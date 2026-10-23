'use client';

import { useTranslations } from 'next-intl';
import { Compass, Hash } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { PostTile, ReelTile } from '@/components/profile/posts-grid';
import { FollowButton } from '@/components/social/follow-button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useExploreQuery } from '@/store/social-api';

export function ExploreView() {
  const t = useTranslations('explore');
  const { data, isLoading, isError, refetch } = useExploreQuery();

  if (isLoading) {
    return (
      <ul className="grid grid-cols-3 gap-1 pt-3 md:pt-0" aria-busy="true">
        {Array.from({ length: 9 }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-square rounded-none" />
          </li>
        ))}
      </ul>
    );
  }
  if (isError || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const nothing = data.posts.length === 0 && data.reels.length === 0;

  return (
    <div className="grid gap-6 px-4 pt-4 md:px-0 md:pt-0">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      {data.trendingHashtags.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t('trending')}>
          {data.trendingHashtags.map((tag) => (
            <li key={tag.name}>
              <Link href={`/explore/tags/${encodeURIComponent(tag.name)}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm text-link">
                <Hash className="size-3.5" />
                {tag.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {nothing ? (
        <EmptyState icon={Compass} title={t('emptyTitle')} text={t('emptyText')} />
      ) : (
        <>
          {data.posts.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t('posts')}</h2>
              <ul className="grid grid-cols-3 gap-1">
                {data.posts.map((post) => (
                  <PostTile key={post.id} post={post} />
                ))}
              </ul>
            </section>
          ) : null}
          {data.reels.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t('reels')}</h2>
              <ul className="grid grid-cols-3 gap-1">
                {data.reels.map((reel) => (
                  <ReelTile key={reel.id} reel={reel} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {data.suggestedUsers.length > 0 ? (
        <section className="post-card rounded-3xl p-4">
          <h2 className="mb-3 text-base font-semibold">{t('people')}</h2>
          <ul className="grid gap-3">
            {data.suggestedUsers.map((user) => (
              <li key={user.id} className="flex items-center gap-3">
                <Link href={`/profile/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={user.avatarUrl} alt={user.username} className="size-11" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{user.username}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.fullName}</span>
                  </span>
                </Link>
                <FollowButton userId={user.id} username={user.username} status="NONE" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
