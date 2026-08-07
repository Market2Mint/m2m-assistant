/**
 * WHEN A KIOSK IS ALLOWED TO UPDATE ITSELF.
 *
 * ~18 of these run unattended in shops nobody on the team is standing in. Two failure
 * modes matter, and they pull in opposite directions:
 *
 *   - Update too eagerly and a kiosk reloads at a bad moment. There is no service worker
 *     and no offline cache, so a reload while the shop WiFi is between breaths lands on a
 *     Safari error page — and because the app is no longer running, **nothing retries**.
 *     The kiosk is dead until a human notices and touches it. That is the worst outcome
 *     available and it is silent.
 *   - Update too reluctantly and the fleet drifts apart. A price fix that reaches four
 *     kiosks is arguably worse than one that reaches none, because now the shops disagree.
 *
 * The old policy was "reload as soon as the kiosk has been idle five minutes after a new
 * bundle appears". It got the second half right and the first half wrong: it never checked
 * the network, never verified the new bundle was actually reachable, and gave no control
 * over WHEN a fleet moves — a deploy at 2pm rolled through shops mid-afternoon, one at a
 * time, in whatever order they happened to go quiet.
 *
 * This module is the decision, kept pure so it can be tested against a clock instead of
 * observed in a shop. `updatePolicy.test.ts` covers the boundaries.
 */

/**
 * Local hours at which a kiosk may take a pending update. Cayden's call, 2026-08-07:
 * twice a day — enough to keep the fleet current without churn.
 *
 * 04:00 is chosen because every shop is shut, so idleness is guaranteed and no customer is
 * mid-order. 11:00 is the second because it is after opening but before the afternoon
 * rush, so a kiosk that was powered off overnight — and therefore missed the 04:00 window
 * entirely — still gets same-day coverage rather than waiting until the next morning.
 *
 * These are HOURS in the kiosk's own local time, which is what you want across CA and TX:
 * each shop updates at 4am *its* time, not 4am somewhere else.
 */
export const UPDATE_WINDOWS = [4, 11];

/** How long a kiosk must be untouched before a reload is considered safe. */
export const IDLE_REQUIRED_MS = 5 * 60 * 1000;

/**
 * The most recent window boundary that has already passed.
 *
 * A kiosk is eligible once per window rather than "at 04:00 exactly", because a device
 * that is asleep, offline or mid-order at 04:00 would otherwise skip the window and wait
 * half a day. Eligibility opens at the boundary and stays open until the next one.
 *
 * Before the first window of the day, the answer is yesterday's LAST window — otherwise
 * the hours between midnight and 04:00 would belong to no window at all, and a kiosk that
 * went idle at 01:00 would sit on a pending update it was already entitled to take.
 */
export const mostRecentWindowStart = (now: Date, windows: number[] = UPDATE_WINDOWS): Date => {
  const sorted = [...windows].sort((a, b) => a - b);
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  let best: Date | null = null;
  for (const hour of sorted) {
    const boundary = new Date(midnight);
    boundary.setHours(hour, 0, 0, 0);
    if (boundary.getTime() <= now.getTime()) best = boundary;
  }
  if (best) return best;

  const yesterday = new Date(midnight);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(sorted[sorted.length - 1], 0, 0, 0);
  return yesterday;
};

/**
 * What this kiosk knows about its own updater.
 *
 * Persisted, because the interesting failures span reloads and reboots: "this kiosk has
 * not completed a successful check since the 3rd" is the sentence that identifies a broken
 * shop, and it cannot be assembled from anything held in memory.
 *
 * This is also precisely the payload telemetry needs to send. It is defined here rather
 * than inside the beacon so the Settings panel and the beacon report the same numbers by
 * construction — a health readout that disagrees with the fleet view is worse than none.
 */
export interface UpdateHealth {
  /** Epoch ms of the last check that actually reached the server. */
  lastSuccessfulCheck: number | null;
  /** Epoch ms of the last reload this kiosk applied. */
  lastAppliedAt: number | null;
  /** Consecutive failed checks. Non-zero for long is the alarm that matters. */
  consecutiveFailures: number;
  /** Total failures since this device was first seen — survives a lucky success. */
  totalFailures: number;
}

export const EMPTY_HEALTH: UpdateHealth = {
  lastSuccessfulCheck: null,
  lastAppliedAt: null,
  consecutiveFailures: 0,
  totalFailures: 0,
};

/**
 * A kiosk that has not completed a check in this long is presumed broken, not quiet.
 *
 * Two days rather than one: a shop shut for a public holiday with the iPad asleep is
 * normal and must not page anyone. Three days would hide a fault across a weekend.
 */
