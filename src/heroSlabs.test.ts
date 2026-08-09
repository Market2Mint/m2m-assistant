/**
 * The hero bundle budget, enforced (Cayden 2026-08-09): at most FOUR slabs, ~450KB of
 * image total. Video was ruled off the bundle in the idle-video costing; this stops
 * images creeping the same way one "just one more card" at a time. Every kiosk
 * downloads these on every update — the budget is fleet bandwidth, not disk.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HERO_SLABS } from './heroSlabs';

const ASSETS = join(__dirname, 'assets');
const SLAB_BUDGET_BYTES = 450 * 1024;
const SLAB_CAP = 4;

describe('hero slab budget', () => {
  it(`carries at most ${SLAB_CAP} slabs`, () => {
    expect(HERO_SLABS.length).toBeLessThanOrEqual(SLAB_CAP);
  });

  it('keeps every slab entry to card, grade and company — with an image', () => {
    for (const slab of HERO_SLABS) {
      expect(slab.src, 'slab must have an image').toBeTruthy();
      // Grade floor is 10 / 9.5 / Pristine (curation rule) — the alt must lead with
      // the grade so a screen reader hears what the display is claiming.
      expect(slab.alt).toMatch(/^(PSA|BGS|CGC|SGC|JSA|MBA)\b/);
    }
  });

  it(`keeps the slab images at or under ${SLAB_BUDGET_BYTES / 1024}KB total`, () => {
    const slabFiles = readdirSync(ASSETS).filter((f) => /^slab_.*\.(jpe?g|png|webp)$/i.test(f));
    expect(slabFiles.length, 'slab files on disk vs the cap').toBeLessThanOrEqual(SLAB_CAP);
    const total = slabFiles.reduce((sum, f) => sum + statSync(join(ASSETS, f)).size, 0);
    expect(
      total,
      `slab images total ${(total / 1024).toFixed(0)}KB — over the ~450KB budget; compress or remove one`,
    ).toBeLessThanOrEqual(SLAB_BUDGET_BYTES);
  });
});
