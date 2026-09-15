import { describe, expect, it } from 'vitest';
import { ACTIVE_SERVICES, SERVICE_MENU, copyFor, type ServiceRecord } from './serviceMenu';

/**
 * Phase 2 restructured the menu against the corrected pricing sheet. These assertions
 * pin the parts that changed, because "the menu is data now" only helps if a wrong edit
 * to that data fails loudly. Each one describes a rule someone told us, not a number
 * someone happened to type.
 */

const byName = (name: string): ServiceRecord[] => SERVICE_MENU.filter((s) => s.name === name);
const activeNamed = (name: string) => ACTIVE_SERVICES.filter((s) => s.name === name);
const uniqueActive = (predicate: (s: ServiceRecord) => boolean) =>
  [...new Set(ACTIVE_SERVICES.filter(predicate).map((s) => s.name))].sort();

const priceOf = (name: string) => {
  const rows = activeNamed(name);
  expect(rows.length, `${name} is not active in the menu`).toBeGreaterThan(0);
  return rows[0];
};

describe('SGC is two tiers, each with a pack-pulled autograph variant', () => {
  it('offers exactly the four SGC card services', () => {
    // Scoped to Trading Cards 2026-08-20: SGC gained four Crossover services that day,
    // and they live under the Crossover category with their own pins (the speed ladders
    // and the crossover routing walk) — this test pins the CARD ladder.
    expect(uniqueActive((s) => s.category === 'Trading Cards' && s.name.startsWith('SGC'))).toEqual([
      'SGC Expedited', 'SGC Expedited w/Auto', 'SGC Standard', 'SGC Standard w/Auto',
    ]);
  });

  it('prices the base tiers at $60.00 / ~75 days and $175.00 / ~15 days', () => {
    // SGC Standard repriced $25.00 -> $60.00 on 2026-09-09 (SGC's cost moved 15 -> 50;
    // Cayden's margin rule, customer = cost + 10). Expedited unchanged.
    expect(priceOf('SGC Standard').price.customer).toBe(60.0);
    expect(priceOf('SGC Standard').businessDays).toBe(75);
    expect(priceOf('SGC Expedited').price.customer).toBe(175.0);
    expect(priceOf('SGC Expedited').businessDays).toBe(15);
  });

  it('charges nothing extra and adds no time for the autograph', () => {
    // Genuinely identical to the base service. Without the disclosure below, these read
    // as duplicate rows and someone will "fix" one of them.
    expect(priceOf('SGC Standard w/Auto').price.customer).toBe(60.0);
    expect(priceOf('SGC Standard w/Auto').businessDays).toBe(75);
    expect(priceOf('SGC Expedited w/Auto').price.customer).toBe(175.0);
    expect(priceOf('SGC Expedited w/Auto').businessDays).toBe(15);
  });

  it('carries the grade-10 disclosure in the DESCRIPTION, not buried in the details', () => {
    // Moved 2026-08-07 on Cayden's instruction. These two are identical to their base
    // service in price, turnaround AND insured value, so the description was the only
    // thing on screen that could tell them apart — and it was a verbatim copy of the
    // base's. The explanation has to be the first thing read, not a footnote.
    for (const name of ['SGC Standard w/Auto', 'SGC Expedited w/Auto']) {
      expect(copyFor(name).description, `${name} is missing the grade-10 disclosure`)
        .toMatch(/only if the card itself grades a 10/i);
    }
  });

  it('does not read as a duplicate of its base service', () => {
    // The actual requirement. If a w/Auto description ever becomes a straight copy of its
    // base again, two rows at the same price with the same turnaround appear on screen
    // with nothing to choose between them, and someone deletes one.
    for (const [variant, base] of [
      ['SGC Standard w/Auto', 'SGC Standard'],
      ['SGC Expedited w/Auto', 'SGC Expedited'],
    ]) {
      expect(copyFor(variant).description, `${variant} still copies ${base}`)
        .not.toBe(copyFor(base).description);
    }
  });

  it('says aftermarket autographs are not accepted', () => {
    for (const name of ['SGC Standard w/Auto', 'SGC Expedited w/Auto']) {
      expect(copyFor(name).details, `${name} does not exclude aftermarket`)
        .toMatch(/aftermarket/i);
    }
  });
});

