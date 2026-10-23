'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Flag, MessageCircle, Trash2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { EmptyState, ErrorState, LoadMore, Spinner } from '@/components/ui/states';
import { useRelativeTime } from '@/lib/use-relative-time';
import { useMeQuery } from '@/store/api';
import { useCommentsInfiniteQuery, useDeleteCommentMutation, type CommentTarget } from '@/store/social-api';
import { ReportDialog } from './report-dialog';
import { RichText } from './rich-text';

export function CommentsList({ target, ownerId }: { target: CommentTarget; ownerId: string }) {
  const t = useTranslations('comments');
  const ago = useRelativeTime();
  const { data: me } = useMeQuery();
  const query = useCommentsInfiniteQuery(target);
  const [deleteComment] = useDeleteCommentMutation();
  const [reporting, setReporting] = useState<string | null>(null);

  if (query.isLoading) {
    return <Spinner />;
  }
  if (query.isError) {
    return <ErrorState onRetry={() => void query.refetch()} />;
  }
  const comments = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (comments.length === 0) {
    return <EmptyState icon={MessageCircle} title={t('empty')} />;
  }

  return (
    <>
      <ul className="grid gap-4">
        {comments.map((comment) => {
          const canDelete = me && (me.id === comment.author.id || me.id === ownerId);
          return (
            <li key={comment.id} className="group flex gap-3">
              <Link href={`/profile/${comment.author.username}`}>
                <Avatar src={comment.author.avatarUrl} alt={comment.author.username} className="size-9" />
              </Link>
              <div className="min-w-0 flex-1 text-sm">
                <p className="break-words">
                  <Link href={`/profile/${comment.author.username}`} className="mr-1.5 font-semibold">
                    {comment.author.username}
                  </Link>
                  <RichText text={comment.content} />
                </p>
                <p className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>{ago(comment.createdAt)}</span>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t('confirmDelete'))) {
                          void deleteComment({ commentId: comment.id, target });
                        }
                      }}
                      className="inline-flex items-center gap-1 hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                      {t('delete')}
                    </button>
                  ) : null}
                  {me && me.id !== comment.author.id ? (
                    <button type="button" onClick={() => setReporting(comment.id)} className="inline-flex items-center gap-1 hover:text-destructive">
                      <Flag className="size-3" />
                      {t('report')}
                    </button>
                  ) : null}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <LoadMore hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onLoadMore={() => void query.fetchNextPage()} />
      {reporting ? <ReportDialog targetType="COMMENT" targetId={reporting} onClose={() => setReporting(null)} /> : null}
    </>
  );
}
