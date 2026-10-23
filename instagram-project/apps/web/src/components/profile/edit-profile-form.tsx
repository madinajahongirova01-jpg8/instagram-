'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { BIO_MAX, FULL_NAME_MAX, type CurrentUser } from '@insta/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormErrors } from '@/components/auth/form-errors';
import { FormField } from '@/components/auth/form-field';
import { useApiErrors } from '@/lib/use-api-errors';
import { hasErrors, validateRequired, validateUrl, type ValidationKey } from '@/lib/validators';
import { useUpdateProfileMutation } from '@/store/api';

interface EditProfileFormProps {
  me: CurrentUser;
  onDone: () => void;
}

export function EditProfileForm({ me, onDone }: EditProfileFormProps) {
  const t = useTranslations('profile');
  const tv = useTranslations('validation');
  const toMessages = useApiErrors();
  const [update, { isLoading, error }] = useUpdateProfileMutation();
  const [fullName, setFullName] = useState(me.fullName);
  const [bio, setBio] = useState(me.bio);
  const [website, setWebsite] = useState(me.website ?? '');
  const [errors, setErrors] = useState<Record<string, ValidationKey | null>>({});

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problems = { fullName: validateRequired(fullName), website: validateUrl(website) };
    setErrors(problems);
    if (hasErrors(problems)) {
      return;
    }
    const result = await update({ fullName: fullName.trim(), bio: bio.trim(), website: website.trim() || null })
      .unwrap()
      .catch(() => null);
    if (result) {
      onDone();
    }
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-4 sm:p-6">
      <FormField id="fullName" label={t('fullName')} error={errors.fullName ? tv(errors.fullName) : null}>
        <Input
          id="fullName"
          value={fullName}
          maxLength={FULL_NAME_MAX}
          onChange={(event) => setFullName(event.target.value)}
          aria-invalid={errors.fullName ? true : undefined}
        />
      </FormField>
      <FormField
        id="bio"
        label={t('bio')}
        aside={<span className="text-xs text-muted-foreground">{t('bioCounter', { count: bio.length, max: BIO_MAX })}</span>}
      >
        <Textarea id="bio" value={bio} maxLength={BIO_MAX} rows={3} onChange={(event) => setBio(event.target.value)} />
      </FormField>
      <FormField id="website" label={t('website')} error={errors.website ? tv(errors.website) : null}>
        <Input
          id="website"
          type="url"
          inputMode="url"
          placeholder="https://"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          aria-invalid={errors.website ? true : undefined}
        />
      </FormField>
      <FormErrors messages={toMessages(error)} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={isLoading}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : null}
          {isLoading ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  );
}
