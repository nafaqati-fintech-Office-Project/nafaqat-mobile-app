# Phase 13c – Export the monthly report as a PDF (mobile app and web)

## In one paragraph
The Reports screen (phase 13, and phase 13b on the web) now has an **Export PDF** button. It exports the
complete report of the month on screen: header (app, month, currency, date), then the six sections.
Both apps build the report as a printable page and let the platform make the PDF, so Arabic (right-to-left)
text is rendered correctly. No backend change.

## 1. What was built

| App | How it works |
|---|---|
| Mobile | `expo-print` renders the report HTML to an A4 PDF in the cache folder; `expo-sharing` opens the share sheet (save to Files, send, print). The button shows a spinner while it works; on failure a toast says so. |
| Web | The button opens the browser's print dialog with a print stylesheet (no sidebar, top bar or buttons, one column, cards kept whole). The user chooses "Save as PDF". The suggested file name is `Nafaqati-Report-YYYY-MM`. |

The button is disabled until the report is fully loaded, so the PDF never contains half the data.
A section that failed to load (merchants or the 6-month trend) appears in the PDF as its "could not load" note.

### PDF content
Title and month · currency · date generated, then: Monthly spending (total, income, net, average per day,
transactions, biggest expense) · Category analysis · Merchant analysis · Lifestyle spending · Savings ·
Compared with last month (income, expenses, net) with the 6-month spending bars. English or Arabic
following the user's language.

### New files (mobile)
| Path | What it does |
|---|---|
| `src/features/reports/reportHtml.ts` | Builds the HTML of the report; escapes all text that comes from the services |
| `src/features/reports/reportHtml.test.ts` | 6 tests (English, Arabic/RTL, escaping, sections that failed to load, empty month) |
| `src/features/reports/exportReport.ts` | Makes the PDF and opens the share sheet (modules loaded on first use) |
| `docs/phase-13c-report-pdf.md` | This document |

### Changed files (mobile)
| Path | What changed |
|---|---|
| `src/app/reports.tsx` | "Export PDF" button in the header |
| `src/i18n/en.ts`, `ar.ts` | 2 new strings |
| `package.json`, `package-lock.json` | `expo-print ~58.0.8`, `expo-sharing ~58.0.21` (installed with `npx expo install`) |
| `app.json` | `expo-sharing` config plugin added by the installer |

### Changed files (web)
| Path | What changed |
|---|---|
| `src/features/reports/Reports.jsx` | "Export PDF" button, print-only currency/date line, file name |
| `src/features/reports/Reports.css` | Button styles and the `@media print` rules (scoped to the Reports page with `:has(.reports)`) |
| `src/constants/appText.js` | 3 new strings in English and Arabic |

## 2. Notes
- **Expo Go (Android):** both modules are included, but the file `expo-print` writes can be neither read nor
  shared there ("Missing READ permission" / "Not allowed to read file"). The app therefore asks for the PDF's
  bytes (`base64: true`), writes its own copy into the app's cache folder with `expo-file-system`
  (`Nafaqati-Report-YYYY-MM.pdf`) and shares that copy. Same approach as the earlier Final-Year-Project app.
  `expo-file-system` was added as a direct dependency for this.
- **Notifications in Expo Go:** `expo-notifications` cannot load in Expo Go on Android, so it is now loaded through
  `src/features/notifications/loadNotifications.ts`, which returns nothing there (no phone banners, no error).
  A development build gives banners.
- The PDF uses the data already on screen, so merchant totals, transaction count and biggest expense are
  partial above 500 payments, exactly as on screen.
- Bars are drawn as coloured blocks; the numbers are always printed next to them, so the PDF is readable even if a
  viewer drops background colours (browsers drop them unless "Background graphics" is on in the print dialog).

## 3. Checked
- Mobile: `npx tsc --noEmit` and `npx expo lint` clean; `npx vitest run`: 441 passed, 5 skipped. Export PDF confirmed
  working on a phone in Expo Go (share sheet opens with the PDF).
- Web: `vite build` succeeds; 28 tests pass; no lint warnings in the Reports files.
- **Not checked:** the PDF's Arabic rendering and page breaks, and the print preview in a browser. Do both once
  before the demo.

## 4. What is left
- Look at the PDF on Android and iOS, in English and Arabic.
- Web is "print to PDF", not a one-click download (chosen to keep Arabic correct and add no library).
- No logo in the PDF (text header only).
- Next in the plan: the basic AI assistant.
