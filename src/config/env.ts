// Model server, called directly only in auth bypass; signed in, the app goes through the gateway.
export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8087';

// Off by default: when the parser finds no merchant, send a redacted copy of the SMS to the
// server so it can name the merchant. Turn on only after the user has consented.
export const MERCHANT_FALLBACK_ENABLED: boolean =
  process.env.EXPO_PUBLIC_MERCHANT_FALLBACK === 'true';

// Experiment, off by default: send every debit (transfers too, names with digits and account numbers
// removed) to the model server instead of using the local lookup table and the transfer rule. The
// server needs FORCE_LLM=true to ask the LLM every time. Turn off to go back to the normal flow.
export const LLM_ONLY: boolean = process.env.EXPO_PUBLIC_LLM_ONLY === 'true';

// "Continue with Google": the OAuth *Web* client id from Google Cloud Console (not the Android one). The phone
// asks Google for an ID token for this id, and the auth-service accepts it (GOOGLE_CLIENT_IDS there). Empty
// = the button shows a "not set up" message.
export const GOOGLE_WEB_CLIENT_ID: string = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
