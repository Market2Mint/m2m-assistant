import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'node:child_process';
import {defineConfig} from 'vite';

/**
 * Build identity, stamped at build time.
 *
 * A shop owner on the phone needs to be able to read out what their kiosk is running, and
 * a hashed asset filename ("index-BDeGAHmo.js") is not something anyone says out loud
 * accurately. A date plus a short commit hash is, and the hash ties a kiosk to an exact
 * line of the repo.
 *
 * Both are read from git at build time and fall back rather than throwing: a build that
 * fails because git is unavailable would be a self-inflicted outage, and "unknown" in a
 * diagnostics panel is a perfectly good answer.
 */
const gitShort = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'nogit';
  }
};

export default defineConfig(() => {
  return {
    define: {
      // Literal values substituted into the bundle. Public by definition — a commit hash
      // and a date are exactly the kind of thing that is safe here, unlike the API key
      // this block used to carry.
      __BUILD_COMMIT__: JSON.stringify(gitShort()),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [react(), tailwindcss()],
    // NOTHING GOES IN `define` THAT IS NOT PUBLIC. Vite substitutes these at BUILD time,
    // writing the literal value into the JS bundle that every kiosk downloads — so a
    // secret put here is readable by anyone who opens the deployed site. This block used
    // to carry GEMINI_API_KEY and leaked it exactly that way. The AI chat it powered was
    // removed on 2026-08-05, so the key is no longer needed at all.
    // Before adding a Square (or any payment) credential to this app, read
    // Kiosk v3/M2M_KIOSK_SOFTWARE_AUDIT_2026-08-05.md §1.1 — the same pattern would leak
    // it, and that is a materially worse day.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Dev server only — no effect on `npm run build` or on anything the kiosks run.
      // It lets you open `npm run dev` on a real iPad via the Mac's Bonjour name
      // (http://<mac-name>.local:3000) instead of its IP, which DHCP changes without
      // warning. Vite blocks non-IP Host headers by default.
      allowedHosts: ['.local'],
    },
    // `preview` serves the real production build from dist/. It is a SEPARATE config block
    // from `server` above — the dev allowance does not apply to it — and it is what you
    // want on an actual iPad before a deploy, because the dev server differs from what a
    // kiosk runs in ways that matter: unminified bundle, HMR injected, and React StrictMode
    // double-invoking effects. Checking a shippable build on the dev server is checking
    // something else.
    preview: {
      allowedHosts: ['.local'],
    },
  };
});
