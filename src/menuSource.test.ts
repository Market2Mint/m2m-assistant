import { describe, expect, it } from 'vitest';
import { SERVICE_MENU } from './serviceMenu';
import {
  MENU_MIN_SERVICES,
  validateMenuPayload,
  type MenuPayload,
} from './menuSource';

/** A payload built from the real menu — the thing a correct publisher would emit. */
const goodPayload = (overrides: Partial<MenuPayload> = {}): MenuPayload => ({
  version: '2026-08-07T04:00:00Z',
  publishedAt: '2026-08-07T04:00:00.000Z',
  services: JSON.parse(JSON.stringify(SERVICE_MENU)),
  ...overrides,
});

const errorsFor = (raw: unknown): string[] => {
  const result = validateMenuPayload(raw);
  return result.ok ? [] : result.errors;
};

describe('the real menu is a valid payload', () => {
  it('accepts what the generator already produces', () => {
    // If this ever fails, the publisher contract and the build have drifted apart, and the
    // fleet would silently fall back to the baked-in menu forever.
    expect(validateMenuPayload(goodPayload()).ok).toBe(true);
  });

  it('the live menu is far above the truncation floor', () => {
    expect(SERVICE_MENU.length).toBeGreaterThan(MENU_MIN_SERVICES * 2);
  });
});

describe('🔒 it refuses to accept internal pricing', () => {
  // Everything a kiosk downloads is public. Grader cost and the employee/owner tiers must
  // never leave the building. These are the assertions that make that a property of the
  // system rather than a habit of whoever writes the publisher.

  it('rejects a payload carrying grader cost', () => {
    const payload = goodPayload();
    payload.services[3].cost = 63.99;
    expect(errorsFor(payload).join(' ')).toContain('LEAKS grader cost');
  });

  it('rejects a payload carrying an employee price', () => {
    const payload = goodPayload();
    payload.services[3].price.employee = 70.0;
    expect(errorsFor(payload).join(' ')).toContain('LEAKS employee price');
  });

  it('rejects a payload carrying an owner price', () => {
    const payload = goodPayload();
    payload.services[3].price.owner = 65.0;
    expect(errorsFor(payload).join(' ')).toContain('LEAKS owner price');
  });

  it('rejects rather than sanitising', () => {
    // Stripping the field quietly would hide a broken publisher until the day it leaks
    // something this validator does not know to look for.
    const payload = goodPayload();
    payload.services[0].cost = 1;
    expect(validateMenuPayload(payload).ok).toBe(false);
  });

  it('treats a zero cost as a leak too', () => {
    // 0 is falsy, so a `if (cost)` check would wave it through — and a zero cost is still
    // a statement about what M2M pays.
    const payload = goodPayload();
    payload.services[0].cost = 0;
    expect(errorsFor(payload).join(' ')).toContain('LEAKS grader cost');
  });
});

describe('it rebuilds the guards the build-time tests provide', () => {
  it('rejects a service with no usable price', () => {
    const payload = goodPayload();
    payload.services[5].price.customer = 0;
    expect(errorsFor(payload).join(' ')).toContain('no usable customer price');

    const missing = goodPayload();
    (missing.services[5].price as { customer: unknown }).customer = '84.99';
    expect(errorsFor(missing).join(' ')).toContain('no usable customer price');
  });

  it('rejects a service with no usable turnaround', () => {
    const payload = goodPayload();
    payload.services[5].businessDays = 0;
    expect(errorsFor(payload).join(' ')).toContain('no usable turnaround');
  });

  it('rejects an active service the question tree cannot reach', () => {
    // Invisible to a customer but counted by everything else — the exact failure the
    // generated menu exists to make impossible.
    const payload = goodPayload();
    const active = payload.services.findIndex((s) => s.active);
    payload.services[active].questions = null;
    expect(errorsFor(payload).join(' ')).toContain('not routable');
  });

  it('rejects an active service with a blank question value', () => {
    const payload = goodPayload();
    const active = payload.services.findIndex((s) => s.active);
    payload.services[active].questions![2] = '';
    expect(errorsFor(payload).join(' ')).toContain('blank question value');
  });

  it('allows an INACTIVE service to be unroutable', () => {
    // Retiring a service is a data change; it keeps its history and simply stops being
    // reachable. That must not fail a publish.
    const payload = goodPayload();
    const idx = payload.services.findIndex((s) => !s.active);
    if (idx >= 0) {
      payload.services[idx].questions = null;
      expect(validateMenuPayload(payload).ok).toBe(true);
    }
  });
});

describe('it refuses a truncated or malformed publish', () => {
  it('rejects a suspiciously short menu', () => {
    // A partial write, a filtered export and a half-finished edit all look like "fewer
    // services". Selling four of them is worse than ignoring the publish entirely.
    const payload = goodPayload({ services: SERVICE_MENU.slice(0, 5) });
    expect(errorsFor(payload).join(' ')).toContain('looks truncated');
  });

  it('rejects an empty menu', () => {
    expect(validateMenuPayload(goodPayload({ services: [] })).ok).toBe(false);
  });

  it('rejects anything that is not a payload at all', () => {
    // What an Apps Script web app returns when it errors, redirects to a login, or is
    // deployed with the wrong access setting: HTML, null, or a bare string.
    for (const junk of [null, undefined, 'Moved Temporarily', 42, [], '<html>Sign in</html>']) {
      expect(validateMenuPayload(junk).ok, String(junk)).toBe(false);
    }
  });

  it('rejects a payload with no version stamp', () => {
    expect(errorsFor(goodPayload({ version: '' })).join(' ')).toContain('missing version');
  });

  it('reports every problem at once, not just the first', () => {
    // A publisher should be fixable in one pass rather than one error per attempt.
    const payload = goodPayload({ version: '' });
    payload.services[0].cost = 5;
    payload.services[1].businessDays = 0;
    expect(errorsFor(payload).length).toBeGreaterThanOrEqual(3);
  });

  it('names the offending service so a bad row can be found in the sheet', () => {
    const payload = goodPayload();
    payload.services[7].price.customer = -1;
    expect(errorsFor(payload).join(' ')).toContain(payload.services[7].name);
  });
});
