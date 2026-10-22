import data from './merchantLookup.json';

type Entry = { pattern: string; category: string };

const MIN_PATTERN_LENGTH = 3;

export function normalizeMerchant(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z؀-ۿ]+/g, ' ')
    .trim();
}

const entries = (data as Entry[])
  .map(({ pattern, category }) => ({ pattern: normalizeMerchant(pattern), category }))
  .filter(({ pattern }) => pattern.length >= MIN_PATTERN_LENGTH)
  .sort((a, b) => b.pattern.length - a.pattern.length);

export function lookupCategory(merchant: string): string | null {
  const padded = ` ${normalizeMerchant(merchant)} `;
  const hit = entries.find(({ pattern }) => padded.includes(` ${pattern} `));
  return hit?.category ?? null;
}
