/**
 * THE SPEED SUMMARY at the top of the results screen.
 *
 * When a customer lands on a list of services, the useful question is "how fast, and how
 * much" — so the screen leads with a small set of shortcut cards ordered by turnaround.
 *
 * ⚠️ THE RULE THAT MATTERS: **summarising is only allowed when something is left to
 * summarise.** An earlier version always reduced the list to LONGEST / MIDDLE / FASTEST,
 * which on a four-service result set silently dropped one — PSA Regular Ticket was
 * unreachable from the summary for exactly that reason. A service a customer cannot see
 * is a service they cannot buy, so this is lost revenue, not a cosmetic defect.
 *
 * Extracted from App.tsx and made pure on 2026-08-07 so the boundary can be tested. The
 * bug itself was fixed in Phase 2b; this is what stops it coming back.
 */

export interface TierCandidate {
  name: string;
  /** Turnaround in business days. */
  businessDays: number;
}

export interface TierCard<T> {
  /** '' when every service is shown — there is nothing to contrast it against. */
  label: '' | 'LONGEST WAIT' | 'MIDDLE' | 'FASTEST';
  service: T;
  /** Index into the ORIGINAL list, because tapping a card scrolls to that tile. */
  index: number;
}

/**
 * At or below this many services, show all of them. Above it, summarise to three.
 *
 * Four rather than three: three is the size of the summary itself, so summarising a
 * four-item list saves one row and costs a whole service. The saving only starts to be
 * worth anything at five.
 */
export const SHOW_ALL_AT_OR_BELOW = 4;

/**
 * Build the summary cards, slowest first.
 *
 * Slowest-to-fastest because price climbs with speed, so it reads cheapest-first — which
 * is the order a customer expects to be shown options in, and the order that does not feel
 * like an upsell.
 */
export const summariseTiers = <T extends TierCandidate>(services: T[]): TierCard<T>[] => {
  // One service needs no summary — the single tier card below it IS the choice, and a
  // shortcut to the only option is noise.
  if (services.length <= 1) return [];

  const sorted = [...services].sort((a, b) => b.businessDays - a.businessDays);
  const cardFor = (service: T, label: TierCard<T>['label']): TierCard<T> => ({
    label,
    service,
    index: services.indexOf(service),
  });

  if (sorted.length <= SHOW_ALL_AT_OR_BELOW) {
    // No labels: with everything on screen there is nothing to contrast against, and
    // calling one of four "MIDDLE" is meaningless.
    return sorted.map((s) => cardFor(s, ''));
  }

  return [
    cardFor(sorted[0], 'LONGEST WAIT'),
    cardFor(sorted[Math.floor(sorted.length / 2)], 'MIDDLE'),
    cardFor(sorted[sorted.length - 1], 'FASTEST'),
  ];
};
