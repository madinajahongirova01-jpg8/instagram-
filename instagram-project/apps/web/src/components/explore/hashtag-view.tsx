'use client';

import { useTranslations } from 'next-intl';
import { Hash } from 'lucide-react';
import { PostTile } from '@/components/profile/posts-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, LoadMore } from '@/components/ui/states';
import { useHashtagPostsInfiniteQuery } from '@/store/social-api';

export function HashtagView({ name }: { name: string }) {
  const t = useTranslations('explore');
  const query = useHashtagPostsInfiniteQuery(name);
  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="grid gap-5 px-4 pt-4 md:px-0 md:pt-0">
      <header className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full border-2">
          <Hash className="size-8" />
        </span>
        <h1 className="text-2xl font-semibold">#{name}</h1>
      </header>
      {query.isLoading ? (
        <ul className="grid grid-cols-3 gap-1" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-square rounded-none" />
            </li>
          ))}
        </ul>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : posts.length === 0 ? (
        <EmptyState icon={Hash} title={t('noTagPosts')} />
      ) : (
        <ul className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <PostTile key={post.id} post={post} />
          ))}
        </ul>
      )}
      <LoadMore hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onLoadMore={() => void query.fetchNextPage()} />
    </div>
  );
}