describe('CGC and SGC accept pack-pulled autographs', () => {
  it('offers all six CGC card services', () => {
    expect(uniqueActive((s) => s.category === 'Trading Cards' && s.name.startsWith('CGC'))).toEqual([
      'CGC Economy', 'CGC Economy w/Auto', 'CGC Express', 'CGC Express w/Auto',
      'CGC Standard', 'CGC Standard w/Auto',
    ]);
  });

  it('prices each CGC autograph variant at base +$5.00 and +5 days', () => {
    for (const [base, auto] of [['CGC Economy', 'CGC Economy w/Auto'],
                                ['CGC Standard', 'CGC Standard w/Auto'],
                                ['CGC Express', 'CGC Express w/Auto']]) {
      expect(priceOf(auto).price.customer).toBeCloseTo(priceOf(base).price.customer + 5, 2);
      expect(priceOf(auto).businessDays).toBe(priceOf(base).businessDays + 5);
    }
  });

  it('accepts pack-pulled 1999-or-newer only — never aftermarket, never pre-1999', () => {
    const autos = ACTIVE_SERVICES.filter(
      (s) => s.category === 'Trading Cards' &&
             /^(CGC|SGC)/.test(s.name) && /w\/Auto$/.test(s.name),
    );
    expect(autos.length).toBe(5);
    for (const s of autos) {
      expect(s.questions?.[2], `${s.name} should require an autograph`).toBe('Yes');
      expect(s.questions?.[3], `${s.name} must be pack-pulled only`).toBe('Pack-pulled');
      expect(s.questions?.[4], `${s.name} must be 1999-newer only`).toBe('1999 - Newer Only');
    }
  });
});

describe('retired services are kept as history, not deleted', () => {
  // PSA suspended the Value tiers. The rows stay so the menu still explains what a
  // customer was quoted last month. BGS Base, Standard and Crossover (+ w/Auto) left this
  // list 2026-09-12: BGS is offering them again and Cayden un-retired all six at their
  // original prices, costs and turnarounds — see 'BGS Base and Standard are back' below.
  const retired = [
    'PSA Value Bulk', 'PSA Vintage & Value', 'PSA Value & Vintage Dual',
    'PSA Value Plus', 'PSA Value Plus Dual', 'PSA Value Max', 'PSA Max Dual',
    'PSA Crossover Plus Card Only', 'PSA Crossover Plus Dual',
  ];

  it.each(retired)('%s is present but inactive', (name) => {
    const rows = byName(name);
    expect(rows.length, `${name} is missing from the menu entirely`).toBeGreaterThan(0);
    for (const r of rows) expect(r.active, `${name} is still active`).toBe(false);
  });

  it('retires exactly the 9 the sheet greys out', () => {
    expect(uniqueActive(() => true).length).toBeGreaterThan(0);
    const inactive = [...new Set(SERVICE_MENU.filter((s) => !s.active).map((s) => s.name))];
    expect(inactive.sort()).toEqual([...retired].sort());
  });
});

describe('event tickets are a speed ladder, not an autograph ladder', () => {
  it('offers four PSA tickets at the sheet prices', () => {
    expect(uniqueActive((s) => s.name.startsWith('PSA') && s.name.includes('Ticket'))).toEqual([
      'PSA Express Ticket', 'PSA Priority Ticket', 'PSA Super Express Ticket', 'PSA Value Ticket',
    ]);
    expect(priceOf('PSA Value Ticket').price.customer).toBe(49.99);
    expect(priceOf('PSA Priority Ticket').price.customer).toBe(84.99);
    expect(priceOf('PSA Express Ticket').price.customer).toBe(159.0);
    expect(priceOf('PSA Super Express Ticket').price.customer).toBe(310.0);
  });

  it('adds the two BGS tickets', () => {
    expect(priceOf('BGS Base Ticket').price.customer).toBe(40.0);
    expect(priceOf('BGS Base Ticket Dual').price.customer).toBe(55.0);
  });

  it('never asks a PSA ticket customer about autographs', () => {
    // PSA's ticket ladder no longer varies by signature. Its rows skip the autograph
    // question so the question is not asked at all — rather than offering a "Yes" that
    // matches nothing, which is how a customer reaches "No Matches Found".
    for (const r of activeNamed('PSA Value Ticket')) {
      expect(r.questions?.[2].toLowerCase()).toBe('skip question');
    }
  });

  it('dropped the old PSA Ticket w/Auto', () => {
    expect(byName('PSA Ticket w/Auto')).toEqual([]);
    expect(byName('PSA Ticket')).toEqual([]);
  });
});

