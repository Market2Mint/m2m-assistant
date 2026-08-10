/**
 * THE QUESTION FLOW — pure routing logic for the six-step wizard.
 *
 * Extracted from App.tsx so the whole decision tree can be enumerated and pinned in
 * tests (flow.test.ts). The auto-advance rules below decide, per path, whether the
 * kiosk answers a question on the customer's behalf — and that decision must fail a
 * test when a menu change flips it, not ship silently.
 */

/** The shape every flow function needs. App.tsx's `Service` satisfies it. */
export interface Routable {
  questions: string[];
}

/** One recorded answer. `auto` = the kiosk chose it because it was the only option. */
export interface AnswerEntry {
  value: string;
  auto: boolean;
}

/** One step of Back history. `auto` entries are skipped on rewind. */
export interface TrailEntry<T> {
  questionIdx: number;
  services: T[];
  auto?: boolean;
  wasYearQuestion?: boolean;
}

/** Narrow the service list by one answer. Pure — the only place the match rules live. */
export const filterByAnswer = <T extends Routable>(
  services: T[],
  idx: number,
  answer: string,
): T[] =>
  services.filter((s) => {
    const val = s.questions[idx];
    if (!val) return false;

    const normalizedVal = val.toLowerCase();
    if (normalizedVal === 'x' || normalizedVal === 'skip question' || normalizedVal === 'either') {
      return true;
    }

    if (idx === 4) {
      // Dynamic year matching logic
      if (answer === '1999 - Newer') {
        return normalizedVal.includes('1999') || normalizedVal.includes('2000') || normalizedVal === 'either';
      }
      if (answer === '1998 - Older') {
        return normalizedVal.includes('1998') || normalizedVal.includes('1974') || normalizedVal.includes('1975') || normalizedVal === 'either';
      }
    }

    return normalizedVal === answer.toLowerCase();
  });

export const getOptionsForQuestion = <T extends Routable>(idx: number, services: T[]): string[] => {
  if (idx === 4) {
    // Release year. The two eras are fixed strings rather than values read off the
    // services, so — unlike every other question — this one could offer an answer that
    // matches nothing. It did: every autograph service at BGS, CGC and SGC is
    // "1999 - Newer Only", so a customer with a signed pre-1999 card was offered
    // "1998 - Older" and landed on "No Matches Found".
    //
    // Offer an era only if a remaining service can actually satisfy it. Same rule the
    // other five questions have always followed: never ask what has no answer.
    const hasYearRestriction = services.some((s) => {
      const val = s.questions[4];
      if (!val) return false;
      const normalized = val.toLowerCase();
      return normalized !== 'x' && normalized !== 'skip question' && normalized !== 'either';
    });
    if (!hasYearRestriction) return [];
    return ['1999 - Newer', '1998 - Older'].filter(
      (era) => filterByAnswer(services, 4, era).length > 0,
    );
  }

  const options = new Set<string>();
  services.forEach((s) => {
    const val = s.questions[idx];
    if (val && val.toUpperCase() !== 'X' && val.toLowerCase() !== 'skip question' && val.toLowerCase() !== 'either') {
      options.add(val);
    }
  });
  return Array.from(options);
};

export const findNextValidQuestionIdx = <T extends Routable>(
  startIdx: number,
  services: T[],
): number => {
  for (let i = startIdx; i < 6; i++) {
    const options = getOptionsForQuestion(i, services);
    if (options.length > 0) return i;
  }
  return 6; // Results
};

