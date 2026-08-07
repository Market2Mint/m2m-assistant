/**
 * PRICING — single source of truth for every price the kiosk states out loud.
 *
 * These numbers are LOCKED. They come from M2M_BRAND_FOUNDATION_v6.md §6 (the pricing
 * rule) and are re-stated in CLAUDE.md. Do not invent, round, or "simplify" them, and
 * do not add a second copy of any of them anywhere in the app — that is exactly how the
 * shipping fee shipped a bug where the cart charged $29.00 while the handoff the customer
 * scanned printed $24.00.
 *
 * Covered by src/pricing.test.ts. If you change a number here, that test tells you what
 * else it breaks.
 */

/** Pregrading, per card, at a kiosk. */
export const PREGRADE_PRICE_KIOSK = 7.0;

/**
 * The cheapest full submission, per card. Quoted on the landing screen as "FROM $25.00".
 * `pricing.test.ts` checks every entry against the live service menu — both that the
 * price still holds AND that the service is still active — so the claim on the attract
 * screen cannot outlive the menu behind it.
 *
 * `BGS Base` was here until 2026-08-06 and was removed because BGS retired it. That test
 * failing is what caught it. `CGC Economy` and `SGC Standard` are both still $25.00, so
 * "FROM $25.00" survives on measured data rather than on habit.
 */
export const SUBMISSION_BASE_TIERS = {
  'CGC Economy': 25.0,
  'SGC Standard': 25.0,
} as const;

export const SUBMISSION_FROM_PRICE = Math.min(...Object.values(SUBMISSION_BASE_TIERS));

/**
 * Shipping & insurance: $24.00 FLAT, ONE TIME PER ORDER, however many cards.
 *
 * Ruled by Cayden 2026-08-03 ("$24.00 always, for now") and reaffirmed 2026-08-05.
 * It is not per card, it is not per grading company, and there is no surcharge for
 * mixing graders. A +$5 second-shipping-leg surcharge used to apply when a Florida
 * grader (CGC / SGC) was mixed with a local one (PSA / BGS), or when both Florida
 * graders appeared together. The underlying cost is real; the $24.00 fee runs at ~55%
 * margin and absorbs it, and every piece of M2M artwork states the flat figure.
 */
export const SHIPPING_AND_INSURANCE = 24.0;

/**
 * The approved disclosure line, verbatim (BRAND FOUNDATION v6 §6 / §9).
 *
 * The wording is deliberate: customers assume shipping is charged per card, so the line
 * has to answer that before they ask. It must appear EARLY — on the landing screen — and
 * never as fine print at checkout only.
 */
export const SHIPPING_DISCLOSURE = '$24.00 covers your whole order, however many cards.';

/**
 * The one and only shipping calculation. Independent of cart size, service mix and
 * grading company. Returns 0 for an empty cart because there is no order to ship.
 */
export const shippingFeeForCart = (itemCount: number): number =>
  itemCount > 0 ? SHIPPING_AND_INSURANCE : 0;

/**
 * What one cart line costs, before any show discount.
 *
 * The oversized upcharge is PER CARD, not per line — an oversized order of three cards is
 * three upcharges, because BGS charges per card. Everything that needs a line total goes
 * through here: the cart, the order summary and the QR handoff all read the same figure.
 * The shipping fee once had two implementations and the customer saw $24.00 while being
 * charged $29.00; one function is the entire lesson from that.
 */
export const lineTotal = (
  unitPrice: number,
  quantity: number,
  oversizedSurcharge: number | null = null,
): number => (unitPrice + (oversizedSurcharge ?? 0)) * quantity;

/** Prices always carry two decimals — `$7.00`, never `$7` (BRAND FOUNDATION v6 §2). */
export const formatUSD = (amount: number): string =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Every turnaround shown to a customer, in one place.
 *
 * The `~` is not decoration. Turnarounds are the grader's estimate and begin when the
 * grader receives the item — and the kiosk has shipped numbers faster than the grader
 * actually delivers. `~` is also already M2M's house style: the printed customer menu
 * writes "~20 Business Days" throughout, so the kiosk matches the counter rather than
 * inventing a second convention.
 *
 * Two forms because one screen sets the number large and the unit small, but the `~`
 * itself is defined once. Do not hand-prefix it anywhere and do not pick it apart out of
 * the full string — two copies of one rule is exactly how the shipping fee ended up
 * charging $29.00 while printing $24.00.
 */
export const formatTurnaroundDays = (businessDays: number): string => `~${businessDays}`;

export const formatTurnaround = (businessDays: number): string =>
  `${formatTurnaroundDays(businessDays)} BUSINESS DAYS`;