describe('comics and magazines are split, and priced per format', () => {
  const tiers = ['Modern', 'Vintage', 'High Value'];

  it.each(['Comic', 'Magazine'])('offers all six PSA %s tiers', (format) => {
    for (const tier of tiers) {
      expect(activeNamed(`PSA ${tier} ${format}`).length).toBeGreaterThan(0);
      expect(activeNamed(`PSA ${tier} ${format} Dual`).length).toBeGreaterThan(0);
    }
  });

  it.each(['Comic', 'Magazine'])('offers all six CGC %s tiers', (format) => {
    for (const tier of tiers) {
      expect(activeNamed(`CGC ${tier} ${format}`).length).toBeGreaterThan(0);
      expect(activeNamed(`CGC ${tier} ${format} w/Auto`).length).toBeGreaterThan(0);
    }
  });

  it('prices PSA Modern at the raised $44.99, not the old $34.99', () => {
    // Raised deliberately to clear the employee margin floor. If this ever reads 34.99
    // again, the old CSV has come back.
    expect(priceOf('PSA Modern Comic').price.customer).toBe(44.99);
    expect(priceOf('PSA Modern Magazine').price.customer).toBe(44.99);
  });

  it('dropped the old era-named services and the pressing modifiers', () => {
    for (const name of ['1975 - Newer', '1974 - Older', "High Value (All Era's)",
                        "High Value All Era's", "Super Express (All Era's)",
                        "Walk-Through (All Era's)"]) {
      expect(byName(name), `${name} should be gone`).toEqual([]);
    }
  });
});

describe('BGS Priority is live', () => {
  it('offers both variants at the sheet prices and turnarounds', () => {
    expect(priceOf('BGS Priority').price.customer).toBe(150.0);
    expect(priceOf('BGS Priority').businessDays).toBe(20);
    expect(priceOf('BGS Priority w/Auto').price.customer).toBe(155.0);
    expect(priceOf('BGS Priority w/Auto').businessDays).toBe(25);
  });

  it('sits at the top of the full four-rung BGS card ladder again', () => {
    // Was ['BGS Express', 'BGS Express w/Auto', 'BGS Priority', 'BGS Priority w/Auto']
    // while Base and Standard were retired (2026-08 .. 2026-09-12).
    expect(uniqueActive((s) => s.category === 'Trading Cards' && s.name.startsWith('BGS')))
      .toEqual(['BGS Base', 'BGS Base w/Auto', 'BGS Express', 'BGS Express w/Auto',
                'BGS Priority', 'BGS Priority w/Auto', 'BGS Standard', 'BGS Standard w/Auto']);
  });
});

