'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/store/api';
import { useApiErrors } from '@/lib/use-api-errors';
import { hasErrors, validateConfirmation, validateEmail, validateNewPassword, type ValidationKey } from '@/lib/validators';
import { AuthShell } from './auth-shell';
import { FormErrors } from './form-errors';
import { FormField } from './form-field';
import { PasswordInput } from './password-input';

function BackToLogin() {
  const t = useTranslations('forgot');
  return (
    <p className="mt-8 text-center text-sm">
      <Link href="/login" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" />
        {t('backToLogin')}
      </Link>
    </p>
  );
}

function RequestLinkForm() {
  const t = useTranslations('forgot');
  const ta = useTranslations('auth');
  const tv = useTranslations('validation');
  const toMessages = useApiErrors();
  const [send, { isLoading, isSuccess, error }] = useForgotPasswordMutation();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<ValidationKey | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validateEmail(email);
    setFieldError(problem);
    if (problem) {
      return;
    }
    await send(email.trim().toLowerCase()).unwrap().catch(() => undefined);
  };

  return (
    <AuthShell title={t('title')} subtitle={t('subtitle')}>
      {isSuccess ? (
        <Alert variant="success">
          <CheckCircle2 />
          {t('sent')}
        </Alert>
      ) : (
        <form noValidate onSubmit={submit} className="grid gap-6">
          <FormField id="email" label={ta('email')} error={fieldError ? tv(fieldError) : null}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'email-error' : undefined}
            />
          </FormField>
          <FormErrors messages={toMessages(error)} />
          <Button type="submit" size="lg" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : null}
            {isLoading ? t('sending') : t('send')}
          </Button>
        </form>
      )}
      <BackToLogin />
    </AuthShell>
  );
}

function ResetForm({ token }: { token: string }) {
  const t = useTranslations('forgot');
  const ta = useTranslations('auth');
  const tv = useTranslations('validation');
  const toMessages = useApiErrors();
  const [reset, { isLoading, isSuccess, error }] = useResetPasswordMutation();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, ValidationKey | null>>({});

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      password: validateNewPassword(password),
      confirmation: validateConfirmation(password, confirmation),
    };
    setErrors(next);
    if (hasErrors(next)) {
      return;
    }
    await reset({ token, newPassword: password }).unwrap().catch(() => undefined);
  };

  return (
    <AuthShell title={t('resetTitle')} subtitle={t('resetSubtitle')}>
      {isSuccess ? (
        <Alert variant="success">
          <CheckCircle2 />
          {t('resetDone')}
        </Alert>
      ) : (
        <form noValidate onSubmit={submit} className="grid gap-6">
          <FormField id="password" label={t('newPassword')} error={errors.password ? tv(errors.password) : null} hint={ta('passwordHint')}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={errors.password ? true : undefined}
            />
          </FormField>
          <FormField id="confirmation" label={ta('confirmPassword')} error={errors.confirmation ? tv(errors.confirmation) : null}>
            <PasswordInput
              id="confirmation"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              aria-invalid={errors.confirmation ? true : undefined}
            />
          </FormField>
          <FormErrors messages={toMessages(error, { 400: t('invalidToken') })} />
          <Button type="submit" size="lg" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : null}
            {isLoading ? t('resetting') : t('reset')}
          </Button>
        </form>
      )}
      <BackToLogin />
    </AuthShell>
  );
}

export function ForgotPasswordFlow() {
  const token = useSearchParams().get('token');
  return token ? <ResetForm token={token} /> : <RequestLinkForm />;
}
