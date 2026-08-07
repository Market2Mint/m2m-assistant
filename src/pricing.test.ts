import { describe, expect, it } from 'vitest';
import { ACTIVE_SERVICES, SERVICE_MENU } from './serviceMenu';
import {
  PREGRADE_PRICE_KIOSK,
  SHIPPING_AND_INSURANCE,
  SHIPPING_DISCLOSURE,
  SUBMISSION_BASE_TIERS,
  SUBMISSION_FROM_PRICE,
  formatTurnaround,
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

describe('formatTurnaround', () => {
  it('marks every turnaround as an estimate with a tilde', () => {
    expect(formatTurnaround(75)).toBe('~75 BUSINESS DAYS');
    expect(formatTurnaround(7)).toBe('~7 BUSINESS DAYS');
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

  it('does not offer MBA — priced and final, but routing not yet supplied', () => {
    // MBA Base $25.00 / MBA Express $60.00 are HOLD — NOT YET LIVE in the pricing
    // sheet. They must not reach a customer until their question path exists.
    expect(SERVICE_MENU.filter((s) => s.name.startsWith('MBA'))).toEqual([]);
  });
});