describe('BGS Base and Standard are back (Cayden 2026-09-12), at their original figures', () => {
  // BGS un-retired the tiers. The sheet rows lost their "TEMPORARILY UNAVAILABLE" suffix
  // and status; no price, cost or turnaround moved. Cost is still BGS list x 0.85.
  const ladder = (path: string[]) =>
    ACTIVE_SERVICES
      .filter((s) => s.name.startsWith('BGS') && s.questions?.slice(0, path.length).join('>') === path.join('>'))
      .sort((a, b) => a.price.customer - b.price.customer)
      .map((s) => [s.name, s.price.customer, s.businessDays] as const);

  it('Trading Cards -> BGS -> No offers four tiers, cheapest first: 25 / 40 / 85 / 150', () => {
    expect(ladder(['Trading Cards', 'BGS', 'No'])).toEqual([
      ['BGS Base', 25.0, 95], ['BGS Standard', 40.0, 45], ['BGS Express', 85.0, 30], ['BGS Priority', 150.0, 20],
    ]);
  });

  it('the pack-pulled 1999-Newer autograph path offers four: 30 / 45 / 90 / 155', () => {
    expect(ladder(['Trading Cards', 'BGS', 'Yes', 'Pack-pulled', '1999 - Newer Only'])).toEqual([
      ['BGS Base w/Auto', 30.0, 100], ['BGS Standard w/Auto', 45.0, 50],
      ['BGS Express w/Auto', 90.0, 35], ['BGS Priority w/Auto', 155.0, 25],
    ]);
  });

  it('Crossover -> BGS offers three on both No variations: 40 / 85 / 150', () => {
    for (const variation of ['Card Grade Only', 'Authenticate Only']) {
      const rows = ACTIVE_SERVICES
        .filter((s) => s.category === 'Crossover' && s.questions?.[1] === 'BGS' && s.questions?.[2] === 'No' && s.questions?.[5] === variation)
        .sort((a, b) => a.price.customer - b.price.customer)
        .map((s) => [s.name, s.price.customer, s.businessDays] as const);
      expect(rows, variation).toEqual([
        ['BGS Crossover', 40.0, 45], ['BGS Crossover Express', 85.0, 30], ['BGS Crossover Priority', 150.0, 20],
      ]);
    }
    expect(ladder(['Crossover', 'BGS', 'Yes'])).toEqual([
      ['BGS Crossover w/Auto', 45.0, 50], ['BGS Crossover Express w/Auto', 90.0, 35], ['BGS Crossover Priority w/Auto', 155.0, 25],
    ]);
  });

  it('max declared value and status come from the sheet', () => {
    expect(priceOf('BGS Base').maxInsuredValue).toBe('$500.00');
    // $500.00 on every BGS grading service (Cayden 2026-09-12): insured value is $500.00
    // unless the customer asks and pays for more. Was $2,000.00 on Standard, NA on Crossover.
    expect(priceOf('BGS Standard').maxInsuredValue).toBe('$500.00');
    expect(priceOf('BGS Crossover').maxInsuredValue).toBe('$500.00');
    for (const s of ACTIVE_SERVICES.filter((s) => s.name.startsWith('BGS') && (s.category === 'Trading Cards' || s.category === 'Crossover'))) {
      expect(s.maxInsuredValue, s.name).toBe('$500.00');
    }
    for (const n of ['BGS Base', 'BGS Base w/Auto', 'BGS Standard', 'BGS Standard w/Auto', 'BGS Crossover', 'BGS Crossover w/Auto']) {
      expect(priceOf(n).status).toBe('NEW / CHANGED');
    }
  });
});

describe('oversized is a modifier, not four extra services', () => {
  it('never appears as a menu entry', () => {
    expect(SERVICE_MENU.filter((s) => /oversized/i.test(s.name))).toEqual([]);
  });

  it('offers +$10.00 on every BGS card service', () => {
    const bgsCards = ACTIVE_SERVICES.filter(
      (s) => s.category === 'Trading Cards' && s.name.startsWith('BGS'),
    );
    expect(bgsCards.length).toBeGreaterThan(0);
    for (const s of bgsCards) {
      expect(s.oversizedSurcharge, `${s.name} should accept an oversized card`).toBe(10);
    }
  });

  it('follows BGS Base and Standard into retirement, so it returns with them', () => {
    // The whole reason this is a modifier and not four records: when BGS un-retires
    // Base and Standard, oversized has to come back with them without anyone editing
    // a second list.
    for (const name of ['BGS Base', 'BGS Standard', 'BGS Base w/Auto', 'BGS Standard w/Auto']) {
      const rows = byName(name);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r.oversizedSurcharge, `${name}`).toBe(10);
    }
  });

  it('is offered by no other grader', () => {
    const others = ACTIVE_SERVICES.filter(
      (s) => s.oversizedSurcharge !== null && !s.name.startsWith('BGS'),
    );
    expect(others.map((s) => s.name)).toEqual([]);
  });

  it('is not offered on BGS services outside trading cards', () => {
    for (const s of ACTIVE_SERVICES.filter((s) => s.category !== 'Trading Cards')) {
      expect(s.oversizedSurcharge, `${s.name} should not offer oversized`).toBeNull();
    }
  });
});

