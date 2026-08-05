import { describe, expect, it } from 'vitest';
import { CSV_DATA } from './data';
import {
  PREGRADE_PRICE_KIOSK,
  SHIPPING_AND_INSURANCE,
  SHIPPING_DISCLOSURE,
  SUBMISSION_BASE_TIERS,
  SUBMISSION_FROM_PRICE,
  formatUSD,
  shippingFeeForCart,
} from './pricing';

describe('locked prices', () => {
  it('pregrading is $7.00 per card at a kiosk', () => {
    expect(PREGRADE_PRICE_KIOSK).toBe(7.0);
    expect(formatUSD(PREGRADE_PRICE_KIOSK)).toBe('$7.00');
  });

  it('quotes submissions from $25.00', () => {
    expect(SUBMISSION_FROM_PRICE).toBe(25.0);
    expect(formatUSD(SUBMISSION_FROM_PRICE)).toBe('$25.00');
  });

  it('shipping & insurance is $24.00', () => {
    expect(SHIPPING_AND_INSURANCE).toBe(24.0);
  });

  it('uses the approved shipping disclosure verbatim', () => {
    // Customers assume shipping is charged per card. This exact wording is the
    // approved answer (BRAND FOUNDATION v6 §6) — do not paraphrase it.
    expect(SHIPPING_DISCLOSURE).toBe('$24.00 covers your whole order, however many cards.');
  });
});

describe('shippingFeeForCart', () => {
  it('charges nothing for an empty cart', () => {
    expect(shippingFeeForCart(0)).toBe(0);
  });

  it('charges $24.00 once, however many cards', () => {
    expect(shippingFeeForCart(1)).toBe(24.0);
    expect(shippingFeeForCart(2)).toBe(24.0);
    expect(shippingFeeForCart(39)).toBe(24.0);
    expect(shippingFeeForCart(500)).toBe(24.0);
  });

  it('does not surcharge any grading-company mix — the $29.00 regression', () => {
    // The deployed app charged $29.00 on a CGC+SGC cart (and on Florida+local mixes)
    // in the cart total, while the QR handoff printed "$24.00". The fee no longer
    // depends on the cart's contents at all, so there is nothing left to disagree.
    const carts = [
      ['CGC Economy', 'SGC <1500'],
      ['CGC Economy', 'SGC <1500', 'PSA Regular'],
      ['PSA Express', 'BGS Base'],
      ['Pregrading'],
    ];
    for (const cart of carts) {
      expect(shippingFeeForCart(cart.length)).toBe(24.0);
    }
  });
});

describe('formatUSD', () => {
  it('always renders two decimals', () => {
    expect(formatUSD(7)).toBe('$7.00');
    expect(formatUSD(24)).toBe('$24.00');
    expect(formatUSD(84.99)).toBe('$84.99');
    expect(formatUSD(0)).toBe('$0.00');
  });

  it('groups thousands', () => {
    expect(formatUSD(1234.5)).toBe('$1,234.50');
  });
});

describe('drift check against the live service menu', () => {
  // data.ts holds the service menu as an embedded CSV, hand-maintained against
  // "Kiosk v3/iPad Service Menu.xlsx". The landing screen promises "FROM $25.00", so
  // if a base tier is ever repriced in that CSV without updating pricing.ts, the
  // promise on the attract screen becomes a lie. This catches that.
  const priceOf = (serviceName: string): number | null => {
    for (const line of CSV_DATA.split('\n')) {
      const cols = line.split(',');
      // col 6 = Service Name, col 7 = Cost / Per. Every base-tier row is unquoted up
      // to and including the price, so a plain split is safe for this lookup.
      if (cols[6] === serviceName && cols[7]?.startsWith('$')) {
        return parseFloat(cols[7].replace(/[^0-9.]/g, ''));
      }
    }
    return null;
  };

  it.each(Object.entries(SUBMISSION_BASE_TIERS))(
    '%s is still priced at $%d in data.ts',
    (serviceName, expectedPrice) => {
      expect(priceOf(serviceName)).toBe(expectedPrice);
    },
  );

  it('pregrading is still $7.00 in data.ts', () => {
    expect(priceOf('Pregrading')).toBe(PREGRADE_PRICE_KIOSK);
  });

  it('no submission in the menu undercuts the advertised "from" price', () => {
    const cheapest = Math.min(...Object.values(SUBMISSION_BASE_TIERS));
    expect(SUBMISSION_FROM_PRICE).toBe(cheapest);
  });
});
