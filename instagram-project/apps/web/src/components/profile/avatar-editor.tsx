'use client';

import { useRef, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Loader2 } from 'lucide-react';
import { IMAGE_MAX_BYTES, IMAGE_MIME_TYPES, type CurrentUser } from '@insta/shared';
import { Button } from '@/components/ui/button';
import { FormErrors } from '@/components/auth/form-errors';
import { useApiErrors } from '@/lib/use-api-errors';
import { useRemoveAvatarMutation, useSetAvatarMutation, useUploadMediaMutation } from '@/store/api';
import { Avatar } from './avatar';

export function AvatarEditor({ me }: { me: CurrentUser }) {
  const t = useTranslations('profile');
  const toMessages = useApiErrors();
  const input = useRef<HTMLInputElement>(null);
  const [upload, uploadState] = useUploadMediaMutation();
  const [setAvatar, setState] = useSetAvatarMutation();
  const [removeAvatar, removeState] = useRemoveAvatarMutation();
  const busy = uploadState.isLoading || setState.isLoading || removeState.isLoading;

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || file.size > IMAGE_MAX_BYTES) {
      return;
    }
    const media = await upload({ file, purpose: 'AVATAR' }).unwrap().catch(() => null);
    if (media) {
      await setAvatar(media.id).unwrap().catch(() => undefined);
    }
  };

  const errors = [...toMessages(uploadState.error), ...toMessages(setState.error), ...toMessages(removeState.error)];

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="group relative rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={t('changePhoto')}
      >
        <Avatar src={me.avatarUrl} alt={t('photoAlt', { username: me.username })} className="size-24 sm:size-36" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-overlay text-overlay-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {busy ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
        </span>
      </button>
      <input ref={input} type="file" accept={IMAGE_MIME_TYPES.join(',')} className="hidden" onChange={onFile} />
      <div className="flex flex-wrap justify-center gap-1">
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {uploadState.isLoading ? t('uploading') : t('changePhoto')}
        </Button>
        {me.avatarUrl ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void removeAvatar()} className="text-destructive">
            {t('removePhoto')}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{t('photoHint')}</p>
      {errors.length > 0 ? <FormErrors messages={errors} /> : null}
    </div>
  );
}
