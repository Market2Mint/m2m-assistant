/**
 * THE HANDOFF URL — the whole order, encoded into a QR code the customer scans.
 *
 * There is no server between the kiosk and JotForm. Everything the shop and the customer
 * need travels as query parameters in this URL, which gives the URL a hard ceiling: a QR
 * code holds a finite number of bytes and past it the encoder throws.
 *
 * ⚠️ THAT THROW HAPPENS DURING RENDER, AND THERE IS NO ERROR BOUNDARY. An over-long order
 * does not degrade — it unmounts the app and blanks the kiosk, taking the customer's whole
 * order with it. Measured 2026-08-06 at the shipped level H: a plain order failed at SEVEN
 * cart lines. That is why the size of this string is treated as a correctness constraint
 * here rather than as a formatting detail at the call site.
 *
 * `handoff.test.ts` encodes real orders with the same encoder the kiosk uses, so the
 * budget below is verified against the encoder rather than asserted from a spec table.
 */

/** Card orders, and every non-show order. */
export const JOTFORM_CARD_FORM = 'https://form.jotform.com/260667434445159';

/** Cash at a card show — a separate form because the payment step differs. */
export const JOTFORM_CASH_FORM = 'https://form.jotform.com/260846848017162';

/**
 * Error correction level for the handoff QR.
 *
 * Was `H` (30% recovery). `H` is the right choice for a code that is PRINTED — stickers
 * scuff, labels tear, ink fades. This one is drawn on a backlit LCD eighteen inches from
 * the customer's phone, is redrawn from scratch on every render, and cannot be damaged;
 * the recovery budget was being spent on a risk that does not exist here, and it was being
 * paid for with capacity the kiosk genuinely needs. `M` (15%) is the normal level for a
 * screen-displayed code and roughly doubles what the order can carry: measured, a plain
 * order goes from 6 cart lines to 13, and one with minimum grades from 3 to 7.
 */
export const QR_ERROR_CORRECTION_LEVEL = 'M' as const;

/**
 * The most bytes a QR can hold at `QR_ERROR_CORRECTION_LEVEL` — version 40, byte mode.
 *
 * Verified against the live encoder by binary search in `handoff.test.ts`, which also
 * checks the boundary in both directions, so this cannot quietly drift if the QR library
 * is upgraded or the level above is changed.
 */
export const QR_BYTE_BUDGET = 2331;

/**
 * Bytes, not characters. `—` is one character and nine bytes once URL-encoded (`%E2%80%94`)
 * and the order lines are full of them, so a `.length` check understates the payload by a
 * factor of three on realistic input.
 */
export const urlByteLength = (url: string): number => new TextEncoder().encode(url).length;

/**
 * "Additional Instructions" travels in this URL too, and the textarea was unbounded — a
 * long enough note on its own could take a one-line order past the QR's capacity. Several
 * sentences, with room left for the order itself.
 */
export const CUSTOMER_NOTES_MAX_LENGTH = 400;

export interface HandoffOrder {
  /** One line per cart line, joined with newlines, plus the shipping line. */
  servicesPlainString: string;
  /** The order total, already rounded to two decimals. */
  total: string;
  /** The shop code, or the show name in card-show mode. */
  storeCode: string;
  /** Free text from "Additional Instructions". Never carries minimum-grade data. */
  customerNotes: string;
  cashAtShow: boolean;
  /**
   * The policy acknowledgement, or null when the box is unticked. Complete Order is
   * already gated on the box, so a null here never reaches a rendered QR — but the
   * field is REQUIRED so every caller decides, rather than an optional silently
   * defaulting the record away.
   */
  policy: PolicyAcknowledgement | null;
}

export interface PolicyAcknowledgement {
  /** UTC ISO 8601, captured at the moment the box was TICKED, not at submit. */
  acknowledgedAt: string;
  /** POLICY_VERSION at render time — which text was on screen that day. */
  version: string;
}

/**
 * `totalAmount`, `paymentAmount` and `totalAmountBridge` are three different JotForm
 * fields that all receive the same figure — that is the form's design, not a bug, and
 * removing one silently breaks payment on the far side.
 */
