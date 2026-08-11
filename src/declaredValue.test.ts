/**
 * The declared-value sentinel, pinned against the LIVE generated menu.
 *
 * A verifier found the real risk here: `NA` was a magic literal repeated at three render
 * sites with nothing asserting any of it. That fails open — a fourth render site, or a
 * regenerated menu spelling it differently, puts "NA" back in front of a customer and
 * nothing errors. These tests make the sentinel and its population load-bearing.
 */
import { describe, expect, it } from 'vitest';
import { SERVICE_MENU } from './serviceMenu';
import {
  NO_DECLARED_VALUE_CAP,
  hasDeclaredValueCap,
  uncappedActiveServiceNames,
} from './declaredValue';

describe('declared-value cap', () => {
  it('treats the menu sentinel as "no cap"', () => {
    expect(hasDeclaredValueCap(NO_DECLARED_VALUE_CAP)).toBe(false);
    // Spelling variants and blanks are the same defect wearing a different hat.
    for (const v of ['NA', 'na', ' NA ', '', '   ', null, undefined]) {
      expect(hasDeclaredValueCap(v as string)).toBe(false);
    }
  });

  it('treats a real figure as a cap', () => {
    for (const v of ['$500.00', '$1,500.00', '$20,000.00']) {
      expect(hasDeclaredValueCap(v)).toBe(true);
    }
  });

  /**
   * The sentinel must keep matching what the generator actually writes. If a menu
   * rebuild changes the spelling, this fails here rather than on a kiosk.
   */
  it('is the exact string the generated menu uses', () => {
    const raw = new Set(SERVICE_MENU.map((s) => s.maxInsuredValue));
    expect(raw.has(NO_DECLARED_VALUE_CAP)).toBe(true);
    // Nothing else in the menu may be a non-money placeholder.
    for (const v of raw) {
      if (v === NO_DECLARED_VALUE_CAP) continue;
      expect(v, `unexpected non-money declared value: ${v}`).toMatch(/^\$[\d,]+\.\d{2}$/);
    }
  });

  /**
   * This population is why the guard exists — Pregrading is the one a customer
   * photographed reading "MAX DECLARED VALUE / NA".
   */
  it('still covers live services a customer can reach', () => {
    const uncapped = uncappedActiveServiceNames();
    expect(uncapped.length).toBeGreaterThan(0);
    expect(uncapped).toContain('Pregrading');
  });
});
