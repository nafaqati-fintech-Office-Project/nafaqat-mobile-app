# Phase 10 – Change a category, and remember it

In short: the user taps a transaction and picks a different category. The app saves it, keeps a note of
the change (feedback), and can remember it for every transaction with the same name. These choices are
**personal**: they belong to that user only and never change anything for other users.

## 1. New files
| Path | What it does |
|---|---|
| `src/app/change-category.tsx` | The "Change category" sheet |
| `src/features/transactions/categoryRules.ts` | Saves a change, saves the user's own rules, and finds a rule for a name |
| `src/auth/currentUser.ts` | Lets non-screen code know who is signed in (for personal rules) |
| `src/features/transactions/categoryRules.test.ts` | 10 tests |
| `docs/phase-10-category-correction.md` | This document |

## 2. Changed files
| Path | What changed |
|---|---|
| `src/features/transactions/TransactionRow.tsx` | Tapping a row opens the sheet |
| `src/app/_layout.tsx` | The sheet opens from the bottom (form sheet) |
| `src/features/transactions/db.ts` | Two new tables (see below) |
| `src/features/transactions/transactionsRepo.ts` | `getTransaction(id)`. A retry can no longer overwrite a category the user picked |
| `src/features/categorizer/categorize.ts`, `retryPending.ts` | The user's own rule is checked first |
| `src/features/transactions/categoryDisplay.ts` | The list the user can pick from. Salary and Other Income added |
| `src/auth/AuthProvider.tsx` | Keeps the signed-in user id up to date |
| `src/i18n/en.ts`, `ar.ts` | Sheet texts and the two new categories |
| Tests | Rule tests added to the categorize, fallback, retry, display and repository tests |

## 3. How it works

### The sheet
- Tap any transaction, then "Change category" opens.
- Money spent: the 15 spending categories. Money received: **Salary** or **Other Income**.
  These are the same lists the backend (transaction service) uses, so they will sync without changes in task #9.
- A tick box, on by default: **"Apply to all transactions with this name"**.
- The app never says how the old category was found. The user just picks a new one.

### What happens on Save
1. The transaction gets the new category and is marked **picked by hand**. Nothing will change it later
   (no retry, no rule).
2. If the category really changed, a feedback note is saved: name, money in or out, old category,
   how the old one was found, new category, time, and "not sent yet".
3. With the tick box on, a **personal rule** is saved: "for me, [name] = [category]". Then:
   - Other transactions with that name change now. Hand-picked ones are left alone.
   - New SMS with that name get this category at once, before any other rule or the model.
4. The list on screen refreshes by itself.

### Names
"ALI RAZA", "Ali  Raza" and "ali raza" count as the same name (case and extra spaces are ignored).
Money **sent to** Ali and money **received from** Ali have separate rules.

### Personal, not shared
- Each rule stores the user id. Only the signed-in user's rules are used. Signed out, no rules apply.
- Nothing is sent to the server. The shop list and the server's verified list never change because of
  one user. Example: one user sets "Ali" to Housing, another sets their "Ali" to something else. Both
  are right, for them.

### Where the category comes from now (in order)
1. The user's own rule for this name
2. Income (money received) / Transfers (Raast, IBFT, IBAN)
3. The app's shop list
4. The model on the server (ML model, verified shops, Gemini)
5. Uncategorized

New table: `category_rules`
| Column | Meaning |
|---|---|
| `user_id` | Whose rule it is |
| `merchant_key` | The name, in capitals, single spaces |
| `type` | DEBIT (money out) or CREDIT (money in) |
| `category` | The user's category |

New table: `category_feedback`
| Column | Meaning |
|---|---|
| `user_id`, `transaction_id`, `merchant`, `type` | Which transaction, whose change |
| `from_category`, `from_source` | What it was, and how that was found |
| `to_category` | What the user picked |
| `synced` | 0 = not sent anywhere yet |

Transaction `source` values added: `user` (picked by hand on this transaction) and `rule` (filled in from
the user's rule; it follows when the user changes that rule).

## 4. Known gaps
- ~~Feedback is not sent anywhere yet.~~ Now sent to the model server: see `prediction-log-feedback.md`
  (only shop names, never person names; many different users must agree, and someone reviews it first).
- **No "Transfers" in the spending list.** The backend has no Transfers or Person category, so money sent to
  a friend can only be given one of the 15 spending categories. Task #9 must decide how Transfers and Person
  are sent to the backend, and whether the backend should get a Transfers category.
- Rules stay on the phone. A new phone starts with no rules until they are synced (task #9 or later).
- Custom categories (like "Friends" or "Father") are not supported. The backend has a fixed list.

## 5. Commands
```bash
npm test
npx tsc --noEmit
npx expo lint
```
After adding a new screen file, start the dev server once (`npx expo start`) so Expo Router updates its
route types. Otherwise `tsc` reports the new route as unknown.

Manual test list (Android phone, signed in, some transactions saved):
1. Tap a transaction. The sheet opens with the right list (spending, or Salary / Other Income for money received).
2. Pick a category with the tick box **off** and Save. Only that row changes.
3. Pick a category for a name that appears several times, tick box **on**. All rows with that name change.
4. Receive or import a new SMS with that name. It gets the user's category at once.
5. Change one of those rows by hand to something else, then change the rule again from another row. The
   hand-picked row keeps its own category.
6. Sign out and sign in as a different user. The first user's rule is not used for new SMS.
7. Switch to Arabic. The sheet and categories are in Arabic.
