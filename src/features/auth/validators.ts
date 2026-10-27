import type { TranslationKey } from '@/i18n';

// These mirror the auth-service rules (RegisterRequest, ValidPasswordValidator) so most mistakes
// are caught before a request is sent. The server stays the source of truth.
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_EMAIL = 255;
const MIN_PASSWORD_CHARS = 8;
const MAX_PASSWORD_BYTES = 72;

export type RegisterValues = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegisterField = keyof RegisterValues;
export type FieldErrors<K extends string> = Partial<Record<K, TranslationKey>>;

const byteLength = (value: string) => new TextEncoder().encode(value).length;

export function validateEmail(email: string): TranslationKey | null {
  if (!email) return 'validation.emailRequired';
  if (email.length > MAX_EMAIL) return 'validation.emailTooLong';
  if (!EMAIL_RE.test(email)) return 'validation.emailInvalid';
  return null;
}

export function validateRegister(values: RegisterValues): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {};

  if (!values.firstName) errors.firstName = 'validation.firstNameRequired';
  else if (values.firstName.length > MAX_NAME) errors.firstName = 'validation.nameTooLong';

  if (values.lastName.length > MAX_NAME) errors.lastName = 'validation.nameTooLong';

  if (!USERNAME_RE.test(values.username)) errors.username = 'validation.usernameInvalid';

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  if (!values.password) errors.password = 'validation.passwordRequired';
  else if ([...values.password].length < MIN_PASSWORD_CHARS) errors.password = 'validation.passwordTooShort';
  else if (byteLength(values.password) > MAX_PASSWORD_BYTES) errors.password = 'validation.passwordTooLongBytes';

  if (values.confirmPassword !== values.password) errors.confirmPassword = 'validation.passwordMismatch';

  return errors;
}
