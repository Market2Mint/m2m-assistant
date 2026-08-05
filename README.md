# M2M Kiosk

The tablet flow that runs on the Market 2 Mint kiosks in partner shops. React 19 + Vite +
TypeScript + Tailwind 4, deployed as a static site on Vercel.

Flow: landing → up to 6 filtering questions → matched services → cart → QR handoff to
JotForm. Payment and photo upload happen off-kiosk, in JotForm.

Originally scaffolded in AI Studio: https://ai.studio/apps/81032cfd-700c-4790-a2da-70b299e39f34

## Run locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev      # http://localhost:3000 — also served on the LAN, so you can open it on a real iPad
```

No environment variables are required. The `GEMINI_API_KEY` this file used to ask for is
gone: the AI chat it powered was removed on 2026-08-05.

**Nothing secret may go in the `define` block in `vite.config.ts`** — Vite substitutes
those values at build time, writing them literally into the public JS bundle. That is
exactly how the Gemini key leaked. Read
`Kiosk v3/M2M_KIOSK_SOFTWARE_AUDIT_2026-08-05.md` §1.1 before adding any credential to
this app, especially a payment one.

## Checks

```bash
npm run lint     # tsc --noEmit
npm test         # vitest — the pricing rules, plus drift checks against data.ts
npm run build
```

## Before you push

**The kiosks self-update.** Every device polls `/index.html` every 5 minutes and reloads
itself after 5 idle minutes when the bundle hash changes, so **a push to `main` reaches
every kiosk in the field within roughly 10 minutes, unattended.** There is no staging and
no rollback other than another push. Work on `develop`.

## Where the prices live

`src/pricing.ts` — the numbers the kiosk states out loud (pregrade, submissions-from,
shipping) and the single shipping calculation. `src/data.ts` holds the service menu as an
embedded CSV, hand-maintained against `Kiosk v3/iPad Service Menu.xlsx`.
