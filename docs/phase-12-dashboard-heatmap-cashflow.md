# Phase 12 – Dashboard: cash flow, spending heatmap and savings trend

## In one paragraph
The requirements document lists a spending heatmap, savings trends and a cash flow overview on the
dashboard. Until now the dashboard had the total, the weekly bars, four stat tiles, the category
breakdown and recent transactions. This phase adds three cards between the stat tiles and the category
breakdown, in this order: **Cash flow**, **Spending heatmap**, **Savings trend**. They use the currency
the user chose in their preferences (the same one as the rest of the dashboard). No backend change.

## 1. What was built

| Card | What it shows | Data |
|---|---|---|
| Cash flow | Income and expenses of this month as two bars, the net amount, and a line such as "You kept 22% of your income this month" | Already loaded: `income-vs-expenses` for this month |
| Spending heatmap | A calendar of this month (Monday first), each day shaded in 5 levels by its spending; tap a day to see its total; a Less/More legend | New: `daily-spending` for the whole month |
| Savings trend | Net (income minus expenses) of the last 6 months as bars; a negative month is red, the best month is highlighted | New: `income-vs-expenses` once per month, 6 calls |

If the heatmap or the trend cannot be loaded, only that card shows "Could not load this right now";
the rest of the dashboard still works (same rule as budget and subscriptions).

### New files
| Path | What it does |
|---|---|
| `src/features/dashboard/heatmapMath.ts` | Day shading level, calendar layout, last N months, savings rate |
| `src/features/dashboard/heatmapMath.test.ts` | 13 tests (shading, layout, months across a year, builders) |
| `src/features/dashboard/InfoCard.tsx` | Card shell with a title and an optional "unavailable" note |
| `src/features/dashboard/CashFlowCard.tsx` | The cash flow card |
| `src/features/dashboard/HeatmapCard.tsx` | The heatmap card |
| `src/features/dashboard/SavingsTrendCard.tsx` | The savings trend card |
| `docs/phase-12-dashboard-heatmap-cashflow.md` | This document |

### Changed files
| Path | What changed |
|---|---|
| `src/features/dashboard/types.ts` | `cashFlow`, `heatmap`, `heatmapState`, `savingsTrend`, `savingsTrendState` on `DashboardData` |
| `src/features/dashboard/dashboardBuilder.ts` | `buildCashFlow`, `buildHeatmap`, `buildSavingsTrend`; two new inputs |
| `src/features/dashboard/dashboardService.ts` | Two more optional requests: the month's daily spending and 6 monthly income/expense reports |
| `src/features/dashboard/mock.ts` | Mock values for the three cards |
| `src/app/(tabs)/home.tsx` | Shows the three cards in the agreed order |
| `src/i18n/en.ts`, `ar.ts` | 13 new strings in English and Arabic |
| `dashboardBuilder.test.ts`, `dashboardService.test.ts` | New inputs; call counts; a test that a failing heatmap/trend leaves the rest working |

## 2. How it works
- **Heatmap shade:** each day is compared with the month's heaviest day: 0 = no spending, 1 to 4 = a
  quarter steps up to the heaviest. A day with any spending is never shown as empty. The shade is a
  scale only; amounts stay decimal strings and are formatted with `formatMoney`.
- **Calendar:** day 1 is placed under its weekday, Monday first, like the weekly bars above.
- **Savings rate:** `net ÷ income`, rounded. With no income there is no rate and the card says so.
- **Trend:** the six months end with the current one; a month with no data counts as zero.
- **Currency:** one currency, the user's preferred one, chosen by the existing `pickCurrency`.

## 3. Real data and mock data
- A signed-in account uses the **real report endpoints** (`/api/reports/income-vs-expenses`,
  `/api/reports/daily-spending`). Nothing new on the server.
- In demo mode (`AUTH_BYPASS=true`) the dashboard returns the numbers in `mock.ts`. Those three cards
  are clearly marked MOCK there.
- **Not verified:** that the reports service counts CREDIT transactions as income. The backend is not in
  this repository. If income shows 0 on a real account, check that first.

## 4. Checked
`npx tsc --noEmit` and `npx expo lint` clean; `npx vitest run`: 406 passed, 5 skipped (46 files).
**Not checked:** the new cards on a device or emulator (layout, Arabic/RTL look). Do this before the demo.

## 5. What is left
- Look at the cards on the phone, in English and Arabic, and adjust spacing if needed.
- Confirm income on a real account (see section 3).
- The cards use one currency; users with several currencies see only the preferred one.
- Next steps in the plan: reports screen, overspending alerts, basic AI assistant.
