'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BadgeCheck, Bookmark, Flag, Heart, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import type { PostDto } from '@insta/shared';
import { Link, useRouter } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { Dropdown } from '@/components/ui/dropdown';
import { useRelativeTime } from '@/lib/use-relative-time';
import { cn } from '@/lib/utils';
import { useMeQuery } from '@/store/api';
import { useDeletePostMutation, useSetPostLikeMutation, useSetPostSaveMutation } from '@/store/social-api';
import { CommentForm } from './comment-form';
import { MediaCarousel } from './media-carousel';
import { ReportDialog } from './report-dialog';
import { RichText } from './rich-text';

export function PostCard({ post, showCommentsLink = true }: { post: PostDto; showCommentsLink?: boolean }) {
  const t = useTranslations('post');
  const ago = useRelativeTime();
  const router = useRouter();
  const { data: me } = useMeQuery();
  const [setLike] = useSetPostLikeMutation();
  const [setSave] = useSetPostSaveMutation();
  const [deletePost, deleteState] = useDeletePostMutation();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likesCount);
  const [saved, setSaved] = useState(post.savedByMe);
  const [reporting, setReporting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [burst, setBurst] = useState(0);
  const [countKey, setCountKey] = useState(0);
  const mine = me?.id === post.author.id;

  useEffect(() => {
    setLiked(post.likedByMe);
    setLikes(post.likesCount);
    setSaved(post.savedByMe);
  }, [post.likedByMe, post.likesCount, post.savedByMe]);

  const toggleLike = async (force?: boolean) => {
    const next = force ?? !liked;
    if (next === liked) {
      return;
    }
    const before = { liked, likes };
    setFailed(false);
    setLiked(next);
    setLikes((value) => (value === null ? null : value + (next ? 1 : -1)));
    setCountKey((value) => value + 1);
    try {
      const result = await setLike({ id: post.id, on: next }).unwrap();
      setLikes(post.hideLikeCount && !mine ? null : result.likesCount);
    } catch {
      setLiked(before.liked);
      setLikes(before.likes);
      setFailed(true);
    }
  };

  const toggleSave = async () => {
    const next = !saved;
    setFailed(false);
    setSaved(next);
    try {
      await setSave({ id: post.id, on: next }).unwrap();
    } catch {
      setSaved(!next);
      setFailed(true);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('confirmDelete'))) {
      return;
    }
    try {
      await deletePost(post).unwrap();
      router.push('/');
    } catch {
      setFailed(true);
    }
  };

  return (
    <article className="post-card overflow-hidden sm:rounded-3xl sm:p-2">
      <header className="flex items-center gap-3 px-3 py-3 sm:px-3">
        <Link href={`/profile/${post.author.username}`}>
          <Avatar src={post.author.avatarUrl} alt={post.author.username} className="size-11" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${post.author.username}`} className="flex items-center gap-1 text-[15px] font-semibold">
            <span className="truncate">{post.author.username}</span>
            {post.author.isVerified ? <BadgeCheck className="size-4 fill-verified text-background" /> : null}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {post.location ? `${post.location} · ` : ''}
            {ago(post.createdAt)}
          </p>
        </div>
        <Dropdown
          label={t('more')}
          triggerClassName="rounded-full p-2 hover:bg-nav-hover"
          panelClassName="right-0 mt-1 w-56 p-1"
          trigger={<MoreHorizontal className="size-5" />}
        >
          {(close) =>
            mine ? (
              <button
                type="button"
                disabled={deleteState.isLoading}
                onClick={() => {
                  close();
                  void remove();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-nav-hover"
              >
                <Trash2 className="size-4" />
                {t('delete')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  close();
                  setReporting(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-nav-hover"
              >
                <Flag className="size-4" />
                {t('report')}
              </button>
            )
          }
        </Dropdown>
      </header>

      <MediaCarousel
        media={post.media}
        alt={post.caption.slice(0, 60) || post.author.username}
        burst={burst}
        onDoubleClick={() => {
          setBurst((value) => value + 1);
          void toggleLike(true);
        }}
      />

      <div className="grid gap-2 px-3 pb-3 pt-3">
        <div className="flex items-center gap-4">
          <button type="button" aria-pressed={liked} aria-label={liked ? t('unlike') : t('like')} onClick={() => void toggleLike()} className="transition-transform hover:scale-110 active:scale-90">
            <Heart key={liked ? 'on' : 'off'} className={cn('size-7', liked && 'animate-like-pop fill-like text-like')} strokeWidth={1.8} />
          </button>
          <Link href={`/p/${post.id}`} aria-label={t('comment')} className="transition-transform hover:scale-110 active:scale-90">
            <MessageCircle className="size-7 -scale-x-100" strokeWidth={1.8} />
          </Link>
          <button type="button" aria-pressed={saved} aria-label={saved ? t('unsave') : t('save')} onClick={() => void toggleSave()} className="ml-auto transition-transform hover:scale-110 active:scale-90">
            <Bookmark key={saved ? 'on' : 'off'} className={cn('size-7', saved && 'animate-bookmark-pop fill-current')} strokeWidth={1.8} />
          </button>
        </div>
        {failed ? (
          <p role="alert" className="text-xs text-destructive">
            {t('actionFailed')}
          </p>
        ) : null}
        {likes !== null ? (
          <p className="overflow-hidden text-sm font-semibold">
            <span key={countKey} className={cn('inline-block', countKey > 0 && 'animate-count-up')}>
              {t('likes', { count: likes })}
            </span>
          </p>
        ) : null}
        {post.caption ? (
          <p className="whitespace-pre-line break-words text-sm">
            <Link href={`/profile/${post.author.username}`} className="mr-1.5 font-semibold">
              {post.author.username}
            </Link>
            <RichText text={post.caption} />
          </p>
        ) : null}
        {showCommentsLink && post.commentsCount > 0 ? (
          <Link href={`/p/${post.id}`} className="text-sm text-muted-foreground">
            {t('viewComments', { count: post.commentsCount })}
          </Link>
        ) : null}
        {showCommentsLink && !post.commentsDisabled ? <CommentForm target={{ kind: 'posts', id: post.id }} className="mt-1" /> : null}
      </div>
      {reporting ? <ReportDialog targetType="POST" targetId={post.id} onClose={() => setReporting(false)} /> : null}
    </article>
  );
}
