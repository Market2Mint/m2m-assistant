/**
 * QUANTITY ENTRY — the shared rules for the stepper and the on-screen keypad.
 *
 * The stepper is the right tool at real-world quantities (Phase 1: the five most
 * common orders never exceed three cards), but it scales linearly — 30 cards would be
 * 29 taps. Tapping the quantity NUMBER opens a keypad instead: any bulk quantity in a
 * few presses. Both controls share these bounds so they can never disagree.
 */

/** Never fewer than one card on a line — zero cards is "remove the line" (the bin). */
export const MIN_QUANTITY_PER_LINE = 1;

/**
 * A ceiling against typos, not a business rule: 99 is far above any single-service
 * kiosk order ever taken, and a fat-fingered extra digit (350 for 35) is exactly the
 * kind of order a customer completes without noticing. Quantity rides inside ONE cart
 * line in the handoff URL ("(x99)"), so this has no QR-budget consequence.
 */
export const MAX_QUANTITY_PER_LINE = 99;

/**
 * Append one keypad digit to the current entry string.
 * Entry is kept as a STRING so "0" can exist mid-entry ("10" starts with a "1", but a
 * leading lone "0" is dropped rather than shown as an impossible quantity).
 * Input longer than the cap simply refuses the digit — no clamping surprise.
 */
export const appendKeypadDigit = (current: string, digit: string): string => {
  if (!/^\d$/.test(digit)) return current;
  const next = current === '0' ? digit : current + digit;
  if (next.length > String(MAX_QUANTITY_PER_LINE).length) return current;
  if (Number.parseInt(next, 10) > MAX_QUANTITY_PER_LINE) return current;
  return next;
};

/** Backspace. */
export const trimKeypadDigit = (current: string): string => current.slice(0, -1);

/**
 * The quantity a Done press would commit, or null while the entry is not a valid
 * quantity (empty, or below the minimum). Done stays disabled on null — invalid input
 * is refused at the moment of entry, never silently corrected after it.
 */
export const keypadQuantity = (entry: string): number | null => {
  if (!/^\d+$/.test(entry)) return null;
  const n = Number.parseInt(entry, 10);
  if (n < MIN_QUANTITY_PER_LINE || n > MAX_QUANTITY_PER_LINE) return null;
  return n;
};

/** Stepper arithmetic: one press, one card, never outside the bounds. */
export const stepQuantity = (current: number, delta: 1 | -1): number =>
  Math.min(MAX_QUANTITY_PER_LINE, Math.max(MIN_QUANTITY_PER_LINE, current + delta));

/**
 * The keypad's calculator convention, as a pure state machine so it is testable:
 * the display opens PRISTINE showing the current count (Done without typing is a
 * no-op, never a reset), and the first key press replaces the seed instead of
 * appending — nobody tapping "2" over a pre-filled "3" wants 32. Backspace on the
 * pristine seed clears it outright, for the same reason.
 */
export interface KeypadState {
  entry: string;
  pristine: boolean;
}

export const openKeypadState = (current: number): KeypadState => ({
  entry: String(current),
  pristine: true,
});

export const keypadDigitPressed = (state: KeypadState, digit: string): KeypadState => ({
  entry: appendKeypadDigit(state.pristine ? '' : state.entry, digit),
  pristine: false,
});

export const keypadBackspacePressed = (state: KeypadState): KeypadState => ({
  entry: state.pristine ? '' : trimKeypadDigit(state.entry),
  pristine: false,
});
