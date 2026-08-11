/**
 * THE HERO ROTATION — a CURATED set of real Market2Mint submissions.
 *
 * This file is the wiring point for the feed direction ruled 2026-08-08 (design record
 * §5b/§5c): the ticker goes data-driven first; the hero stays a curated list a human
 * edits, because it needs a straight-on slab PHOTOGRAPH, which arrives via PSA's dealer
 * account, not the dashboard. Shop-aware weighting and the authenticated photo grabber
 * come later — when they do, they replace THIS ARRAY and nothing else.
 *
 * Curation rules (Cayden):
 *  · REAL submissions only — the point is "your card could be up here".
 *  · Grade floor: 10 and 9.5 only.
 *  · 🔴 NEVER a customer's name. Card, grade, company — nothing else.
 *  · Three graders, three collector worlds. Known gap: no sports rookie card yet.
 *
 * Images are FILES imported by Vite — cached, compressed, out of the JS bundle. Each is
 * ~900px tall; the hero renders at ≤452px. All three are cropped to near-identical
 * framing on near-black; the hero sizes them BY HEIGHT, so their differing widths read
 * as real slab proportions — and the two holder types genuinely differ: a PSA holder
 * is ~0.619 wide-to-tall, a BGS holder ~0.636. Aspects here: Messi 0.619 (PSA),
 * Gengar 0.619 (PSA), Pikachu 0.641 (BGS).
 *
 * ⚠️ CORRECTED 2026-08-10: the first exports shipped Messi and Gengar at 0.591 — ~4.5%
 * too tall — while this comment claimed they "read as real slab proportions". They did
 * not; that was the squished-and-tall look. The fix PADDED the canvases out to true
 * PSA aspect (photographs untouched, never stretched). If a slab ever looks narrow or
 * tall again, measure the file's aspect against the holder type before touching CSS.
 *
 * 🔒 BUNDLE BUDGET (Cayden 2026-08-09): the curated set is capped at FOUR slabs and
 * ~450KB total. The idle-video costing already concluded video cannot ride in the
 * bundle; images must not creep the same way one card at a time. Adding a slab means
 * compressing it to fit the budget, or removing one. `heroSlabs.test.ts` enforces
 * both limits mechanically — it will fail the build gate, not just this comment.
 */
import slabMessi from './assets/slab_messi.jpg';
import slabPikachu from './assets/slab_pikachu.jpg';
import slabGengar from './assets/slab_gengar.jpg';

export interface HeroSlab {
  src: string;
  /** Screen-reader text; card, grade and company only. */
  alt: string;
}

export const HERO_SLABS: readonly HeroSlab[] = [
  { src: slabMessi, alt: 'PSA 10 — 2026 Prizm World Cup Lionel Messi auto' },
  { src: slabPikachu, alt: 'BGS 10 Pristine — 2026 Mega Evolution Pikachu ex SIR' },
  { src: slabGengar, alt: 'PSA Auto 10 — 2006 Pokemon EX Gengar, signed' },
];

/**
 * 9s dwell per card, 1.2s crossfade. 9 deliberately does NOT divide the 14s turn, so
 * the swap lands at a different angle each cycle and never reads as a scripted loop.
 */
export const HERO_DWELL_MS = 9000;
