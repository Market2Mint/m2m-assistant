/**
 * The footer QR's scannability floor, enforced (Cayden 2026-08-09).
 *
 * The QR renders 90px of actual code in a fixed, protected box. Scannability is
 * px-per-module, and the module count is a FUNCTION OF THE URL: a longer address
 * bumps the QR version, the modules rise, and the code silently shrinks below the
 * floor with no error anywhere. This test renders the real component with the real
 * URL and does the division, so "just changing the URL" has to prove it still scans.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { describe, expect, it } from 'vitest';
import { QR_DESTINATION } from './landingStrings';

/** Must match the rendered code area in renderLanding: 100px box − 2×5px padding. */
const QR_CODE_PX = 90;
/** Below this a 2x iPad camera at arm's length stops locking on. */
const MIN_PX_PER_MODULE = 3.1;

const moduleCount = (value: string): number => {
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value, size: QR_CODE_PX }));
  const viewBox = svg.match(/viewBox="0 0 (\d+) \1"/);
  expect(viewBox, `no square viewBox in rendered QR svg: ${svg.slice(0, 120)}`).not.toBeNull();
  return Number(viewBox![1]);
};

describe('footer QR stays scannable', () => {
  it('is the settled destination', () => {
    // The address the footer prints beside the code. Changing it is a Cayden call —
    // and it re-runs the module math below.
    expect(QR_DESTINATION).toBe('https://market2mint.com');
  });

  it(`renders at or above ${MIN_PX_PER_MODULE}px per module`, () => {
    const modules = moduleCount(QR_DESTINATION);
    const pxPerModule = QR_CODE_PX / modules;
    expect(
      pxPerModule,
      `${QR_DESTINATION} encodes as ${modules} modules = ${pxPerModule.toFixed(2)}px/module ` +
        `in the ${QR_CODE_PX}px code area — under the ${MIN_PX_PER_MODULE} floor. ` +
        'Shorten the URL or grow the (protected) QR box; do not ship a code that does not scan.',
    ).toBeGreaterThanOrEqual(MIN_PX_PER_MODULE);
  });

  it('pins today’s module count so drift is loud, not silent', () => {
    // 25 modules (version 2) as approved 2026-08-09 at 3.60px/module. If this fails
    // the URL changed — rerun the scan check on real hardware before re-pinning.
    expect(moduleCount(QR_DESTINATION)).toBe(25);
  });
});
