'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FollowStatus } from '@insta/shared';
import { cn } from '@/lib/utils';
import { useSetFollowMutation } from '@/store/api';

interface FollowButtonProps {
  userId: string;
  username: string;
  status: FollowStatus;
  isPrivate?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const LABELS = { NONE: 'follow', FOLLOWING: 'following', REQUESTED: 'requested' } as const;

export function FollowButton({ userId, username, status, isPrivate = false, size = 'sm', className }: FollowButtonProps) {
  const t = useTranslations('follow');
  const [setFollow, { isLoading }] = useSetFollowMutation();
  const [current, setCurrent] = useState<FollowStatus>(status);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrent(status);
  }, [status]);

  const toggle = async () => {
    const previous = current;
    const follow = previous === 'NONE';
    setFailed(false);
    setCurrent(follow ? (isPrivate ? 'REQUESTED' : 'FOLLOWING') : 'NONE');
    try {
      const result = await setFollow({ userId, username, follow }).unwrap();
      setCurrent(result.status);
    } catch {
      setCurrent(previous);
      setFailed(true);
    }
  };

  return (
    <span className={cn('inline-flex flex-col items-end gap-1', className)}>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={isLoading}
        aria-pressed={current !== 'NONE'}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-95 disabled:opacity-70',
          size === 'sm' ? 'h-8 rounded-lg px-3 text-xs' : 'h-9 rounded-xl px-5 text-sm',
          current === 'NONE' ? 'btn-follow' : 'bg-following-fill text-following-fg',
        )}
      >
        <span key={current} className="animate-fade-in">
          {t(LABELS[current])}
        </span>
      </button>
      {failed ? (
        <span role="alert" className="text-[11px] text-destructive">
          {t('failed')}
        </span>
      ) : null}
    </span>
  );
}
