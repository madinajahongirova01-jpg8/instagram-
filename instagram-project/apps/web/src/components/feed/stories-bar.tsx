'use client';

import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { StoryRing } from '@/components/ui/story-ring';
import { rememberStoryOrigin } from '@/lib/story-origin';
import { useMeQuery } from '@/store/api';
import { useStoriesFeedQuery } from '@/store/social-api';

export function StoriesBar() {
  const t = useTranslations('stories');
  const { data: me } = useMeQuery();
  const { data, isLoading } = useStoriesFeedQuery();
  const groups = data ?? [];
  const mine = groups.find((group) => group.author.id === me?.id);
  const others = groups.filter((group) => group.author.id !== me?.id);

  return (
    <section aria-label={t('title')} className="overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] md:-mx-1 md:px-1">
      <ul className="flex gap-4">
        <li className="w-[78px] shrink-0">
          <div className="relative mx-auto w-fit">
            <Link href={mine ? `/stories/${mine.author.username}` : '/create?tab=story'} aria-label={t('yourStory')} onClick={rememberStoryOrigin}>
              <StoryRing seen={!mine || !mine.hasUnseen} className={mine ? '' : 'bg-transparent'}>
                <Avatar src={me?.avatarUrl ?? null} alt={me?.username ?? ''} className="size-[66px]" />
              </StoryRing>
            </Link>
            <Link
              href="/create?tab=story"
              aria-label={t('add')}
              className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full border-2 border-background bg-dot-active text-badge-foreground"
            >
              <Plus className="size-3.5" strokeWidth={3} />
            </Link>
          </div>
          <p className="mt-1.5 truncate text-center text-xs font-medium">{t('yourStory')}</p>
        </li>
        {isLoading
          ? [0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="w-[78px] shrink-0">
                <Skeleton className="mx-auto size-[76px] rounded-full" />
                <Skeleton className="mx-auto mt-2 h-3 w-14" />
              </li>
            ))
          : others.map((group) => (
              <li key={group.author.id} className="w-[78px] shrink-0">
                <Link href={`/stories/${group.author.username}`} className="block transition-transform duration-200 hover:scale-105 active:scale-95" onClick={rememberStoryOrigin}>
                  <StoryRing seen={!group.hasUnseen} className="mx-auto w-fit">
                    <Avatar src={group.author.avatarUrl} alt={group.author.username} className="size-[66px]" />
                  </StoryRing>
                  <p className="mt-1.5 truncate text-center text-xs font-medium">{group.author.username}</p>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}
