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
  it('offers exactly the four SGC services', () => {
    expect(uniqueActive((s) => s.name.startsWith('SGC'))).toEqual([
      'SGC Expedited', 'SGC Expedited w/Auto', 'SGC Standard', 'SGC Standard w/Auto',
    ]);
  });

  it('prices the base tiers at $25.00 / ~75 days and $175.00 / ~15 days', () => {
    expect(priceOf('SGC Standard').price.customer).toBe(25.0);
    expect(priceOf('SGC Standard').businessDays).toBe(75);
    expect(priceOf('SGC Expedited').price.customer).toBe(175.0);
    expect(priceOf('SGC Expedited').businessDays).toBe(15);
  });

  it('charges nothing extra and adds no time for the autograph', () => {
    // Genuinely identical to the base service. Without the disclosure below, these read
    // as duplicate rows and someone will "fix" one of them.
    expect(priceOf('SGC Standard w/Auto').price.customer).toBe(25.0);
    expect(priceOf('SGC Standard w/Auto').businessDays).toBe(75);
    expect(priceOf('SGC Expedited w/Auto').price.customer).toBe(175.0);
    expect(priceOf('SGC Expedited w/Auto').businessDays).toBe(15);
  });

  it('discloses that the autograph grade only lands on a card that grades a 10', () => {
    for (const name of ['SGC Standard w/Auto', 'SGC Expedited w/Auto']) {
      expect(copyFor(name).details, `${name} is missing the grade-10 disclosure`)
        .toMatch(/only applied to the label if the card itself grades a 10/i);
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
  // BGS retired Base and Standard; PSA suspended the Value tiers. The rows stay so the
  // menu still explains what a customer was quoted last month.
  const retired = [
    'BGS Base', 'BGS Base w/Auto', 'BGS Standard', 'BGS Standard w/Auto',
    'BGS Crossover', 'BGS Crossover w/Auto',
    'PSA Value Bulk', 'PSA Vintage & Value', 'PSA Value & Vintage Dual',
    'PSA Value Plus', 'PSA Value Plus Dual', 'PSA Value Max', 'PSA Max Dual',
    'PSA Crossover Plus Card Only', 'PSA Crossover Plus Dual',
  ];

  it.each(retired)('%s is present but inactive', (name) => {
    const rows = byName(name);
    expect(rows.length, `${name} is missing from the menu entirely`).toBeGreaterThan(0);
    for (const r of rows) expect(r.active, `${name} is still active`).toBe(false);
  });

  it('retires exactly the 15 the sheet greys out', () => {
    expect(uniqueActive(() => true).length).toBeGreaterThan(0);
    const inactive = [...new Set(SERVICE_MENU.filter((s) => !s.active).map((s) => s.name))];
    expect(inactive.sort()).toEqual([...retired].sort());
  });
});

describe('event tickets are a speed ladder, not an autograph ladder', () => {
  it('offers four PSA tickets at the sheet prices', () => {
    expect(uniqueActive((s) => s.name.startsWith('PSA') && s.name.includes('Ticket'))).toEqual([
      'PSA Express Ticket', 'PSA Regular Ticket', 'PSA Super Express Ticket', 'PSA Value Ticket',
    ]);
    expect(priceOf('PSA Value Ticket').price.customer).toBe(49.99);
    expect(priceOf('PSA Regular Ticket').price.customer).toBe(84.99);
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
    expect(priceOf('BGS Priority').businessDays).toBe(25);
    expect(priceOf('BGS Priority w/Auto').price.customer).toBe(155.0);
    expect(priceOf('BGS Priority w/Auto').businessDays).toBe(30);
  });

  it('is what BGS still offers now Base and Standard are gone', () => {
    expect(uniqueActive((s) => s.category === 'Trading Cards' && s.name.startsWith('BGS')))
      .toEqual(['BGS Express', 'BGS Express w/Auto', 'BGS Priority', 'BGS Priority w/Auto']);
  });
});
