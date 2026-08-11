/**
 * THE ORDER, DRAWN ONCE, WHEREVER THE CUSTOMER IS.
 *
 * There used to be three drawings of one idea: a dark "ESTIMATED TOTAL" box sitting
 * beside a separate green "CART (1)" button on the results screen, a floating bar
 * pinned to the bottom of the landing, and a bare count badge stuck on the questions
 * screen's home button. Three shapes for "here is your order" means a customer has to
 * re-learn it on every screen — and on the results screen the box-plus-button pair
 * asked them to work out which half was pressable, because only one of them was.
 *
 * So: ONE component, one tap target, the whole surface. Bag, label, money, count and a
 * chevron that says it goes somewhere.
 *
 * ⚠️ THE LABEL IS "ORDER TOTAL", NEVER "SUBTOTAL". The figure includes the $24.00
 * shipping and insurance — $108.99 is $84.99 + $24.00 — and calling a
 * shipping-inclusive figure a subtotal tells the customer more is coming when nothing
 * is. This project already found and fixed that exact defect once; do not reintroduce
 * the word. "TOTAL SO FAR" replaces it whenever a minimum-priced line makes the whole
 * total a floor, which is the rule the checkout summary has always used.
 *
 * ⚠️ MONEY AND COUNT ARRIVE AS PROPS, FROM ONE SOURCE. They were computed inline at
 * every call site before, which is how two screens end up disagreeing about one order.
 * App.tsx derives `total` and `cardCount` once and hands them here.
 *
 * TWO STATES, AND THE LOUD ONE IS LOAD-BEARING. The bar this replaces existed because
 * an order the customer cannot see or reach is worse than no order at all — persistence
 * without a way back in is a trap. A top-right chip is inherently quieter than a
 * centred bottom bar, so when an order exists this goes GREEN and filled: readable at a
 * glance from a few feet, which is the distance the old bar was solving for. Empty, it
 * drops to a dim outline — present so the control does not pop into existence and shift
 * the header the moment a first card is added, but never competing with the prices.
 */

import React from 'react';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { formatUSD } from '../pricing';

export interface OrderTotalProps {
  /**
   * CARDS, not cart lines — the sum of every line's quantity. The shipping fee is the
   * only thing that counts lines, and it does that in pricing.ts.
   */
  cardCount: number;
  /** The order total, shipping and insurance already included. */
  total: number;
  /**
   * True when any line is priced from a minimum, which makes the WHOLE total a floor.
   * Comes from the same `cartHasMinimumPricedItem` the checkout summary reads.
   */
  isMinimum: boolean;
  /** Opens the checkout. The entire component is this one target. */
  onOpen: () => void;
  /** Placement only — margins and alignment belong to the screen, not to this. */
  className?: string;
}

const OrderTotal: React.FC<OrderTotalProps> = ({
  cardCount,
  total,
  isMinimum,
  onOpen,
  className = '',
}) => {
  const hasOrder = cardCount > 0;

  return (
    <button
      onClick={onOpen}
      aria-label={
        hasOrder
          ? `Your order, ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}, ${formatUSD(total)}. Open checkout.`
          : 'Your order is empty. Open checkout.'
      }
      className={`flex min-h-[56px] items-center gap-4 rounded-2xl border-2 px-5 py-2.5 text-left transition-all active:scale-[0.98] ${
        hasOrder
          ? 'border-m2m-green bg-m2m-green/[0.12] shadow-[0_0_22px_rgba(0,200,5,0.18)] hover:bg-m2m-green/[0.18]'
          : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
      } ${className}`}
    >
      <ShoppingBag className={`h-6 w-6 shrink-0 ${hasOrder ? 'text-m2m-green' : 'text-zinc-600'}`} />

      {hasOrder ? (
        <>
          <span className="leading-tight">
            {/* The label and the count stack, so the money keeps its own column and
                stays the largest thing here — it is what the customer is checking. */}
            {/* 14px, not 13: this chip renders on the results screen, and the same
                change set raised every other sub-14px label there to the 14px floor.
                A shared component that undercuts the floor it ships beside would make
                its own label the smallest customer-facing type on that screen. */}
            <span className="block text-[14px] font-bold uppercase tracking-[1.4px] text-m2m-green">
              {isMinimum ? 'Total so far' : 'Order total'}
            </span>
            <span className="block text-[14px] font-semibold text-m2m-ink2">
              {cardCount} {cardCount === 1 ? 'card' : 'cards'}
            </span>
          </span>
          <span className="tabular-nums text-2xl font-extrabold leading-none text-m2m-ivory">
            {formatUSD(total)}
          </span>
          <ChevronRight className="h-6 w-6 shrink-0 text-m2m-green" />
        </>
      ) : (
        <>
          <span className="text-[15px] font-semibold text-zinc-500">Your order is empty</span>
          <ChevronRight className="h-6 w-6 shrink-0 text-zinc-700" />
        </>
      )}
    </button>
  );
};

export default OrderTotal;
