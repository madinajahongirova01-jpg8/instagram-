'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { COMMENT_MAX } from '@insta/shared';
import { Avatar } from '@/components/profile/avatar';
import { errorStatus } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useMeQuery } from '@/store/api';
import { useAddCommentMutation, type CommentTarget } from '@/store/social-api';

export function CommentForm({ target, className }: { target: CommentTarget; className?: string }) {
  const t = useTranslations('comments');
  const { data: me } = useMeQuery();
  const [content, setContent] = useState('');
  const [addComment, state] = useAddCommentMutation();

  const submit = async () => {
    const text = content.trim();
    if (!text) {
      return;
    }
    try {
      await addComment({ ...target, content: text }).unwrap();
      setContent('');
    } catch {
      return;
    }
  };

  const status = errorStatus(state.error);

  return (
    <div className={cn('grid gap-1', className)}>
      <form
        className="flex items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Avatar src={me?.avatarUrl ?? null} alt={me?.username ?? ''} className="size-9" />
        <div className="relative flex-1">
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={COMMENT_MAX}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            className="h-11 w-full rounded-full border border-surface-border bg-surface pl-4 pr-12 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            aria-label={t('send')}
            disabled={!content.trim() || state.isLoading}
            className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-link disabled:opacity-40"
          >
            <Send className="size-5" />
          </button>
        </div>
      </form>
      {state.isError ? (
        <p role="alert" className="pl-12 text-xs text-destructive">
          {status === 403 ? t('notAllowed') : t('failed')}
        </p>
      ) : null}
    </div>
  );
}
