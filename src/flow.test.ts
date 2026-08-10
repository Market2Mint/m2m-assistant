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
const enumerate = (): { events: FlowEvent[]; terminals: number } => {
  const events: FlowEvent[] = [];
  let terminals = 0;

  const walk = (entry: FlowEvent['entry'], list: Svc[], fromIdx: number, path: string[]) => {
    const adv = autoAdvance(list, fromIdx, [], []);
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
  return { events, terminals };
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

  it('25 single-option question events exist across every reachable path', () => {
    expect(events.length).toBe(25);
    expect(terminals).toBe(48);
  });

  it('15 are service facts and still auto-answer: 3 on Q2, 12 on Q6', () => {
    expect(auto.length).toBe(15);
    expect(byIdx(auto)).toEqual({ 1: 3, 5: 12 });
  });

  it('10 are claims about the card and are shown: 2 on Q3, 4 on Q4, 4 on Q5', () => {
    expect(shown.length).toBe(10);
    expect(byIdx(shown)).toEqual({ 2: 2, 3: 4, 4: 4 });
  });

  it('no auto-answer ever lands on a card-fact question', () => {
    expect(auto.filter((e) => isCardFactQuestion(e.questionIdx))).toEqual([]);
  });

  it('the harmful class is exactly these ten events — new ones fail here', () => {
    const keys = shown.map((e) => `${e.path} @Q${e.questionIdx + 1}=${e.value}`).sort();
    expect(keys).toEqual(
      [
        // The four autograph paths: +2 taps each, and both taps are the point.
        'Trading Cards→BGS→Yes @Q4=Pack-pulled',
        'Trading Cards→BGS→Yes→Pack-pulled @Q5=1999 - Newer',
        'Trading Cards→CGC→Yes @Q4=Pack-pulled',
        'Trading Cards→CGC→Yes→Pack-pulled @Q5=1999 - Newer',
        'Trading Cards→MBA→Yes @Q4=Pack-pulled',
        'Trading Cards→MBA→Yes→Pack-pulled @Q5=1999 - Newer',
        'Trading Cards→SGC→Yes @Q4=Pack-pulled',
        'Trading Cards→SGC→Yes→Pack-pulled @Q5=1999 - Newer',
        // No carve-out (ruled 2026-08-10): "Is the item autographed?" with only "No"
        // is still a claim about the customer's card, even when PSA is the only grader.
        'Crossover→PSA* @Q3=No',
        'Unopened Packs→PSA* @Q3=No',
      ].sort(),
    );
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

  it('Crossover: Q2 "PSA" is auto-answered, then the flow STOPS at Q3', () => {
    const afterCategory = filterByAnswer(services.filter((s) => !isPregrade(s)), 0, 'Crossover');
    const adv = autoAdvance(afterCategory, 1, [], []);
    expect(adv.answers).toEqual([{ value: 'PSA', auto: true }]);
    expect(adv.idx).toBe(2);
    expect(getOptionsForQuestion(2, adv.services)).toEqual(['No']);
  });
});

describe('the four autograph paths stop at every card-fact question — the +2 taps', () => {
  it.each(['BGS', 'CGC', 'SGC', 'MBA'])('%s → Yes shows Q4, then Q5, then auto-Q6', (company) => {
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
