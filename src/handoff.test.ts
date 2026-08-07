import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { ACTIVE_SERVICES } from './serviceMenu';
import {
  CARD_REFERENCE_MAX_LENGTH,
  minimumGradeHandoffFragment,
  supportsMinimumGrade,
} from './minimumGrade';
import {
  CUSTOMER_NOTES_MAX_LENGTH,
  JOTFORM_CARD_FORM,
  JOTFORM_CASH_FORM,
  QR_BYTE_BUDGET,
  QR_ERROR_CORRECTION_LEVEL,
  buildHandoffUrl,
  fitHandoffUrl,
  urlByteLength,
} from './handoff';

/**
 * Encode with the SAME encoder the kiosk uses, at the SAME level. Returns the QR's module
 * count, or null if the payload is over capacity — which is the case that blanks a real
 * kiosk, because qrcode.react throws from inside render and the app has no error boundary.
 */
const encode = (value: string, level = QR_ERROR_CORRECTION_LEVEL): number | null => {
  try {
    const svg = renderToStaticMarkup(
      React.createElement(QRCodeSVG, { value, level, size: 320, includeMargin: false }),
    );
    return Number(svg.match(/viewBox="0 0 (\d+)/)![1]);
  } catch {
    return null;
  }
};

const longestNameWhere = (predicate: (s: (typeof ACTIVE_SERVICES)[number]) => boolean) =>
  [...ACTIVE_SERVICES].filter(predicate).sort((a, b) => b.name.length - a.name.length)[0].name;

/** The longest service name in the live menu — measured, so a new service re-tightens it. */
const LONGEST_SERVICE_NAME = longestNameWhere(() => true);

/**
 * The longest name among services that can actually carry a minimum grade. Using the
 * overall longest for a minimum-grade line would test an order that cannot exist: nothing
 * named "CGC Standard Video…" offers the control.
 */
const LONGEST_MIN_GRADE_SERVICE_NAME = longestNameWhere(supportsMinimumGrade);

/** A cart line at its most expensive: longest real name, oversized, and a variation. */
const worstLine = (name: string, minimumGrade: number | null, cardReference: string) => {
  const fragment = minimumGradeHandoffFragment({ minimumGrade, cardReference });
  const body = `• ${name} — OVERSIZED (Aftermarket)${fragment} - $1,234.56 (x3)`;
  return { full: `${body} — EST: Mon, Sep 14, 2026`, compact: body };
};

const worstOrder = (lineCount: number, withMinimumGrade: boolean, notes = '') =>
  fitHandoffUrl({
    lines: Array.from({ length: lineCount }, () =>
      withMinimumGrade
        ? worstLine(LONGEST_MIN_GRADE_SERVICE_NAME, 8.5, 'M'.repeat(CARD_REFERENCE_MAX_LENGTH))
        : worstLine(LONGEST_SERVICE_NAME, null, ''),
    ),
    shippingLine: '• Shipping & Insurance - $24.00',
    total: '12345.67',
    storeCode: 'NTX Dallas Card Show',
    customerNotes: notes,
    cashAtShow: false,
  });

/** A line a customer actually produces: a common service, no oversized, no variation. */
const typicalLine = {
  full: '• PSA Regular - $84.99 (x1) — EST: Mon, Sep 14, 2026',
  compact: '• PSA Regular - $84.99 (x1)',
};

const typicalOrder = (lineCount: number) =>
  fitHandoffUrl({
    lines: Array.from({ length: lineCount }, () => typicalLine),
    shippingLine: '• Shipping & Insurance - $24.00',
    total: '1,000.00',
    storeCode: 'HH',
    customerNotes: '',
    cashAtShow: false,
  });

describe('the QR byte budget is the encoder\'s real capacity', () => {
  // QR_BYTE_BUDGET is what stops the kiosk building a URL that would throw. If it is even
  // one byte high, the guard passes an order straight into the crash it exists to prevent.
  // So it is checked against the encoder in both directions rather than trusted.
  it('accepts a payload of exactly the budget', () => {
    expect(encode('x'.repeat(QR_BYTE_BUDGET))).not.toBeNull();
  });

  it('rejects one byte more', () => {
    expect(encode('x'.repeat(QR_BYTE_BUDGET + 1))).toBeNull();
  });

  it('must be measured on the encoded URL — an em dash costs nine bytes there', () => {
    // The trap: the order lines are full of "—", which is ONE character in the string the
    // kiosk builds and NINE (%E2%80%94) once it reaches the URL. Sizing the payload from
    // the readable order text understates it roughly threefold, which is more than the
    // entire margin the guard has to work with.
    const order = '—'.repeat(100);
    const url = buildHandoffUrl({
      servicesPlainString: order,
      total: '0.00',
      storeCode: 'HH',
      customerNotes: '',
      cashAtShow: false,
    });
    expect(urlByteLength(url)).toBeGreaterThan(order.length * 8);

    // urlByteLength and .length agree today only because every parameter is percent
    // encoded, which yields ASCII. That is a property of buildHandoffUrl, not a law — if
    // a raw parameter is ever added, .length starts lying and this measure keeps working.
    expect(urlByteLength(url)).toBe(url.length);
    expect(urlByteLength('—')).toBe(3);
  });
});

describe('a realistic worst-case order still scans', () => {
  // The brief's bar is "10+ cards, long names". A CARD is not a LINE — a line carries a
  // quantity, so ten cards is commonly one to three lines. The figures below are measured
  // at level M, not chosen; each is the largest order of that shape that still fits, and
  // they are asserted so that a change to the payload format shows up as a failure here
  // rather than as a blank kiosk in a shop.
  //
  // For contrast, at the level H this shipped with: a plain worst-case order failed at
  // SEVEN lines and a minimum-grade one at FOUR, with no guard and no error boundary.

  it('carries twenty typical lines — the shape a customer actually builds', () => {
    // "PSA Regular ×1", twenty times over. Comfortably past any real order.
    const { url, droppedDates } = typicalOrder(20);
    expect(url).not.toBeNull();
    expect(encode(url!)).not.toBeNull();
    expect(droppedDates).toBe(false);
  });

  it('carries ten pathological plain lines with dates intact', () => {
    // Longest service name in the menu, oversized, with a variation — on all ten lines.
    const { url, droppedDates } = worstOrder(10, false);
    expect(url).not.toBeNull();
    expect(encode(url!)).not.toBeNull();
    expect(droppedDates).toBe(false);
  });

  it('carries seven pathological minimum-grade lines with dates intact', () => {
    // Every line: longest PSA card name, oversized, a variation, a minimum grade AND an
    // 80-character card reference. Seven of those is not an order anyone assembles on a
    // touch screen; §5.2b's own worked example is two lines.
    const { url, droppedDates } = worstOrder(7, true);
    expect(url).not.toBeNull();
    expect(encode(url!)).not.toBeNull();
    expect(droppedDates).toBe(false);
  });

  it('carries eight of them by dropping only the estimated dates', () => {
    const { url, droppedDates } = worstOrder(8, true);
    expect(url).not.toBeNull();
    expect(encode(url!)).not.toBeNull();
    expect(droppedDates).toBe(true);
  });

  it('carries five even with a full-length instructions note on top', () => {
    const { url } = worstOrder(5, true, 'N'.repeat(CUSTOMER_NOTES_MAX_LENGTH));
    expect(url).not.toBeNull();
    expect(encode(url!)).not.toBeNull();
  });

  it('never hands the encoder something it will throw on', () => {
    // The whole point of the guard. Sweep far past any plausible order and assert that
    // whenever fitHandoffUrl returns a URL, that URL actually encodes.
    for (let lines = 1; lines <= 60; lines++) {
      for (const withGrade of [false, true]) {
        const { url } = worstOrder(lines, withGrade);
        if (url !== null) {
          expect(encode(url), `${lines} lines, minimum grade ${withGrade}`).not.toBeNull();
        }
      }
    }
  });
});

describe('how the order degrades when it will not fit', () => {
  it('sends the full order, dates included, whenever it fits', () => {
    const { url, droppedDates } = worstOrder(2, true);
    expect(droppedDates).toBe(false);
    expect(url).toContain(encodeURIComponent('EST: Mon, Sep 14, 2026'));
  });

  it('drops estimated dates before it drops anything a customer chose', () => {
    // Find the first size that will not fit at full detail and check what gives way.
    let size = 1;
    while (size < 80 && !worstOrder(size, true).droppedDates) size += 1;
    const { url, droppedDates } = worstOrder(size, true);
    expect(droppedDates).toBe(true);
    expect(url).not.toBeNull();

    const decoded = decodeURIComponent(url!);
    expect(decoded).not.toContain('EST:');
    // Everything the customer chose and is paying for survives.
    expect(decoded).toContain('MIN GRADE 8.5');
    expect(decoded).toContain('OVERSIZED');
    expect(decoded).toContain('$1,234.56');
    expect(decoded).toContain('(x3)');
    expect(decoded).toContain('Shipping & Insurance - $24.00');
  });

  it('refuses rather than silently discarding a minimum grade', () => {
    // A minimum grade is a term the customer is financially exposed to. If it cannot
    // reach the shop, the order must not go through automatically — the caller shows an
    // attendant-assist screen instead. Returning a URL with the grade quietly stripped
    // would send the shop an order the customer did not place.
    const { url } = worstOrder(400, true);
    expect(url).toBeNull();
  });

  it('reports droppedDates as false when it gives up entirely', () => {
    expect(worstOrder(400, true)).toEqual({ url: null, droppedDates: false });
  });
});

describe('buildHandoffUrl', () => {
  it('sends every JotForm money field the same figure', () => {
    // totalAmount, paymentAmount and totalAmountBridge are three separate JotForm fields
    // that all take the total. That is the form's design; dropping one breaks payment.
    const url = buildHandoffUrl({
      servicesPlainString: '• PSA Regular - $84.99 (x1)',
      total: '108.99',
      storeCode: 'HH',
      customerNotes: '',
      cashAtShow: false,
    });
    expect(url).toContain('totalAmount=108.99');
    expect(url).toContain('paymentAmount=108.99');
    expect(url).toContain('totalAmountBridge=108.99');
  });

  it('routes cash at a show to the cash form and everything else to the card form', () => {
    const order = {
      servicesPlainString: 'x',
      total: '1.00',
      storeCode: 'HH',
      customerNotes: '',
    };
    expect(buildHandoffUrl({ ...order, cashAtShow: true }).startsWith(JOTFORM_CASH_FORM)).toBe(true);
    expect(buildHandoffUrl({ ...order, cashAtShow: false }).startsWith(JOTFORM_CARD_FORM)).toBe(
      true,
    );
  });

  it('encodes newlines and ampersands so the order cannot forge a query parameter', () => {
    const url = buildHandoffUrl({
      servicesPlainString: '• A\n• B & C',
      total: '1.00',
      storeCode: 'HH',
      customerNotes: '&totalAmount=0.01',
      cashAtShow: false,
    });
    // Exactly six parameters, whatever the customer typed.
    expect(url.split('&').length).toBe(6);
    expect(url).toContain('customernotes=%26totalAmount%3D0.01');
  });
});
