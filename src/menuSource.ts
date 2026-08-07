/**
 * THE MENU AS DATA, NOT CODE.
 *
 * Prices change weekly. The app changes rarely. Today they are welded together: the menu
 * is compiled into the bundle, so moving a price from $84.99 to $89.99 needs a code
 * change, a rebuild, a deploy and a fleet update — the same machinery and the same risk as
 * rewriting checkout. That is the root of both "we cannot edit the kiosks" and "updating
 * all 18 is a problem". They are one problem: two things with different change rates
 * sharing one release.
 *
 * This module splits them. The kiosk fetches a published menu, validates it, and falls
 * back — twice — if anything is wrong.
 *
 * ⚠️ THE GUARD RAILS ARE THE POINT, NOT THE FETCH.
 *
 * `serviceMenu.ts` is GENERATED rather than hand-written for a reason: the pricing sheet is
 * not trustworthy on its own, and the build-time tests are what catch a missing price or an
 * unroutable tier before it reaches a customer. Moving the menu to runtime throws that
 * safety net away unless it is rebuilt here — otherwise a spreadsheet typo reaches eighteen
 * shops with nothing in the way. So every check the build performs, this performs again on
 * arrival, and a payload that fails is REFUSED rather than partially applied.
 *
 * Three layers, in order:
 *   1. The published menu, if it arrives and validates.
 *   2. The last one that did, cached on the device — so a bad publish or a dead network
 *      changes nothing.
 *   3. The menu compiled into the bundle — so a brand-new kiosk that has never reached the
 *      network still sells the right things.
 *
 * A kiosk therefore has no state in which it shows no menu, and no state in which it shows
 * an invalid one.
 */

import { SERVICE_MENU, type ServiceRecord } from './serviceMenu';

/** Where the published menu lives. Overridable per device so hosting can change later. */
export const MENU_SOURCE_URL_KEY = 'm2m_menu_source_url';

/** Cached last-known-good payload. */
export const MENU_CACHE_KEY = 'm2m_menu_cache';

/**
 * A published menu is a version stamp plus the services. The stamp is what lets a kiosk
 * say "mine is older than that" without diffing the whole menu, and what makes a rollback
 * expressible: republish an older version and the fleet converges on it.
 */
export interface MenuPayload {
  /** Opaque and compared by equality only — never parsed or ordered. */
  version: string;
  publishedAt: string;
  services: ServiceRecord[];
}

/**
 * `errors` is always present and empty when `ok`, rather than a discriminated union.
 * This project compiles without `strict`, where narrowing on a boolean literal is not
 * reliable — and a validator whose result needs a type-checker trick to read is the wrong
 * shape for something this load-bearing.
 */
export interface MenuValidation {
  ok: boolean;
  /** Present only when `ok`. */
  payload?: MenuPayload;
  errors: string[];
}

/**
 * A published menu smaller than this is treated as truncated rather than as a very short
 * menu. A partial write, a filtered export or a half-finished edit all present as "fewer
 * services", and silently selling four of them is worse than ignoring the publish. The
 * live menu carries ~130 routable records; this is a floor, not a target.
 */
export const MENU_MIN_SERVICES = 40;

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isPositiveNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * Validate a published payload as if it were untrusted input, because it is.
 *
 * Returns every problem rather than the first, so a bad publish can be fixed in one pass
 * instead of one error at a time.
 */
