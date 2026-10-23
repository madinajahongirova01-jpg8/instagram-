'use client';

import { useTranslations } from 'next-intl';
import { ImageOff } from 'lucide-react';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { errorStatus } from '@/lib/errors';
import { usePostQuery } from '@/store/social-api';
import { CommentsList } from './comments-list';
import { CommentForm } from './comment-form';
import { PostCard } from './post-card';

export function PostDetail({ id }: { id: string }) {
  const t = useTranslations('post');
  const { data: post, isLoading, error, refetch } = usePostQuery(id);

  if (isLoading) {
    return <Spinner className="py-16" />;
  }
  if (error) {
    const status = errorStatus(error);
    return status === 404 || status === 400 ? (
      <EmptyState icon={ImageOff} title={t('notFound')} text={t('notFoundText')} />
    ) : (
      <ErrorState onRetry={() => void refetch()} />
    );
  }
  if (!post) {
    return null;
  }

  return (
    <div className="grid gap-5 pt-3 md:pt-0">
      <PostCard post={post} showCommentsLink={false} />
      <section className="post-card grid gap-4 p-4 sm:rounded-3xl">
        <h2 className="text-base font-semibold">{t('comments')}</h2>
        {post.commentsDisabled ? (
          <p className="text-sm text-muted-foreground">{t('commentsOff')}</p>
        ) : (
          <CommentForm target={{ kind: 'posts', id: post.id }} />
        )}
        <CommentsList target={{ kind: 'posts', id: post.id }} ownerId={post.author.id} />
      </section>
    </div>
  );
}
