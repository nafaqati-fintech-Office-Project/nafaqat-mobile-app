# Phase 13 – Reports screen

## In one paragraph
The requirements document asks for smart reports: monthly spending, category analysis, merchant
analysis, lifestyle spending, savings and comparative monthly reports. The Insights tab already shows
a trend, category changes and top merchants for the current month. This phase adds a **Reports**
screen that shows all six reports for any month (up to 24 months back), with previous/next month
arrows. It is opened from **More → Reports** and from the **Reports** link on the dashboard's Cash flow
card. No backend change.

## 1. What was built

| Section | What it shows | Data |
|---|---|---|
| Monthly spending | Total spent, income, net, average per day, number of transactions, biggest expense | Monthly comparison report + the month's spending rows |
| Category analysis | Every category: amount, share of the month, bar | Monthly comparison report |
| Merchant analysis | Top 10 merchants: amount, payments, category | The month's spending rows (same logic as Insights) |
| Lifestyle spending | Split bar of Essentials / Lifestyle / Other with amounts and shares | Categories grouped by a fixed list (below) |
| Savings | Net saved, share of income kept, change against last month | Monthly comparison report |
| Compared with last month | Income, expenses and net, this month vs last month with % change; spending of the last 6 months as bars | Monthly comparison + monthly trend reports |

If the trend or the spending rows cannot be loaded, only those parts show a note; the rest of the report
still shows. If the monthly comparison fails, the screen shows an error with a retry button.

### New files
| Path | What it does |
|---|---|
| `src/features/reports/types.ts` | The `Report` shape |
| `src/features/reports/reportBuilder.ts` | Builds the report; lifestyle grouping, averages, shares, biggest expense |
| `src/features/reports/reportBuilder.test.ts` | 14 tests |
| `src/features/reports/reportsService.ts` | Loads the three reports for a month; mock in demo mode |
| `src/features/reports/useReport.ts` | Screen state and month navigation |
| `src/features/reports/mock.ts` | MOCK report for demo mode |
| `src/features/reports/ReportSections.tsx` | The six section cards |
| `src/app/reports.tsx` | The screen |
| `docs/phase-13-reports.md` | This document |

### Changed files
| Path | What changed |
|---|---|
| `src/app/(tabs)/more.tsx` | "Reports" row |
| `src/features/dashboard/InfoCard.tsx` | Optional link in the title row |
| `src/features/dashboard/CashFlowCard.tsx` | "Reports" link that opens the screen |
| `src/i18n/en.ts`, `ar.ts` | 19 new strings in English and Arabic |

## 2. How it works
- **Month:** starts at the current month in the user's time zone; the next arrow stops at the current
  month, the previous arrow at 24 months back. An answer that arrives for a month the user already left
  is ignored.
- **Currency:** one currency, the user's preferred one (otherwise the one spent most in).
- **Average per day:** spending ÷ days so far (current month) or ÷ days in the month (past months).
- **Percent change:** shown only when last month's figure was above zero.
- **Lifestyle groups (our own choice, not from the document):**
  - Essentials: Groceries, Utilities, Health, Education, Transportation, Fuel, Housing, Loans/EMI
  - Lifestyle: Food & Beverage, Clothing & Shopping, Entertainment, Travel, Subscriptions
  - Other: everything else (Charity, Investments, Uncategorized ...)
  The list is `ESSENTIALS` / `LIFESTYLE` in `reportBuilder.ts`.
- **Reused:** `getMonthlyComparison`, `getMonthlyTrend`, `getSpendingRows`, `merchantTotals`,
  `MerchantRow`, `ChangeChip` from Insights.

## 3. Real data and mock data
- Signed in: real report endpoints (`monthly-comparison`, `monthly-trend`, and the transaction list).
- Demo mode (`AUTH_BYPASS=true`): `mock.ts` (SAR, May-style numbers); the month label follows the arrows.
- Transaction count, biggest expense and merchants come from the month's rows. The app reads at most
  500 rows; beyond that those three are partial and a note says so (same as Insights).

## 4. Checked
`npx tsc --noEmit` and `npx expo lint` clean; full `npx vitest run` passes (see the summary in the chat).
**Not checked:** the screen on a device or emulator (layout, Arabic/RTL, arrow directions).

## 5. What is left
- Look at the screen on the phone in English and Arabic.
- Debt report: the document says "savings and debt reports", but the app has no debt data. Only savings is built.
- No export or share (PDF) yet.
- One currency only.
- Next in the plan: overspending alerts, then the basic AI assistant.
