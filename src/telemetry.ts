/**
 * FLEET TELEMETRY — what each kiosk says about itself, and when.
 *
 * ⚠️ THE ROSTER IS THE SOURCE OF TRUTH AND SILENCE IS THE ALARM.
 *
 * That inversion is the whole design. A dashboard built from "kiosks that reported" can
 * only ever show you healthy kiosks — the broken one is, by definition, the one that is
 * not in the list. So the receiving end holds an expected roster of shops, and a row that
 * has not been heard from is the finding. This file is only the sending half; it exists to
 * make silence *meaningful* rather than ambiguous.
 *
 * Nothing here can affect a customer. Every send is fire-and-forget and every failure is
 * swallowed: a kiosk with a broken beacon still sells cards, and a telemetry outage must
 * never become a retail outage.
 *
 * No customer data, no order data, no PII. Device and build state only.
 */

import { BUILD_COMMIT, BUILD_TIME } from './buildInfo';
import type { UpdateHealth } from './updatePolicy';

/** Where beacons go. A localStorage entry under this key overrides the built-in default. */
export const TELEMETRY_URL_KEY = 'm2m_telemetry_url';

/**
 * The deployed receiver, baked into the build.
 *
 * ⚠️ THIS IS BAKED IN ON PURPOSE, AND THE ALTERNATIVE IS WHY.
 *
 * The roster only means something if every kiosk reports without anyone visiting it. Left
 * as a localStorage-only setting, switching telemetry on would mean typing this URL into
 * twenty-one iPads in twenty-one shops — and the kiosks that most need watching are exactly
 * the ones nobody is going to get to. Silence would then be ambiguous again: is that shop
 * broken, or did we simply never configure it? A default in the build removes that question.
 *
 * Nothing secret is here. The endpoint is deliberately open ("Anyone", because a kiosk
 * cannot sign in), it only accepts writes, and it returns nothing. Publishing it in a
 * client bundle costs nothing that deploying it did not already cost.
 *
 * Apps Script container-bound web app, market2mint@gmail.com, deployed 2026-08-08.
 */
export const DEFAULT_TELEMETRY_URL =
  'https://script.google.com/macros/s/AKfycbwDJ3hcKIuNDfpoxPNpVN7vkv1sJ0dKDsAhIweVjpG8t2gPm9ClKJTGIOiFDCw5EtgFng/exec';

/**
 * Store this as the URL to silence one device.
 *
 * A baked-in default with no way to turn it off is a trap: the moment one kiosk misbehaves —
 * a runaway send loop, a shop that objects — the only remedy would be shipping a new build to
 * the whole fleet. This is the local off switch.
 */
export const TELEMETRY_OFF = 'off';

/** Stable per-device identity, generated once. */
export const DEVICE_ID_KEY = 'm2m_device_id';

/** Don't send more often than this unless something actually changed. */
export const MIN_SEND_INTERVAL_MS = 10 * 60 * 1000;

export interface TelemetryPayload {
  deviceId: string;
  storeCode: string;
  buildCommit: string;
  buildTime: string;
  menuVersion: string;
  lastSuccessfulCheck: number | null;
  lastAppliedAt: number | null;
  consecutiveFailures: number;
  totalFailures: number;
  updatePending: boolean;
  /** 'standalone' means an Add-to-Home-Screen web app — how the fleet actually runs. */
  displayMode: string;
  /** Milliseconds since this page loaded. Large means it has not reloaded in a long time. */
  uptimeMs: number;
  timeZone: string;
  online: boolean;
  userAgent: string;
}

/**
 * A UUID made once and kept.
 *
 * Necessary because `storeCode` can legitimately be `NOT_SET` — a real kiosk reported
 * exactly that during testing. Keyed on store code alone, five unconfigured kiosks are
 * indistinguishable from one, which is the opposite of what a fleet view is for.
 *
 * Deliberately NOT `crypto.randomUUID()`: that requires a secure context, and a kiosk
 * served over plain http on a shop LAN would throw. This does not need to be
 * cryptographically strong — it needs to be unique across eighteen iPads and to never
 * fail.
 */
