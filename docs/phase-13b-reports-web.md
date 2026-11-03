# Phase 13b – Reports page on the web app (`D:\Fintech\nafaqati-web`)

## In one paragraph
The web app had a **Reports** item in the sidebar that opened a "Coming soon" page. This phase replaces it
with the same report module as the mobile app (phase 13): a monthly report for any month with six
sections, month stepper, currency selector, English and Arabic (RTL). No backend change: it uses the
reports-analytics-service and transaction-service calls the Analytics page already uses.

## 1. What was built

| Section | What it shows | Data |
|---|---|---|
| Monthly spending | Total spent, income, net, average per day, number of transactions, biggest expense | `monthly-comparison` + the month's expenses |
| Category analysis | Every category: amount, share, coloured bar | `monthly-comparison` |
| Merchant analysis | Top 10 shops: amount, payments, category | The month's completed expenses (`GET /api/transactions`) |
| Lifestyle spending | Essentials / Lifestyle / Other split bar with amounts and shares | `monthly-comparison` categories grouped by code |
| Savings | Net saved, share of income kept, change vs last month | `monthly-comparison` |
| Compared with last month | Income, expenses, net: this month, last month, % change; spending of the last 6 months as bars | `monthly-comparison` + `monthly-trend` |

Each section loads on its own with its own skeleton, error and Retry (same `SectionCard` as Analytics), so
a failing trend or merchant request never hides the rest.

### New files (web)
| Path | What it does |
|---|---|
| `src/features/reports/Reports.jsx` | The page: header with month stepper and currency selector, the six sections |
| `src/features/reports/ReportSections.jsx` | The six section components |
| `src/features/reports/reportUtils.js` | Pure logic: lifestyle grouping, category shares, merchant totals, biggest expense, average per day, savings rate |
| `src/features/reports/Reports.css` | Styles (reuses the Analytics header, card and colour tokens) |
| `src/features/reports/useReportsText.js` | Language, direction and date locale from preferences |
| `src/hooks/useReports.js` | Loads comparison, 6-month trend and the month's expenses; currency selection |
| `tests/reportUtils.test.js` | 7 tests |

### Changed files (web)
| Path | What changed |
|---|---|
| `src/App.jsx` | `/reports` route to the new page; `reports` removed from the "Coming soon" fallback list |
| `src/constants/appText.js` | `REPORTS_TEXT` in English and Arabic |

The sidebar item already existed (`config/navigation.js`), so navigation needed no change.

## 2. How it matches the mobile app
- Same six sections, same Essentials / Lifestyle / Other lists (by category code), same rules: average per
  day uses the days so far in the current month, a percentage change is shown only when last month was above
  zero, one currency at a time (other currencies are listed in a note, never mixed).
- Reused from Analytics: `reportsApi`, `SectionCard`, month and currency styles, `useAsync`, `useFormat`,
  `useCategories` (names in the user's language).

## 3. Verified in the backend
`reports-analytics-service` counts **CREDIT as income and DEBIT as expenses** (`IncomeVsExpensesCalculator`,
`MonthlyTrendCalculator`). This answers the question left open in phases 12 and 13 about income on a real account.

## 4. Checked
- `node --test tests/*.test.js`: 28 passed (7 new). `vite build` succeeds. `oxlint`: no warnings in the new files
  (the existing warnings in other files are unchanged).
- **Not checked:** the page in a browser with a signed-in account (layout, Arabic/RTL, real data).

## 5. Limitations and what is left
- Merchants, transaction count and biggest expense come from the month's first 500 completed expenses; above
  that a note says they are partial (the mobile app reads 500 as well).
- Debt report: not built (no debt data in the services). No export or share button.
- Nothing is committed in the web repository (it also has an unrelated uncommitted change in `vite.config.js`).
