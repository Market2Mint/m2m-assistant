import { describe, expect, it } from 'vitest';
import { ACTIVE_SERVICES, copyFor } from './serviceMenu';
import {
  autoAdvance,
  filterByAnswer,
  getOptionsForQuestion,
  isCardFactQuestion,
  singleOptionDetails,
} from './flow';

/**
 * These tests walk EVERY reachable path of the real menu from both landing entries and
 * pin what they find. The point is not the numbers themselves — it is that a menu
 * change which creates a new single-option question event fails here, loudly, and a
 * human decides whether it is a service fact (auto-answer) or a claim about the
 * customer's card (must be shown). The alternative already happened once: a code
 * comment said "sixteen" while the menu had quietly grown to 25.
 */

const services = ACTIVE_SERVICES.map((r) => ({
  questions: r.questions as string[],
  name: r.name,
  details: copyFor(r.name).details,
}));
type Svc = (typeof services)[number];

const isPregrade = (s: Svc) => s.questions[0] === 'Pregrading';

interface FlowEvent {
  entry: 'pregrade' | 'submissions';
  kind: 'auto' | 'shown';
  questionIdx: number;
  value: string;
  /** Answers so far, auto ones marked `*`. */
  path: string;
  /** What renders beneath the button when the event is shown. */
  details: string[];
}

/**
 * Drive the REAL autoAdvance the way App.tsx does: advance, then branch on every
 * option of the question it stopped at — a shown single-option question is "answered"
 * by its only option, exactly as the customer's one available tap would.
 */
const enumerate = (): { events: FlowEvent[]; terminals: number; collapsed: string[] } => {
  const events: FlowEvent[] = [];
  const collapsed: string[] = [];
  let terminals = 0;

  const walk = (entry: FlowEvent['entry'], list: Svc[], fromIdx: number, path: string[]) => {
    const msgs: string[] = [];
    const adv = autoAdvance(list, fromIdx, [], [], (m) => msgs.push(m));
    msgs
      .filter((m) => m.startsWith('Collapsed'))
      .forEach((m) => collapsed.push(`${entry} [${path.join('→')}] ${m}`));
    const here = [...path];
    adv.trail.forEach((t, i) => {
      const value = adv.answers[i].value;
      events.push({
        entry,
        kind: 'auto',
        questionIdx: t.questionIdx,
        value,
        path: here.join('→'),
        details: [],
      });
      here.push(`${value}*`);
    });
    if (adv.idx >= 6) {
      terminals++;
      return;
    }
    const options = getOptionsForQuestion(adv.idx, adv.services);
    if (options.length === 1) {
      events.push({
        entry,
        kind: 'shown',
        questionIdx: adv.idx,
        value: options[0],
        path: here.join('→'),
        details: singleOptionDetails(adv.services, adv.idx, options[0]),
      });
    }
    for (const opt of options) {
      walk(entry, filterByAnswer(adv.services, adv.idx, opt), adv.idx + 1, [...here, opt]);
    }
  };

  walk('pregrade', services.filter(isPregrade), 1, ['Pregrading']);
  walk('submissions', services.filter((s) => !isPregrade(s)), 0, []);
  return { events, terminals, collapsed };
};

const byIdx = (events: FlowEvent[]) =>
  events.reduce<Record<number, number>>((acc, e) => {
    acc[e.questionIdx] = (acc[e.questionIdx] ?? 0) + 1;
    return acc;
  }, {});

