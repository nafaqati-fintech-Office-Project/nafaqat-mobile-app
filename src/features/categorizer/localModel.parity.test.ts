import { describe, expect, it } from 'vitest';

import base from './localModelBase.json';
import parity from './__fixtures__/localModelParity.json';
import { classProbabilities, cleanMerchantText, isValidModel, predictLocal, type LocalModel } from './localModel';

// The fixture holds what the server's Python model answered for each text (made by
// merchant_api_project/scripts/make_mobile_parity.py from the same model as localModelBase.json).
// Regenerate both together after changing the model or the cleaning rules.
const model = base as unknown as LocalModel;
type Case = { text: string; cleaned: string; category: string | null; confidence: number | null; runner_up: number | null };
const cases = parity.cases as Case[];

describe('on-device model matches the server', () => {
  it('uses the same model version as the fixture', () => {
    expect(isValidModel(model)).toBe(true);
    expect(model.version).toBe(parity.version);
  });

  it('cleans text exactly like clean_merchant_text', () => {
    const wrong = cases.filter((c) => cleanMerchantText(c.text.trim()) !== c.cleaned);
    expect(wrong.map((c) => [c.text, cleanMerchantText(c.text.trim()), c.cleaned])).toEqual([]);
  });

  it('gives the server probability within 0.002 and the same category', () => {
    const problems: unknown[] = [];
    for (const c of cases) {
      const got = predictLocal(model, c.text);
      if (c.category === null) {
        if (got !== null) problems.push(['expected no answer', c.text, got]);
        continue;
      }
      if (!got) {
        problems.push(['no answer', c.text]);
        continue;
      }
      if (Math.abs(got.confidence - c.confidence!) > 0.002) problems.push(['confidence', c.text, got.confidence, c.confidence]);
      // A different category is only acceptable when the top two were a coin toss.
      const tie = c.confidence! - c.runner_up! < 0.004;
      if (got.category !== c.category && !tie) problems.push(['category', c.text, got.category, c.category]);
    }
    expect(problems).toEqual([]);
  });

  it('answers the Saudi merchants the server was fixed for', () => {
    expect(predictLocal(model, 'Panda Ret')?.category).toBe('Groceries');
    expect(predictLocal(model, 'Aldrees 12')?.category).toBe('Fuel');
    expect(predictLocal(model, 'SASCO 114')?.category).toBe('Fuel');
    expect(predictLocal(model, 'NAFT Serv')?.category).toBe('Fuel');
  });

  it('returns probabilities that add up to one, and null for text the model has never seen', () => {
    const p = classProbabilities(model, 'Starbucks')!;
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(predictLocal(model, '')).toBeNull();
    expect(predictLocal(model, '12345')).toBeNull();
  });
});
