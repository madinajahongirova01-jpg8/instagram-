'use client';

import { useTranslations } from 'next-intl';
import { Bookmark, Camera, Clapperboard, Copy, Heart, MessageCircle, Play } from 'lucide-react';
import type { MediaDto, Paginated, PostDto, ReelDto } from '@insta/shared';
import { Link } from '@/i18n/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, LoadMore } from '@/components/ui/states';
import { mediaUrl } from '@/lib/config';
import { useProfilePostsInfiniteQuery, useProfileReelsInfiniteQuery, useSavedPostsInfiniteQuery } from '@/store/social-api';

interface GridQuery<T> {
  data?: { pages: Paginated<T>[] };
  isLoading: boolean;
  isError: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}

function Cover({ media, alt }: { media: MediaDto | undefined | null; alt: string }) {
  const src = mediaUrl(media?.url);
  if (!src) {
    return null;
  }
  return media?.kind === 'VIDEO' ? (
    <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
  ) : (
    <img src={src} alt={alt} loading="lazy" className="size-full object-cover" />
  );
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-3 gap-1" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-square rounded-none" />
        </li>
      ))}
    </ul>
  );
}

function Grid<T>({ query, empty, render }: { query: GridQuery<T>; empty: { icon: typeof Camera; title: string }; render: (item: T) => React.ReactNode }) {
  if (query.isLoading) {
    return <GridSkeleton />;
  }
  if (query.isError) {
    return <ErrorState onRetry={() => void query.refetch()} />;
  }
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (items.length === 0) {
    return <EmptyState icon={empty.icon} title={empty.title} />;
  }
  return (
    <>
      <ul className="grid grid-cols-3 gap-1">{items.map(render)}</ul>
      <LoadMore hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onLoadMore={() => void query.fetchNextPage()} />
    </>
  );
}

export function PostTile({ post }: { post: PostDto }) {
  const cover = post.media[0];
  return (
    <li className="relative aspect-square overflow-hidden bg-muted">
      <Link href={`/p/${post.id}`} className="group block size-full">
        <Cover media={cover} alt={post.caption.slice(0, 80) || post.author.username} />
        {post.media.length > 1 ? <Copy className="absolute right-2 top-2 size-4 text-overlay-foreground drop-shadow" /> : null}
        {post.media.length === 1 && cover?.kind === 'VIDEO' ? (
          <Play className="absolute right-2 top-2 size-4 fill-overlay-foreground text-overlay-foreground drop-shadow" />
        ) : null}
        <span className="absolute inset-0 hidden items-center justify-center gap-5 bg-overlay text-sm font-semibold text-overlay-foreground group-hover:flex">
          {post.likesCount !== null ? (
            <span className="inline-flex items-center gap-1">
              <Heart className="size-4 fill-current" />
              {post.likesCount}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-4 fill-current" />
            {post.commentsCount}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function ReelTile({ reel }: { reel: ReelDto }) {
  return (
    <li className="relative aspect-[9/16] overflow-hidden bg-muted">
      <Link href={`/reels?start=${reel.id}`} className="block size-full">
        <Cover media={reel.thumbnail ?? reel.video} alt={reel.caption.slice(0, 80) || reel.author.username} />
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-xs font-semibold text-overlay-foreground drop-shadow">
          <Play className="size-3.5 fill-current" />
          {reel.viewsCount}
        </span>
      </Link>
    </li>
  );
}

export function PostsGrid({ username }: { username: string }) {
  const t = useTranslations('profile');
  const query = useProfilePostsInfiniteQuery(username);
  return <Grid query={query} empty={{ icon: Camera, title: t('noPosts') }} render={(post) => <PostTile key={post.id} post={post} />} />;
}

export function ReelsGrid({ username }: { username: string }) {
  const t = useTranslations('profile');
  const query = useProfileReelsInfiniteQuery(username);
  return <Grid query={query} empty={{ icon: Clapperboard, title: t('noReels') }} render={(reel) => <ReelTile key={reel.id} reel={reel} />} />;
}

export function SavedGrid() {
  const t = useTranslations('profile');
  const query = useSavedPostsInfiniteQuery();
  return <Grid query={query} empty={{ icon: Bookmark, title: t('noSaved') }} render={(post) => <PostTile key={post.id} post={post} />} />;
}