describe('the pinned counts — a menu change that moves these must be classified by a human', () => {
  const { events, terminals } = enumerate();
  const auto = events.filter((e) => e.kind === 'auto');
  const shown = events.filter((e) => e.kind === 'shown');

  // Re-pinned 2026-08-20 for the crossover build-out (17 new services): +6 shown events
  // (the same two autograph taps every card path shows, now on the BGS/CGC/SGC crossover
  // paths) and +3 Q6 auto-answers, while Crossover Q2 stopped being single-option (PSA
  // was auto-answered there; it is now a real four-grader question). Later the same day
  // the PSA duals moved from Either-routing onto the Yes branch (Cayden's ruling: Yes
  // holds the Dual services, No the non-dual), so PSA's lone-"No" Q3 became a real
  // Yes/No question and its shown event disappeared too.
  // Re-pinned 2026-09-10 for BAS (Beckett Authentication Services). Trading Cards→BGS→Yes
  // gained an Aftermarket answer on Q4 and a 1998 - Older answer on Q5 (both route to
  // BAS Card Autograph Authentication), so its two single-button disclosures became real
  // two-option questions: −2 shown events. Each of the three new BGS→Yes leaves ends on
  // a single-option Q6 that auto-answers: +2 auto events net (the old leaf already had
  // one). Total stays 32; terminals 66 → 69 (+2 BGS leaves, +1 Memorabilia→BAS).
  it('32 single-option question events exist across every reachable path', () => {
    expect(events.length).toBe(32);
    // 66 since the PSA crossover matrix (2026-08-20, third pass): the Yes branch fans
    // out through Pack-pulled/Aftermarket and the eras, mirroring the Trading Cards
    // PSA rows, without creating any new single-option event. 69 since BAS (2026-09-10).
    expect(terminals).toBe(69);
  });

  it('19 are service facts and still auto-answer: 2 on Q2, 17 on Q6', () => {
    expect(auto.length).toBe(19);
    expect(byIdx(auto)).toEqual({ 1: 2, 5: 17 });
  });

  it('13 are claims about the card and are shown: 1 on Q3, 6 on Q4, 6 on Q5', () => {
    expect(shown.length).toBe(13);
    expect(byIdx(shown)).toEqual({ 2: 1, 3: 6, 4: 6 });
  });

  it('no auto-answer ever lands on a card-fact question', () => {
    expect(auto.filter((e) => isCardFactQuestion(e.questionIdx))).toEqual([]);
  });

  it('the harmful class is exactly these thirteen events — new ones fail here', () => {
    const keys = shown.map((e) => `${e.path} @Q${e.questionIdx + 1}=${e.value}`).sort();
    expect(keys).toEqual(
      [
        // The card autograph paths: +2 taps each, and both taps are the point.
        // Trading Cards→BGS→Yes left this list 2026-09-10: BAS gave its Q4 a second
        // answer (Aftermarket) and its Q5 a second era (1998 - Older), so neither is a
        // single-option screen any more — see 'BGS → Yes routes to BAS' below.
        'Trading Cards→CGC→Yes @Q4=Pack-pulled',
        'Trading Cards→CGC→Yes→Pack-pulled @Q5=1999 - Newer',
        'Trading Cards→MBA→Yes @Q4=Pack-pulled',
        'Trading Cards→MBA→Yes→Pack-pulled @Q5=1999 - Newer',
        'Trading Cards→SGC→Yes @Q4=Pack-pulled',
        'Trading Cards→SGC→Yes→Pack-pulled @Q5=1999 - Newer',
        // The three crossover autograph paths (2026-08-20 build-out): the identical
        // two-tap shape, deliberately — the Yes path asserts the same two card facts.
        'Crossover→BGS→Yes @Q4=Pack-pulled',
        'Crossover→BGS→Yes→Pack-pulled @Q5=1999 - Newer',
        'Crossover→CGC→Yes @Q4=Pack-pulled',
        'Crossover→CGC→Yes→Pack-pulled @Q5=1999 - Newer',
        'Crossover→SGC→Yes @Q4=Pack-pulled',
        'Crossover→SGC→Yes→Pack-pulled @Q5=1999 - Newer',
        // No carve-out (ruled 2026-08-10): "Is the item autographed?" with only "No"
        // is still a claim about the customer's card, even when PSA is the only grader.
        // (Crossover→PSA left this list 2026-08-20: the PSA duals moved onto the Yes
        // branch, so its Q3 is a real Yes/No question now, not a single-option event.)
        'Unopened Packs→PSA* @Q3=No',
      ].sort(),
    );
  });
});

describe('the WITHDRAWN same-outcome collapse must stay withdrawn', () => {
  // Built and withdrawn 2026-08-10: skipping a question because every option leads to
  // the same services is WRONG here, because Q6's answer itself ships on the handoff
  // line the shop invoices from — "Card Grade Only" vs "Authenticate Only" are
  // different PSA order types at the same price. See the warning comment in flow.ts.
  const { collapsed, events } = enumerate();

  it('no question is ever skipped because its options "do not matter"', () => {
    expect(collapsed).toEqual([]);
    expect(events.filter((e) => e.kind === 'auto').length).toBe(19);
    expect(events.filter((e) => e.kind === 'shown').length).toBe(13);
  });

  it('THE CASE THAT KILLED IT: PSA → not autographed still asks Which variation?', () => {
    const afterCategory = filterByAnswer(services.filter((s) => !isPregrade(s)), 0, 'Trading Cards');
    const afterCompany = filterByAnswer(afterCategory, 1, 'PSA');
    const afterNo = filterByAnswer(afterCompany, 2, 'No');
    const adv = autoAdvance(afterNo, 3, [], []);
    expect(adv.idx).toBe(5);
    expect(getOptionsForQuestion(5, adv.services).sort()).toEqual([
      'Authenticate Only',
      'Card Grade Only',
    ]);
  });
});

