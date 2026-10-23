'use client';

import { useTranslations } from 'next-intl';
import { Bell, Check } from 'lucide-react';
import type { NotificationDto } from '@insta/shared';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, LoadMore } from '@/components/ui/states';
import { useRelativeTime } from '@/lib/use-relative-time';
import { cn } from '@/lib/utils';
import { useMarkAllNotificationsReadMutation, useNotificationsUnreadCountQuery } from '@/store/api';
import { useAnswerFollowRequestMutation, useFollowRequestsQuery } from '@/store/social-api';
import { useMarkNotificationReadMutation, useNotificationsPageInfiniteQuery } from '@/store/settings-api';

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function targetHref(item: NotificationDto): string {
  if ((item.type === 'LIKE' || item.type === 'COMMENT' || item.type === 'MENTION') && item.entityId) {
    return `/p/${item.entityId}`;
  }
  return `/profile/${item.actor.username}`;
}

function FollowRequests() {
  const t = useTranslations('notifications');
  const { data } = useFollowRequestsQuery();
  const [answer, state] = useAnswerFollowRequestMutation();
  const requests = data?.items ?? [];
  if (requests.length === 0) {
    return null;
  }
  return (
    <section className="post-card rounded-3xl p-4">
      <h2 className="mb-3 text-base font-semibold">{t('requests', { count: requests.length })}</h2>
      <ul className="grid gap-3">
        {requests.map((request) => (
          <li key={request.id} className="flex items-center gap-3">
            <Link href={`/profile/${request.requester.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar src={request.requester.avatarUrl} alt={request.requester.username} className="size-11" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{request.requester.username}</span>
                <span className="block truncate text-xs text-muted-foreground">{request.requester.fullName}</span>
              </span>
            </Link>
            <button
              type="button"
              disabled={state.isLoading}
              onClick={() => void answer({ id: request.id, accept: true })}
              className="btn-follow h-8 rounded-lg px-3 text-xs font-semibold disabled:opacity-60"
            >
              {t('accept')}
            </button>
            <button
              type="button"
              disabled={state.isLoading}
              onClick={() => void answer({ id: request.id, accept: false })}
              className="h-8 rounded-lg bg-following-fill px-3 text-xs font-semibold text-following-fg disabled:opacity-60"
            >
              {t('decline')}
            </button>
          </li>
        ))}
      </ul>
      {state.isError ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {t('failed')}
        </p>
      ) : null}
    </section>
  );
}

function NotificationRow({ item }: { item: NotificationDto }) {
  const t = useTranslations('notifications');
  const ago = useRelativeTime();
  const [markRead] = useMarkNotificationReadMutation();

  return (
    <li className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5', !item.isRead && 'bg-muted')}>
      <Link href={`/profile/${item.actor.username}`}>
        <Avatar src={item.actor.avatarUrl} alt={item.actor.username} className="size-11" />
      </Link>
      <Link
        href={targetHref(item)}
        onClick={() => {
          if (!item.isRead) {
            void markRead(item.id);
          }
        }}
        className="min-w-0 flex-1 text-sm leading-snug"
      >
        <span className="font-semibold">{item.actor.username}</span> {t(item.type)}
        {item.preview && (item.type === 'COMMENT' || item.type === 'MENTION') ? <span className="text-muted-foreground"> «{item.preview}»</span> : null}{' '}
        <span className="whitespace-nowrap text-muted-foreground">{ago(item.createdAt)}</span>
      </Link>
      {!item.isRead ? (
        <button type="button" aria-label={t('markRead')} title={t('markRead')} onClick={() => void markRead(item.id)} className="rounded-full p-1.5 text-muted-foreground hover:bg-nav-hover">
          <Check className="size-4" />
        </button>
      ) : null}
    </li>
  );
}

export function NotificationsView() {
  const t = useTranslations('notifications');
  const query = useNotificationsPageInfiniteQuery();
  const { data: unread } = useNotificationsUnreadCountQuery();
  const [markAll, markAllState] = useMarkAllNotificationsReadMutation();
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const today = items.filter((item) => isToday(item.createdAt));
  const earlier = items.filter((item) => !isToday(item.createdAt));

  return (
    <div className="grid gap-5 px-4 pt-4 md:px-0 md:pt-0">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <button
          type="button"
          disabled={(unread?.count ?? 0) === 0 || markAllState.isLoading}
          onClick={() => void markAll()}
          className="text-sm font-semibold text-see-all disabled:opacity-40"
        >
          {t('markAll')}
        </button>
      </header>
      <FollowRequests />
      {query.isLoading ? (
        <ul className="grid gap-3" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3 px-3">
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </li>
          ))}
        </ul>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title={t('empty')} text={t('emptyText')} />
      ) : (
        <>
          {today.length > 0 ? (
            <section className="post-card rounded-3xl p-2">
              <h2 className="px-3 py-2 text-sm font-semibold">{t('today')}</h2>
              <ul className="grid gap-1">
                {today.map((item) => (
                  <NotificationRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ) : null}
          {earlier.length > 0 ? (
            <section className="post-card rounded-3xl p-2">
              <h2 className="px-3 py-2 text-sm font-semibold">{t('earlier')}</h2>
              <ul className="grid gap-1">
                {earlier.map((item) => (
                  <NotificationRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
      <LoadMore hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onLoadMore={() => void query.fetchNextPage()} />
    </div>
  );
}
