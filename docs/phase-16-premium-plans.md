# Phase 16 – Premium / Free plans screen

## In one paragraph
A **Plans** screen compares the Free and Premium plans feature by feature, shows the user's current plan
and offers an **Upgrade to Premium** button. There is no payment flow yet: in auth-bypass (demo) mode the
button switches the phone to Premium so the paid features can be tried, and otherwise it says payments
are coming soon. The screen opens from a new **Your plan** row on the More tab, and from **Export PDF**
on the Reports screen when a free user taps it.

## 1. Decisions

These were proposed as defaults and confirmed by the product owner on 2026-11-03. All of them live in
`src/features/plans/plans.ts`; change them there and the screen follows.

| Question | Default used |
|---|---|
| Plan names | Free and Premium (Arabic: مجانية / مميزة) |
| Price | SAR 19 / month or SAR 190 / year; PKR 999 / month or PKR 9,999 / year. Shown in the currency from the user's preferences; any other currency, or no preferences (bypass mode), shows SAR. |
| Free features | Bank SMS tracking and categories, monthly reports, overspending alerts, subscription tracking, up to 3 budgets, up to 2 savings goals |
| Premium only | PDF report export, AI Assistant, family finance, unlimited budgets and goals |
| Payment | None yet. Placeholder upgrade action (see above). |
| Opened from | More tab row; locked PDF export on Reports |

## 2. What was built

| Part | What it does |
|---|---|
| Current plan card | "Current plan: Free / Premium" with a one-line description; dark card on Premium. |
| Comparison table | One row per feature with a Free and a Premium column (tick, cross, or "Up to 3" / "Unlimited"). Each row is one accessible element read as "Budgets. Free: Up to 3. Premium: Included". |
| Locked feature | `/plans?feature=pdfExport` shows "PDF report export is part of Premium." and tints that row. |
| Price and billing | Monthly / Yearly tabs (Yearly first), price formatted with `formatMoney`, and "2 months free compared with paying monthly" for yearly. Hidden once on Premium. |
| Upgrade | Bypass mode: saves Premium on the phone, shows a toast, and goes back if opened from a locked feature. Real sign-in: a "Coming soon" alert. |
| Demo downgrade | In bypass mode a Premium user sees "Switch back to Free (demo)". |
| More tab | New "Your plan" row with the current plan as its value. |
| Reports | Export PDF opens the plans screen for a free user and exports as before for Premium. |

The plan is stored on the phone (`AsyncStorage` key `nafaqati.plan`) because there is no billing backend
yet. Everyone starts on Free.

### New files
| Path | What it does |
|---|---|
| `src/app/plans.tsx` | The screen (route `/plans`, optional `feature` param) |
| `src/features/plans/plans.ts` | Plans, features, limits and prices; `canUse`, `limitOf`, `canAddMore`, `premiumPrice`, `monthsFreeYearly` |
| `src/features/plans/plans.test.ts` | 6 tests |
| `src/features/plans/planStore.ts` | Reads and saves the plan on the phone |
| `src/features/plans/usePlan.ts` | The current plan, re-read when a screen comes into focus |
| `src/features/plans/PlanComparison.tsx` | The comparison table |
| `docs/phase-16-premium-plans.md` | This document |

### Changed files
| Path | Change |
|---|---|
| `src/app/(tabs)/more.tsx` | "Your plan" row |
| `src/app/reports.tsx` | PDF export checks the plan |
| `src/i18n/en.ts`, `src/i18n/ar.ts` | `more.plan` and `plans.*` strings |

## 3. Not done yet
- **Enforcing the other Premium features.** Only PDF export is locked. The AI Assistant tab (phase 15,
  not committed yet), family finance, and the 3-budget / 2-goal limits are listed in the table but not
  enforced. Use `canUse(plan, 'assistant')` and `canAddMore(plan, 'budgets', count)` from
  `src/features/plans/plans.ts` when adding those checks.
- **Real payments.** App Store / Google Play billing (for example RevenueCat or `expo-iap`) needs a new
  development build, store products, and a server-side record of the plan that replaces `planStore.ts`.
- **Web app page.** `nafaqati-web` has no Plans page yet.
- **Onboarding entry point.** The plans are not shown after onboarding.