describe('every shown event renders the surviving services’ details copy', () => {
  const shown = enumerate().events.filter((e) => e.kind === 'shown');

  it('all but Unopened Packs have existing routing-sheet copy to show', () => {
    for (const e of shown) {
      if (e.path.startsWith('Unopened Packs')) continue;
      expect(e.details.length, `${e.path} @Q${e.questionIdx + 1}`).toBeGreaterThan(0);
      for (const d of e.details) expect(d).not.toBe('');
    }
  });

  it('Unopened Packs has NO details copy — the single "No" button stands alone', () => {
    // Pinned deliberately: PSA Economy Pack and PSA Express Pack carry empty `details`
    // in SERVICE_COPY, and writing new copy is out of scope. If copy is ever added to
    // those services, this fails so the screen gets looked at, not discovered by a
    // customer.
    const packs = shown.filter((e) => e.path.startsWith('Unopened Packs'));
    expect(packs.length).toBe(1);
    expect(packs[0].details).toEqual([]);
  });

  it('Crossover dedupes shared copy and drops empty strings', () => {
    const crossover = shown.find((e) => e.path.startsWith('Crossover'));
    expect(crossover).toBeDefined();
    // Eight surviving records collapse to the one distinct non-empty details string.
    expect(crossover!.details.length).toBe(1);
    expect(crossover!.details[0]).toContain('minimum acceptable grade');
  });
});

describe('the benign class still auto-answers', () => {
  it('Pregrading: the card tap goes straight to results, Q6 answered by the kiosk', () => {
    const adv = autoAdvance(services.filter(isPregrade), 1, [], []);
    expect(adv.idx).toBe(6);
    expect(adv.answers).toEqual([{ value: '2000 - Newer Only', auto: true }]);
    // Safe by accident: that value is a card-era claim, but the results tile it lands
    // on opens with "Cards from Year 2000 and Newer Only." — see flow.ts.
    expect(copyFor('Pregrading').description.startsWith('Cards from Year 2000 and Newer Only')).toBe(true);
  });

  it('Event Tickets → PSA: Q6 "Ticket Grade" is auto-answered through to results', () => {
    const afterCategory = filterByAnswer(services.filter((s) => !isPregrade(s)), 0, 'Event Tickets');
    const afterCompany = filterByAnswer(afterCategory, 1, 'PSA');
    const adv = autoAdvance(afterCompany, 2, [], []);
    expect(adv.idx).toBe(6);
    expect(adv.answers).toEqual([{ value: 'Ticket Grade', auto: true }]);
  });

  it('Crossover: Q2 is a real four-grader question since 2026-08-20, then Q3 offers Yes/No', () => {
    // PSA used to be the only active crossover grader, so Q2 was auto-answered and the
    // flow stopped at Q3 with a lone "No". The 2026-08-20 build-out made Q2 a genuine
    // choice, and ALL FOUR graders split on the autograph question — Cayden's spec.
    // For PSA, Yes holds the Dual services and No the non-dual (ruled later the same
    // day; the duals had been riding Q3 as "Either" and surfacing through Q6 instead).
    const afterCategory = filterByAnswer(services.filter((s) => !isPregrade(s)), 0, 'Crossover');
    const adv = autoAdvance(afterCategory, 1, [], []);
    expect(adv.answers).toEqual([]);
    expect(adv.idx).toBe(1);
    expect(getOptionsForQuestion(1, adv.services).sort()).toEqual(['BGS', 'CGC', 'PSA', 'SGC']);
    for (const grader of ['BGS', 'CGC', 'PSA', 'SGC']) {
      const afterGrader = filterByAnswer(afterCategory, 1, grader);
      expect(getOptionsForQuestion(2, afterGrader).sort(), `${grader} must offer Yes and No`)
        .toEqual(['No', 'Yes']);
    }
    // PSA's Yes branch mirrors the Trading Cards matrix (Cayden's rule, 2026-08-20):
    // a pack-pulled 1999-or-newer auto choosing Card Grade Only or Authenticate Card
    // Only does NOT need the Dual — PSA never has to verify the autograph — while
    // 1998-or-older pack-pulled and all aftermarket autos reach Duals only.
    const psa = filterByAnswer(afterCategory, 1, 'PSA');
    const names = (svcs: typeof psa) => [...new Set(svcs.map((s) => s.name))].sort();
    // PSA Crossover Standard joined every rung 2026-09-15 (Cayden): the card Standard tier
    // opened to crossovers, mirroring PSA Standard's figures.
    expect(names(filterByAnswer(psa, 2, 'No'))).toEqual(
      ['PSA Crossover Express', 'PSA Crossover Standard', 'PSA Crossover Super Express']);

    const yes = filterByAnswer(psa, 2, 'Yes');
    const packModern = filterByAnswer(filterByAnswer(yes, 3, 'Pack-pulled'), 4, '1999 - Newer');
    // Base services reachable at the base price, but ONLY behind the two no-verification
    // products; every other product on this path is a Dual.
    for (const q6 of ['Card Grade Only', 'Authenticate Card Only']) {
      expect(names(filterByAnswer(packModern, 5, q6)), `${q6} must be the non-dual tier`)
        .toEqual(['PSA Crossover Express', 'PSA Crossover Standard', 'PSA Crossover Super Express']);
    }
    expect(names(packModern)).toEqual([
      'PSA Crossover Express', 'PSA Crossover Express Dual',
      'PSA Crossover Standard', 'PSA Crossover Standard Dual',
      'PSA Crossover Super Express', 'PSA Crossover Super Express Dual',
    ]);
    expect(names(filterByAnswer(filterByAnswer(yes, 3, 'Pack-pulled'), 4, '1998 - Older')))
      .toEqual(['PSA Crossover Express Dual', 'PSA Crossover Standard Dual', 'PSA Crossover Super Express Dual']);
    expect(names(filterByAnswer(yes, 3, 'Aftermarket')))
      .toEqual(['PSA Crossover Express Dual', 'PSA Crossover Standard Dual', 'PSA Crossover Super Express Dual']);
  });
});

