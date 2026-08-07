/**
 * WHAT THIS KIOSK IS RUNNING — in a form a person can say out loud.
 *
 * Stamped into the bundle by vite.config.ts at build time. A shop owner on the phone
 * cannot accurately read out "index-BDeGAHmo.js"; they can read out a date and seven
 * characters of hash, and that hash ties the kiosk to an exact commit.
 *
 * Declared here rather than in a global .d.ts so the fallbacks live next to the values —
 * a diagnostics panel that says "unknown" is fine; one that crashes because a define was
 * missing in a dev server is not.
 */
declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;

const read = (fn: () => string): string => {
  try {
    return fn() || 'unknown';
  } catch {
    return 'unknown';
  }
};

/** Short git hash of the commit this bundle was built from. */
export const BUILD_COMMIT = read(() => __BUILD_COMMIT__);

/** ISO timestamp of the build. */
export const BUILD_TIME = read(() => __BUILD_TIME__);

/** e.g. "Aug 7, 2026 · a1b2c3d" — the whole identity in one readable line. */
export const BUILD_LABEL = (() => {
  if (BUILD_TIME === 'unknown') return BUILD_COMMIT;
  const when = new Date(BUILD_TIME);
  if (Number.isNaN(when.getTime())) return BUILD_COMMIT;
  const date = when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${date} · ${BUILD_COMMIT}`;
})();
