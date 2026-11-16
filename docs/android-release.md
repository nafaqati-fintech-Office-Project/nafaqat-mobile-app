# Android release guide

How to build the Nafaqati app for a client, once the backend is running on the client's own server.

## Build profiles (`eas.json`)

| Profile | For | Output | Server address | Notes |
|---|---|---|---|---|
| `development` | developers | dev-client APK | from `.env.local` | plain http allowed (backend on the local network) |
| `preview` | internal testing | APK | fixed in the profile (your VPS) | keep pointing at your own server |
| `production` | the client | APK (direct install) | **you must supply it** | demo mode refused, http traffic off |
| `production-store` | Google Play | app bundle (.aab) | same as `production` | `eas submit --profile production-store` |

`production` and `production-store` set `APP_VARIANT=production`. `app.config.ts` then **stops the build** unless the
server address is an `https://` URL and demo mode is off, so a client build can never point at nothing or ship with the
mock login.

## One-time setup for a client

1. **Server address** (not stored in git, so the same repo serves any client):
   ```bash
   npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://api.client-domain.com --visibility plaintext
   ```
2. **Signing key.** The first production build asks to generate an Android keystore: let EAS create it, then download a
   backup (`npx eas-cli@latest credentials`). Losing it means the app can never be updated in place.
3. **Google sign-in.** In the client's Google Cloud project create an Android OAuth client for package
   `com.intellivex.nafaqati` with the **SHA-1 of that keystore** (shown by `eas credentials`). Put the Web client id in
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (an EAS variable, or add it to the `production` profile `env`) and the same id in the
   auth-service `GOOGLE_CLIENT_IDS`. Without it the "Continue with Google" button shows "not set up".
4. **Push notifications.** Create a Firebase project for the client, add the Android app, download
   `google-services.json`, upload it as an EAS **file** variable named `GOOGLE_SERVICES_JSON`, and upload the FCM v1
   service-account key in `eas credentials`. Without the file the app builds and works but receives no push messages.
5. **Version.** Raise `android.versionCode` in `app.json` for every build that replaces an installed one (it is `1` now).

## Build

```bash
npx eas-cli@latest build --profile production --platform android
```

## What is switched off or on in a production build

| Setting | Value | Why |
|---|---|---|
| `EXPO_PUBLIC_AUTH_BYPASS` | `false` (and refused if `true`) | no mock session |
| `EXPO_PUBLIC_MERCHANT_FALLBACK` | `false` | sends a redacted copy of a bank SMS to the server; turn it on only after the user has consented in the app |
| `EXPO_PUBLIC_SMS_TOOLS` | `true` | Android reads bank SMS (READ_SMS, RECEIVE_SMS) |
| plain-http traffic | off | the production server must use https |
| over-the-air updates | channel `production` | publish with `eas update --channel production` |

## Before handing it over (cannot be done from this repo)

- Backend deployed on the client's server and the app pointed at it (step 1). Check that Free and Premium test users can
  open Insights, and that payments are either live or intentionally off.
- Google Play only: a Permissions Declaration for the SMS permissions, a privacy policy URL, and the Data safety form.
  A directly installed APK needs none of these, but the privacy policy should still be given to the client.
- Test the APK on a real Android phone: sign in, SMS read, sync, Premium lock, delete and restore account.
