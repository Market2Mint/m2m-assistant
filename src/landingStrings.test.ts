/**
 * Guards for the landing screen's copy. Each rule here was given by a person, not
 * invented — sources: 00_HOME_PAGE_DESIGN_RECORD_2026-08-08.md §4, and the port spec's
 * no-hard-coded-money rule.
 */
import { describe, expect, it } from 'vitest';
import { LANDING, TICKER_SAMPLE } from './landingStrings';
import { SHIPPING_AND_INSURANCE, SHIPPING_DISCLOSURE, formatUSD } from './pricing';

/** Every string reachable inside a nested readonly object. */
const allStrings = (node: unknown): string[] => {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(allStrings);
  if (node && typeof node === 'object') return Object.values(node).flatMap(allStrings);
  return [];
};

describe('no money is ever a literal string on the landing screen', () => {
  // Hard-coding $7.00 breaks card-show mode, which quotes $5.00. Every figure must
  // come from pricing.ts at render time.
  it('LANDING contains no dollar amount', () => {
    for (const s of allStrings(LANDING)) {
      expect(s, `money literal in LANDING: "${s}"`).not.toMatch(/\$\s?\d/);
    }
  });
});

describe('the shipping line composes back to the canonical disclosure', () => {
  // The screen renders the figure (green, from pricing.ts) followed by the tail. If
  // either half drifts, the sentence on screen stops matching the locked $24-once-
  // per-order ruling — this is what makes that impossible.
  it('figure + tail === SHIPPING_DISCLOSURE', () => {
    expect(`${formatUSD(SHIPPING_AND_INSURANCE)} ${LANDING.ship.tail}`).toBe(SHIPPING_DISCLOSURE);
  });
});

describe('the HOW IT WORKS strip holds one line per step', () => {
  it('has exactly four steps', () => {
    expect(LANDING.how.steps.length).toBe(4);
  });

  it('keeps every description at or under 42 characters', () => {
    // Over ~42 characters a description wraps, one step becomes two lines, and the
    // whole strip goes ragged (design record §4).
    for (const step of LANDING.how.steps) {
      expect(step.desc.length, `"${step.desc}" wraps the strip`).toBeLessThanOrEqual(42);
    }
  });
});

describe('locked copy stays locked', () => {
  it('keeps RECOMMENDED on the pregrade card', () => {
    // Cayden declined "START HERE IF UNSURE" — do not re-raise.
    expect(LANDING.pregrade.pill).toBe('RECOMMENDED');
  });

  it('names six partners, in type', () => {
    expect(LANDING.proof.partners).toEqual(['PSA', 'BGS', 'CGC', 'SGC', 'JSA', 'MBA']);
  });

  it('sells submissions per ITEM, not per card', () => {
    // The menu sells comics, tickets, packs and memorabilia — "per card" undersells it.
    expect(LANDING.submission.perUnit).toBe('PER ITEM');
  });
});

describe('ticker sample entries carry no customer name', () => {
  // Structural check only: two fields, grade and card. The real rule — never a
  // customer's name on the attract screen — has to be enforced again at the feed.
  it('every entry is exactly { grade, card }', () => {
    for (const entry of TICKER_SAMPLE) {
      expect(Object.keys(entry).sort()).toEqual(['card', 'grade']);
      expect(entry.grade).toMatch(/^(PSA|BGS|CGC|SGC|JSA|MBA)\s/);
    }
  });
});
