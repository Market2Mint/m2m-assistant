/**
 * `npm run menu` — regenerate the human-readable service menu from the data the kiosk
 * actually serves.
 *
 * The point is that it CANNOT drift. The catalogue used to live in at least three places
 * (an embedded CSV, a spreadsheet, a printed docx) with nothing reconciling them, which
 * is how an $80 gap on one SGC tier survived unnoticed. This document is generated from
 * `src/serviceMenu.ts`, so if it disagrees with the kiosk, the kiosk changed and this was
 * not re-run.
 *
 * Customer prices only. Employee/owner pricing and grader cost are never in
 * `serviceMenu.ts` and therefore can never leak into this document.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SERVICE_MENU, type ServiceRecord } from '../src/serviceMenu';
import { formatUSD, formatTurnaround } from '../src/pricing';

const OUT = new URL('../../Kiosk v3/M2M_SERVICE_MENU.md', import.meta.url);

/** One row per distinct service, not per routing path — a service can be reached several ways. */
const distinct = (records: ServiceRecord[]) => {
  const seen = new Map<string, ServiceRecord>();
  for (const r of records) {
    const key = `${r.category}::${r.name}::${r.price.customer}`;
    if (!seen.has(key)) seen.set(key, r);
  }
  return [...seen.values()];
};

const rows = distinct(SERVICE_MENU);
const categories = [...new Set(rows.map((r) => r.category))];

const out: string[] = [];
out.push('# M2M SERVICE MENU');
out.push('');
out.push('**GENERATED — do not edit by hand.** Run `npm run menu` in `kiosk-app/`.');
out.push('');
out.push(
  'This is what the kiosks serve, read straight out of `kiosk-app/src/serviceMenu.ts`. ' +
    'Customer prices only: employee and owner pricing never enters the kiosk bundle, so it ' +
    'cannot appear here either.',
);
out.push('');
out.push(
  `**${rows.filter((r) => r.active).length} active · ` +
    `${rows.filter((r) => !r.active).length} retired or suspended · ` +
    `${rows.filter((r) => r.questions === null).length} not yet reachable in the question flow.**`,
);
out.push('');
out.push(
  'Turnarounds are estimates and are shown to customers with a `~`. They begin when the ' +
    'grader receives the item, not when the customer hands it over.',
);
out.push('');

for (const category of categories) {
  const inCategory = rows.filter((r) => r.category === category);
  out.push(`## ${category}`);
  out.push('');
  out.push('| Service | Customer | Turnaround | Max insured | Status |');
  out.push('|---|---:|---:|---:|---|');
  for (const r of inCategory) {
    const name = r.active ? r.name : `~~${r.name}~~`;
    // Deliberately no "notes" column. The pricing sheet's notes carry M2M's cost basis
    // and dealer discounts ("BGS list $124.95 × 0.85 dealer discount") — internal, and
    // they must not travel with the menu.
    const reachable = r.questions === null ? ' ⚠️ no route' : '';
    out.push(
      `| ${name} | ${formatUSD(r.price.customer)} | ${formatTurnaround(r.businessDays)} | ` +
        `${r.maxInsuredValue} | ${r.status}${reachable} |`,
    );
  }
  out.push('');
}

writeFileSync(OUT, out.join('\n'));
console.log(`wrote ${fileURLToPath(OUT)} — ${rows.length} services across ${categories.length} categories`);
