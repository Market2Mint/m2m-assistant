import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
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
    },
  };
});
