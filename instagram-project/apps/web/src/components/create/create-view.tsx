'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ImagePlus, Loader2, X } from 'lucide-react';
import {
  CAPTION_MAX,
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  POST_MEDIA_MAX,
  VIDEO_MAX_BYTES,
  VIDEO_MIME_TYPES,
  type MediaPurpose,
  type StoryAudience,
} from '@insta/shared';
import { useRouter } from '@/i18n/navigation';
import { useApiErrors } from '@/lib/use-api-errors';
import { cn } from '@/lib/utils';
import { useUploadMediaMutation } from '@/store/api';
import { useCreatePostMutation, useCreateReelMutation, useCreateStoryMutation } from '@/store/social-api';

type Tab = 'post' | 'story' | 'reel';

const TABS: Tab[] = ['post', 'story', 'reel'];
const IMAGE_TYPES: readonly string[] = IMAGE_MIME_TYPES;
const VIDEO_TYPES: readonly string[] = VIDEO_MIME_TYPES;
const AUDIENCES: StoryAudience[] = ['EVERYONE', 'FOLLOWERS', 'CLOSE_FRIENDS'];

interface Picked {
  file: File;
  url: string;
  video: boolean;
}

function checkFile(file: File, allowImages: boolean): 'type' | 'size' | null {
  const image = IMAGE_TYPES.includes(file.type);
  const video = VIDEO_TYPES.includes(file.type);
  if ((!image || !allowImages) && !video) {
    return 'type';
  }
  if ((image && file.size > IMAGE_MAX_BYTES) || (video && file.size > VIDEO_MAX_BYTES)) {
    return 'size';
  }
  return null;
}

export function CreateView() {
  const t = useTranslations('create');
  const params = useSearchParams();
  const router = useRouter();
  const toMessages = useApiErrors();
  const initial = params.get('tab');
  const [tab, setTab] = useState<Tab>(TABS.includes(initial as Tab) ? (initial as Tab) : 'post');
  const [files, setFiles] = useState<Picked[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState<StoryAudience>('EVERYONE');
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [upload, uploadState] = useUploadMediaMutation();
  const [createPost, postState] = useCreatePostMutation();
  const [createStory, storyState] = useCreateStoryMutation();
  const [createReel, reelState] = useCreateReelMutation();

  const max = tab === 'post' ? POST_MEDIA_MAX : 1;
  const accept = tab === 'reel' ? VIDEO_TYPES.join(',') : [...IMAGE_TYPES, ...VIDEO_TYPES].join(',');

  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const switchTab = (next: Tab) => {
    setTab(next);
    setFiles([]);
    setLocalError(null);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    setLocalError(null);
    const next: Picked[] = [];
    for (const file of picked) {
      const problem = checkFile(file, tab !== 'reel');
      if (problem) {
        setLocalError(problem === 'type' ? t('badType') : t('tooBig'));
        continue;
      }
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      next.push({ file, url, video: VIDEO_TYPES.includes(file.type) });
    }
    const merged = [...files, ...next];
    if (merged.length > max) {
      setLocalError(t('tooMany', { max }));
    }
    setFiles(merged.slice(0, max));
  };

  const purpose: MediaPurpose = tab === 'post' ? 'POST' : tab === 'story' ? 'STORY' : 'REEL';

  const submit = async () => {
    if (files.length === 0) {
      setLocalError(t('pickFirst'));
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      const ids: string[] = [];
      for (const item of files) {
        const media = await upload({ file: item.file, purpose }).unwrap();
        ids.push(media.id);
      }
      const text = caption.trim() || undefined;
      if (tab === 'post') {
        const post = await createPost({ mediaIds: ids, caption: text, location: location.trim() || null }).unwrap();
        router.push(`/p/${post.id}`);
      } else if (tab === 'story') {
        await createStory({ mediaId: ids[0], caption: text, audience }).unwrap();
        router.push('/');
      } else {
        await createReel({ videoMediaId: ids[0], caption: text }).unwrap();
        router.push('/reels');
      }
    } catch {
      setBusy(false);
    }
  };

  const errors = useMemo(
    () => [
      ...(localError ? [localError] : []),
      ...toMessages(uploadState.error),
      ...toMessages(postState.error),
      ...toMessages(storyState.error),
      ...toMessages(reelState.error),
    ],
    [localError, toMessages, uploadState.error, postState.error, storyState.error, reelState.error],
  );

  return (
    <div className="grid animate-fade-up gap-5 px-4 pt-4 md:px-0 md:pt-0">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <div role="tablist" aria-label={t('title')} className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => switchTab(key)}
            className={cn('h-10 rounded-xl text-sm font-semibold', tab === key ? 'nav-active' : 'text-muted-foreground')}
          >
            {t(`tab.${key}`)}
          </button>
        ))}
      </div>

      <section className="post-card grid gap-4 rounded-3xl p-4">
        <p className="text-sm text-muted-foreground">{t(`hint.${tab}`, { max })}</p>
        {files.length > 0 ? (
          <ul className={cn('grid gap-2', tab === 'post' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3')}>
            {files.map((item, index) => (
              <li key={item.url} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                {item.video ? (
                  <video src={item.url} muted playsInline className="size-full object-cover" />
                ) : (
                  <img src={item.url} alt={t('preview', { n: index + 1 })} className="size-full object-cover" />
                )}
                <button
                  type="button"
                  aria-label={t('remove')}
                  onClick={() => setFiles(files.filter((f) => f !== item))}
                  className="absolute right-1 top-1 rounded-full bg-overlay p-1 text-overlay-foreground"
                >
                  <X className="size-4" />
                </button>
                {tab === 'post' ? (
                  <span className="absolute bottom-1 left-1 rounded-full bg-overlay px-2 text-xs text-overlay-foreground">{index + 1}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {files.length < max ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm text-muted-foreground hover:bg-nav-hover"
          >
            <ImagePlus className="size-8" strokeWidth={1.5} />
            {t('pick')}
          </button>
        ) : null}
        <input ref={input} type="file" accept={accept} multiple={tab === 'post'} hidden onChange={onPick} />

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{t('caption')}</span>
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={tab === 'story' ? 200 : CAPTION_MAX}
            rows={3}
            placeholder={t('captionPlaceholder')}
            className="rounded-2xl border border-surface-border bg-surface px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-right text-xs text-muted-foreground">
            {caption.length}/{tab === 'story' ? 200 : CAPTION_MAX}
          </span>
        </label>

        {tab === 'post' ? (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t('location')}</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={100}
              placeholder={t('locationPlaceholder')}
              className="h-11 rounded-2xl border border-surface-border bg-surface px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        ) : null}

        {tab === 'story' ? (
          <fieldset className="grid gap-2 text-sm">
            <legend className="mb-1 font-medium">{t('audience')}</legend>
            {AUDIENCES.map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-nav-hover">
                <input type="radio" name="audience" checked={audience === value} onChange={() => setAudience(value)} />
                {t(`audiences.${value}`)}
              </label>
            ))}
          </fieldset>
        ) : null}

        {errors.length > 0 ? (
          <ul role="alert" className="grid gap-1 text-sm text-destructive">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          disabled={busy || files.length === 0}
          onClick={() => void submit()}
          className="btn-edit inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50 dark:rounded-full"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? t('publishing') : t('publish')}
        </button>
      </section>
    </div>
  );
}
