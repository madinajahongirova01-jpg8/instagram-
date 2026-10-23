'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLoginMutation, useVerifyEmailMutation } from '@/store/api';
import { useApiErrors } from '@/lib/use-api-errors';
import { hasErrors, validateEmail, validateRequired, type ValidationKey } from '@/lib/validators';
import { AuthShell } from './auth-shell';
import { FormErrors } from './form-errors';
import { FormField } from './form-field';
import { PasswordInput } from './password-input';
import { SocialButtons } from './social-buttons';

type Mode = 'email' | 'username';

export const VERIFY_EMAIL_CACHE_KEY = 'verify-email';

export function EmailVerifier() {
  const searchParams = useSearchParams();
  const token = searchParams.get('verifyToken');
  const [verify] = useVerifyEmailMutation({ fixedCacheKey: VERIFY_EMAIL_CACHE_KEY });
  const started = useRef(false);

  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      void verify(token);
    }
  }, [token, verify]);

  return null;
}

export function LoginForm() {
  const t = useTranslations('auth');
  const tv = useTranslations('validation');
  const toMessages = useApiErrors();
  const [login, { isLoading, error }] = useLoginMutation();
  const te = useTranslations('errors');
  const [, verification] = useVerifyEmailMutation({ fixedCacheKey: VERIFY_EMAIL_CACHE_KEY });

  const [mode, setMode] = useState<Mode>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, ValidationKey | null>>({});

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      identifier: mode === 'email' ? validateEmail(identifier) : validateRequired(identifier),
      password: validateRequired(password),
    };
    setErrors(next);
    if (hasErrors(next)) {
      return;
    }
    await login({ login: identifier.trim(), password }).unwrap().catch(() => undefined);
  };

  const switchMode = () => {
    setMode((value) => (value === 'email' ? 'username' : 'email'));
    setIdentifier('');
    setErrors({});
  };

  const identifierError = errors.identifier ? tv(errors.identifier) : null;
  const passwordError = errors.password ? tv(errors.password) : null;

  return (
    <AuthShell title={t('welcome')} subtitle={t('loginSubtitle')}>
      {verification.isSuccess ? (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 />
          {t('emailVerified')}
        </Alert>
      ) : null}
      {verification.isError ? <FormErrors messages={[t('emailVerifyFailed')]} /> : null}

      <form noValidate onSubmit={submit} className="grid gap-6">
        <FormField
          id="identifier"
          label={mode === 'email' ? t('email') : t('username')}
          error={identifierError}
          aside={
            <button type="button" onClick={switchMode} className="text-sm hover:underline">
              {mode === 'email' ? t('loginWithUsername') : t('loginWithEmail')}
            </button>
          }
        >
          <Input
            id="identifier"
            type={mode === 'email' ? 'email' : 'text'}
            autoComplete={mode === 'email' ? 'email' : 'username'}
            autoCapitalize="none"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            aria-invalid={identifierError ? true : undefined}
            aria-describedby={identifierError ? 'identifier-error' : undefined}
          />
        </FormField>

        <FormField
          id="password"
          label={t('password')}
          error={passwordError}
          aside={
            <Link href="/forgot-password" className="text-sm hover:underline">
              {t('forgotPassword')}
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? 'password-error' : undefined}
          />
        </FormField>

        <FormErrors messages={toMessages(error, { 401: te('invalidCredentials') })} />

        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : null}
          {isLoading ? t('loggingIn') : t('login')}
        </Button>
      </form>

      <SocialButtons />

      <p className="mt-8 text-center text-sm">
        {t('noAccount')}{' '}
        <Link href="/register" className="underline underline-offset-4">
          {t('signUp')}
        </Link>
      </p>
    </AuthShell>
  );
}
