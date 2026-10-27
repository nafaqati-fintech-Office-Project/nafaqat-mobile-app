import { useState } from 'react';

import { toApiErrorInfo } from '@/api/errors';
import * as authApi from '@/auth/authApi';
import { useLanguage } from '@/i18n/LanguageProvider';
import { validateEmail } from './validators';

export function useForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (submitting) return;
    const clean = email.trim();
    const invalid = validateEmail(clean);
    setEmailError(invalid ? t(invalid) : undefined);
    setBanner(null);
    if (invalid) return;

    setSubmitting(true);
    try {
      await authApi.forgotPassword(clean);
      setSent(true);
    } catch (error) {
      const info = toApiErrorInfo(error);
      setEmailError(info.fieldErrors.email);
      setBanner(info.message ?? Object.values(info.fieldErrors)[0] ?? null);
    } finally {
      setSubmitting(false);
    }
  };

  return { email, emailError, banner, submitting, sent, setEmail, submit };
}
