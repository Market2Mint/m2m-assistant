/**
 * EVERY user-facing string on the landing (attract) screen, in ONE object.
 *
 * Spanish is DEFERRED, not cancelled (Cayden 2026-08-08). The approved mockup
 * (`Kiosk v3/kiosk_attract_messi_2026-08-07.html`) carries a complete EN/ES dictionary;
 * when the toggle is built, it becomes a second object of this exact shape and a
 * `dict[key]` lookup — a wiring job, not a rewrite. That is the entire reason no copy
 * may live inline in `renderLanding()`'s JSX.
 *
 * ⚠️ NO MONEY IN THIS FILE. Every figure on the landing screen comes from `pricing.ts`
 * (`landingPregradePrice`, `SUBMISSION_FROM_PRICE`, `SHIPPING_AND_INSURANCE`) — a
 * literal "$7.00" here would break card-show mode, which quotes $5.00.
 * `landingStrings.test.ts` fails on any `$<digit>` in this object.
 *
 * Copy is LOCKED per 00_HOME_PAGE_DESIGN_RECORD_2026-08-08.md §4. Do not edit wording
 * here without Cayden's sign-off; in particular `RECOMMENDED` stays.
 */
export const LANDING = {
  tagline: 'YOUR CARDS. OUR PASSION.',

  // Headline renders as two lines; the middle segment is the green accent.
  h1Line1: 'WE GET YOUR CARDS',
  h1Green: 'PROFESSIONALLY',
  h1Tail: ' GRADED.',
  sub: 'We prepare and submit your cards, and return them encapsulated with an official grade.',

  chips: [
    { label: '60,000+ Items Submitted', caption: 'packed, insured and submitted for you' },
    { label: 'Secure & Insured', caption: 'every order, end to end' },
    { label: 'Market2Mint Dashboard', caption: 'live status on every card' },
  ],

  pregrade: {
    label: 'PREGRADE',
    pill: 'RECOMMENDED', // locked — Cayden declined "START HERE IF UNSURE"; do not re-raise
    perUnit: 'PER CARD',
    copyStrong: 'Know before you commit.',
    copyRest:
      ' We evaluate centering, corners, edges, and surface for a projected grade — before you pay for grading.',
    // Centering · Corners · Edges · Surface — the four things a pregrade scores.
    meterLabel: 'C · C · E · S',
    cta: 'START A PREGRADE',
  },

  submission: {
    label: 'FULL SUBMISSION',
    from: 'From',
    perUnit: 'PER ITEM', // item, not card — the menu sells comics, tickets, packs, memorabilia
    copy: 'Graded, authenticated and encapsulated. You choose the company and the service at the next step.',
    cta: 'START A SUBMISSION',
  },

  ship: {
    // Rendered after the green formatUSD(SHIPPING_AND_INSURANCE) figure. The test
    // asserts figure + ' ' + tail === SHIPPING_DISCLOSURE, so this can never drift
    // from the canonical $24-once-per-order ruling.
    tail: 'covers your whole order, however many cards.',
    labelA: 'SHIPPING & INSURANCE',
    labelB: 'ONE TIME PER ORDER',
  },

  proof: {
    label: 'OFFICIAL SUBMISSION CENTER FOR',
    // TYPE, never logos — partner rights are uncleared in writing.
    partners: ['PSA', 'BGS', 'CGC', 'SGC', 'JSA', 'MBA'],
  },

  how: {
    headLine1: 'HOW IT',
    headLine2: 'WORKS',
    // Descriptions stay under ~42 characters so all four steps hold one line each
    // (design record §4). The test enforces it.
    steps: [
      { title: 'PLACE YOUR ORDER', desc: 'Give your order to the shop attendant.' },
      { title: 'WE EVALUATE', desc: 'We pregrade or prepare your cards.' },
      { title: 'WE SUBMIT', desc: 'To all major grading companies.' },
      { title: 'YOU RECEIVE', desc: 'Your graded cards back, protected.' },
    ],
  },

  tickerTag: 'RECENT GRADES',

  footer: {
    links: [
      { modal: 'terms', label: 'Terms of Use' },
      { modal: 'privacy', label: 'Privacy Policy' },
      { modal: 'submission', label: 'Submission Policy' },
    ] as const,
    video: 'HOW IT WORKS',
    // Renders as two lines: "SCAN TO TRACK / YOUR ORDER", SCAN emphasised.
    qr: { strong: 'SCAN', line1Rest: ' TO TRACK', line2: 'YOUR ORDER' },
  },
} as const;

/**
 * ── TICKER — SAMPLE DATA, and the wiring point for the dashboard feed. ──
 *
 * Ruling (Cayden 2026-08-08): the RECENT GRADES ticker goes DATA-DRIVEN from the
 * market2mint.net dashboard — it must stop inventing plausible grades on a public
 * terminal. This constant is the seed/fallback; the feed replaces the ARRAY, nothing
 * else. Shape stays `{ grade, card }`.
 *
 * 🔴 NEVER a customer name here. Card, grade and company only — consent to grade a
 * card is not consent to display who owns it. `landingStrings.test.ts` cannot check
 * intent, so this rule rides on whoever wires the feed: filter to those two fields at
 * the source.
 */
export interface TickerEntry {
  grade: string; // e.g. "PSA 10"
  card: string; //  e.g. "2018 Topps Update Ohtani RC"
}

export const TICKER_SAMPLE: readonly TickerEntry[] = [
  { grade: 'PSA 10', card: '2026 Prizm World Cup Lionel Messi Auto' },
  { grade: 'PSA 10', card: '2023 Prizm Victor Wembanyama RC' },
  { grade: 'BGS 9.5', card: '2020 Select Justin Herbert RC' },
  { grade: 'PSA 9', card: '1999 Pokémon Game Charizard Holo' },
  { grade: 'CGC 9.8', card: 'Amazing Spider-Man #300' },
  { grade: 'PSA 10', card: '2018 Topps Update Ohtani RC' },
  { grade: 'SGC 10', card: '1986 Fleer Michael Jordan RC' },
  { grade: 'PSA 10', card: '2025 One Piece Promo Monkey D. Luffy' },
];
