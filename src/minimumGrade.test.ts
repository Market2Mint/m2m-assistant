import { describe, expect, it } from 'vitest';
import { ACTIVE_SERVICES } from './serviceMenu';
import { POLICY } from './data';
import {
  CARD_REFERENCE_MAX_LENGTH,
  MINIMUM_GRADES,
  MIN_GRADE_COLLAPSED_LABEL,
  MIN_GRADE_CONSEQUENCE_REST,
  MIN_GRADE_LEAD_REST,
  MIN_GRADE_LEAD_STRONG,
  NO_MINIMUM_DISCLOSURE,
  NO_MINIMUM_LABEL,
  formatGrade,
  minimumGradeConsequence,
  minimumGradeHandoffFragment,
  sanitizeCardReference,
  supportsMinimumGrade,
} from './minimumGrade';

describe('the grade scale', () => {
  it('has no 9.5 — PSA does not award one', () => {
    // The single most important assertion in this file. A 9.5 threshold can never be met,
    // so a customer who picked it would pay the full fee and receive a raw card back with
    // no possible outcome in which they did not. Halves stop at 8.5, then 9, then 10.
    expect(MINIMUM_GRADES).not.toContain(9.5);
    expect(MINIMUM_GRADES).toContain(8.5);
    expect(MINIMUM_GRADES).toContain(9);
    expect(MINIMUM_GRADES).toContain(10);
  });

  it('runs 1 to 10 with halves, 18 values', () => {
    const expected = [10, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];
    expect([...MINIMUM_GRADES]).toEqual(expected);
    expect(MINIMUM_GRADES.length).toBe(18);
  });

  it('offers the realistic grades first', () => {
    // This renders as a picker wheel on an iPad. 10 and 9 are what anyone actually
    // chooses; burying them under sixteen rows of 1.5 and 2.5 is a usability tax.
    expect(MINIMUM_GRADES[0]).toBe(10);
    expect(MINIMUM_GRADES[1]).toBe(9);
  });

  it('never renders a grade as money', () => {
    expect(formatGrade(9)).toBe('9');
    expect(formatGrade(10)).toBe('10');
    expect(formatGrade(8.5)).toBe('8.5');
  });
});

describe('which services offer it', () => {
  it('offers it on every active PSA trading-card service', () => {
    const psaCards = ACTIVE_SERVICES.filter(
      (s) => s.category === 'Trading Cards' && s.name.startsWith('PSA'),
    );
    expect(psaCards.length).toBeGreaterThan(0);
    for (const s of psaCards) {
      expect(supportsMinimumGrade(s), `${s.name} should offer a minimum grade`).toBe(true);
    }
  });

  it('offers it on nothing else', () => {
    for (const s of ACTIVE_SERVICES) {
      const shouldOffer = s.category === 'Trading Cards' && s.name.startsWith('PSA');
      expect(supportsMinimumGrade(s), `${s.category} / ${s.name}`).toBe(shouldOffer);
    }
  });

  it('does not offer it on BGS, CGC or SGC cards', () => {
    // The consequence copy names PSA explicitly and describes PSA's rule. Showing this
    // control on another grader's card would state something untrue about that order.
    for (const name of ['BGS Base', 'CGC Economy', 'SGC Standard', 'BGS Express w/Auto']) {
      expect(supportsMinimumGrade({ category: 'Trading Cards', name })).toBe(false);
    }
  });

  it('does not offer it on PSA crossover — a miss there returns the card still slabbed', () => {
    // Crossover genuinely takes a minimum grade, but a crossover that misses comes back
    // in its EXISTING holder, not ungraded. Attaching "PSA will not slab it. It comes back
    // ungraded" to a crossover line would be false. Extending the control to crossover
    // needs its own copy, which is Cayden's call — see the note in minimumGrade.ts.
    const crossovers = ACTIVE_SERVICES.filter((s) => s.category === 'Crossover');
    expect(crossovers.length).toBeGreaterThan(0);
    for (const s of crossovers) expect(supportsMinimumGrade(s)).toBe(false);
  });

  it('does not offer it on pregrading, packs, tickets, comics or memorabilia', () => {
    for (const category of [
      'Pregrading',
      'Unopened Packs',
      'Event Tickets',
      'Comics & Magazines',
      'Memorabilia',
      'Reholder',
      'Slab Cracking',
    ]) {
      expect(supportsMinimumGrade({ category, name: 'PSA Anything' })).toBe(false);
    }
  });
});

describe('the required copy, verbatim', () => {
  // Every string here is quoted from the brief. It must not be paraphrased, softened or
  // abbreviated to fit a layout — "not refunded", never "non-refundable". These assertions
  // are what make that rule enforceable instead of aspirational.

  it('states the consequence in plain words, naming the chosen grade', () => {
    expect(minimumGradeConsequence(9)).toBe(
      'If this card grades below 9, PSA will not slab it. It comes back ungraded, and the grading fee is not refunded.',
    );
    expect(minimumGradeConsequence(8.5)).toBe(
      'If this card grades below 8.5, PSA will not slab it. It comes back ungraded, and the grading fee is not refunded.',
    );
  });

  it('does not soften "not refunded"', () => {
    const text = minimumGradeConsequence(10).toLowerCase();
    expect(text).toContain('is not refunded');
    expect(text).not.toContain('non-refundable');
    expect(text).not.toContain('refund policy');
    expect(MIN_GRADE_CONSEQUENCE_REST).toBe(
      'It comes back ungraded, and the grading fee is not refunded.',
    );
  });

  it('states the default out loud when no minimum is selected', () => {
    expect(NO_MINIMUM_DISCLOSURE).toBe(
      "No minimum selected — we'll submit this without a minimum grade.",
    );
  });

  it('leads with who the feature is for, before the dropdown', () => {
    expect(MIN_GRADE_LEAD_STRONG).toBe("Most submissions don't use this.");
    expect(MIN_GRADE_LEAD_REST).toBe(
      'Set a minimum grade only if you want your card returned ungraded rather than slabbed below a certain grade.',
    );
  });

  it('labels the collapsed control as optional and calls it nothing else', () => {
    expect(MIN_GRADE_COLLAPSED_LABEL).toBe('Set a minimum grade — optional');
    // Nothing that could read as an unanswered required step.
    expect(MIN_GRADE_COLLAPSED_LABEL.toLowerCase()).not.toContain('required');
    expect(MIN_GRADE_COLLAPSED_LABEL).not.toContain('*');
  });

  it('names the default "No minimum"', () => {
    expect(NO_MINIMUM_LABEL).toBe('No minimum');
  });
});