/**
 * The Q6 variation fragment of an order line — ` (Authenticate Only)` — or '' when the
 * routing slot holds a placeholder rather than a variation.
 *
 * ⚠️ `questions[5]` IS THE PRODUCT, not routing metadata (ruled 2026-08-10):
 * "Authenticate Only" means no grade for the card or the autograph — the slab comes
 * back sealed and labelled Authentic, at the same price as grading. The shop invoices
 * and submits from the line this fragment lands on, so dropping it changes what the
 * customer receives and nothing on any screen errors. That is not hypothetical: the
 * same-outcome question collapse conflated these variations for a few hours the same
 * day, and was withdrawn for exactly this reason. handoff.test.ts pins the VALUE all
 * the way into the URL.
 */
export const variationHandoffFragment = (q6: string | undefined): string => {
  if (!q6) return '';
  const normalized = q6.toLowerCase();
  if (normalized === 'skip question' || normalized === 'either' || normalized === 'x') return '';
  return ` (${q6})`;
};

export const buildHandoffUrl = (order: HandoffOrder): string => {
  const base = order.cashAtShow ? JOTFORM_CASH_FORM : JOTFORM_CARD_FORM;
  const params = [
    `totalAmount=${order.total}`,
    `paymentAmount=${order.total}`,
    `servicesOrdered=${encodeURIComponent(order.servicesPlainString)}`,
    `storecode=${encodeURIComponent(order.storeCode)}`,
    `customernotes=${encodeURIComponent(order.customerNotes)}`,
    `totalAmountBridge=${order.total}`,
  ];
  if (order.policy) {
    // ⚠️ THE CASING OF THESE THREE LITERALS IS LOAD-BEARING. The JotForm fields were
    // hand-corrected to exactly this camelCase (JotForm auto-generates lowercase); a
    // mismatch does not error — JotForm silently stores NOTHING, forever, on every
    // order. Do not tidy them, derive them, or reword them.
    params.push(
      'policyAcknowledged=Yes',
      `policyAcknowledgedAt=${encodeURIComponent(order.policy.acknowledgedAt)}`,
      `policyVersion=${encodeURIComponent(order.policy.version)}`,
    );
  }
  return `${base}?${params.join('&')}`;
};

/** One order line in both the form we would like to send and the form we can fall back to. */
export interface HandoffLine {
  full: string;
  /** The same line without its estimated-completion date. */
  compact: string;
}

export interface HandoffFit {
  /** null when even the compact payload will not fit — the caller must not render a QR. */
  url: string | null;
  /** True when estimated dates were dropped to make the order fit. */
  droppedDates: boolean;
}

/**
 * Build the largest handoff URL that will actually encode.
 *
 * The degradation is deliberately ordered by what costs the customer least:
 *
 *  1. The full order.
 *  2. The order without `— EST: <date>` on each line. The date is not information the
 *     shop needs from this string — it is `today + the service's business days`, it is on
 *     the screen the customer just came from, and it is the single most expensive field
 *     per line. Dropping it buys roughly a third of the payload back.
 *  3. Nothing. Every remaining field is something a customer chose and is paying for —
 *     services, quantities, prices, minimum grades. Silently discarding one of those to
 *     make a QR fit would send the shop an order the customer did not place, which is
 *     worse than not sending one. The caller shows an attendant-assist screen instead.
 *
 * Note what is NOT dropped at step 2: minimum grades and card references. A minimum grade
 * is a term the customer is financially exposed to — it must reach the shop or the order
 * must not go through automatically.
 */
export const fitHandoffUrl = (
  payload: Omit<HandoffOrder, 'servicesPlainString'> & {
    lines: HandoffLine[];
    shippingLine: string;
  },
): HandoffFit => {
  const { lines, shippingLine, ...rest } = payload;

  const attempt = (bodies: string[]) => {
    const url = buildHandoffUrl({ ...rest, servicesPlainString: [...bodies, shippingLine].join('\n') });
    return urlByteLength(url) <= QR_BYTE_BUDGET ? url : null;
  };

  const full = attempt(lines.map((l) => l.full));
  if (full) return { url: full, droppedDates: false };

  const compact = attempt(lines.map((l) => l.compact));
  if (compact) return { url: compact, droppedDates: true };

  return { url: null, droppedDates: false };
};
