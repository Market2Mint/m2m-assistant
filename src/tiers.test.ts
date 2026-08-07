import { describe, expect, it } from 'vitest';
import { ACTIVE_SERVICES } from './serviceMenu';
import { SHOW_ALL_AT_OR_BELOW, summariseTiers } from './tiers';

const svc = (name: string, businessDays: number) => ({ name, businessDays });

describe('nothing is ever silently dropped', () => {
  // The whole point of this file. A service a customer cannot see is a service they
  // cannot buy — PSA Regular Ticket was unreachable from the summary for exactly this
  // reason, on a four-service result set.

  it.each([2, 3, 4])('shows every service when there are %i', (n) => {
    const services = Array.from({ length: n }, (_, i) => svc(`Service ${i}`, 10 + i * 5));
    const cards = summariseTiers(services);
    expect(cards.length).toBe(n);
    expect(cards.map((c) => c.service.name).sort()).toEqual(services.map((s) => s.name).sort());
  });

  it('THE REGRESSION: all four PSA ticket tiers survive the summary', () => {
    // The exact live case. These four are the entire Event Tickets → PSA result set, and
    // one of them used to vanish.
    const tickets = ACTIVE_SERVICES.filter(
      (s) => s.category === 'Event Tickets' && s.name.startsWith('PSA'),
    ).map((s) => svc(s.name, s.businessDays));
    expect(tickets.length).toBe(4);

    const shown = summariseTiers(tickets).map((c) => c.service.name);
    expect(shown).toContain('PSA Regular Ticket');
    expect(shown.length).toBe(4);
  });

  it('only starts summarising at five, where it finally saves something', () => {
    const five = Array.from({ length: 5 }, (_, i) => svc(`Service ${i}`, 10 + i * 5));
    expect(summariseTiers(five).length).toBe(3);
    expect(SHOW_ALL_AT_OR_BELOW).toBe(4);
  });
});

describe('ordering and labelling', () => {
  it('runs slowest to fastest, so price reads cheapest first', () => {
    const cards = summariseTiers([svc('fast', 10), svc('slow', 60), svc('mid', 30)]);
    expect(cards.map((c) => c.service.name)).toEqual(['slow', 'mid', 'fast']);
  });

  it('labels the ends only when it is actually summarising', () => {
    const many = [svc('a', 60), svc('b', 50), svc('c', 40), svc('d', 30), svc('e', 20)];
    expect(summariseTiers(many).map((c) => c.label)).toEqual(['LONGEST WAIT', 'MIDDLE', 'FASTEST']);
  });

  it('leaves labels blank when everything is shown', () => {
    // Calling one of four "MIDDLE" says nothing — there is nothing to contrast against.
    expect(summariseTiers([svc('a', 40), svc('b', 20)]).every((c) => c.label === '')).toBe(true);
  });

  it('offers no shortcut to a single option', () => {
    expect(summariseTiers([svc('only', 30)])).toEqual([]);
    expect(summariseTiers([])).toEqual([]);
  });
});

describe('the index points back at the right tile', () => {
  it('indexes into the ORIGINAL list, not the sorted one', () => {
    // Tapping a card scrolls to that service's tile. If the index came from the sorted
    // array the card would scroll to the wrong service — visibly wrong, and confusing in
    // a way that looks like the kiosk ignoring the tap.
    const services = [svc('fast', 10), svc('slow', 60), svc('mid', 30)];
    for (const card of summariseTiers(services)) {
      expect(services[card.index].name).toBe(card.service.name);
    }
  });

  it('still points correctly when summarising a long list', () => {
    const services = Array.from({ length: 9 }, (_, i) => svc(`s${i}`, 90 - i * 10));
    for (const card of summariseTiers(services)) {
      expect(services[card.index]).toBe(card.service);
    }
  });
});

describe('every real result set in the menu keeps all its services reachable', () => {
  it('never hides a service on any question path', () => {
    // Group the live menu the way the results screen does — by the six question values —
    // and assert that no group loses a member. This is the guard that generalises: a new
    // grading company creating a four-service path cannot reintroduce the bug.
    const byPath = new Map<string, { name: string; businessDays: number }[]>();
    for (const s of ACTIVE_SERVICES) {
      const key = (s.questions ?? []).join('|');
      if (!byPath.has(key)) byPath.set(key, []);
      byPath.get(key)!.push(svc(s.name, s.businessDays));
    }

    for (const [path, services] of byPath) {
      const cards = summariseTiers(services);
      if (services.length <= SHOW_ALL_AT_OR_BELOW && services.length > 1) {
        expect(cards.length, `${path} hid a service`).toBe(services.length);
      }
    }
  });
});
