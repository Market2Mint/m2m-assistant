/**
 * THE SPEED SUMMARY at the top of the results screen.
 *
 * When a customer lands on a list of services, the useful question is "how fast, and how
 * much" — so the screen leads with a small set of shortcut cards.
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
  /** The customer price in dollars — the display sort key. Cheapest renders first. */
  customerPrice: number;
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
 * The one display order, shared by the summary cards and the tile list below them:
 * cheapest first, and at the same price the faster service first (strictly better, so
 * it belongs ahead). Both lists must sort with THIS comparator — if they disagree,
 * tapping a card scrolls to a seemingly random position in the list.
 */
export const byPriceAscending = <T extends TierCandidate>(a: T, b: T): number =>
  a.customerPrice - b.customerPrice || a.businessDays - b.businessDays;

/**
 * Build the summary cards, cheapest first.
 *
 * The display order is CUSTOMER PRICE ASCENDING. An earlier version sorted by
 * turnaround, slowest first, on the assumption that price climbs with speed so it would
 * read cheapest-first anyway. That assumption is false wherever a Dual variant sits
 * between two speed tiers — the live crossover chooser rendered $204, $154, $354 — so
 * the price sort is now explicit. Cheapest-first is the order a customer expects and
 * the one that does not open with an upsell, which was the original intent.
 *
 * LABELS are derived from `businessDays`, independent of the display order — a card's
 * label describes the service it sits on, never the position it renders at. They stay
 * speed-based rather than price-based because the label answers the one question the
 * card's own figures don't already shout: the price is the largest thing on the card,
 * so "CHEAPEST" would repeat it, while relative wait is only knowable by reading all
 * three turnarounds. A service that is both cheapest and fastest is labelled FASTEST
 * and renders first — label and position agree, nothing is hidden.
 */
export const summariseTiers = <T extends TierCandidate>(services: T[]): TierCard<T>[] => {
  // One service needs no summary — the single tier card below it IS the choice, and a
  // shortcut to the only option is noise.
  if (services.length <= 1) return [];

  const cardFor = (service: T, label: TierCard<T>['label']): TierCard<T> => ({
    label,
    service,
    // Into the ORIGINAL list — the sorts below work on copies and must never leak here.
    index: services.indexOf(service),
  });

  if (services.length <= SHOW_ALL_AT_OR_BELOW) {
    // No labels: with everything on screen there is nothing to contrast against, and
    // calling one of four "MIDDLE" is meaningless.
    return [...services].sort(byPriceAscending).map((s) => cardFor(s, ''));
  }

  // Five or more: summarise. The REPRESENTATIVES are still chosen by speed — the
  // summary exists so a long list still shows the full spread of waits — but they are
  // DISPLAYED cheapest-first like everything else, each carrying the label for what it
  // actually is. (Position-derived labels would lie here: sorted by price, the cheapest
  // card is not necessarily the slowest.)
  const bySpeed = [...services].sort((a, b) => b.businessDays - a.businessDays);
  const picked = [
    cardFor(bySpeed[0], 'LONGEST WAIT'),
    cardFor(bySpeed[Math.floor(bySpeed.length / 2)], 'MIDDLE'),
    cardFor(bySpeed[bySpeed.length - 1], 'FASTEST'),
  ];
  return picked.sort((a, b) => byPriceAscending(a.service, b.service));
};