describe('the three single-route autograph paths stop at every card-fact question — the +2 taps', () => {
  // BGS left this list 2026-09-10: its Q4 and Q5 are real choices now (BAS). Pinned below.
  it.each(['CGC', 'SGC', 'MBA'])('%s → Yes shows Q4, then Q5, then auto-Q6', (company) => {
    const afterCategory = filterByAnswer(services.filter((s) => !isPregrade(s)), 0, 'Trading Cards');
    const afterCompany = filterByAnswer(afterCategory, 1, company);
    const afterYes = filterByAnswer(afterCompany, 2, 'Yes');

    // Tap 1 would have been skipped before: Q4 is shown despite one option.
    const atQ4 = autoAdvance(afterYes, 3, [], []);
    expect(atQ4.idx).toBe(3);
    expect(atQ4.answers).toEqual([]);
    expect(getOptionsForQuestion(3, atQ4.services)).toEqual(['Pack-pulled']);
    expect(singleOptionDetails(atQ4.services, 3, 'Pack-pulled').length).toBeGreaterThan(0);

    // Tap 2: Q5 is shown despite one option.
    const afterQ4 = filterByAnswer(atQ4.services, 3, 'Pack-pulled');
    const atQ5 = autoAdvance(afterQ4, 4, [], []);
    expect(atQ5.idx).toBe(4);
    expect(atQ5.answers).toEqual([]);
    expect(getOptionsForQuestion(4, atQ5.services)).toEqual(['1999 - Newer']);
    expect(singleOptionDetails(atQ5.services, 4, '1999 - Newer').length).toBeGreaterThan(0);

    // Q6 is a service question and still auto-answers through to results.
    const afterQ5 = filterByAnswer(atQ5.services, 4, '1999 - Newer');
    const done = autoAdvance(afterQ5, 5, [], []);
    expect(done.idx).toBe(6);
    expect(done.answers.length).toBe(1);
    expect(done.answers[0].auto).toBe(true);
  });
});

