export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// Off by default: when the parser finds no merchant, send a redacted copy of the SMS to the
// server so it can name the merchant. Turn on only after the user has consented.
export const MERCHANT_FALLBACK_ENABLED: boolean =
  process.env.EXPO_PUBLIC_MERCHANT_FALLBACK === 'true';
