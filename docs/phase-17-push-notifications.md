# Phase 17: Push notifications

Alerts now reach the phone even when the app is closed. Every notification that notification-service creates is also sent as a push, through the **Expo Push Service**, to each phone the user is signed in on. The text is in that phone's app language (English or Arabic).

## What sends a push

A notification row is created, and the user has not switched its type off in Notification settings. Pushes follow the same preferences and dedupe keys as the in-app list, so a duplicate alert never reaches the phone twice.

| Type | Producer | State |
| --- | --- | --- |
| `BUDGET_THRESHOLD`, `BUDGET_EXCEEDED` (overspending, personal and family) | budget-service | Live |
| `FAMILY` | family-service | Live |
| `SECURITY_ALERT`, `SYSTEM` (always on) | internal API / Kafka | Live |
| `LARGE_TRANSACTION` | transaction-service, allowed as an internal caller | Needs a producer |
| `SUBSCRIPTION_RENEWAL` (template `SUBSCRIPTION_RENEWAL`) | subscription-service, allowed as an internal caller | Needs a producer |
| `GOAL_MILESTONE` (templates `GOAL_MILESTONE`, `GOAL_COMPLETED`) | goal-service, allowed as an internal caller | Needs a producer |

The last three only need their service to call `POST /internal/notifications` with the template, its params (see `TemplateCatalog`) and `referenceType` `TRANSACTION`, `SUBSCRIPTION` or `GOAL`. The push then follows on its own.

## Backend (notification-service)

- `V5__create_push_tokens.sql`: one row per installed app (`token` is unique). If another account signs in on the same phone, the row moves to that account.
- `PUT /api/notifications/push-tokens` `{ token, platform: ios|android, language }` registers the phone. It is idempotent.
- `DELETE /api/notifications/push-tokens` `{ token }` is called on sign-out. Only the token's owner can remove it, and the call always answers 204.
- `POST /api/notifications/push-tokens/test` sends a test push to all of the caller's phones and answers `{ devices, accepted }`.
- `NotificationService` publishes `NotificationCreatedEvent`. `NotificationPushListener` sends it **after commit**, on the async executor, so callers never wait for Expo.
- `PushSender` renders the text per phone language, uses the Android channel `budget-alerts` (budget and payments) or `alerts` (everything else), and sets `high` priority for WARNING/CRITICAL. Tokens that Expo reports as `DeviceNotRegistered` are deleted.
- Config (`notification.push.*`): `NOTIFICATION_PUSH_ENABLED` (default true), `EXPO_PUSH_URL`, `EXPO_ACCESS_TOKEN` (only when "enhanced push security" is on; keep it in the environment, never in git), `EXPO_PUSH_TIMEOUT`.
- Not done yet: Expo push **receipts** are not checked, so a token rejected later by FCM/APNs is only removed on its next ticket error.

## App

- `src/features/notifications/push.ts`: `registerForPush('once' | 'now')`, `unregisterPush()`, `getPushStatus()`, `isPushActive()`.
- `usePushRegistration` (tabs layout): after sign-in it asks for permission **once**, never again after a denial, then registers the token. It registers again when the language or the token changes. A push that arrives while the app is open refreshes the bell badge.
- Sign-out (`AuthProvider.signOut`) removes the token first, while the session is still valid.
- `useAlertTaps` handles taps on pushes too, including the tap that cold-starts the app. It marks the notification read and opens the budget, transaction, subscriptions or goal screen (`notificationLink`).
- The 45 s polling stays for the badge. While push is active it only records server alerts and no longer shows its own banners, so nothing appears twice.
- Notification settings has a **Phone notifications** card: status, *Turn on* (or *Open phone settings* when blocked) and *Send a test notification*.
- **Auth-bypass mode**: the token is fetched (when possible) but nothing is sent to the backend, and the test button is hidden.
- Where push cannot run (web, emulator, Expo Go on Android, a dev build made before expo-notifications), everything is skipped and the app works as before.

## What you must do to get pushes on a phone

1. **Android (FCM v1):** create a Firebase project with an Android app whose package is `com.intellivex.nafaqati`. Download `google-services.json` to the project root and add `"googleServicesFile": "./google-services.json"` under `expo.android` in `app.json`. In the Firebase console, create a service account key for FCM v1 and upload it with `npx eas-cli@latest credentials` (Android → Push Notifications: FCM V1). See https://docs.expo.dev/push-notifications/fcm-credentials/.
2. **iOS:** an Apple Developer account. `eas build` sets up the APNs key when you allow it.
3. Build a development build (Expo Go on Android cannot receive pushes):

   ```bash
   npx eas-cli@latest build --profile development --platform android
   ```

   The EAS project id is already in `app.json` (`extra.eas.projectId`).
4. Run notification-service with the V5 migration. Pushes are on by default.
5. On the phone, sign in, allow notifications, open **More → Notification settings**, and tap **Send a test notification**.