export const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

export const isStale = (health: UpdateHealth, now: number): boolean =>
  health.lastSuccessfulCheck === null || now - health.lastSuccessfulCheck > STALE_AFTER_MS;

export interface UpdateDecisionInput {
  now: Date;
  /** A newer bundle has been seen on the server. */
  updatePending: boolean;
  /** navigator.onLine. Necessary, not sufficient — see `reason: 'offline'`. */
  online: boolean;
  /** Milliseconds since the customer last touched anything. */
  msSinceInteraction: number;
  /** Epoch ms of the last applied update, or null if this kiosk has never updated. */
  lastAppliedAt: number | null;
  windows?: number[];
}

export type UpdateDecisionReason =
  | 'ready'
  /**
   * No new version was detected, but the window is due and the kiosk reloads anyway.
   *
   * This is the belt-and-braces case, added 2026-08-07. A kiosk whose update CHECK is
   * broken can never discover that it is broken — it reports "up to date" forever because
   * nothing it believes is being tested. An unconditional daily reload is the one action
   * that does not depend on the poll working, so it is the only thing that can rescue a
   * kiosk stuck behind a silently failing check. It costs a few seconds on an idle screen
   * at 4am.
   */
  | 'scheduled-refresh'
  /** A real update landed less than MIN_REAPPLY_MS ago. Loop guard, not a policy. */
  | 'just-applied'
  | 'offline'
  | 'in-use'
  | 'window-already-serviced';

export interface UpdateDecision {
  apply: boolean;
  reason: UpdateDecisionReason;
}

/**
 * A real update must not re-apply faster than this.
 *
 * Purely a loop guard. If a kiosk ever reloaded into a build that still reported an update
 * pending — a stale CDN edge is the plausible cause — it would otherwise reload in a tight
 * cycle and be unusable. Ten minutes bounds that to something a shop would tolerate while
 * still propagating a fix quickly.
 */
export const MIN_REAPPLY_MS = 10 * 60 * 1000;

/**
 * Should this kiosk reload right now?
 *
 * ⚠️ THE WINDOWS GATE THE UNCONDITIONAL REFRESH, NOT A REAL UPDATE. That distinction is
 * the whole design and it was wrong in the first cut.
 *
 * Window-gating a genuine new build creates a fatal asymmetry: a deploy would reach the
 * fleet fast (the kiosks it lands on are running the OLD rules) while a ROLLBACK would
 * wait for the next window — up to fourteen hours. Fast in, slow out, which is exactly
 * backwards. The emergency you cannot respond to quickly is the one that matters.
 *
 * And the thing the windows were protecting against turns out to be cheap: a reload takes
 * about two seconds, only happens after five idle minutes, and returns to the same attract
 * screen. Spending fourteen hours of rollback latency to avoid a rare two-second blip is a
 * bad trade — so a detected new build now applies as soon as the kiosk is idle, online and
 * has confirmed the bundle is fetchable.
 *
 * The windows still gate `scheduled-refresh`, where they belong: that one has no new build
 * behind it, so there is no reason to run it more than twice a day.
 *
 * ⚠️ `online: true` is NOT proof the reload will succeed. `navigator.onLine` reports a
 * link, not reachability: an iPad associated to a shop access point with a dead uplink
 * reports true. The caller must ALSO fetch the new bundle and confirm it arrives before
 * committing. This decides whether it is the right TIME; only the fetch decides whether it
 * is safe.
 */
export const shouldApplyUpdate = (input: UpdateDecisionInput): UpdateDecision => {
  if (!input.online) return { apply: false, reason: 'offline' };
  if (input.msSinceInteraction < IDLE_REQUIRED_MS) return { apply: false, reason: 'in-use' };

  if (input.updatePending) {
    const since = input.lastAppliedAt === null ? Infinity : input.now.getTime() - input.lastAppliedAt;
    if (since < MIN_REAPPLY_MS) return { apply: false, reason: 'just-applied' };
    return { apply: true, reason: 'ready' };
  }

  // No new build. The unconditional refresh exists because `updatePending` is set by the
  // very check that might be broken — a kiosk with a silently failing poll reports "up to
  // date" forever and would never reload. This is the one action that does not consult
  // anything the kiosk believes about itself, which is the only reason it can rescue one.
  const windowStart = mostRecentWindowStart(input.now, input.windows).getTime();
  if (input.lastAppliedAt !== null && input.lastAppliedAt >= windowStart) {
    return { apply: false, reason: 'window-already-serviced' };
  }
  return { apply: true, reason: 'scheduled-refresh' };
};
