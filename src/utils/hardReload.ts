/**
 * Reload in a way iOS cannot satisfy from cache.
 *
 * `location.reload()` is allowed to re-serve the cached document, and `reload(true)` — the
 * old force-reload — is ignored by every current browser.
 *
 * ⚠️ I first justified this by a Home-Screen-cache theory. **Cayden disproved it on
 * 2026-08-07**: index.html is served `max-age=0, must-revalidate` with an ETag, and a
 * conditional request correctly returns 304. Revalidation works. The browser cannot hand
 * back a stale document without asking the server first.
 *
 * So this is belt-and-braces, not a fix for a known fault. It is kept because it is
 * strictly no worse than a soft reload, and because it stops depending on a cache header
 * staying correct forever — a header is a deployment setting someone can change without
 * ever thinking about these kiosks.
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
