'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { Audience, NotificationSettingsDto, PrivacySettingsDto } from '@insta/shared';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { ErrorState, Spinner } from '@/components/ui/states';
import { useDebounced } from '@/lib/use-debounced';
import { cn } from '@/lib/utils';
import { useMeQuery } from '@/store/api';
import { useSearchQuery } from '@/store/social-api';
import {
  useBlockedUsersQuery,
  useNotificationSettingsQuery,
  usePeopleQuery,
  usePrivacySettingsQuery,
  useSetBlockMutation,
  useSetPersonMutation,
  useUpdateNotificationSettingsMutation,
  useUpdatePrivacySettingsMutation,
  type PeopleList,
} from '@/store/settings-api';

function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section className="post-card grid gap-3 rounded-3xl p-5">
      <header>
        <h2 className="text-base font-semibold">{title}</h2>
        {text ? <p className="mt-1 text-sm text-muted-foreground">{text}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <span className="h-7 w-12 rounded-full bg-muted transition-colors peer-checked:bg-dot-active peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
        <span className="absolute left-1 top-1 size-5 rounded-full bg-popover shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function PrivacySection({ settings }: { settings: PrivacySettingsDto }) {
  const t = useTranslations('settings');
  const [update, state] = useUpdatePrivacySettingsMutation();
  const set = (data: Partial<PrivacySettingsDto>) => void update(data);
  const dmOptions: Audience[] = ['EVERYONE', 'FOLLOWING'];

  return (
    <>
      <Section title={t('privacyTitle')}>
        <Toggle label={t('private')} hint={t('privateHint')} checked={settings.isPrivate} onChange={(isPrivate) => set({ isPrivate })} />
        <Toggle label={t('onlineStatus')} hint={t('onlineStatusHint')} checked={settings.showOnlineStatus} onChange={(showOnlineStatus) => set({ showOnlineStatus })} />
        <Toggle label={t('readReceipts')} hint={t('readReceiptsHint')} checked={settings.showReadReceipts} onChange={(showReadReceipts) => set({ showReadReceipts })} />
      </Section>
      <Section title={t('messagesTitle')} text={t('messagesText')}>
        <div role="radiogroup" aria-label={t('messagesTitle')} className="grid gap-1">
          {dmOptions.map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-nav-hover">
              <input type="radio" name="dm" checked={settings.allowDirectMessages === value} onChange={() => set({ allowDirectMessages: value })} />
              <span className="text-sm">{t(`dm.${value}`)}</span>
            </label>
          ))}
        </div>
      </Section>
      {state.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t('saveFailed')}
        </p>
      ) : null}
    </>
  );
}

function NotificationSection({ settings }: { settings: NotificationSettingsDto }) {
  const t = useTranslations('settings');
  const [update, state] = useUpdateNotificationSettingsMutation();
  const keys: (keyof NotificationSettingsDto)[] = ['likes', 'comments', 'follows', 'followRequests', 'mentions', 'messages'];
  return (
    <Section title={t('notificationsTitle')} text={t('notificationsText')}>
      {keys.map((key) => (
        <Toggle key={key} label={t(`notify.${key}`)} checked={settings[key]} onChange={(value) => void update({ [key]: value })} />
      ))}
      {state.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t('saveFailed')}
        </p>
      ) : null}
    </Section>
  );
}

