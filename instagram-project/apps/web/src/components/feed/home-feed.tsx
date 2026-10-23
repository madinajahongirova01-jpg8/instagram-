'use client';

import { useTranslations } from 'next-intl';
import { Camera } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { PostCard } from '@/components/post/post-card';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, LoadMore } from '@/components/ui/states';
import { useFeedInfiniteQuery } from '@/store/social-api';
import { StoriesBar } from './stories-bar';

function PostSkeleton() {
  return (
    <div className="post-card grid gap-3 p-4 sm:rounded-3xl" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export function HomeFeed() {
  const t = useTranslations('feed');
  const query = useFeedInfiniteQuery();
  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="grid gap-5 pt-3 md:pt-0">
      <StoriesBar />
      {query.isLoading ? (
        <>
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : posts.length === 0 ? (
        <EmptyState icon={Camera} title={t('emptyTitle')} text={t('emptyText')}>
          <Link href="/explore" className="btn-follow inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold">
            {t('explore')}
          </Link>
        </EmptyState>
      ) : (
        posts.map((post) => (
          <Reveal key={post.id}>
            <PostCard post={post} />
          </Reveal>
        ))
      )}
      <LoadMore hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onLoadMore={() => void query.fetchNextPage()} />
    </div>
  );
}
