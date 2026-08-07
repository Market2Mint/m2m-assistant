import { describe, expect, it } from 'vitest';
import {
  IDLE_REQUIRED_MS,
  UPDATE_WINDOWS,
  mostRecentWindowStart,
  shouldApplyUpdate,
  type UpdateDecisionInput,
} from './updatePolicy';

/** Local time, because the windows are deliberately local to each shop. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 7, day, hour, minute, 0, 0);

const base: UpdateDecisionInput = {
  now: at(7, 4, 30),
  updatePending: true,
  online: true,
  msSinceInteraction: IDLE_REQUIRED_MS,
  lastAppliedAt: null,
};

describe('the windows themselves', () => {
  it('is twice a day', () => {
    expect(UPDATE_WINDOWS).toEqual([4, 11]);
  });

  it('puts one window where every shop is certainly shut', () => {
    // 04:00 guarantees idleness and guarantees no customer is mid-order.
    expect(UPDATE_WINDOWS).toContain(4);
  });

  it('puts the other after opening, so a kiosk powered off overnight still updates today', () => {
    const second = UPDATE_WINDOWS.filter((h) => h !== 4)[0];
    expect(second).toBeGreaterThan(8);
    expect(second).toBeLessThan(14); // before the afternoon rush
  });
});

describe('mostRecentWindowStart', () => {
  it('returns today 04:00 between 04:00 and 11:00', () => {
    expect(mostRecentWindowStart(at(7, 4, 0))).toEqual(at(7, 4));
    expect(mostRecentWindowStart(at(7, 9, 59))).toEqual(at(7, 4));
  });

  it('returns today 11:00 from 11:00 until midnight', () => {
    expect(mostRecentWindowStart(at(7, 11, 0))).toEqual(at(7, 11));
    expect(mostRecentWindowStart(at(7, 23, 59))).toEqual(at(7, 11));
  });

  it('returns YESTERDAY 11:00 before the first window of the day', () => {
    // The hours between midnight and 04:00 must belong to a window. If they did not, a
    // kiosk that went idle at 01:00 holding a pending update would sit on it for hours
    // despite already being entitled to take it.
    expect(mostRecentWindowStart(at(7, 0, 1))).toEqual(at(6, 11));
    expect(mostRecentWindowStart(at(7, 3, 59))).toEqual(at(6, 11));
  });

  it('does not care what order the windows are given in', () => {
    expect(mostRecentWindowStart(at(7, 12), [11, 4])).toEqual(at(7, 11));
  });

  it('handles a single window', () => {
    expect(mostRecentWindowStart(at(7, 5), [4])).toEqual(at(7, 4));
    expect(mostRecentWindowStart(at(7, 3), [4])).toEqual(at(6, 4));
  });
});

describe('shouldApplyUpdate', () => {
  it('applies when there is an update, the kiosk is idle, online and in a fresh window', () => {
    expect(shouldApplyUpdate(base)).toEqual({ apply: true, reason: 'ready' });
  });

  it('reloads on the window even with NO update pending — the belt-and-braces case', () => {
    // Changed 2026-08-07, deliberately. `updatePending` is set by the very check that may
    // be broken, so gating on it means a kiosk with a silently failing poll reports "up to
    // date" forever and never reloads. The unconditional window reload is the only action
    // that does not depend on the poll working, so it is the only thing that can rescue
    // such a kiosk. It costs a few seconds on an idle screen at 4am.
    expect(shouldApplyUpdate({ ...base, updatePending: false })).toEqual({
      apply: true,
      reason: 'scheduled-refresh',
    });
  });

  it('still distinguishes a real update from a scheduled refresh, for the logs', () => {
    expect(shouldApplyUpdate({ ...base, updatePending: true }).reason).toBe('ready');
    expect(shouldApplyUpdate({ ...base, updatePending: false }).reason).toBe('scheduled-refresh');
  });

  it('never reloads while offline', () => {
    // The whole reason this module exists. No service worker, no offline cache: a reload
    // with no network lands on a browser error page, and with the app gone nothing
    // retries. The kiosk stays dead until a person notices.
    expect(shouldApplyUpdate({ ...base, online: false })).toEqual({
      apply: false,
      reason: 'offline',
    });
  });

  it('refuses a scheduled refresh while offline, exactly like a real update', () => {
    // The forced reload is insurance, so it must be at least as careful as the thing it
    // insures. Reloading a HEALTHY kiosk into a dead network would be self-inflicted.
    expect(shouldApplyUpdate({ ...base, updatePending: false, online: false }).apply).toBe(false);
  });

  it('reports offline even when the kiosk is also busy', () => {
    // Order is about the log line, not the logic — sending someone to look at a "busy"
    // kiosk when the real problem is the shop's WiFi wastes a trip.
    expect(
      shouldApplyUpdate({ ...base, online: false, msSinceInteraction: 0 }).reason,
    ).toBe('offline');
  });

  it('never reloads under a customer', () => {
    expect(shouldApplyUpdate({ ...base, msSinceInteraction: 0 }).apply).toBe(false);
    expect(shouldApplyUpdate({ ...base, msSinceInteraction: IDLE_REQUIRED_MS - 1 })).toEqual({
      apply: false,
      reason: 'in-use',
    });
    // Exactly at the threshold is idle enough.
    expect(shouldApplyUpdate({ ...base, msSinceInteraction: IDLE_REQUIRED_MS }).apply).toBe(true);
  });

  it('takes an update only once per window', () => {
    // Applied at 04:05; still inside the 04:00 window at 09:00, so no second reload.
    const applied = at(7, 4, 5).getTime();
    expect(shouldApplyUpdate({ ...base, now: at(7, 9), lastAppliedAt: applied })).toEqual({
      apply: false,
      reason: 'window-already-serviced',
    });
  });

  it('opens again at the next window', () => {
    const applied = at(7, 4, 5).getTime();
    expect(shouldApplyUpdate({ ...base, now: at(7, 11, 1), lastAppliedAt: applied }).apply).toBe(
      true,
    );
  });

  it('lets a kiosk that missed 04:00 catch up at 11:00 rather than waiting a day', () => {
    // Powered off overnight, booted at 10:00, idle by 11:30.
    const yesterday = at(6, 11, 30).getTime();
    expect(shouldApplyUpdate({ ...base, now: at(7, 11, 30), lastAppliedAt: yesterday }).apply).toBe(
      true,
    );
  });

  it('updates a brand-new kiosk that has never updated', () => {
    expect(shouldApplyUpdate({ ...base, lastAppliedAt: null }).apply).toBe(true);
  });

  it('THE COLD-START CASE: asleep overnight, build published at 02:00, woken at 09:00', () => {
    // The real-world scenario, and the one most likely to have been failing. A sleeping
    // iPad does not run setInterval — timers are suspended, not queued — so the kiosk
    // performs NO check at 04:00 and nothing fires late. It learns about the new build
    // only because waking now triggers a check directly (see the visibilitychange /
    // pageshow listeners in App.tsx); a timer alone would have left it up to five more
    // minutes, and on the old build there was no wake trigger at all.
    //
    // Once it knows, 09:00 sits inside the 04:00 window, which yesterday's update did not
    // serve — so it is eligible immediately rather than waiting for 11:00.
    const lastAppliedAt = at(6, 11, 15).getTime(); // yesterday's 11:00 window
    expect(shouldApplyUpdate({ ...base, now: at(7, 9, 0), lastAppliedAt })).toEqual({
      apply: true,
      reason: 'ready',
    });
  });

  it('waits for the shop to go quiet before taking it, even on a cold start', () => {
    // Whoever woke the iPad probably touched it. The update must not land while they are
    // standing there — it waits out the idle period like any other.
    const lastAppliedAt = at(6, 11, 15).getTime();
    expect(
      shouldApplyUpdate({ ...base, now: at(7, 9, 0), lastAppliedAt, msSinceInteraction: 30_000 }),
    ).toEqual({ apply: false, reason: 'in-use' });
  });

  it('rescues a kiosk whose update CHECK has been broken for weeks', () => {
    // The case that motivated the scheduled refresh. This kiosk believes it is current —
    // its poll has been failing silently, so updatePending is false and has been for a
    // month. Nothing it knows about itself is true. The window reload does not consult
    // any of that, which is the only reason it recovers.
    const lastAppliedAt = at(6, 11, 15).getTime();
    expect(
      shouldApplyUpdate({ ...base, now: at(7, 9, 0), lastAppliedAt, updatePending: false }),
    ).toEqual({ apply: true, reason: 'scheduled-refresh' });
  });

  it('does not reload repeatedly through the small hours', () => {
    // 00:30 belongs to yesterday's 11:00 window. A kiosk that updated at 23:00 has
    // already served that window and must stay put until 04:00.
    const applied = at(6, 23, 0).getTime();
    expect(shouldApplyUpdate({ ...base, now: at(7, 0, 30), lastAppliedAt: applied })).toEqual({
      apply: false,
      reason: 'window-already-serviced',
    });
    expect(shouldApplyUpdate({ ...base, now: at(7, 4, 1), lastAppliedAt: applied }).apply).toBe(
      true,
    );
  });

  /**
   * Walk a week in ten-minute steps with an update permanently pending and the kiosk
   * always idle — the worst case for reload churn.
   */
  const simulateWeek = (startHour: number, seedLastApplied: number | null) => {
    let lastAppliedAt = seedLastApplied;
    const applications: Date[] = [];
    for (let step = 0; step < 7 * 24 * 6; step++) {
      const now = new Date(at(7, startHour).getTime() + step * 10 * 60 * 1000);
      if (shouldApplyUpdate({ ...base, now, lastAppliedAt }).apply) {
        lastAppliedAt = now.getTime();
        applications.push(now);
      }
    }
    return applications;
  };

  it('applies at most ONCE PER WINDOW, which is the actual guarantee', () => {
    // Not "twice per calendar day" — those differ, and the difference is real rather than
    // a bug. A kiosk booting for the first time at 00:30 is inside YESTERDAY's 11:00
    // window, so it can legitimately reload at 00:30, again at 04:00 and again at 11:00:
    // three times in one calendar date, but once each for three separate windows. Nobody
    // is in the shop at 00:30, so this costs nothing and it is what stops a first-boot
    // kiosk sitting on a stale bundle until morning.
    const applications = simulateWeek(0, null);
    const seen = new Set<number>();
    for (const when of applications) {
      const key = mostRecentWindowStart(when).getTime();
      expect(seen.has(key), `two reloads inside the window at ${new Date(key)}`).toBe(false);
      seen.add(key);
    }
    expect(applications.length).toBeGreaterThan(12); // ~2 per day for a week
  });

  it('settles to exactly twice a day once a kiosk has been running', () => {
    // Steady state — the thing a shop actually experiences day to day.
    const applications = simulateWeek(4, at(7, 3, 0).getTime());
    const perDay: Record<string, number> = {};
    for (const when of applications) {
      const key = when.toDateString();
      perDay[key] = (perDay[key] ?? 0) + 1;
    }
    expect(Object.keys(perDay).length).toBeGreaterThan(5);
    for (const [day, count] of Object.entries(perDay)) {
      expect(count, `${day} reloaded ${count} times`).toBeLessThanOrEqual(2);
    }
  });

  it('reloads within hours of a deploy, not days', () => {
    // The opposite failure: a fleet that drifts apart because updates never land. Four
    // kiosks on a new price and fourteen on the old one is worse than none of them
    // moving, because now the shops disagree with each other.
    const deployedAt = at(7, 12, 0); // just after the 11:00 window closed
    const applications = simulateWeek(12, deployedAt.getTime());
    expect(applications[0].getTime() - deployedAt.getTime()).toBeLessThanOrEqual(
      17 * 60 * 60 * 1000,
    );
  });
});
