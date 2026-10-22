import { router } from 'expo-router';
import { useState } from 'react';

import { toApiErrorInfo } from '@/api/errors';
import { AUTH_BYPASS } from '@/config/flags';
import { useAuth } from '@/auth/AuthProvider';
import { useLanguage } from '@/i18n/LanguageProvider';

const MAX_IDENTIFIER = 255;
const MAX_PASSWORD = 72;

type FieldErrors = { identifier?: string; password?: string };

export function useLogin() {
  const { t } = useLanguage();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (id: string): FieldErrors => {
    const errors: FieldErrors = {};
    if (!id) errors.identifier = t('validation.identifierRequired');
    else if (id.length > MAX_IDENTIFIER) errors.identifier = t('validation.identifierTooLong');
    if (!password) errors.password = t('validation.passwordRequired');
    else if (password.length > MAX_PASSWORD) errors.password = t('validation.passwordTooLong');
    return errors;
  };

  const submit = async () => {
    if (submitting) return;
    if (AUTH_BYPASS) {
      // TEMP: remove when dashboard is connected to backend
      await signIn({ identifier, password, rememberMe });
      router.replace('/home');
      return;
    }
    const id = identifier.trim();
    const errors = validate(id);
    setFieldErrors(errors);
    setBanner(null);
    if (errors.identifier || errors.password) return;

    setSubmitting(true);
    try {
      await signIn({ identifier: id, password, rememberMe });
      router.replace('/home');
    } catch (error) {
      const info = toApiErrorInfo(error);
      const { identifier: idError, password: pwError, ...rest } = info.fieldErrors;
      setFieldErrors({ identifier: idError, password: pwError });
      setBanner(info.message ?? Object.values(rest)[0] ?? null);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    identifier,
    password,
    rememberMe,
    fieldErrors,
    banner,
    submitting,
    setIdentifier,
    setPassword,
    setRememberMe,
    submit,
  };
}
