'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clapperboard, Heart, Loader2, MessageCircle, Play, Volume2, VolumeX } from 'lucide-react';
import type { ReelDto } from '@insta/shared';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { CommentForm } from '@/components/post/comment-form';
import { CommentsList } from '@/components/post/comments-list';
import { RichText } from '@/components/post/rich-text';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, LoadMore, Spinner } from '@/components/ui/states';
import { mediaUrl } from '@/lib/config';
import { cn } from '@/lib/utils';
import { useReelsInfiniteQuery, useSetReelLikeMutation, useViewReelMutation } from '@/store/social-api';

function ReelItem({ reel, muted, onToggleMute }: { reel: ReelDto; muted: boolean; onToggleMute: () => void }) {
  const t = useTranslations('reels');
  const common = useTranslations('common');
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const viewed = useRef(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [liked, setLiked] = useState(reel.likedByMe);
  const [likes, setLikes] = useState(reel.likesCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [setLike] = useSetReelLikeMutation();
  const [viewReel] = useViewReelMutation();

  useEffect(() => {
    const node = container.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver((entries) => setVisible(Boolean(entries[0]?.isIntersecting)), { threshold: 0.6 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = video.current;
    if (!node) {
      return;
    }
    if (visible && !paused) {
      void node.play().catch(() => undefined);
      if (!viewed.current) {
        viewed.current = true;
        void viewReel(reel.id);
      }
    } else {
      node.pause();
    }
  }, [visible, paused, reel.id, viewReel]);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((value) => value + (next ? 1 : -1));
    try {
      const result = await setLike({ id: reel.id, on: next }).unwrap();
      setLikes(result.likesCount);
    } catch {
      setLiked(!next);
      setLikes((value) => value + (next ? -1 : 1));
    }
  };

  return (
    <section ref={container} className="relative flex h-[calc(100dvh-7rem)] snap-start items-center justify-center md:h-[calc(100dvh-6rem)]">
      <div className="relative h-full w-full max-w-[420px] overflow-hidden bg-overlay sm:rounded-3xl">
        <video
          ref={video}
          src={`${mediaUrl(reel.video.url) ?? ''}#t=0.1`}
          poster={reel.thumbnail ? (mediaUrl(reel.thumbnail.url) ?? undefined) : undefined}
          loop
          playsInline
          muted={muted}
          preload="metadata"
          onLoadedData={() => setLoaded(true)}
          onClick={() => setPaused((value) => !value)}
          className={cn('size-full cursor-pointer object-cover transition-opacity duration-300', loaded || reel.thumbnail ? 'opacity-100' : 'opacity-0')}
        />
        {loaded ? null : (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Loader2 className="size-9 animate-spin text-overlay-foreground/80" />
          </span>
        )}
        {paused ? (
          <Play aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 fill-overlay-foreground text-overlay-foreground opacity-80" />
        ) : null}
        <button
          type="button"
          aria-label={muted ? t('unmute') : t('mute')}
          onClick={onToggleMute}
          className="absolute right-3 top-3 rounded-full bg-overlay p-2 text-overlay-foreground"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <div className="absolute inset-x-0 bottom-0 grid gap-2 bg-gradient-to-t from-overlay to-transparent p-4 pr-16 text-overlay-foreground">
          <Link href={`/profile/${reel.author.username}`} className="flex items-center gap-2 text-sm font-semibold">
            <Avatar src={reel.author.avatarUrl} alt={reel.author.username} className="size-8" />
            {reel.author.username}
          </Link>
          {reel.caption ? (
            <p className="line-clamp-3 text-sm">
              <RichText text={reel.caption} />
            </p>
          ) : null}
          <p className="text-xs opacity-80">{t('views', { count: reel.viewsCount })}</p>
        </div>
        <div className="absolute bottom-4 right-3 grid justify-items-center gap-4 text-overlay-foreground">
          <button type="button" aria-pressed={liked} aria-label={liked ? t('unlike') : t('like')} onClick={() => void toggleLike()} className="grid justify-items-center gap-1 text-xs">
            <Heart key={liked ? 'on' : 'off'} className={cn('size-7', liked && 'animate-like-pop fill-like text-like')} />
            <span key={likes} className="inline-block animate-count-up">
              {likes}
            </span>
          </button>
          <button type="button" aria-label={t('comments')} onClick={() => setCommentsOpen(true)} className="grid justify-items-center gap-1 text-xs">
            <MessageCircle className="size-7 -scale-x-100" />
            {reel.commentsCount}
          </button>
        </div>
      </div>
      {commentsOpen ? (
        <Modal title={t('comments')} closeLabel={common('close')} onClose={() => setCommentsOpen(false)}>
          <div className="grid gap-4">
            {reel.allowComments ? <CommentForm target={{ kind: 'reels', id: reel.id }} /> : <p className="text-sm text-muted-foreground">{t('commentsOff')}</p>}
            <CommentsList target={{ kind: 'reels', id: reel.id }} ownerId={reel.author.id} />
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

export function ReelsFeed() {
  const t = useTranslations('reels');
  const query = useReelsInfiniteQuery();
  const [muted, setMuted] = useState(true);
  const reels = query.data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    const start = new URLSearchParams(window.location.search).get('start');
    if (start && reels.length > 0) {
      document.getElementById(`reel-${start}`)?.scrollIntoView();
    }
  }, [reels.length]);

  if (query.isLoading) {
    return <Spinner className="py-20" />;
  }
  if (query.isError) {
    return <ErrorState onRetry={() => void query.refetch()} />;
  }
  if (reels.length === 0) {
    return (
      <EmptyState icon={Clapperboard} title={t('emptyTitle')} text={t('emptyText')}>
        <Link href="/create?tab=reel" className="btn-follow inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold">
          {t('create')}
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="h-[calc(100dvh-7rem)] snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] md:h-[calc(100dvh-6rem)]">
      {reels.map((reel) => (
        <div key={reel.id} id={`reel-${reel.id}`}>
          <ReelItem reel={reel} muted={muted} onToggleMute={() => setMuted((value) => !value)} />
        </div>
      ))}
      <LoadMore hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onLoadMore={() => void query.fetchNextPage()} />
    </div>
  );
}
