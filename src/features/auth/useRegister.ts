import { router } from 'expo-router';
import { useState } from 'react';

import { toApiErrorInfo } from '@/api/errors';
import * as authApi from '@/auth/authApi';
import { useAuth } from '@/auth/AuthProvider';
import { showToast } from '@/components/Toast';
import { useLanguage } from '@/i18n/LanguageProvider';
import { validateRegister, type RegisterField, type RegisterValues } from './validators';

type FieldErrors = Partial<Record<RegisterField, string>>;

const EMPTY: RegisterValues = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export function useRegister() {
  const { t } = useLanguage();
  const { signIn } = useAuth();
  const [values, setValues] = useState<RegisterValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: RegisterField) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    if (submitting) return;
    const clean: RegisterValues = {
      ...values,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      username: values.username.trim(),
      email: values.email.trim(),
    };
    const invalid = validateRegister(clean);
    const translated: FieldErrors = Object.fromEntries(
      Object.entries(invalid).map(([field, key]) => [field, t(key)]),
    );
    setFieldErrors(translated);
    setBanner(null);
    if (Object.keys(translated).length > 0) return;

    setSubmitting(true);
    try {
      await authApi.register({
        username: clean.username,
        email: clean.email,
        firstName: clean.firstName,
        lastName: clean.lastName || undefined,
        password: clean.password,
      });
    } catch (error) {
      const info = toApiErrorInfo(error);
      setFieldErrors(info.fieldErrors as FieldErrors);
      setBanner(info.message ?? Object.values(info.fieldErrors)[0] ?? null);
      setSubmitting(false);
      return;
    }

    // Registering returns no tokens, so sign in with the same credentials.
    try {
      await signIn({ identifier: clean.username, password: clean.password, rememberMe: false });
      router.replace('/home');
    } catch {
      showToast(t('register.signInFailed'));
      router.replace('/login');
    } finally {
      setSubmitting(false);
    }
  };

  return { values, fieldErrors, banner, submitting, setField, submit };
}
