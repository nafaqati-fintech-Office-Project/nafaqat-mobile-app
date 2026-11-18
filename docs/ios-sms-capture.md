# iPhone bank-message capture (Shortcuts automation)

Implements the work package "iOS SMS Capture and Setup Simulation" (Desktop/iOS SMS Read.pdf).
An iPhone app cannot read the SMS inbox. The user creates one Shortcuts automation ("when a message containing the keyword
arrives, run **Log bank message**"); iOS then hands each matching message to Nafaqati in the background.

| Work item | Where | State |
|---|---|---|
| 1. Shortcuts actions | `plugins/ios/NafaqatiShortcutIntents.swift`, `plugins/withNafaqatiShortcuts.js` | written, **not yet built on a Mac** |
| 2. Capture pipeline | `modules/nafaqati-capture` (Swift queue), `src/features/iosCapture/` | done + unit tests |
| 3. Setup simulation | `src/features/iosSetup/` | already existed |
| 4. Connection check | `iosSetup/ConnectionCheck.tsx`, `iosCapture/status.ts`, `reminder.ts`, `CaptureStatusCard`, `CaptureReminderBanner` | done; test SMS needs backend |

## How it fits together

1. `withNafaqatiShortcuts` (config plugin, runs on `expo prebuild`) copies the two App Intents into the app target, adds the
   App Group `group.com.intellivex.nafaqati` and the Arabic/English action names (string catalog).
2. An action calls `CaptureQueue` (Swift, in `modules/nafaqati-capture`): one AES-GCM encrypted file per item in the App Group
   container, key in the Keychain (after first unlock, so writes work while locked). One-time passwords are dropped **before**
   anything is written; the backend's test SMS (`NFQ-TEST`) only updates a timestamp.
3. `IosCaptureSync` (mounted in `_layout.tsx`) calls `processCaptured()` at start, on coming to the front and every 30 s:
   secret code -> drop, no amount/transaction word -> drop, same text twice -> one copy, then the existing `parseSms` +
   categorizer (`handleIncomingSms`, unreadable ones go to "Needs review" through `saveIfMissed`).
4. Wallet payments are held for their SMS (`walletHoldMs`); SMS and Wallet for the same purchase (amount, card, time window)
   become one transaction; empty merchant / zero amount waits `incompleteWaitMs`, then is flagged `needsCompletion`.
5. An item leaves the queue only after it was handled; the raw text is gone from the device at that point.

Timings (`matchWindowMs`, `walletHoldMs`, `incompleteWaitMs`, `reminderDays`) are in `DEFAULT_CAPTURE_CONFIG` and can be
overridden by a `capture` object in the setup configuration (the same JSON the backend will serve for the simulation).

## Building and testing

Needs a Mac (or EAS) and a real iPhone on iOS 17+; the Simulator cannot run Shortcuts message automations.

```bash
npx expo prebuild --platform ios --clean
eas build --platform ios --profile development
```

Check on the device: both actions appear in Shortcuts in English and Arabic; with the app closed and the phone locked a
matching SMS is saved; no banner/dialog appears when the automation runs; an OTP containing the keyword leaves no trace.

## Not done yet

- **Backend**: `POST /api/capture/test-sms` (texts the keyword + `NFQ-TEST` marker to the verified number, 3 per day) and
  serving the setup configuration. The app shows "Setup saved" until `EXPO_PUBLIC_IOS_TEST_SMS=true`.
- Sending the setup-funnel events (and "first message received") to the backend; they are kept on the device for now.
- A screen to complete held Apple Pay payments (they are counted in Settings but cannot be edited yet).
- Wording of the simulation compared with real iPhones in both languages (`labelsVerified` in `defaultConfig.ts`).
- App Review notes and demo video; privacy/legal review of the consent text.