export const deviceId = (): string => {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const made = `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, made);
    return made;
  } catch {
    return 'unknown-device';
  }
};

/**
 * Falls back to the built-in endpoint, so a kiosk reports without ever being configured.
 *
 * A stored value wins — that is how a single device is redirected at a test receiver or
 * silenced with `TELEMETRY_OFF`. A blank or whitespace-only entry is treated as "not set"
 * rather than as "off", because a half-cleared field is far more likely to be a slip than a
 * deliberate opt-out, and the failure it would cause — one silently dark kiosk — is the one
 * this whole system exists to prevent.
 */
export const telemetryUrl = (): string | null => {
  try {
    const stored = localStorage.getItem(TELEMETRY_URL_KEY);
    const trimmed = stored ? stored.trim() : '';
    if (!trimmed) return DEFAULT_TELEMETRY_URL || null;
    if (trimmed.toLowerCase() === TELEMETRY_OFF) return null;
    return trimmed;
  } catch {
    // localStorage can throw in private-mode iOS. The endpoint is still known, so still report.
    return DEFAULT_TELEMETRY_URL || null;
  }
};

/** How the app is being displayed — the direct test of the Home-Screen-web-app question. */
const displayMode = (): string => {
  try {
    for (const mode of ['standalone', 'fullscreen', 'minimal-ui']) {
      if (window.matchMedia(`(display-mode: ${mode})`).matches) return mode;
    }
    return (window.navigator as { standalone?: boolean }).standalone ? 'standalone-ios' : 'browser';
  } catch {
    return 'unknown';
  }
};

export const buildPayload = (input: {
  storeCode: string;
  menuVersion: string;
  health: UpdateHealth;
  updatePending: boolean;
  pageLoadedAt: number;
}): TelemetryPayload => ({
  deviceId: deviceId(),
  storeCode: input.storeCode || 'NOT_SET',
  buildCommit: BUILD_COMMIT,
  buildTime: BUILD_TIME,
  menuVersion: input.menuVersion,
  lastSuccessfulCheck: input.health.lastSuccessfulCheck,
  lastAppliedAt: input.health.lastAppliedAt,
  consecutiveFailures: input.health.consecutiveFailures,
  totalFailures: input.health.totalFailures,
  updatePending: input.updatePending,
  displayMode: displayMode(),
  uptimeMs: Date.now() - input.pageLoadedAt,
  timeZone: (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
    } catch {
      return 'unknown';
    }
  })(),
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
});

/**
 * The fields whose change is worth an early beacon.
 *
 * Deliberately excludes uptime and timestamps — those change constantly and would defeat
 * the rate limit entirely, turning "send on change" into "send every tick".
 */
const signature = (p: TelemetryPayload): string =>
  [p.storeCode, p.buildCommit, p.menuVersion, p.consecutiveFailures, p.updatePending, p.online].join('|');

let lastSentAt = 0;
let lastSignature = '';

/** Exposed for tests; a reload resets this naturally. */
export const resetSendState = () => {
  lastSentAt = 0;
  lastSignature = '';
};

export const shouldSend = (payload: TelemetryPayload, now: number): boolean => {
  if (signature(payload) !== lastSignature) return true;
  return now - lastSentAt >= MIN_SEND_INTERVAL_MS;
};

/**
 * Send a beacon. Resolves true only if it was actually sent.
 *
 * ⚠️ `text/plain` IS REQUIRED, NOT SLOPPINESS. Apps Script web apps do not answer CORS
 * preflight, so an `application/json` content type triggers an OPTIONS request that fails
 * and the beacon silently never arrives. `text/plain` is a "simple request" and goes
 * straight through. The body is still JSON; only the header differs.
 *
 * `keepalive` so a beacon fired as the page unloads still completes.
 */
export const sendTelemetry = async (payload: TelemetryPayload, now: number): Promise<boolean> => {
  const url = telemetryUrl();
  if (!url) return false;
  if (!shouldSend(payload, now)) return false;

  lastSentAt = now;
  lastSignature = signature(payload);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: 'no-cors',
    });
    return true;
  } catch {
    // Swallowed on purpose. A kiosk that cannot report is still a kiosk that sells.
    return false;
  }
};
