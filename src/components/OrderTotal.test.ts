/**
 * THE ORDER CHIP'S RULES, PINNED AGAINST THE REAL RENDER.
 *
 * Two of these guard defects this project has actually shipped:
 *
 *  · "SUBTOTAL" ON A SHIPPING-INCLUSIVE FIGURE. This chip's number includes the $24.00
 *    shipping and insurance, so calling it a subtotal promises the customer more is
 *    coming when nothing is. The cart's own summary DOES legitimately have a Subtotal
 *    row — the services line, before shipping is added — so the word cannot simply be
 *    banned across the app. It is banned HERE, where the figure is the whole total.
 *
 *  · TWO HALVES, ONE PRESSABLE. The pair this replaced was a dark total box beside a
 *    green button, and only the button did anything. The one-button assertion below is
 *    what stops that growing back.
 *
 * Rendered with renderToStaticMarkup, the same way qrDestination.test.ts renders the
 * real QR — the tests run in a node environment, so this is markup, not a DOM.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import OrderTotal, { type OrderTotalProps } from './OrderTotal';

const render = (props: Partial<OrderTotalProps> = {}): string =>
  renderToStaticMarkup(
    createElement(OrderTotal, {
      cardCount: 2,
      total: 108.99,
      isMinimum: false,
      onOpen: () => {},
      ...props,
    }),
  );

/** Tag text only — class names carry colour words that are not customer copy. */
const visibleText = (markup: string): string =>
  markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('OrderTotal', () => {
  it('is ONE tap target, whole', () => {
    // Both states, because the empty one is a different branch.
    expect(render().match(/<button/g)).toHaveLength(1);
    expect(render({ cardCount: 0, total: 0 }).match(/<button/g)).toHaveLength(1);
  });

  it('never calls a shipping-inclusive figure a subtotal', () => {
    for (const props of [{}, { isMinimum: true }, { cardCount: 0, total: 0 }]) {
      expect(visibleText(render(props)).toLowerCase()).not.toContain('subtotal');
    }
  });

  it('says ORDER TOTAL, and TOTAL SO FAR when a line is priced from a minimum', () => {
    expect(visibleText(render())).toContain('Order total');
    expect(visibleText(render())).not.toContain('Total so far');

    expect(visibleText(render({ isMinimum: true }))).toContain('Total so far');
    expect(visibleText(render({ isMinimum: true }))).not.toContain('Order total');
  });

  it('states the money with both decimals, and the count in cards', () => {
    const two = visibleText(render());
    expect(two).toContain('$108.99');
    expect(two).toContain('2 cards');

    // Singular is not "1 cards".
    const one = visibleText(render({ cardCount: 1, total: 31.0 }));
    expect(one).toContain('1 card');
    expect(one).not.toContain('1 cards');
    // Whole-dollar amounts keep both decimals — prices are never "$31".
    expect(one).toContain('$31.00');
  });

  it('shows no money at all when the order is empty', () => {
    // A quiet chip is the point; "$0.00" would read as a price the customer is paying.
    const empty = visibleText(render({ cardCount: 0, total: 0 }));
    expect(empty).not.toContain('$');
    expect(empty.toLowerCase()).toContain('empty');
  });

  it('goes green only when there is an order to see', () => {
    // The bar this replaced was centred at the bottom of the screen; a top-right chip
    // is quieter, so the filled green state is doing that work now.
    expect(render()).toContain('border-m2m-green');
    expect(render({ cardCount: 0, total: 0 })).not.toContain('border-m2m-green');
  });
});
