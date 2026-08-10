import { describe, expect, it } from 'vitest';
import { ACTIVE_SERVICES, SERVICE_MENU } from './serviceMenu';
import {
  PREGRADE_PRICE_KIOSK,
  SHIPPING_AND_INSURANCE,
  SHIPPING_DISCLOSURE,
  SUBMISSION_BASE_TIERS,
  SUBMISSION_FROM_PRICE,
  formatTurnaround,
  formatTurnaroundDays,
  formatUSD,
  lineTotal,
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

describe('lineTotal', () => {
  it('is unit price times quantity when nothing is oversized', () => {
    expect(lineTotal(84.99, 1)).toBeCloseTo(84.99, 2);
    expect(lineTotal(84.99, 3)).toBeCloseTo(254.97, 2);
    expect(lineTotal(25, 4, null)).toBe(100);
  });

  it('charges the oversized upcharge PER CARD, not per line', () => {
    // BGS charges per card, so three oversized cards is three upcharges. Applying it
    // once per line would undercharge every multi-card oversized order.
    expect(lineTotal(85, 1, 10)).toBe(95);
    expect(lineTotal(85, 3, 10)).toBe(285);
    expect(lineTotal(150, 2, 10)).toBe(320);
  });

  it('matches the sheet\'s own oversized rows to the cent', () => {
    // The sheet lists these as separate services; the kiosk computes them. If the two
    // ever disagree, one of them is wrong and it will be this.
    expect(lineTotal(85, 1, 10)).toBe(95);    // BGS Express — Oversized
    expect(lineTotal(90, 1, 10)).toBe(100);   // BGS Express w/Auto — Oversized
    expect(lineTotal(150, 1, 10)).toBe(160);  // BGS Priority — Oversized
    expect(lineTotal(155, 1, 10)).toBe(165);  // BGS Priority w/Auto — Oversized
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

describe('formatTurnaround', () => {
  it('marks every turnaround as an estimate with a tilde', () => {
    expect(formatTurnaround(75)).toBe('~75 BUSINESS DAYS');
    expect(formatTurnaround(7)).toBe('~7 BUSINESS DAYS');
  });

  it('offers the number alone for screens that style the unit separately', () => {
    // The tier card sets the number large and "BUSINESS DAYS" small. It must take the
    // number from here rather than hand-writing the tilde or slicing it out of the full
    // string, or the two screens drift.
    expect(formatTurnaroundDays(75)).toBe('~75');
    expect(formatTurnaround(75).startsWith(formatTurnaroundDays(75))).toBe(true);
  });
});

describe('pricing.ts agrees with the service menu', () => {
  // The menu is the authority; pricing.ts only restates the handful of figures the
  // kiosk says out loud. These assertions are what makes a price change in the menu
  // surface as a failing test rather than as a screen quietly contradicting itself.
  const findActive = (name: string) => ACTIVE_SERVICES.filter((s) => s.name === name);

  it.each(Object.entries(SUBMISSION_BASE_TIERS))(
    '%s is active in the menu at $%d',
    (name, expectedPrice) => {
      const matches = findActive(name);
      expect(matches.length).toBeGreaterThan(0);
      for (const m of matches) expect(m.price.customer).toBe(expectedPrice);
    },
  );

  it('pregrading is $7.00 in the menu', () => {
    const pregrade = findActive('Pregrading');
    expect(pregrade.length).toBe(1);
    expect(pregrade[0].price.customer).toBe(PREGRADE_PRICE_KIOSK);
  });

  it('the advertised "from" price is the cheapest base tier', () => {
    expect(SUBMISSION_FROM_PRICE).toBe(Math.min(...Object.values(SUBMISSION_BASE_TIERS)));
  });

  it('no trading-card submission undercuts the advertised "from" price', () => {
    // The landing card reads "FULL SUBMISSION — From $25.00", which is a claim about
    // card grading specifically. Ancillary services are deliberately cheaper and are
    // not covered by it: slab cracking is $10.00, CGC Reholder $15.00, Auto Quick
    // Opinion $20.00. Scoping this to the Trading Cards path is what makes it a real
    // guard rather than an assertion that happens to pass.
    const submissions = ACTIVE_SERVICES.filter((s) => s.category === 'Trading Cards');
    expect(submissions.length).toBeGreaterThan(0);
    const cheapest = Math.min(...submissions.map((s) => s.price.customer));
    expect(cheapest).toBe(SUBMISSION_FROM_PRICE);
  });
});

describe('the shipped menu carries no internal pricing', () => {
  // Everything in src/ reaches every kiosk, and anything in the bundle is public.
  // Employee/owner prices and grader cost are resolved server-side after a role login
  // (brief §4.1b); they must never be seeded into the client. This is the guard.
  it('has no employee price, owner price or grader cost on any record', () => {
    for (const s of SERVICE_MENU) {
      expect(s.price.employee, `${s.name} leaks an employee price`).toBeNull();
      expect(s.price.owner, `${s.name} leaks an owner price`).toBeNull();
      expect(s.cost, `${s.name} leaks grader cost`).toBeNull();
    }
  });

  it('gives every reachable service a real customer price and turnaround', () => {
    for (const s of ACTIVE_SERVICES) {
      expect(s.price.customer, `${s.name} has no price`).toBeGreaterThan(0);
      expect(s.businessDays, `${s.name} has no turnaround`).toBeGreaterThan(0);
      expect(s.questions, `${s.name} is unroutable but marked active`).not.toBeNull();
    }
  });

  it('offers MBA at the four prices Cayden supplied', () => {
    // Went live 2026-08-07. This test used to assert MBA was ABSENT — it was HOLD, priced
    // but with no routing. Adding it was four rows in the routing CSV and four ALIAS
    // entries, no code, which was the whole point of generating the menu.
    // Turnarounds re-set 2026-08-09: Express 10->15, and w/Auto now adds five days at
    // both tiers — the same +5 rule as BGS and CGC. SGC stays the deliberate exception.
    const expected = {
      'MBA Base': { price: 25.0, days: 30, insured: '$100.00' },
      'MBA Base w/Auto': { price: 30.0, days: 35, insured: '$100.00' },
      'MBA Express': { price: 65.0, days: 15, insured: '$1,000.00' },
      'MBA Express w/Auto': { price: 70.0, days: 20, insured: '$1,000.00' },
    };
    for (const [name, want] of Object.entries(expected)) {
      const matches = ACTIVE_SERVICES.filter((s) => s.name === name);
      expect(matches.length, `${name} is not reachable`).toBeGreaterThan(0);
      for (const m of matches) {
        expect(m.price.customer, `${name} price`).toBe(want.price);
        expect(m.businessDays, `${name} turnaround`).toBe(want.days);
        expect(m.maxInsuredValue, `${name} insured value`).toBe(want.insured);
      }
    }
  });

  it('charges $5.00 for an MBA autograph and adds five days', () => {
    // The 2026-08-07 launch assumption — "+$5.00 and NO extra days" — did not survive:
    // Cayden re-set the sheet on 2026-08-09 and MBA now follows the same +5-day w/Auto
    // rule as BGS and CGC. SGC remains the deliberate +$0/+0-day exception (the locked
    // 8/06 correction) — do not normalise it to this rule.
    const priceOf = (n: string) => ACTIVE_SERVICES.find((s) => s.name === n)!;
    expect(priceOf('MBA Base w/Auto').price.customer - priceOf('MBA Base').price.customer).toBe(5);
    expect(priceOf('MBA Express w/Auto').price.customer - priceOf('MBA Express').price.customer).toBe(5);
    expect(priceOf('MBA Base w/Auto').businessDays).toBe(priceOf('MBA Base').businessDays + 5);
    expect(priceOf('MBA Express w/Auto').businessDays).toBe(priceOf('MBA Express').businessDays + 5);
  });

  it('never routes an MBA aftermarket autograph — MBA does not accept them', () => {
    // A path that exists but cannot be honoured is worse than no path: the customer pays
    // and the shop finds out at intake.
    const mba = ACTIVE_SERVICES.filter((s) => s.name.startsWith('MBA'));
    expect(mba.length).toBe(4);
    for (const s of mba) {
      expect(s.questions![3], `${s.name} accepts an aftermarket autograph`).not.toBe('Aftermarket');
    }
  });
});
