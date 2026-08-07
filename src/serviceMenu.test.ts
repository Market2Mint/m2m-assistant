import { describe, expect, it } from 'vitest';
import { ACTIVE_SERVICES, SERVICE_MENU, type ServiceRecord } from './serviceMenu';

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

describe('SGC is two services, and only two', () => {
  // "Replaces all old SGC tiers. No w/Auto" — SGC no longer prices autographs separately.
  it('offers exactly SGC Standard and SGC Expedited', () => {
    expect(uniqueActive((s) => s.name.startsWith('SGC'))).toEqual(['SGC Expedited', 'SGC Standard']);
  });

  it('prices them at $25.00 / ~75 days and $175.00 / ~15 days', () => {
    expect(priceOf('SGC Standard').price.customer).toBe(25.0);
    expect(priceOf('SGC Standard').businessDays).toBe(75);
    expect(priceOf('SGC Expedited').price.customer).toBe(175.0);
    expect(priceOf('SGC Expedited').businessDays).toBe(15);
  });

  it('has no SGC autograph variant anywhere, retired or not', () => {
    expect(SERVICE_MENU.filter((s) => s.name.startsWith('SGC') && /auto/i.test(s.name))).toEqual([]);
  });
});

describe('CGC does not grade cards with autographs', () => {
  it('offers no CGC card service with an autograph variant', () => {
    const cgcCards = uniqueActive((s) => s.category === 'Trading Cards' && s.name.startsWith('CGC'));
    expect(cgcCards).toEqual(['CGC Economy', 'CGC Express', 'CGC Standard']);
  });

  it('removed them entirely rather than retiring them', () => {
    // Deleted, not `active: false` — they were never a real M2M offering.
    for (const name of ['CGC Economy w/Auto', 'CGC Standard w/Auto', 'CGC Express w/Auto']) {
      expect(byName(name), `${name} should be gone from the menu`).toEqual([]);
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