describe('services whose price is only a floor', () => {
  // JSA, PSA/DNA and (since 2026-09-10) the two BAS services are assessed per item AFTER
  // the order, so $25.00 is a deposit, not a price. The flag is what drives every
  // disclosure — results screen, cart line, order total and the shop's copy of the order.
  // If a menu regeneration ever drops it, all four go silent at once and the customer's
  // first hint is a second invoice. The flag comes from the word "minimum" in the sheet's
  // NOTES, so a NOTES edit that loses the word fails here rather than on a kiosk.
  const MINIMUM_PRICED = [
    'BAS Autograph Authentication',
    'BAS Card Autograph Authentication',
    'JSA Authentication',
    'PSA/DNA Memorabilia Certification',
  ];

  it('flags JSA, PSA/DNA and both BAS services, and nothing else', () => {
    const minimums = uniqueActive((s) => s.priceIsMinimum);
    expect(minimums).toEqual(MINIMUM_PRICED);
  });

  it('prices all four at the $25.00 minimum', () => {
    for (const name of MINIMUM_PRICED) {
      const svc = ACTIVE_SERVICES.find((s) => s.name === name)!;
      expect(svc.price.customer, name).toBe(25.0);
    }
  });
});

describe('every active service has a description', () => {
  // 25 services accumulated with blank descriptions (measured 2026-08-21) because each
  // newly added tier arrived without copy and nothing failed. Two traps this guard is
  // built around: (1) iterate ACTIVE_SERVICES and look each up — 14 of the 25 had NO
  // SERVICE_COPY key at all, so iterating the map reports zero problems while services
  // render nothing; (2) copy flows donor -> variant only, via the generator's base-name
  // fallback — see build_service_menu.py for the direction rule and its history.
  it('renders no active service with an empty or missing description', () => {
    for (const s of ACTIVE_SERVICES) {
      expect(copyFor(s.name).description, `${s.name} renders with no description`).not.toBe('');
    }
  });
});

