'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { FULL_NAME_MAX } from '@insta/shared';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegisterMutation } from '@/store/api';
import { useApiErrors } from '@/lib/use-api-errors';
import {
  hasErrors,
  validateConfirmation,
  validateEmail,
  validateNewPassword,
  validateRequired,
  validateUsername,
  type ValidationKey,
} from '@/lib/validators';
import { AuthShell } from './auth-shell';
import { FormErrors } from './form-errors';
import { FormField } from './form-field';
import { PasswordInput } from './password-input';
import { SocialButtons } from './social-buttons';

interface Values {
  fullName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

const empty: Values = { fullName: '', email: '', username: '', password: '', confirmPassword: '' };

export function RegisterForm() {
  const t = useTranslations('auth');
  const tv = useTranslations('validation');
  const toMessages = useApiErrors();
  const [register, { isLoading, error }] = useRegisterMutation();

  const [values, setValues] = useState<Values>(empty);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, ValidationKey | null>>({});

  const set = (key: keyof Values) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      fullName: validateRequired(values.fullName),
      email: validateEmail(values.email),
      username: validateUsername(values.username),
      password: validateNewPassword(values.password),
      confirmPassword: validateConfirmation(values.password, values.confirmPassword),
      agreed: agreed ? null : ('agree' as const),
    };
    setErrors(next);
    if (hasErrors(next)) {
      return;
    }
    await register({
      fullName: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
      username: values.username.trim().toLowerCase(),
      password: values.password,
    })
      .unwrap()
      .catch(() => undefined);
  };

  const message = (key: string) => (errors[key] ? tv(errors[key]) : null);
  const invalid = (key: string) => (errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${key}-error` } : {});

  return (
    <AuthShell title={t('createTitle')} subtitle={t('createSubtitle')}>
      <form noValidate onSubmit={submit} className="grid gap-4">
        <FormField id="fullName" label={t('name')} error={message('fullName')}>
          <Input
            id="fullName"
            autoComplete="name"
            maxLength={FULL_NAME_MAX}
            value={values.fullName}
            onChange={set('fullName')}
            {...invalid('fullName')}
          />
        </FormField>
        <FormField id="email" label={t('email')} error={message('email')}>
          <Input id="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} {...invalid('email')} />
        </FormField>
        <FormField id="username" label={t('username')} error={message('username')} hint={t('usernameHint')}>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            value={values.username}
            onChange={set('username')}
            {...invalid('username')}
          />
        </FormField>
        <FormField id="password" label={t('password')} error={message('password')} hint={t('passwordHint')}>
          <PasswordInput id="password" autoComplete="new-password" value={values.password} onChange={set('password')} {...invalid('password')} />
        </FormField>
        <FormField id="confirmPassword" label={t('confirmPassword')} error={message('confirmPassword')}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={set('confirmPassword')}
            {...invalid('confirmPassword')}
          />
        </FormField>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-3">
            <Checkbox
              id="agreed"
              checked={agreed}
              onCheckedChange={(state) => setAgreed(state === true)}
              aria-invalid={errors.agreed ? true : undefined}
            />
            <Label htmlFor="agreed" className="block font-normal leading-snug">
              {t('agreePrefix')} <span className="font-medium underline underline-offset-4">{t('terms')}</span> {t('and')}{' '}
              <span className="font-medium underline underline-offset-4">{t('privacy')}</span>
            </Label>
          </div>
          {errors.agreed ? <p className="text-xs text-destructive">{tv('agree')}</p> : null}
        </div>

        <FormErrors messages={toMessages(error)} />

        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : null}
          {isLoading ? t('creating') : t('createAccount')}
        </Button>
      </form>

      <SocialButtons />

      <p className="mt-8 text-center text-sm">
        {t('haveAccount')}{' '}
        <Link href="/login" className="underline underline-offset-4">
          {t('signIn')}
        </Link>
      </p>
    </AuthShell>
  );
}
