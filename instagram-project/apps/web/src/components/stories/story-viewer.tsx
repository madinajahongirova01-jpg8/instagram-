'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Eye, Pause, Play, Trash2, X } from 'lucide-react';
import type { StoryGroupDto } from '@insta/shared';
import { Link, useRouter } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { Spinner } from '@/components/ui/states';
import { mediaUrl } from '@/lib/config';
import { clearStoryOrigin, storyOrigin } from '@/lib/story-origin';
import { useRelativeTime } from '@/lib/use-relative-time';
import { useAppDispatch } from '@/store';
import { api, useMeQuery } from '@/store/api';
import { useDeleteStoryMutation, useStoriesFeedQuery, useUserStoriesQuery, useViewStoryMutation } from '@/store/social-api';

const IMAGE_DURATION_MS = 5000;

export function StoryViewer({ username }: { username: string }) {
  const t = useTranslations('stories');
  const ago = useRelativeTime();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: me } = useMeQuery();
  const feed = useStoriesFeedQuery();
  const inFeed = feed.data?.some((g) => g.author.username === username) ?? false;
  const single = useUserStoriesQuery(username, { skip: !feed.isSuccess || inFeed });
  const [viewStory] = useViewStoryMutation();
  const [deleteStory] = useDeleteStoryMutation();
  const [groupIndex, setGroupIndex] = useState<number | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const [origin] = useState(storyOrigin);

  useEffect(() => clearStoryOrigin, []);

  const groups: StoryGroupDto[] = useMemo(() => {
    if (inFeed) {
      return feed.data ?? [];
    }
    const stories = single.data ?? [];
    if (stories.length === 0) {
      return [];
    }
    return [{ author: { id: stories[0].authorId, username, fullName: username, avatarUrl: null, isVerified: false }, hasUnseen: false, latestAt: '', stories }];
  }, [inFeed, feed.data, single.data, username]);

  useEffect(() => {
    if (groupIndex === null && groups.length > 0) {
      const index = Math.max(0, groups.findIndex((g) => g.author.username === username));
      const firstUnseen = groups[index].stories.findIndex((s) => !s.seen);
      setGroupIndex(index);
      setStoryIndex(firstUnseen >= 0 ? firstUnseen : 0);
    }
  }, [groupIndex, groups, username]);

  const group = groupIndex !== null ? groups[groupIndex] : undefined;
  const story = group?.stories[storyIndex];
  const mine = story?.authorId === me?.id;

  const close = useCallback(() => {
    dispatch(api.util.invalidateTags(['Stories']));
    router.push('/');
  }, [dispatch, router]);

  const next = useCallback(() => {
    if (!group || groupIndex === null) {
      return;
    }
    setProgress(0);
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      close();
    }
  }, [group, groupIndex, groups.length, storyIndex, close]);

  const previous = useCallback(() => {
    if (groupIndex === null) {
      return;
    }
    setProgress(0);
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(0);
    }
  }, [groupIndex, storyIndex]);

  useEffect(() => {
    if (story && !mine && !story.seen) {
      void viewStory(story.id);
    }
  }, [story, mine, viewStory]);

  useEffect(() => {
    if (!story || story.media.kind === 'VIDEO' || paused) {
      return;
    }
    const started = Date.now() - progress * IMAGE_DURATION_MS;
    const timer = window.setInterval(() => {
      const value = (Date.now() - started) / IMAGE_DURATION_MS;
      if (value >= 1) {
        window.clearInterval(timer);
        next();
      } else {
        setProgress(value);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [story, paused, next]);

  useEffect(() => {
    if (video.current) {
      if (paused) {
        video.current.pause();
      } else {
        void video.current.play().catch(() => undefined);
      }
    }
  }, [paused, story]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'Escape') close();
      if (event.key === ' ') setPaused((value) => !value);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [next, previous, close]);

  useEffect(() => {
    if (feed.data && groups.length === 0 && (inFeed || single.isSuccess || single.isError)) {
      close();
    }
  }, [feed.data, groups.length, inFeed, single.isSuccess, single.isError, close]);

  const remove = async () => {
    if (!story || !window.confirm(t('confirmDelete'))) {
      return;
    }
    await deleteStory(story.id).unwrap().catch(() => undefined);
    close();
  };

  if (!group || !story) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
        <Spinner />
      </div>
    );
  }

  const src = mediaUrl(story.media.url) ?? undefined;

  return (
    <div className="fixed inset-0 z-50 flex animate-overlay-in items-center justify-center bg-background/95 backdrop-blur" role="dialog" aria-label={t('viewer')}>
      <button type="button" aria-label={t('close')} onClick={close} className="absolute right-4 top-4 z-10 rounded-full p-2 hover:bg-nav-hover">
        <X className="size-7" />
      </button>
      <button type="button" aria-label={t('previous')} onClick={previous} className="absolute left-4 hidden rounded-full bg-popover p-2 shadow md:block">
        <ChevronLeft className="size-6" />
      </button>
      <button type="button" aria-label={t('next')} onClick={next} className="absolute right-4 hidden rounded-full bg-popover p-2 shadow md:block">
        <ChevronRight className="size-6" />
      </button>

      <div
        className="relative h-dvh w-full animate-story-open overflow-hidden bg-overlay sm:h-[92dvh] sm:max-w-[430px] sm:rounded-3xl"
        style={{ transformOrigin: origin }}
      >
        {story.media.kind === 'VIDEO' ? (
          <video
            ref={video}
            key={story.id}
            src={src}
            autoPlay
            playsInline
            className="size-full object-contain"
            onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime / (event.currentTarget.duration || 1))}
            onEnded={next}
          />
        ) : (
          <img key={story.id} src={src} alt={story.caption || group.author.username} className="size-full object-contain" />
        )}

        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-overlay to-transparent p-3">
          <div className="flex gap-1">
            {group.stories.map((item, i) => (
              <span key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-overlay-foreground/35">
                <span
                  className="block h-full origin-left bg-overlay-foreground transition-transform duration-75 ease-linear"
                  style={{ transform: `scaleX(${i < storyIndex ? 1 : i === storyIndex ? Math.min(1, progress) : 0})` }}
                />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-overlay-foreground">
            <Link href={`/profile/${group.author.username}`} className="flex min-w-0 items-center gap-2">
              <Avatar src={group.author.avatarUrl} alt={group.author.username} className="size-8" />
              <span className="truncate text-sm font-semibold">{group.author.username}</span>
            </Link>
            <span className="text-xs opacity-80">{ago(story.createdAt)}</span>
            {story.audience === 'CLOSE_FRIENDS' ? (
              <span className="rounded-full bg-online px-2 py-0.5 text-[10px] font-semibold text-badge-foreground">{t('closeFriends')}</span>
            ) : null}
            <button type="button" aria-label={paused ? t('play') : t('pause')} onClick={() => setPaused((v) => !v)} className="ml-auto p-1">
              {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
            </button>
          </div>
        </div>

        <button type="button" aria-label={t('previous')} onClick={previous} className="absolute bottom-20 left-0 top-20 w-1/3" />
        <button type="button" aria-label={t('next')} onClick={next} className="absolute bottom-20 right-0 top-20 w-2/3" />

        <div className="absolute inset-x-0 bottom-0 grid gap-2 bg-gradient-to-t from-overlay to-transparent p-4 text-overlay-foreground">
          {story.caption ? <p className="text-sm">{story.caption}</p> : null}
          {mine ? (
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-4" />
                {t('views', { count: story.viewsCount ?? 0 })}
              </span>
              <button type="button" onClick={() => void remove()} className="inline-flex items-center gap-1.5">
                <Trash2 className="size-4" />
                {t('delete')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