export const validateMenuPayload = (raw: unknown): MenuValidation => {
  const errors: string[] = [];
  const payload = raw as MenuPayload;

  if (typeof raw !== 'object' || raw === null) return { ok: false, errors: ['payload is not an object'] };
  if (!isNonEmptyString(payload.version)) errors.push('missing version');
  if (!isNonEmptyString(payload.publishedAt)) errors.push('missing publishedAt');
  if (!Array.isArray(payload.services)) return { ok: false, errors: [...errors, 'services is not an array'] };
  if (payload.services.length < MENU_MIN_SERVICES) {
    errors.push(`only ${payload.services.length} services — looks truncated (min ${MENU_MIN_SERVICES})`);
  }

  payload.services.forEach((s, i) => {
    const where = `service[${i}] ${typeof s?.name === 'string' ? s.name : '(unnamed)'}`;
    if (typeof s !== 'object' || s === null) {
      errors.push(`${where}: not an object`);
      return;
    }
    if (!isNonEmptyString(s.name)) errors.push(`${where}: missing name`);
    if (!isNonEmptyString(s.category)) errors.push(`${where}: missing category`);

    // 🔒 THE SECURITY GUARD. Everything here reaches every kiosk, and anything a kiosk
    // downloads is public. Grader cost and the employee/owner tiers must never leave the
    // building, so a payload carrying them is REJECTED OUTRIGHT rather than sanitised —
    // if these appear, the publisher is broken, and quietly stripping them would hide
    // that until the day something else leaks too.
    if (s.cost !== null && s.cost !== undefined) errors.push(`${where}: LEAKS grader cost`);
    if (s.price?.employee !== null && s.price?.employee !== undefined) errors.push(`${where}: LEAKS employee price`);
    if (s.price?.owner !== null && s.price?.owner !== undefined) errors.push(`${where}: LEAKS owner price`);

    if (!isPositiveNumber(s.price?.customer)) errors.push(`${where}: no usable customer price`);
    if (!isPositiveNumber(s.businessDays)) errors.push(`${where}: no usable turnaround`);

    if (s.active) {
      // An active service the question tree cannot reach is invisible but counted — the
      // exact failure the generated menu was built to make impossible.
      if (!Array.isArray(s.questions) || s.questions.length !== 6) {
        errors.push(`${where}: active but not routable (needs six question values)`);
      } else if (!s.questions.every(isNonEmptyString)) {
        errors.push(`${where}: active with a blank question value`);
      }
    }
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, payload, errors: [] };
};

export const readCachedMenu = (): MenuPayload | null => {
  try {
    const raw = localStorage.getItem(MENU_CACHE_KEY);
    if (!raw) return null;
    const result = validateMenuPayload(JSON.parse(raw));
    // Re-validated on the way out, not just on the way in: the rules can tighten in a
    // later build, and a cache written by an older one must not bypass them.
    return result.ok && result.payload ? result.payload : null;
  } catch {
    return null;
  }
};

export const writeCachedMenu = (payload: MenuPayload): boolean => {
  try {
    localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
};

export const menuSourceUrl = (): string | null => {
  try {
    const url = localStorage.getItem(MENU_SOURCE_URL_KEY);
    return isNonEmptyString(url) ? url : null;
  } catch {
    return null;
  }
};

/** The version identifier of the menu compiled into this bundle. */
export const BAKED_IN_VERSION = 'baked-in';

/**
 * What this kiosk should sell right now.
 *
 * Called at boot only. A menu is deliberately NOT swapped underneath a live session: a
 * customer part-way through choosing a service must not have the price move, and the
 * cheapest way to guarantee that is to change menus only when there is no session. A
 * newly published menu therefore lands at the next reload — which the update policy
 * already schedules for 04:00 and 11:00.
 */
export const resolveMenuAtBoot = (): { services: ServiceRecord[]; version: string; source: 'published' | 'baked-in' } => {
  const cached = readCachedMenu();
  if (cached) return { services: cached.services, version: cached.version, source: 'published' };
  return { services: SERVICE_MENU, version: BAKED_IN_VERSION, source: 'baked-in' };
};

/**
 * Fetch the published menu and cache it if it is good.
 *
 * Returns whether the kiosk now holds a menu DIFFERENT from the one it is running, which
 * the update policy consumes exactly like a pending bundle — same windows, same network
 * check, same idle requirement. A price change and a code change are both "the kiosk needs
 * to restart to pick this up", so they deserve one mechanism rather than two.
 */
export const refreshPublishedMenu = async (
  runningVersion: string,
  log: (message: string) => void,
): Promise<{ changed: boolean }> => {
  const url = menuSourceUrl();
  if (!url) return { changed: false };

  try {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      log(`MENU_FETCH_FAILED: HTTP ${res.status}`);
      return { changed: false };
    }
    const result = validateMenuPayload(await res.json());
    if (!result.ok) {
      // Loud, and it changes nothing. The kiosk keeps the last menu that validated, so a
      // bad publish is a non-event in the shop and a fixable message in the log.
      log(`MENU_REJECTED: ${result.errors.slice(0, 5).join('; ')}`);
      return { changed: false };
    }
    if (result.payload!.version === runningVersion) {
      log('MENU_OK: published menu matches the running one');
      return { changed: false };
    }
    if (!writeCachedMenu(result.payload!)) {
      log('MENU_CACHE_FAILED: could not store the published menu');
      return { changed: false };
    }
    log(`MENU_UPDATE: cached version ${result.payload!.version} (running ${runningVersion})`);
    return { changed: true };
  } catch (e) {
    log(`MENU_FETCH_ERROR: ${(e as Error)?.message ?? 'unknown'}`);
    return { changed: false };
  }
};