/**
 * WHICH QUESTIONS MAY BE ANSWERED FOR THE CUSTOMER — the service/card split.
 *
 * Q1 (category), Q2 (grading company) and Q6 (variation) describe the SERVICE — what
 * M2M offers. When only one option survives there is genuinely no decision left, and a
 * screen with a single button asks the customer to confirm something they were never
 * choosing. Auto-answer those.
 *
 * Q3 ("Is the item autographed?"), Q4 ("Pack-Pulled or Aftermarket?") and Q5 (release
 * year) are claims about the CUSTOMER'S CARD. The kiosk cannot know them, so answering
 * one automatically asserts a fact about a stranger's card — "Is the item autographed?"
 * auto-answered "No" turns a signed card into an order for a service that will not
 * grade the signature, and nobody ever said so. These are ALWAYS shown, even with one
 * option: the single button is the disclosure ("the only way forward answers No"), and
 * the surviving services' details copy renders beneath it so the consequence is stated
 * at the moment of choice — see `singleOptionDetails`. The extra taps on those paths
 * are the point, not a regression. Applies uniformly: Crossover and Unopened Packs
 * included (ruled 2026-08-10, no carve-out).
 *
 * KNOWN EXCEPTION, SAFE BY ACCIDENT — Pregrading's Q6. Its value "2000 - Newer Only"
 * is really a card-era claim sitting in the service-variation slot, and this split
 * auto-answers it. That is safe only because the next screen the customer sees is the
 * Pregrading results tile, whose Service Description copy opens with the sentence
 * "Cards from Year 2000 and Newer Only." — the claim is restated in front of them
 * before they can add it to a cart. If that copy or the pregrade routing changes,
 * this stops being safe: reclassify rather than trusting this note.
 */
export const CARD_FACT_QUESTIONS: ReadonlySet<number> = new Set([2, 3, 4]);

export const isCardFactQuestion = (idx: number): boolean => CARD_FACT_QUESTIONS.has(idx);

/**
 * The copy that renders beneath a card-fact question shown with a single option: the
 * surviving services' own `details` strings from the routing sheet — existing copy,
 * never written here. Deduped, because one service is reachable by several routes and
 * sibling tiers share copy; empty strings stay out rather than rendering an empty
 * panel. (Unopened Packs currently carries no details copy at all, so its single "No"
 * button stands alone — pinned in flow.test.ts so newly added copy gets noticed.)
 */
export const singleOptionDetails = <T extends Routable & { details: string }>(
  services: T[],
  idx: number,
  option: string,
): string[] => [
  ...new Set(
    filterByAnswer(services, idx, option)
      .map((s) => s.details)
      .filter((d) => d !== ''),
  ),
];

/**
 * Advance past every question that has only one possible answer AND describes the
 * service rather than the customer's card.
 *
 * `findNextValidQuestionIdx` already skips questions with ZERO options. A question
 * with exactly one is the same situation only when it is a service question; a
 * card-fact question with one option is shown anyway — see CARD_FACT_QUESTIONS.
 *
 * COUNT, MEASURED 2026-08-10 — an earlier version of this comment said "sixteen" and
 * went stale, so here is exactly what is counted: single-option question events,
 * summed across every reachable path of the current menu from both landing entries
 * (pregrade + submissions). There are 25 — 15 auto-answered here (3 on Q2, 12 on Q6)
 * and 10 card-fact events shown instead (2 on Q3, 4 on Q4, 4 on Q5, across six path
 * prefixes). flow.test.ts pins every one of these numbers: when a menu change moves
 * them, the gate fails and a human classifies the new event instead of the kiosk
 * silently answering for the customer.
 *
 * The auto-answers are recorded like real ones so they can be displayed, and flagged
 * so that Back skips over them to the last question the customer actually answered.
 */
export const autoAdvance = <T extends Routable>(
  services: T[],
  fromIdx: number,
  answers: AnswerEntry[],
  trail: TrailEntry<T>[],
  log?: (message: string) => void,
): { idx: number; services: T[]; answers: AnswerEntry[]; trail: TrailEntry<T>[] } => {
  let idx = findNextValidQuestionIdx(fromIdx, services);
  let current = services;
  const nextAnswers = [...answers];
  const nextTrail = [...trail];

  while (idx < 6) {
    const options = getOptionsForQuestion(idx, current);
    if (options.length !== 1) break;
    // One option, but it is a claim about the customer's card — show it.
    if (isCardFactQuestion(idx)) break;
    const only = options[0];
    log?.(`Auto-answered Q${idx + 1} (only option): ${only}`);
    nextTrail.push({ questionIdx: idx, services: current, auto: true });
    nextAnswers.push({ value: only, auto: true });
    current = filterByAnswer(current, idx, only);
    idx = findNextValidQuestionIdx(idx + 1, current);
  }

  return { idx, services: current, answers: nextAnswers, trail: nextTrail };
};