describe('PSA Standard went live 2026-09-12 (Cayden GO), card only, on every single-card PSA path', () => {
  // PSA's new Standard tier: list $59.99 -> M2M cost 47.99 (the 20% dealer discount on
  // new service levels, J. Searls 2026-09-10) -> customer $64.99, ~100 business days,
  // $1,000 max declared value. Held in the sheet from 2026-09-10 and activated by
  // Kiosk v3/staged/psa_standard/activate.py (the two "No" rows), then widened the same
  // day on Cayden's ruling: "the option for the PSA Standard should pop up with all of
  // the non dual submissions" — so it also rides the Pack-pulled / 1999 - Newer paths,
  // exactly where PSA Priority's single-card rows are. It never appears where the Dual
  // ladder shows (Aftermarket, and any "Either" path).
  //
  // 2026-09-14 (Cayden): PSA added a Dual to the Standard tier — PSA Standard Dual,
  // $84.99, ~110 business days, $1,000 max declared value, cost 63.99. It rides EXACTLY
  // the paths PSA Priority Dual rides (autographed only) and nowhere else. Still no
  // Crossover variant on the CARD paths — the Crossover category has its own Standard since 2026-09-15.
  // ⚠ $84.99 on a $63.99 cost is IDENTICAL to PSA Priority: every assertion below keys
  // on the NAME, never on the figure.
  const rows = activeNamed('PSA Standard');
  const regularSinglePaths = activeNamed('PSA Priority').map((r) => r.questions?.join(' > ')).sort();

  it('is priced and timed off the sheet on every path it appears on', () => {
    expect(rows.length).toBe(4);
    for (const r of rows) {
      expect(r.category).toBe('Trading Cards');
      expect(r.questions?.slice(0, 2)).toEqual(['Trading Cards', 'PSA']);
      expect(r.price.customer).toBe(64.99);
      expect(r.businessDays).toBe(100);
      expect(r.maxInsuredValue).toBe('$1,000.00');
      expect(r.status).toBe('NEW / CHANGED');
      expect(r.priceIsMinimum).toBe(false);
    }
  });

  it('rides exactly the same question paths as the single-card PSA Priority', () => {
    // Priority is the reference rung: wherever a customer sees PSA Priority (not Priority
    // Dual), they must also see Standard. This pins Cayden's rule rather than a list.
    expect(rows.map((r) => r.questions?.join(' > ')).sort()).toEqual(regularSinglePaths);
    expect(regularSinglePaths).toEqual([
      'Trading Cards > PSA > No > Skip Question > Skip Question > Authenticate Only',
      'Trading Cards > PSA > No > Skip Question > Skip Question > Card Grade Only',
      'Trading Cards > PSA > Yes > Pack-pulled > 1999 - Newer > Authenticate Card Only',
      'Trading Cards > PSA > Yes > Pack-pulled > 1999 - Newer > Card Grade Only',
    ]);
  });

  it('never shows where the Dual ladder shows; its Crossover variant lives ONLY under Crossover', () => {
    // 2026-09-15 (Cayden): PSA opened the Standard tier to crossovers, so PSA Crossover
    // Standard now EXISTS — under the Crossover category, mirroring the card figures, never
    // on a Trading Cards path. The card-side rule below is unchanged.
    const xover = byName('PSA Crossover Standard');
    expect(xover.length).toBe(4);
    for (const r of xover) expect(r.category).toBe('Crossover');
    expect(ACTIVE_SERVICES.filter((s) => s.category === 'Trading Cards' && s.name.includes('Crossover'))).toEqual([]);
    const dualPaths = new Set(activeNamed('PSA Priority Dual').map((r) => r.questions?.join(' > ')));
    expect(dualPaths.size).toBeGreaterThan(0);
    for (const r of rows) expect(dualPaths.has(r.questions?.join(' > ') ?? '')).toBe(false);
    for (const r of rows) expect(r.questions?.[3]).not.toBe('Aftermarket');
  });

  it('has a Dual that rides exactly the PSA Priority Dual paths, priced and timed off the sheet', () => {
    // Added 2026-09-14. Autographed paths only: the same four rows Priority Dual sits on,
    // no single-card path, no Crossover. Cheapest and slowest rung of the Dual ladder.
    const dual = activeNamed('PSA Standard Dual');
    expect(dual.length).toBe(4);
    for (const r of dual) {
      expect(r.category).toBe('Trading Cards');
      expect(r.price.customer).toBe(84.99);
      expect(r.businessDays).toBe(110);
      expect(r.maxInsuredValue).toBe('$1,000.00');
      expect(r.status).toBe('NEW / CHANGED');
      expect(r.questions?.[2]).toBe('Yes');
    }
    const priorityDualPaths = activeNamed('PSA Priority Dual').map((r) => r.questions?.join(' > ')).sort();
    expect(dual.map((r) => r.questions?.join(' > ')).sort()).toEqual(priorityDualPaths);
    expect(priorityDualPaths).toEqual([
      'Trading Cards > PSA > Yes > Aftermarket > Either > Auth Card & Auto Only',
      'Trading Cards > PSA > Yes > Aftermarket > Either > Card Grade Only',
      'Trading Cards > PSA > Yes > Either > Either > Autograph Grade Only',
      'Trading Cards > PSA > Yes > Either > Either > Card & Autograph Grade',
    ]);
    for (const path of priorityDualPaths) {
      const rung = ACTIVE_SERVICES.filter(
        (s) => s.category === 'Trading Cards' && s.name.startsWith('PSA') && s.questions?.join(' > ') === path,
      );
      expect([...rung].sort((a, b) => a.price.customer - b.price.customer)[0].name).toBe('PSA Standard Dual');
      expect([...rung].sort((a, b) => b.businessDays - a.businessDays)[0].name).toBe('PSA Standard Dual');
    }
    expect(priceOf('PSA Priority Dual').price.customer).toBe(109.99);
    expect(copyFor('PSA Standard Dual').description).toContain('110 business days');
    expect(copyFor('PSA Standard Dual').description).toContain('$1,000');
  });

  it('is the cheapest and slowest rung of the PSA card ladder, below an unchanged Priority', () => {
    for (const path of regularSinglePaths) {
      const rung = ACTIVE_SERVICES.filter(
        (s) => s.category === 'Trading Cards' && s.name.startsWith('PSA') && s.questions?.join(' > ') === path,
      );
      expect([...rung].sort((a, b) => a.price.customer - b.price.customer)[0].name).toBe('PSA Standard');
      expect([...rung].sort((a, b) => b.businessDays - a.businessDays)[0].name).toBe('PSA Standard');
    }
    expect(priceOf('PSA Priority').price.customer).toBe(84.99);
    expect(priceOf('PSA Priority').businessDays).toBe(80);
    expect(copyFor('PSA Standard').description).toContain('100 business days');
  });
});
