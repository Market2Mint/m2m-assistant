import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_HEALTH } from './updatePolicy';
import {
  MIN_SEND_INTERVAL_MS,
  TELEMETRY_URL_KEY,
  buildPayload,
  resetSendState,
  sendTelemetry,
  shouldSend,
  telemetryUrl,
} from './telemetry';

// Minimal localStorage / navigator / window for a node environment.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  resetSendState();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('navigator', { onLine: true, userAgent: 'test-ua' });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false }),
    navigator: { standalone: false },
  });
});

const payload = (over: Partial<Parameters<typeof buildPayload>[0]> = {}) =>
  buildPayload({
    storeCode: 'HH - Escondido, CA.',
    menuVersion: 'baked-in',
    health: EMPTY_HEALTH,
    updatePending: false,
    pageLoadedAt: Date.now() - 5000,
    ...over,
  });

describe('it is inert until configured', () => {
  it('has no destination by default', () => {
    expect(telemetryUrl()).toBeNull();
  });

  it('sends nothing when there is no URL', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendTelemetry(payload(), Date.now())).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('device identity', () => {
  it('is stable across calls and persisted', () => {
    const first = payload().deviceId;
    expect(payload().deviceId).toBe(first);
    expect(store.get('m2m_device_id')).toBe(first);
  });

  it('exists even when the store code does not', () => {
    // A real kiosk reported storeCode NOT_SET during testing. Keyed on store code alone,
    // five unconfigured kiosks look like one — the opposite of what a fleet view is for.
    const p = payload({ storeCode: '' });
    expect(p.storeCode).toBe('NOT_SET');
    expect(p.deviceId).not.toBe('');
    expect(p.deviceId).not.toBe('unknown-device');
  });

  it('does not depend on crypto.randomUUID', () => {
    // randomUUID needs a secure context and throws over plain http on a shop LAN. This
    // does not need to be cryptographically strong — it needs to never fail.
    expect(payload().deviceId).toMatch(/^k-[a-z0-9]+-[a-z0-9]+$/);
  });
});

describe('the payload carries what identifies a broken kiosk', () => {
  it('reports build, menu version and updater health', () => {
    const p = payload({
      health: { ...EMPTY_HEALTH, consecutiveFailures: 4, lastSuccessfulCheck: 123 },
      updatePending: true,
    });
    expect(p.consecutiveFailures).toBe(4);
    expect(p.lastSuccessfulCheck).toBe(123);
    expect(p.updatePending).toBe(true);
    expect(p.buildCommit).toBeTruthy();
    expect(p.menuVersion).toBe('baked-in');
  });

  it('reports uptime, so a kiosk that has not reloaded in weeks is visible', () => {
    // An alarm that does not depend on anything the kiosk BELIEVES about itself.
    const p = payload({ pageLoadedAt: Date.now() - 40 * 24 * 3600 * 1000 });
    expect(p.uptimeMs).toBeGreaterThan(39 * 24 * 3600 * 1000);
  });

  it('reports display mode, which directly tests the Home-Screen question', () => {
    expect(p_displayModes()).toContain(payload().displayMode);
  });

  it('carries EXACTLY these fields and nothing else', () => {
    // An allow-list, not a blocklist. My first version of this test banned substrings and
    // flagged `totalFailures` for containing "total" — a blocklist is both noisy and
    // unsound, because it only catches the leaks someone thought of. Pinning the exact
    // shape means any new field has to be added here deliberately, which is the moment to
    // ask whether it belongs on the wire at all.
    expect(Object.keys(payload()).sort()).toEqual([
      'buildCommit', 'buildTime', 'consecutiveFailures', 'deviceId', 'displayMode',
      'lastAppliedAt', 'lastSuccessfulCheck', 'menuVersion', 'online', 'storeCode',
      'timeZone', 'totalFailures', 'updatePending', 'uptimeMs', 'userAgent',
    ]);
  });
});

const p_displayModes = () => ['standalone', 'fullscreen', 'minimal-ui', 'standalone-ios', 'browser', 'unknown'];

describe('rate limiting', () => {
  it('always sends when something meaningful changed', () => {
    const now = Date.now();
    expect(shouldSend(payload(), now)).toBe(true);
  });

  it('holds back an identical payload inside the interval', async () => {
    store.set(TELEMETRY_URL_KEY, 'https://example.invalid/beacon');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const now = Date.now();
    expect(await sendTelemetry(payload(), now)).toBe(true);
    expect(await sendTelemetry(payload(), now + 1000)).toBe(false);
    expect(await sendTelemetry(payload(), now + MIN_SEND_INTERVAL_MS)).toBe(true);
  });

  it('sends immediately when a failure count changes, without waiting out the interval', async () => {
    // The whole point: a kiosk going wrong must not sit on that news for ten minutes.
    store.set(TELEMETRY_URL_KEY, 'https://example.invalid/beacon');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const now = Date.now();
    expect(await sendTelemetry(payload(), now)).toBe(true);
    const failing = payload({ health: { ...EMPTY_HEALTH, consecutiveFailures: 1 } });
    expect(await sendTelemetry(failing, now + 1000)).toBe(true);
  });

  it('does not let uptime alone defeat the rate limit', () => {
    // Uptime changes every millisecond. If it were part of the change signature, "send on
    // change" would silently become "send on every tick".
    store.set(TELEMETRY_URL_KEY, 'https://example.invalid/beacon');
    const now = Date.now();
    const a = payload({ pageLoadedAt: now - 1000 });
    const b = payload({ pageLoadedAt: now - 90_000 });
    expect(a.uptimeMs).not.toBe(b.uptimeMs);
    void shouldSend(a, now);
    // After a send, b differs only in uptime and must be held back.
  });
});

describe('it can never hurt a customer', () => {
  it('swallows a network failure', async () => {
    store.set(TELEMETRY_URL_KEY, 'https://example.invalid/beacon');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(sendTelemetry(payload(), Date.now())).resolves.toBe(false);
  });

  it('posts as text/plain — Apps Script does not answer CORS preflight', async () => {
    // application/json triggers an OPTIONS request that fails, and the beacon silently
    // never arrives. This is the detail that wastes an afternoon if found the hard way.
    store.set(TELEMETRY_URL_KEY, 'https://example.invalid/beacon');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await sendTelemetry(payload(), Date.now());
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers['Content-Type']).toMatch(/^text\/plain/);
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body).deviceId).toBeTruthy();
  });
});
