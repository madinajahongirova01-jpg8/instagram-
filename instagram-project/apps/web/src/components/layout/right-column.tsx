'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, UserPlus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { FollowButton } from '@/components/social/follow-button';
import { Skeleton } from '@/components/ui/skeleton';
import { StoryRing } from '@/components/ui/story-ring';
import { useRelativeTime } from '@/lib/use-relative-time';
import { cn } from '@/lib/utils';
import { useContactsQuery, useMeQuery, useSuggestedUsersQuery } from '@/store/api';
import { AccountMenu } from './account-menu';

const SUGGESTIONS_SHOWN = 5;

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('panel rounded-3xl px-1 py-2 dark:px-6 dark:py-5', className)}>{children}</section>;
}

function RowsSkeleton() {
  return (
    <ul className="mt-4 grid gap-4" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <span className="grid flex-1 gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('side');
  return (
    <p className="mt-4 text-sm text-muted-foreground">
      {t('loadFailed')}{' '}
      <button type="button" onClick={onRetry} className="font-semibold text-see-all">
        {t('retry')}
      </button>
    </p>
  );
}

function CurrentUserCard() {
  const t = useTranslations('side');
  const { data: me } = useMeQuery();

  return (
    <Card>
      <div className="flex items-center gap-4">
        <StoryRing>
          <Avatar src={me?.avatarUrl ?? null} alt={me?.username ?? ''} className="size-16" />
        </StoryRing>
        <div className="min-w-0">
          {me ? (
            <>
              <p className="truncate text-[17px] font-semibold">{me.fullName}</p>
              <p className="truncate text-sm text-muted-foreground">{me.username}</p>
            </>
          ) : (
            <span className="grid gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </span>
          )}
        </div>
      </div>
      <Link
        href="/profile?edit=1"
        className="btn-edit mt-4 flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 dark:rounded-full"
      >
        {t('editProfile')}
      </Link>
    </Card>
  );
}

function SuggestionsCard() {
  const t = useTranslations('side');
  const { data, isLoading, isError, refetch } = useSuggestedUsersQuery();
  const users = data?.slice(0, SUGGESTIONS_SHOWN) ?? [];

  return (
    <Card>
      <header className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{t('suggestions')}</h2>
        <Link href="/explore" className="text-sm font-semibold text-see-all hover:opacity-80">
          {t('seeAll')}
        </Link>
      </header>
      {isLoading ? (
        <RowsSkeleton />
      ) : isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : users.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('noSuggestions')}</p>
      ) : (
        <ul className="mt-4 grid gap-4">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-3">
              <Link href={`/profile/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar src={user.avatarUrl} alt={user.username} className="size-11" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{user.username}</span>
                  <span className="block truncate text-xs text-muted-foreground">{user.fullName}</span>
                </span>
              </Link>
              <FollowButton userId={user.id} username={user.username} status="NONE" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ContactsCard() {
  const t = useTranslations('side');
  const presence = useTranslations('presence');
  const ago = useRelativeTime();
  const { data, isLoading, isError, refetch } = useContactsQuery();

  return (
    <Card>
      <header className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{t('contacts')}</h2>
        <Link href="/search" aria-label={t('findPeople')} className="rounded-full p-1 hover:bg-nav-hover">
          <UserPlus className="size-5" />
        </Link>
      </header>
      {isLoading ? (
        <RowsSkeleton />
      ) : isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('noContacts')}</p>
      ) : (
        <ul className="mt-3 grid gap-1">
          {data.map((contact) => (
            <li key={contact.id}>
              <Link
                href={`/profile/${contact.username}`}
                className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-nav-hover"
              >
                <span className="relative">
                  <Avatar src={contact.avatarUrl} alt={contact.username} className="size-11" />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute bottom-0 right-0 size-3.5 rounded-full ring-2 ring-background',
                      contact.online ? 'bg-online' : 'bg-offline',
                    )}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{contact.fullName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {contact.online
                      ? presence('online')
                      : contact.lastSeenAt
                        ? presence('lastSeen', { time: ago(contact.lastSeenAt) })
                        : presence('offline')}
                  </span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RightColumn() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[360px] shrink-0 flex-col gap-4 overflow-y-auto py-4 xl:flex">
      <div className="flex justify-end px-1">
        <AccountMenu />
      </div>
      <CurrentUserCard />
      <SuggestionsCard />
      <ContactsCard />
    </aside>
  );
}
