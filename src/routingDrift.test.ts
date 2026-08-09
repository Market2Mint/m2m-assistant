/**
 * GUARD: the routing CSV's legacy price/days columns must not drift from the fees sheet.
 *
 * `Kiosk v3/kiosk_routing_source.csv` carries a price and a turnaround per row. On a
 * successful join the generator IGNORES them — the sheet wins — but they are the shipped
 * values whenever a row falls off the join (a rename, a new service, a broken alias):
 * the record goes out `UNRECONCILED` carrying the CSV's numbers. A customer would then
 * be quoted a price nobody has checked since the CSV was written. This test measures
 * that gap while it is still harmless.
 *
 * The comparison is CSV row vs the generated record it produced (`serviceMenu.ts` is the
 * sheet's verified projection, and records are emitted in CSV row order — the 2026-08-09
 * reconciliation confirmed 0 price/days/maxval deltas between it and the sheet).
 *
 * ⚠️ KNOWN_DRIFT is a RATCHET, not a shrug. Every entry is a (csvName, csvPrice) variant
 * measured drifting on 2026-08-09 and awaiting Cayden's row-by-row confirmation. The
 * test fails BOTH ways: new drift appears → fix the CSV or get it confirmed here;
 * an entry stops drifting → delete it. The list must only ever shrink.
 *
 * ⚠️ DO NOT "FIX" AN ALIASED ROW'S PRICE IN THE CSV. The generator's alias table is
 * keyed on (kiosk name, kiosk price) — `('PSA Super Express', 474.00)` is HOW the Dual
 * variant finds its sheet row. Correcting the CSV to 475.00 breaks that key, the row
 * falls back to a name-only match against the BASE service, and the Dual silently ships
 * at the base price. Price corrections belong in the sheet + alias table together.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVICE_MENU } from './serviceMenu';

const CSV_PATH = resolve(__dirname, '../../Kiosk v3/kiosk_routing_source.csv');

/**
 * Verified 2026-08-09: no field in this file contains an embedded newline, so a
 * line-per-row parser is safe. Quoted fields (commas, doubled quotes) are handled.
 */
const parseCsvLine = (line: string): string[] => {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { fields.push(cur); cur = ''; }
    else cur += ch;
  }
  fields.push(cur);
  return fields;
};

interface CsvRow { category: string; name: string; price: number; days: number }

const readRoutingRows = (): CsvRow[] =>
  readFileSync(CSV_PATH, 'utf8')
    .split('\n')
    .map(parseCsvLine)
    // The generator's own row filter, replicated exactly.
    .filter(
      (p) =>
        p.length >= 7 &&
        p[0] &&
        p[6] &&
        !['what can we help', 'option 1', 'make the below'].some((s) =>
          p[0].toLowerCase().includes(s),
        ),
    )
    .map((p) => ({
      category: p[0],
      name: p[6],
      price: Number.parseFloat(p[7].replace(/[^0-9.]/g, '')),
      days: Number.parseInt(p[8].replace(/\D/g, '') || '0', 10),
    }));

/**
 * The drift measured 2026-08-09, keyed `csvName @ csvPrice`. 17 variants across 28 CSV
 * rows. Delete entries as Cayden confirms and the CSV (or alias table) is corrected.
 */
const KNOWN_DRIFT = new Set([
  'PSA Super Express @ 474',            // alias join key, sheet corrected Dual to 475.00
  'BGS Base @ 25',
  'BGS Base w/Auto @ 30',
  'SGC Standard @ 25',
  'JSA Memorabilia Certification @ 25',
  'PSA Crossover Plus @ 54.99',
  'PSA Crossover Plus @ 69.99',
  'PSA Crossover Express @ 154',
  'PSA Crossover Express @ 204',
  'PSA Reholder <$2000 @ 17.99',
  'CGC Movies & Videos @ 55',           // alias fans out to three CGC Standard Video tiers
  'CGC Movies & Videos @ 65',
  'CGC Movies & Videos @ 95',
  'CGC Vintage Comic w/Auto @ 79.99',
  'CGC High Value Comic w/Auto @ 139.99',
  'CGC Vintage Magazine w/Auto @ 79.99',
  'CGC High Value Magazine w/Auto @ 139.99',
]);

describe.skipIf(!existsSync(CSV_PATH))('routing CSV fallback columns vs the fees sheet', () => {
  it('emits records in CSV row order (the join this test depends on)', () => {
    const rows = readRoutingRows();
    expect(rows.length).toBe(SERVICE_MENU.length);
    rows.forEach((row, i) => expect(SERVICE_MENU[i].questions?.[0] ?? row.category).toBe(row.category));
  });

  it('has no drift outside the confirmed 2026-08-09 list, and no stale entries in it', () => {
    const rows = readRoutingRows();
    const drifting = new Set<string>();
    rows.forEach((row, i) => {
      const rec = SERVICE_MENU[i];
      const priceDrift = Math.abs(row.price - rec.price.customer) > 0.005;
      const daysDrift = row.days !== rec.businessDays;
      if (priceDrift || daysDrift) drifting.add(`${row.name} @ ${row.price}`);
    });

    const unexpected = [...drifting].filter((k) => !KNOWN_DRIFT.has(k));
    const resolved = [...KNOWN_DRIFT].filter((k) => !drifting.has(k));

    expect(unexpected, 'NEW drift between the routing CSV and the fees sheet — sync the CSV (or, for an aliased row, fix sheet + alias together), or get the row confirmed and added to KNOWN_DRIFT').toEqual([]);
    expect(resolved, 'these KNOWN_DRIFT entries no longer drift — delete them so the ratchet only shrinks').toEqual([]);
  });
});
