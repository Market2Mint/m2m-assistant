/**
 * THE POINT OF THE WHOLE ACKNOWLEDGEMENT EXERCISE.
 *
 * Every order records `policyVersion` — WHICH policy text the customer agreed to. That
 * record is only worth something if the version actually moves when the text moves. A
 * stale version is worse than none: it asserts a customer agreed to text they never saw.
 *
 * So this test hashes every piece of copy the acknowledgement covers and pins the hash
 * against POLICY_VERSION. Change the text → the hash moves → this fails until
 * POLICY_VERSION is bumped and the pin below is updated WITH it. Neither can drift alone.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  POLICY,
  POLICY_VERSION,
  PRIVACY_POLICY_SECTIONS,
  SUBMISSION_POLICY_SECTIONS,
  TERMS_OF_USE_SECTIONS,
} from './data';

/**
 * Everything the checkbox's "all Market 2 Mint service policies" reaches: the checkout
 * POLICY list the customer is looking at when they tick, plus the three policy documents
 * behind the footer links. Key order is part of the canonical form — do not reorder.
 */
const acknowledgedText = () =>
  JSON.stringify({
    POLICY,
    TERMS_OF_USE_SECTIONS,
    SUBMISSION_POLICY_SECTIONS,
    PRIVACY_POLICY_SECTIONS,
  });

/**
 * ── THE PIN ──
 * When the test below fails, a policy text changed. The fix is THREE steps, together:
 *   1. bump POLICY_VERSION in src/data.ts to today's date,
 *   2. update `version` here to match,
 *   3. update `hash` to the new value printed in the failure message.
 * Updating the hash WITHOUT bumping the version defeats the entire record — every order
 * would claim agreement to text the customer never saw.
 */
const PINNED = {
  version: '2026-08-09',
  hash: 'ca2482191c13190c6c7ee219670994f8be79c64cae88490e1513d8da269c2e42',
};

describe('POLICY_VERSION moves when, and only when, the policy text moves', () => {
  it('is an ISO date', () => {
    expect(POLICY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(POLICY_VERSION))).toBe(false);
  });

  it('matches the pinned version', () => {
    expect(
      POLICY_VERSION,
      'POLICY_VERSION changed but the pin in policyVersion.test.ts did not — update PINNED.version alongside it',
    ).toBe(PINNED.version);
  });

  it('the acknowledged text still hashes to the pinned value', () => {
    const hash = createHash('sha256').update(acknowledgedText()).digest('hex');
    expect(
      hash,
      `The policy text changed. Every order records policyVersion='${POLICY_VERSION}' as proof of ` +
        'WHAT the customer agreed to, so the text may not change silently: ' +
        '(1) bump POLICY_VERSION in src/data.ts to today, (2) update PINNED.version, ' +
        `(3) update PINNED.hash to '${hash}'. All three together — see the comment on PINNED.`,
    ).toBe(PINNED.hash);
  });
});
