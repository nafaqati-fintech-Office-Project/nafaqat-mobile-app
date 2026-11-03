# Phase 14 – Overspending alerts (phone banners, on-phone budget check, dashboard strip)

## In one paragraph
The budget service already creates alerts (`BUDGET_THRESHOLD` at 80%, `BUDGET_EXCEEDED` at 100%), but the
user only saw them after opening the bell. This phase makes them visible as they happen, from two sources:
the **server's alerts** (shown as a phone banner) and a **check on the phone** after every new bank SMS.
The most urgent unread budget alert also shows as a strip at the top of the dashboard.

## 1. What was built

| Part | What it does |
|---|---|
| Server alerts → phone banner | After each unread-count poll (every 45 s while the app is open), the newest 20 notifications are read. Each unread `BUDGET_THRESHOLD`, `BUDGET_EXCEEDED` and `LARGE_TRANSACTION` alert not shown before becomes a local phone banner (title and text come from the server, already in the user's language). Up to 3 banners per run. |
| On-phone budget check | After a new **debit** SMS is saved, this month's spending is compared with the current budget's total and category limits. At 80% a warning banner, at 100% an "exceeded" banner. |
| No duplicates | One record per budget and limit of the highest level already shown on the phone. Server and phone alerts both read and write it, so a limit is announced once at 80% and once at 100%, whichever source sees it first. |
| First run | Alerts that already exist when the feature first runs are remembered without a banner, so installing never floods the phone. |
| Tap a banner | Opens the Budget screen with the category highlighted (or Transactions for a large payment), using the existing `notificationLink`. |
| Dashboard strip | The unread budget alert (exceeded before warning, then newest) at the top of the dashboard; tap opens the Budget screen. It disappears when the alert is read. |

### New files
| Path | What it does |
|---|---|
| `src/features/notifications/budgetAlerts.ts` | Pure logic: levels, which server alerts are new, which limits the phone crossed, which alert the strip shows |
| `src/features/notifications/budgetAlerts.test.ts` | 15 tests |
| `src/features/notifications/alertStore.ts` | Remembers announced alert ids and levels (AsyncStorage) |
| `src/features/notifications/budgetAlertService.ts` | `announceServerAlerts()` and `checkBudgetOnPhone()` |
| `src/features/notifications/useAlertTaps.ts` | Opens the right screen when a banner is tapped |
| `src/features/notifications/useTopBudgetAlert.ts` | The alert for the dashboard strip |
| `src/features/dashboard/BudgetAlertStrip.tsx` | The strip |
| `docs/phase-14-overspending-alerts.md` | This document |

### Changed files
| Path | What changed |
|---|---|
| `src/features/notifications/notify.ts` | `notifyAlert()`: banner on a high-importance "Budget alerts" channel; asks for notification permission if needed |
| `src/features/notifications/unreadCount.ts` | Each poll also announces new server alerts |
| `src/features/notifications/unreadCount.test.ts` | Mocks the new service |
| `src/features/sms/useSmsPipeline.ts` | Runs the on-phone check after a new debit is saved |
| `src/features/transactions/transactionsRepo.ts` | `spentByCategory()`: this phone's spending per category for a period |
| `src/app/(tabs)/_layout.tsx` | Starts the tap handler |
| `src/app/(tabs)/home.tsx` | Shows the strip |
| `src/i18n/en.ts`, `ar.ts` | 5 new strings in English and Arabic |

## 2. How the on-phone check works
- Takes the current budget (the budget service, or the mock in demo mode).
- Spending per category on this phone, for the budget's dates and currency, from the local database;
  transfers between own accounts are not counted.
- For the total and for each category, spending = **the larger of the server's figure and the phone's
  figure** (the server may be behind; the phone may not see other devices). Percent = spending ÷ limit.
- 80–99% = warning, 100% and over = exceeded. A level is announced only if it is higher than the one
  already announced for that budget and limit.
- The text is built on the phone in the app's current language.

## 3. Demo mode
With `AUTH_BYPASS=true` the mock budget has Groceries already over its limit, so the first new debit SMS
on the phone produces an "exceeded" banner. The strip shows the unread mock budget alert on the dashboard.
The mock list has no new alerts arriving later, so the server-alert banner cannot be shown in demo mode.

## 4. Limitations
- **No push when the app is closed.** Banners appear only while the app is running (poll and SMS
  listener). Real push needs backend support (FCM and device tokens) and is not part of this phase.
- The on-phone check sees only transactions on this phone; other devices count once the server reports them.
- Phone-only alerts are not saved on the server, so they are not in the bell list and not in the strip.
- Notification permission is needed for banners. Without it the strip and the bell still work.
- Not verified here: that the backend creates alerts for a real account (the backend is not in this repo).
- One currency per budget; current month's budget only.
- Tapping a banner while the app is closed (cold start) is not handled; it opens the app normally.

## 5. Checked
`npx tsc --noEmit` and `npx expo lint` clean; full `npx vitest run`: 434 passed, 5 skipped.
**Not checked:** banners and the strip on a device (permission prompt, channel, tap, Arabic/RTL).

## 6. What is left
- Try it on the phone: grant notifications, receive a debit SMS that crosses a limit, tap the banner.
- Push while the app is closed (backend work).
- Next in the plan: the basic AI assistant.
