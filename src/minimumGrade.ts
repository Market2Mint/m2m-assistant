/**
 * MINIMUM GRADE — PSA card submissions only. Brief §5.2b / §5.2c / §5.2d / §5.3.
 *
 * What it is: PSA will decline to encapsulate a card that grades below a threshold the
 * customer sets. The card comes back raw and the grading fee is still charged. A customer
 * can therefore pay $84.99 and receive an unslabbed card — which is a legitimate service
 * and also exactly the kind of term that produces a dispute when it is discovered
 * afterwards. Every string in this file exists to make sure it is discovered beforehand.
 *
 * What this is NOT: data for PSA. Cayden, 2026-08-05 — *"The card name is only for our
 * note reference. We will input the card correctly into PSA's intake and then add the
 * minimum grade ourselves based on the notes input by the customer/order."* So there is no
 * schema, no validation against a card database, and nothing downstream breaks if a
 * customer types "the Jordan one". The consumer is an M2M staff member already holding the
 * card. That is why the unit stays the CART LINE and not a per-card row.
 *
 * The copy below is quoted from the brief and must not be paraphrased, softened or
 * abbreviated to fit a layout. "not refunded", never "non-refundable". If it does not fit,
 * change the layout. `minimumGrade.test.ts` asserts each string verbatim, which is what
 * makes that rule enforceable rather than aspirational.
 */

import type { ServiceRecord } from './serviceMenu';

/**
 * The grades PSA issues, highest first.
 *
 * **There is no 9.5.** PSA's scale carries halves from 1.5 up to 8.5 and then jumps 9 → 10;
 * offering a 9.5 would let a customer set a threshold no card can ever be awarded, which
 * guarantees the card comes back raw with the fee charged. The one value that must not be
 * in this list is the one that would silently cost a customer the whole fee.
 *
 * Descending because 10 and 9 are the realistic choices and this renders as a picker on a
 * touch screen — the useful end belongs at the top, not eighteen rows down.
 */
export const MINIMUM_GRADES: readonly number[] = [
  10, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1,
];

/** `9`, not `9.0`; `8.5`, not `8.50`. Grades are grades, not money. */
export const formatGrade = (grade: number): string => String(grade);

/**
 * Does this service offer a minimum grade?
 *
 * PSA raw-card grading only — brief §5.3 item 1, "default to showing it on all PSA card
 * services and let Cayden narrow it".
 *
 * ⚠️ PSA **Crossover** is deliberately excluded even though it is a PSA card service and
 * genuinely takes a minimum grade. Its consequence is a different sentence: a crossover
 * that misses comes back **in its existing holder**, still slabbed by the original company
 * — not ungraded. Attaching the copy below to a crossover line would tell the customer
 * something factually untrue about their own order. Crossover states its rule in its own
 * service description today and routes the answer through the checkout notes. Extending
 * this control to crossover means writing new copy for it, which is Cayden's call.
 */
export const supportsMinimumGrade = (service: Pick<ServiceRecord, 'category' | 'name'>): boolean =>
  service.category === 'Trading Cards' && /^PSA\b/.test(service.name);

/** Collapsed state. Small, secondary, clearly skippable — never a green button (§5.2d). */
export const MIN_GRADE_COLLAPSED_LABEL = 'Set a minimum grade — optional';

/**
 * On expand, lead with who it is for — before the dropdown, not after it.
 *
 * The best protection against the downside is that a customer who does not understand the
 * feature never opens it. Split in two so the screen can weight the first sentence; the
 * combined form is what the test pins.
 */
export const MIN_GRADE_LEAD_STRONG = "Most submissions don't use this.";
export const MIN_GRADE_LEAD_REST =
  'Set a minimum grade only if you want your card returned ungraded rather than slabbed below a certain grade.';

/** The dropdown's default, and the only default. A grade is never pre-selected (§5.3). */
export const NO_MINIMUM_LABEL = 'No minimum';

/**
 * Shown under the dropdown whenever it reads "No minimum" (§5.2c).
 *
 * A statement of what will happen, not a warning and not an obstacle. Do not render it red
 * and do not put it behind a confirmation.
 */
export const NO_MINIMUM_DISCLOSURE =
  "No minimum selected — we'll submit this without a minimum grade.";

/**
 * The consequence, shown the moment a grade is chosen (§5.3 item 3).
 *
 * Two parts so the first sentence can carry weight on screen. `minimumGradeConsequence`
 * is the whole thing and is what the handoff and the tests use.
 */
export const minimumGradeConsequenceLead = (grade: number): string =>
  `If this card grades below ${formatGrade(grade)}, PSA will not slab it.`;

export const MIN_GRADE_CONSEQUENCE_REST =
  'It comes back ungraded, and the grading fee is not refunded.';

export const minimumGradeConsequence = (grade: number): string =>
  `${minimumGradeConsequenceLead(grade)} ${MIN_GRADE_CONSEQUENCE_REST}`;

/**
 * The optional free-text reference (§5.2b item 2).
 *
 * Why it earns its place: a customer with three PSA Regulars who wants minimum 9 on two and
 * minimum 8 on one produces two cart lines, but staff receive three physical cards and
 * cannot tell which is which. Unnecessary whenever every card in a line shares a threshold,
 * which is the common case — so it is optional and never blocks completion.
 */
export const CARD_REFERENCE_LABEL = 'Which cards? (optional — helps our team match your request)';
export const CARD_REFERENCE_PLACEHOLDER = 'Jordan rookie, Kobe base';

/**
 * Capped because the whole order travels to JotForm inside a QR code. 80 characters is
 * comfortably more than "Jordan rookie, Kobe base" and keeps the worst realistic cart
 * inside a scannable QR — see the capacity test in `minimumGrade.test.ts`, which encodes
 * a real one rather than assuming.
 */
export const CARD_REFERENCE_MAX_LENGTH = 80;

/**
 * The handoff blob joins one line per cart line with `\n`, so a newline pasted or dictated
 * into this field would forge an extra order line. Collapse all whitespace, trim, and cap.
 * Applied on input rather than only on send, so the customer sees what will actually be
 * transmitted.
 */
export const sanitizeCardReference = (raw: string): string =>
  raw.replace(/\s+/g, ' ').replace(/^ /, '').slice(0, CARD_REFERENCE_MAX_LENGTH);

/**
 * What the shop reads. Appended to the service name on the `servicesOrdered` line built in
 * `renderHandoff` — e.g.
 *   `• PSA Regular — MIN GRADE 9 — "Jordan rookie, Kobe base" - $254.97 (x3) — EST: …`
 *
 * It goes THERE and not in `customerNotes`: that field is free text with its own purpose,
 * and mixing a term the customer is financially exposed to into a notes blob makes both
 * unreliable. Uppercase for the same reason `— OVERSIZED` is uppercase: a staff member is
 * scanning this line, not reading it.
 *
 * The reference survives on its own without a grade. It is a note either way, and dropping
 * something a customer typed because they changed the dropdown back is worse than carrying
 * a harmless line.
 */
export const minimumGradeHandoffFragment = (line: {
  minimumGrade: number | null;
  cardReference: string;
}): string => {
  const parts: string[] = [];
  if (line.minimumGrade !== null) parts.push(`MIN GRADE ${formatGrade(line.minimumGrade)}`);
  const ref = sanitizeCardReference(line.cardReference).trim();
  if (ref) parts.push(`"${ref}"`);
  return parts.length ? ` — ${parts.join(' — ')}` : '';
};