describe('the checkout policy block', () => {
  // Both rules sit behind the single "I acknowledge and agree" checkbox that gates
  // Complete Order. They reach the customer who never expanded the control at all.
  it('carries the missed-minimum rule', () => {
    expect(POLICY).toContain(
      'If you set a minimum grade and the item does not reach it, the item is returned ungraded and the grading fee is not refunded.',
    );
  });

  it('carries the no-minimum default and the customer-responsibility line', () => {
    expect(POLICY).toContain(
      'If no minimum grade is entered, your order will be submitted without one. Customers are responsible for the accuracy of their order details and photos.',
    );
  });

  it('adds no second acknowledgement of its own', () => {
    // Two clear statements — one at the point of choice, one behind the checkout
    // acknowledgement — is the right amount of friction. A modal on a kiosk gets
    // dismissed without reading and buys nothing.
    const minGradeLines = POLICY.filter((p) => p.toLowerCase().includes('minimum grade'));
    expect(minGradeLines.length).toBe(2);
  });
});

describe('sanitizeCardReference', () => {
  it('keeps ordinary input untouched', () => {
    expect(sanitizeCardReference('Jordan rookie, Kobe base')).toBe('Jordan rookie, Kobe base');
  });

  it('collapses newlines — they would forge an extra order line', () => {
    // The handoff joins one line per cart line with "\n". A pasted or dictated newline
    // inside this field would appear to the shop as a service the customer never ordered.
    expect(sanitizeCardReference('Jordan rookie\nKobe base')).toBe('Jordan rookie Kobe base');
    expect(sanitizeCardReference('a\r\n• PSA Regular - $84.99')).toBe('a • PSA Regular - $84.99');
    expect(sanitizeCardReference('a\tb   c')).toBe('a b c');
  });

  it('caps length so a long note cannot break the QR', () => {
    const long = 'x'.repeat(500);
    expect(sanitizeCardReference(long).length).toBe(CARD_REFERENCE_MAX_LENGTH);
  });

  it('lets a trailing space through so a customer can type a second word', () => {
    // Trimming on every keystroke makes the space bar look broken.
    expect(sanitizeCardReference('Jordan ')).toBe('Jordan ');
    expect(sanitizeCardReference('  Jordan')).toBe('Jordan');
  });
});

describe('what the shop reads on the handoff', () => {
  it('says nothing at all when nothing was set', () => {
    // The common case. A customer who never opened the control changes no output.
    expect(minimumGradeHandoffFragment({ minimumGrade: null, cardReference: '' })).toBe('');
  });

  it('prints the grade in a form a staff member can scan', () => {
    expect(minimumGradeHandoffFragment({ minimumGrade: 9, cardReference: '' })).toBe(
      ' — MIN GRADE 9',
    );
    expect(minimumGradeHandoffFragment({ minimumGrade: 8.5, cardReference: '' })).toBe(
      ' — MIN GRADE 8.5',
    );
  });

  it('prints the grade and the reference together', () => {
    expect(
      minimumGradeHandoffFragment({ minimumGrade: 9, cardReference: 'Jordan rookie, Kobe base' }),
    ).toBe(' — MIN GRADE 9 — "Jordan rookie, Kobe base"');
  });

  it('carries a reference typed without a grade rather than dropping it', () => {
    expect(minimumGradeHandoffFragment({ minimumGrade: null, cardReference: 'Jordan rookie' })).toBe(
      ' — "Jordan rookie"',
    );
  });

  it('ignores a reference that is only whitespace', () => {
    expect(minimumGradeHandoffFragment({ minimumGrade: null, cardReference: '   ' })).toBe('');
    expect(minimumGradeHandoffFragment({ minimumGrade: 10, cardReference: '  ' })).toBe(
      ' — MIN GRADE 10',
    );
  });

  it('produces the line shape the brief specifies', () => {
    // • PSA Regular — MIN GRADE 9 — "Jordan rookie, Kobe base" - $254.97 (x3) — EST: …
    const fragment = minimumGradeHandoffFragment({
      minimumGrade: 9,
      cardReference: 'Jordan rookie, Kobe base',
    });
    const line = `• PSA Regular${fragment} - $254.97 (x3) — EST: Mon, Sep 14, 2026`;
    expect(line).toBe(
      '• PSA Regular — MIN GRADE 9 — "Jordan rookie, Kobe base" - $254.97 (x3) — EST: Mon, Sep 14, 2026',
    );
  });

  it('survives the URL encoding the handoff puts it through', () => {
    const fragment = minimumGradeHandoffFragment({
      minimumGrade: 9,
      cardReference: 'Jordan "rookie" & Kobe #8',
    });
    expect(decodeURIComponent(encodeURIComponent(fragment))).toBe(fragment);
  });
});