function PeopleSection({ list, title, text }: { list: PeopleList; title: string; text: string }) {
  const t = useTranslations('settings');
  const { data: me } = useMeQuery();
  const { data: people, isLoading } = usePeopleQuery(list);
  const [setPerson, state] = useSetPersonMutation();
  const [text2, setText2] = useState('');
  const q = useDebounced(text2.trim(), 300);
  const { data: found } = useSearchQuery({ q, type: 'users' }, { skip: q.length === 0 });
  const chosen = new Set((people ?? []).map((p) => p.id));
  const candidates = (found?.users ?? []).filter((u) => u.id !== me?.id && !chosen.has(u.id)).slice(0, 5);

  return (
    <Section title={title} text={text}>
      <input
        type="search"
        value={text2}
        onChange={(event) => setText2(event.target.value)}
        placeholder={t('addPerson')}
        aria-label={`${title}: ${t('addPerson')}`}
        className="h-11 rounded-2xl border border-surface-border bg-surface px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {candidates.length > 0 ? (
        <ul className="grid gap-1">
          {candidates.map((user) => (
            <li key={user.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <Avatar src={user.avatarUrl} alt={user.username} className="size-9" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{user.username}</span>
              <button
                type="button"
                onClick={() => {
                  void setPerson({ list, userId: user.id, on: true });
                  setText2('');
                }}
                className="btn-follow h-8 rounded-lg px-3 text-xs font-semibold"
              >
                {t('add')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {isLoading ? (
        <Spinner />
      ) : (people ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('nobody')}</p>
      ) : (
        <ul className="grid gap-1">
          {(people ?? []).map((user) => (
            <li key={user.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <Avatar src={user.avatarUrl} alt={user.username} className="size-9" />
              <Link href={`/profile/${user.username}`} className="min-w-0 flex-1 truncate text-sm font-semibold">
                {user.username}
              </Link>
              <button
                type="button"
                aria-label={t('removePerson', { username: user.username })}
                onClick={() => void setPerson({ list, userId: user.id, on: false })}
                className="rounded-full p-1.5 hover:bg-nav-hover"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {state.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t('saveFailed')}
        </p>
      ) : null}
    </Section>
  );
}

function BlockedSection() {
  const t = useTranslations('settings');
  const { data, isLoading } = useBlockedUsersQuery();
  const [setBlock, state] = useSetBlockMutation();
  const users = data?.items ?? [];
  return (
    <Section title={t('blockedTitle')} text={t('blockedText')}>
      {isLoading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noBlocked')}</p>
      ) : (
        <ul className="grid gap-1">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <Avatar src={user.avatarUrl} alt={user.username} className="size-9" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{user.username}</span>
              <button
                type="button"
                disabled={state.isLoading}
                onClick={() => void setBlock({ userId: user.id, block: false })}
                className="h-8 rounded-lg bg-following-fill px-3 text-xs font-semibold text-following-fg disabled:opacity-60"
              >
                {t('unblock')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function SettingsView() {
  const t = useTranslations('settings');
  const privacy = usePrivacySettingsQuery();
  const notifications = useNotificationSettingsQuery();
  const [tab, setTab] = useState<'privacy' | 'notifications' | 'stories' | 'blocked'>('privacy');
  const tabs = ['privacy', 'notifications', 'stories', 'blocked'] as const;

  return (
    <div className="grid gap-5 px-4 pt-4 md:px-0 md:pt-0">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <Link href="/change-password" className="text-sm font-semibold text-see-all">
          {t('changePassword')}
        </Link>
      </header>
      <div role="tablist" aria-label={t('title')} className="flex gap-2 overflow-x-auto">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn('h-9 shrink-0 rounded-full px-4 text-sm font-semibold', tab === key ? 'nav-active' : 'bg-muted text-muted-foreground')}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>
      {tab === 'privacy' ? (
        privacy.isLoading ? (
          <Spinner />
        ) : privacy.data ? (
          <PrivacySection settings={privacy.data} />
        ) : (
          <ErrorState onRetry={() => void privacy.refetch()} />
        )
      ) : null}
      {tab === 'notifications' ? (
        notifications.isLoading ? (
          <Spinner />
        ) : notifications.data ? (
          <NotificationSection settings={notifications.data} />
        ) : (
          <ErrorState onRetry={() => void notifications.refetch()} />
        )
      ) : null}
      {tab === 'stories' ? (
        <>
          <PeopleSection list="close-friends" title={t('closeFriendsTitle')} text={t('closeFriendsText')} />
          <PeopleSection list="story-hidden" title={t('hiddenTitle')} text={t('hiddenText')} />
        </>
      ) : null}
      {tab === 'blocked' ? <BlockedSection /> : null}
    </div>
  );
}
