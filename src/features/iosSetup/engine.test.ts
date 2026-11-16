import { describe, expect, it } from 'vitest';

import { checklist, pickVariant, resolveFlow } from './config';
import { DEFAULT_SETUP_CONFIG } from './defaultConfig';
import { back, confirm, currentStep, filledText, progress, startSession, tap } from './engine';
import type { ResolvedFlow, SetupConfig } from './types';

const en = { iosMajor: 17, language: 'en' as const };
const ar = { iosMajor: 18, language: 'ar' as const };

/** Plays a whole flow by always tapping the right element, pressing Continue when a text is showing. */
function playAll(flow: ResolvedFlow) {
  let state = startSession();
  const seen: string[] = [];
  for (let guard = 0; guard < 100 && !state.completed; guard++) {
    seen.push(currentStep(flow, state).id);
    const result = tap(flow, state, currentStep(flow, state).target);
    state = result.state;
    if (result.outcome.kind === 'filled') state = confirm(flow, state).state;
  }
  return { state, seen };
}

describe('the bank flow', () => {
  const flow = resolveFlow(DEFAULT_SETUP_CONFIG, 'bank', en);

  it('has five counted steps and a result, and is completed by tapping each target', () => {
    expect(flow.total).toBe(5);
    expect(flow.steps.at(-1)?.number).toBe(0);
    const { state, seen } = playAll(flow);
    expect(state.completed).toBe(true);
    expect(seen).toHaveLength(flow.steps.length);
  });

  it('every step target exists on its own screen', () => {
    for (const step of flow.steps) {
      const ids = new Set<string>();
      step.screen.elements.forEach((el) => {
        ids.add(el.id);
        el.tabs?.forEach((tab) => ids.add(tab.id));
      });
      if (step.screen.navLeft) ids.add(step.screen.navLeft.id);
      if (step.screen.navRight) ids.add(step.screen.navRight.id);
      expect(ids.has(step.target), `${step.id} target ${step.target}`).toBe(true);
      if (step.fill) expect(ids.has(step.fill.elementId), `${step.id} fill`).toBe(true);
    }
  });

  it('a wrong tap shows a hint and does not move forward', () => {
    const state = startSession();
    const result = tap(flow, state, 'wifi');
    expect(result.outcome.kind).toBe('wrong');
    expect(result.state).toEqual(state);
  });

  it('uses the specific hint for a known wrong choice', () => {
    const result = tap(flow, startSession(), 'transaction');
    expect(result.outcome).toEqual({ kind: 'wrong', hint: expect.stringContaining('Apple Pay') });
  });

  it('types the keyword in step 2 and waits for Continue', () => {
    let state = tap(flow, startSession(), 'message').state;
    expect(currentStep(flow, state).id).toBe('bank-2');
    const result = tap(flow, state, 'contains');
    expect(result.outcome.kind).toBe('filled');
    expect(filledText(flow, result.state, 'contains')).toBe('SAR');
    // Nothing else moves it on while the text is showing.
    expect(tap(flow, result.state, 'contains').state).toEqual(result.state);
    state = confirm(flow, result.state).state;
    expect(state.index).toBe(result.state.index + 1);
  });

  it('keeps the keyword in the field on the screens after step 2', () => {
    const next = flow.steps.find((s) => s.id === 'bank-3a');
    expect(next?.screen.elements.find((el) => el.id === 'contains')?.value).toBe('SAR');
  });

  it('back undoes a filled text first, then goes one step back, never below the first', () => {
    let state = tap(flow, startSession(), 'message').state;
    state = tap(flow, state, 'contains').state;
    expect(back(state).filled).toBe(false);
    expect(back(back(state)).index).toBe(0);
    expect(back(startSession()).index).toBe(0);
  });

  it('reports "step n of 5", with several taps of one step sharing its number', () => {
    const numbers = flow.steps.map((s) => s.number);
    expect(numbers.filter((n) => n === 3)).toHaveLength(2);
    expect(numbers.filter((n) => n === 4)).toHaveLength(3);
    expect(progress(flow, startSession())).toEqual({ current: 1, total: 5 });
    expect(progress(flow, { index: flow.steps.length - 1, filled: false, completed: false })).toEqual({ current: 5, total: 5 });
  });

  it('the checklist for the real app still lists every real tap (9), even though the practice is 5 steps', () => {
    const list = checklist(flow);
    expect(list.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(list[3].text).toContain('"SAR"');
    expect(list[4].text).toContain('Run Immediately');
    expect(list[5].text).toContain('New Blank Automation');
  });
});

describe('the other flows', () => {
  it('"add another keyword" repeats practice steps 2 to 5 with the second keyword and the full checklist', () => {
    const extra = resolveFlow(DEFAULT_SETUP_CONFIG, 'bank-extra', en);
    expect(extra.keyword).toBe('ريال');
    const counted = extra.steps.filter((s) => s.number > 0).map((s) => s.number);
    expect(Math.min(...counted)).toBe(2);
    expect(extra.total).toBe(4);
    expect(playAll(extra).state.completed).toBe(true);
    expect(checklist(extra)).toHaveLength(9);
    expect(checklist(extra)[3].text).toContain('"ريال"');
  });

  it('the Apple Pay flow has five steps, a nine-tap checklist and no keyword', () => {
    const wallet = resolveFlow(DEFAULT_SETUP_CONFIG, 'wallet', en);
    expect(wallet.total).toBe(5);
    expect(playAll(wallet).state.completed).toBe(true);
    expect(wallet.steps.some((s) => s.fill?.text === 'SAR')).toBe(false);
    expect(checklist(wallet)).toHaveLength(9);
  });
});

describe('language and version', () => {
  it('draws the Arabic wording', () => {
    const flow = resolveFlow(DEFAULT_SETUP_CONFIG, 'bank', ar);
    expect(flow.steps[0].instruction).toContain('الأتمتة');
    expect(checklist(flow)[0].text).toContain('الأتمتة');
  });

  it('puts the keyword into the finished-automation summary', () => {
    const flow = resolveFlow(DEFAULT_SETUP_CONFIG, 'bank', en);
    const done = flow.steps.find((s) => s.id === 'bank-5');
    expect(done?.screen.elements[0].label).toContain('"SAR"');
  });

  it('picks the highest variant not above the iOS version, and the lowest when none fits', () => {
    const config: SetupConfig = {
      ...DEFAULT_SETUP_CONFIG,
      variants: [
        { ...DEFAULT_SETUP_CONFIG.variants[0], minIos: 17 },
        { ...DEFAULT_SETUP_CONFIG.variants[0], minIos: 19 },
      ],
    };
    expect(pickVariant(config, 17).minIos).toBe(17);
    expect(pickVariant(config, 18).minIos).toBe(17);
    expect(pickVariant(config, 19).minIos).toBe(19);
    expect(pickVariant(config, 16).minIos).toBe(17);
  });

  it('a corrected label in the config shows up without any code change', () => {
    const edited: SetupConfig = JSON.parse(JSON.stringify(DEFAULT_SETUP_CONFIG));
    edited.variants[0].flows.bank.steps[0].instruction.en = 'Tap Message.';
    expect(resolveFlow(edited, 'bank', en).steps[0].instruction).toBe('Tap Message.');
  });
});
