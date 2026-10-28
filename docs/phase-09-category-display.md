# Phase 09 – Show the category on each transaction

In short: every transaction in the list now shows its category as a small coloured label, in English
or Arabic. The user sees **only the final category**. They never see how it was found (rules, shop list,
ML model or Gemini) and never see a confidence number.

## 1. New files
| Path | What it does |
|---|---|
| `src/features/transactions/categoryDisplay.ts` | Turns a stored category into its name in the app's language, and picks its colour |
| `src/features/transactions/CategoryChip.tsx` | The coloured category label |
| `src/features/transactions/categoryDisplay.test.ts` | 3 tests |
| `docs/phase-09-category-display.md` | This document |

## 2. Changed files
| Path | What changed |
|---|---|
| `src/features/transactions/TransactionRow.tsx` | Shows the category label next to the date (was plain text "Health · 28 Oct") |
| `src/i18n/en.ts`, `ar.ts` | Names for all 19 categories |

## 3. How it works
- 19 categories have a name in English and Arabic: the server's 15, plus Income, Transfers, Person and Uncategorized.
- If a new category ever comes from the server that the app does not know, it is shown as it is (in English) instead of breaking.
- Colours:

| Category | Colour |
|---|---|
| Any spending category (Food, Fuel, Health…) | Blue |
| Income | Green |
| Transfers, Person | Purple |
| Uncategorized | Grey |

- What stays hidden from the user: how the category was found and the confidence number. Both are still saved on the phone, for our own rules (`certaintyOf()` from Phase 08, used in task #8) and for the sync in task #9.
- A transaction still waiting for the model shows as **Uncategorized**. When the model answers, the list updates by itself (Phase 08).

## 4. Known gaps
- The new-transaction notification is still English only ("Debit", "card", and the category name).
- The user cannot change a category yet. That is task #8.
- The SMS debug screen (developer builds only) still shows how each category was found. Users never see it.

## 5. Commands
```bash
npm test
npx tsc --noEmit
npx expo lint
```

Manual test list (Android phone, with some transactions saved):
1. Open Transactions. Each row shows a coloured label: blue for spending, green for Income, purple for Transfers, grey for Uncategorized.
2. Switch the app to Arabic. The labels show Arabic names (for example "طعام ومشروبات").
3. No row shows a percentage or words like "model" or "Gemini".
4. A long category name (Clothing & Shopping) does not push the amount off the screen.
