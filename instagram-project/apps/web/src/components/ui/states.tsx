'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, text, children }: { icon?: LucideIcon; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {Icon ? (
        <span className="flex size-16 items-center justify-center rounded-full border-2 border-foreground">
          <Icon className="size-7" strokeWidth={1.5} />
        </span>
      ) : null}
      <p className="text-lg font-semibold">{title}</p>
      {text ? <p className="max-w-sm text-sm text-muted-foreground">{text}</p> : null}
      {children}
    </div>
  );
}

export function ErrorState({ onRetry, message, className }: { onRetry?: () => void; message?: string; className?: string }) {
  const t = useTranslations('common');
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground', className)}>
      <p>{message ?? t('loadFailed')}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="font-semibold text-see-all">
          {t('retry')}
        </button>
      ) : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center py-6', className)} aria-busy="true">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

interface LoadMoreProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

export function LoadMore({ hasMore, loading, onLoadMore }: LoadMoreProps) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onLoadMore);
  callback.current = onLoadMore;

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callback.current();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  if (!hasMore) {
    return null;
  }
  return <div ref={ref}>{loading ? <Spinner /> : <div className="h-6" />}</div>;
}
