'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Ban, BadgeCheck, Bookmark, Clapperboard, Flag, Grid3x3, Link2, Lock, MailWarning, MoreHorizontal, Settings, UserX } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { ReportDialog } from '@/components/post/report-dialog';
import { FollowButton } from '@/components/social/follow-button';
import { errorStatus } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useMeQuery, useProfileQuery, useResendVerificationMutation } from '@/store/api';
import { useStartConversationMutation } from '@/store/messages-api';
import { useSetBlockMutation } from '@/store/settings-api';
import { Avatar } from './avatar';
import { AvatarEditor } from './avatar-editor';
import { EditProfileForm } from './edit-profile-form';
import { PostsGrid, ReelsGrid, SavedGrid } from './posts-grid';

type Tab = 'posts' | 'reels' | 'saved';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <li className="text-center sm:text-left">
      <span className="font-semibold">{value}</span> <span className="text-muted-foreground sm:text-foreground">{label}</span>
    </li>
  );
}

export function ProfileView({ username }: { username?: string }) {
  const t = useTranslations('profile');
  const router = useRouter();
  const { data: me } = useMeQuery();
  const target = username ?? me?.username ?? '';
  const { data: profile, isLoading, error, refetch } = useProfileQuery(target, { skip: !target });
  const [resend, resendState] = useResendVerificationMutation();
  const [startConversation, startState] = useStartConversationMutation();
  const [setBlock] = useSetBlockMutation();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('posts');
  const [reporting, setReporting] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('edit') === '1') {
      setEditing(true);
    }
  }, []);

  useEffect(() => {
    setTab('posts');
    setEditing(false);
  }, [target]);

  if (!me || isLoading) {
    return <Spinner className="py-20" />;
  }
  if (error) {
    return errorStatus(error) === 404 ? (
      <EmptyState icon={UserX} title={t('notFound')} text={t('notFoundText')} />
    ) : (
      <ErrorState onRetry={() => void refetch()} />
    );
  }
  if (!profile) {
    return null;
  }

  const isMe = profile.isMe;

  const message = async () => {
    setActionFailed(false);
    try {
      const conversation = await startConversation(profile.id).unwrap();
      router.push(`/messages/${conversation.id}`);
    } catch {
      setActionFailed(true);
    }
  };

  const toggleBlock = async () => {
    if (!profile.blockedByMe && !window.confirm(t('confirmBlock', { username: profile.username }))) {
      return;
    }
    setActionFailed(false);
    try {
      await setBlock({ userId: profile.id, block: !profile.blockedByMe }).unwrap();
    } catch {
      setActionFailed(true);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Grid3x3 }[] = [
    { key: 'posts', label: t('tabPosts'), icon: Grid3x3 },
    { key: 'reels', label: t('tabReels'), icon: Clapperboard },
    ...(isMe ? [{ key: 'saved' as const, label: t('tabSaved'), icon: Bookmark }] : []),
  ];

  return (
    <div className="w-full px-4 py-6 md:px-0">
      {isMe && !me.emailVerified ? (
        <Alert className="mb-8 flex-wrap items-center">
          <MailWarning />
          <span className="flex-1">{t('emailNotVerified', { email: me.email })}</span>
          <Button type="button" variant="outline" size="sm" disabled={resendState.isLoading || resendState.isSuccess} onClick={() => void resend()}>
            {resendState.isSuccess ? t('resent') : t('resend')}
          </Button>
        </Alert>
      ) : null}

      <header className="grid gap-6 border-b pb-8 sm:grid-cols-[auto_1fr] sm:gap-12">
        {isMe ? (
          <AvatarEditor me={me} />
        ) : (
          <Avatar src={profile.avatarUrl} alt={profile.username} className="mx-auto size-28 sm:size-36" />
        )}
        <div className="grid content-start gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-1.5 text-xl font-semibold">
              {profile.username}
              {profile.isVerified ? <BadgeCheck className="size-5 fill-verified text-background" /> : null}
              {profile.isPrivate ? <Lock className="size-4 text-muted-foreground" aria-label={t('privateAccount')} /> : null}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {isMe ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing((value) => !value)}
                    className="btn-edit h-9 rounded-xl px-4 text-sm font-semibold dark:rounded-full"
                  >
                    {t('editProfile')}
                  </button>
                  <Link href="/settings" className="inline-flex h-9 items-center gap-2 rounded-xl bg-following-fill px-4 text-sm font-semibold text-following-fg">
                    <Settings className="size-4" />
                    {t('settings')}
                  </Link>
                </>
              ) : profile.blockedByMe ? (
                <button type="button" onClick={() => void toggleBlock()} className="h-9 rounded-xl bg-following-fill px-4 text-sm font-semibold text-following-fg">
                  {t('unblock')}
                </button>
              ) : (
                <>
                  <FollowButton userId={profile.id} username={profile.username} status={profile.followStatus} isPrivate={profile.isPrivate} size="md" />
                  <button
                    type="button"
                    disabled={startState.isLoading}
                    onClick={() => void message()}
                    className="h-9 rounded-xl bg-following-fill px-4 text-sm font-semibold text-following-fg disabled:opacity-60"
                  >
                    {t('message')}
                  </button>
                </>
              )}
              {isMe ? null : (
                <Dropdown label={t('more')} triggerClassName="rounded-full p-2 hover:bg-nav-hover" panelClassName="right-0 mt-1 w-56 p-1" trigger={<MoreHorizontal className="size-5" />}>
                  {(close) => (
                    <div className="grid">
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          void toggleBlock();
                        }}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-nav-hover"
                      >
                        <Ban className="size-4" />
                        {profile.blockedByMe ? t('unblock') : t('block')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          setReporting(true);
                        }}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-nav-hover"
                      >
                        <Flag className="size-4" />
                        {t('report')}
                      </button>
                    </div>
                  )}
                </Dropdown>
              )}
            </div>
          </div>
          {actionFailed ? (
            <p role="alert" className="text-sm text-destructive">
              {t('actionFailed')}
            </p>
          ) : null}

          <ul className="grid grid-cols-3 gap-2 text-sm sm:flex sm:gap-8 sm:text-base">
            <Stat value={profile.counts.posts} label={t('posts', { count: profile.counts.posts })} />
            <Stat value={profile.counts.followers} label={t('followers', { count: profile.counts.followers })} />
            <Stat value={profile.counts.following} label={t('following')} />
          </ul>

          <div className="grid gap-1 text-sm">
            <p className="font-semibold">{profile.fullName}</p>
            {profile.bio ? <p className="whitespace-pre-line">{profile.bio}</p> : null}
            {profile.website ? (
              <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-medium text-link hover:underline">
                <Link2 className="size-3.5" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            ) : null}
            {!isMe && profile.followsYou ? <p className="text-xs text-muted-foreground">{t('followsYou')}</p> : null}
          </div>
        </div>
      </header>

      {editing && isMe ? (
        <div className="mt-8">
          <EditProfileForm me={me} onDone={() => setEditing(false)} />
        </div>
      ) : null}

      {profile.canViewContent ? (
        <>
          <nav role="tablist" aria-label={t('tabs')} className="flex justify-center gap-10 border-b">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  '-mb-px inline-flex items-center gap-2 border-t-0 border-b-2 py-3 text-xs font-semibold uppercase tracking-wider',
                  tab === key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
          <section className="mt-1">
            {tab === 'posts' ? <PostsGrid username={profile.username} /> : null}
            {tab === 'reels' ? <ReelsGrid username={profile.username} /> : null}
            {tab === 'saved' && isMe ? <SavedGrid /> : null}
          </section>
        </>
      ) : (
        <EmptyState icon={Lock} title={profile.blockedByMe ? t('blockedTitle') : t('privateTitle')} text={profile.blockedByMe ? undefined : t('privateText')} />
      )}
      {reporting ? <ReportDialog targetType="USER" targetId={profile.id} onClose={() => setReporting(false)} /> : null}
    </div>
  );
}