describe('BGS → Yes routes to BAS (Beckett Authentication Services), added 2026-09-10', () => {
  // Beckett grades pack-pulled autographs from 1999 or newer only. Everything else that is
  // signed — aftermarket, or pack-pulled from 1998 or older — used to dead-end ("No Matches
  // Found" before the era filter, then simply no way forward). It now routes to BAS Card
  // Autograph Authentication: the signature is authenticated, the card is not graded, and
  // the $25.00 is a minimum. The 1999-or-newer path is unchanged and must never reach BAS.
  const names = (list: Svc[]) => [...new Set(list.map((s) => s.name))].sort();
  const submissions = services.filter((s) => !isPregrade(s));
  const afterYes = filterByAnswer(filterByAnswer(filterByAnswer(submissions, 0, 'Trading Cards'), 1, 'BGS'), 2, 'Yes');

  it('Q4 is a real choice: Pack-pulled or Aftermarket', () => {
    const atQ4 = autoAdvance(afterYes, 3, [], []);
    expect(atQ4.idx).toBe(3);
    expect(atQ4.answers).toEqual([]);
    expect(getOptionsForQuestion(3, atQ4.services)).toEqual(['Pack-pulled', 'Aftermarket']);
  });

  it('Aftermarket → BAS card service alone, Q5 skipped (no era applies), Q6 auto-answered', () => {
    const afterMarket = filterByAnswer(afterYes, 3, 'Aftermarket');
    expect(names(afterMarket)).toEqual(['BAS Card Autograph Authentication']);
    // No surviving service restricts the release year, so the era question is not asked.
    expect(getOptionsForQuestion(4, afterMarket)).toEqual([]);
    const done = autoAdvance(afterMarket, 4, [], []);
    expect(done.idx).toBe(6);
    expect(done.answers).toEqual([{ value: 'Autograph Authentication Only', auto: true }]);
    expect(names(done.services)).toEqual(['BAS Card Autograph Authentication']);
  });

  it('Pack-pulled → Q5 offers both eras, and it is shown', () => {
    const packPulled = filterByAnswer(afterYes, 3, 'Pack-pulled');
    const atQ5 = autoAdvance(packPulled, 4, [], []);
    expect(atQ5.idx).toBe(4);
    expect(atQ5.answers).toEqual([]);
    expect(getOptionsForQuestion(4, atQ5.services)).toEqual(['1999 - Newer', '1998 - Older']);
  });

  it('Pack-pulled → 1998 - Older → BAS card service alone, Q6 auto-answered', () => {
    const older = filterByAnswer(filterByAnswer(afterYes, 3, 'Pack-pulled'), 4, '1998 - Older');
    expect(names(older)).toEqual(['BAS Card Autograph Authentication']);
    const done = autoAdvance(older, 5, [], []);
    expect(done.idx).toBe(6);
    expect(done.answers).toEqual([{ value: 'Autograph Authentication Only', auto: true }]);
  });

  it('Pack-pulled → 1999 - Newer → the BGS w/Auto tiers only, never BAS', () => {
    const newer = filterByAnswer(filterByAnswer(afterYes, 3, 'Pack-pulled'), 4, '1999 - Newer');
    // Was ['BGS Express w/Auto', 'BGS Priority w/Auto'] until Base and Standard returned
    // (Cayden 2026-09-12); the BAS exclusion is the point of this test and is unchanged.
    expect(names(newer)).toEqual(['BGS Base w/Auto', 'BGS Express w/Auto', 'BGS Priority w/Auto', 'BGS Standard w/Auto']);
    expect(newer.some((s) => s.name.startsWith('BAS'))).toBe(false);
    const done = autoAdvance(newer, 5, [], []);
    expect(done.idx).toBe(6);
    expect(done.answers).toEqual([{ value: 'Card & Auto Grade', auto: true }]);
  });

  it('the details copy under BAS states the price is a minimum and the card is not graded', () => {
    const afterMarket = filterByAnswer(afterYes, 3, 'Aftermarket');
    const details = afterMarket.map((s) => s.details);
    expect(details.length).toBe(1);
    expect(details[0]).toMatch(/does not grade the card/i);
  });

  it('Memorabilia → CHOOSE AN AUTHENTICATOR offers JSA, PSA and BAS, in that order', () => {
    const memorabilia = filterByAnswer(submissions, 0, 'Memorabilia');
    const adv = autoAdvance(memorabilia, 1, [], []);
    expect(adv.idx).toBe(1);
    expect(adv.answers).toEqual([]);
    expect(getOptionsForQuestion(1, adv.services)).toEqual(['JSA', 'PSA', 'BAS']);
    const bas = filterByAnswer(memorabilia, 1, 'BAS');
    expect(names(bas)).toEqual(['BAS Autograph Authentication']);
    // Q3–Q6 are all Skip Question: straight to results.
    expect(autoAdvance(bas, 2, [], []).idx).toBe(6);
  });
});
