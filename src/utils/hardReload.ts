/**
 * Reload in a way iOS cannot satisfy from cache.
 *
 * `location.reload()` is allowed to re-serve the cached document, and `reload(true)` — the
 * old force-reload — is ignored by every current browser. On an iPad that matters more
 * than usual: a kiosk added to the Home Screen runs in a separate web-app cache from
 * Safari's, and that cache is stickier. A kiosk stuck on an old bundle is exactly the case
 * where a soft reload is most likely to hand back the same old bundle — which is to say
 * the one case where it must not.
 *
 * Navigating to a URL the cache has never seen sidesteps the question. `replace` rather
 * than `assign` so a kiosk cannot accumulate history entries, and the parameter is
 * rewritten rather than appended so it cannot grow without bound.
 *
 * Shared by all three callers on purpose. The Settings panel's "Reload App" is the button
 * someone talks a shop owner through over the phone when a kiosk is stuck — the single
 * most important place for this to actually work — and the error boundary's recovery has
 * the same requirement for the same reason.
 */
export const hardReload = () => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('r', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    // URL parsing should not fail on a real page, but a reload attempt must never be the
    // thing that throws — falling back to a soft reload is strictly better than nothing.
    window.location.reload();
  }
};
