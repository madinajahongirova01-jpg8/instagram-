'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CardShell } from '@/components/card-shell';
import { useChangePasswordMutation } from '@/store/api';
import { useApiErrors } from '@/lib/use-api-errors';
import { hasErrors, validateConfirmation, validateNewPassword, validateRequired, type ValidationKey } from '@/lib/validators';
import { FormErrors } from './form-errors';
import { FormField } from './form-field';
import { PasswordInput } from './password-input';

export function ChangePasswordForm() {
  const t = useTranslations('changePassword');
  const ta = useTranslations('auth');
  const tv = useTranslations('validation');
  const toMessages = useApiErrors();
  const [change, { data, isLoading, isSuccess, error, reset }] = useChangePasswordMutation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, ValidationKey | null>>({});

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    reset();
    const problems = {
      current: validateRequired(current),
      next: validateNewPassword(next),
      confirmation: validateConfirmation(next, confirmation),
    };
    setErrors(problems);
    if (hasErrors(problems)) {
      return;
    }
    const result = await change({ currentPassword: current, newPassword: next }).unwrap().catch(() => null);
    if (result) {
      setCurrent('');
      setNext('');
      setConfirmation('');
    }
  };

  const serverErrors = toMessages(error, {
    400: error && 'messages' in error && error.messages.some((m) => /current password/i.test(m)) ? t('wrongCurrent') : undefined,
  });

  return (
    <CardShell title={t('title')} subtitle={t('subtitle')}>
      {isSuccess && data ? (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 />
          {t('success', { count: data.revokedSessions })}
        </Alert>
      ) : null}
      <form noValidate onSubmit={submit} className="grid gap-5">
        <FormField id="current" label={t('current')} error={errors.current ? tv(errors.current) : null}>
          <PasswordInput
            id="current"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            aria-invalid={errors.current ? true : undefined}
          />
        </FormField>
        <FormField id="next" label={t('new')} error={errors.next ? tv(errors.next) : null} hint={ta('passwordHint')}>
          <PasswordInput
            id="next"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            aria-invalid={errors.next ? true : undefined}
          />
        </FormField>
        <FormField id="confirmation" label={t('confirm')} error={errors.confirmation ? tv(errors.confirmation) : null}>
          <PasswordInput
            id="confirmation"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            aria-invalid={errors.confirmation ? true : undefined}
          />
        </FormField>
        <FormErrors messages={serverErrors} />
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : null}
          {isLoading ? t('submitting') : t('submit')}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm">
        <Link href="/profile" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" />
          {t('back')}
        </Link>
      </p>
    </CardShell>
  );
}
