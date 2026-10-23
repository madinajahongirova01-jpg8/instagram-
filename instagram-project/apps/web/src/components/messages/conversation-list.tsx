'use client';

import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import type { ConversationDto, MessageDto } from '@insta/shared';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { CountBadge } from '@/components/ui/count-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useRelativeTime } from '@/lib/use-relative-time';
import { cn } from '@/lib/utils';
import { useMeQuery } from '@/store/api';
import { useConversationsQuery } from '@/store/messages-api';

export function useMessagePreview(): (message: MessageDto | null) => string {
  const t = useTranslations('messages');
  return (message) => {
    if (!message) {
      return t('noMessages');
    }
    if (message.deleted) {
      return t('deleted');
    }
    switch (message.type) {
      case 'IMAGE':
        return t('photo');
      case 'VIDEO':
        return t('video');
      case 'AUDIO':
        return t('voice');
      case 'POST_SHARE':
        return t('sharedPost');
      default:
        return message.content ?? '';
    }
  };
}

export function conversationPeer(conversation: ConversationDto, myId: string | undefined) {
  return conversation.participants.find((p) => p.id !== myId) ?? conversation.participants[0];
}

export function ConversationList({ activeId }: { activeId?: string }) {
  const t = useTranslations('messages');
  const ago = useRelativeTime();
  const preview = useMessagePreview();
  const { data: me } = useMeQuery();
  const { data, isLoading, isError, refetch } = useConversationsQuery();
  const conversations = data?.items ?? [];

  return (
    <div className="flex h-full flex-col">
      <h1 className="px-4 py-4 text-xl font-semibold">{t('title')}</h1>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <ul className="grid gap-3 px-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="size-14 rounded-full" />
                <span className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </span>
              </li>
            ))}
          </ul>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : conversations.length === 0 ? (
          <EmptyState icon={MessageCircle} title={t('emptyTitle')} text={t('emptyText')} />
        ) : (
          <ul className="grid gap-1">
            {conversations.map((conversation) => {
              const peer = conversationPeer(conversation, me?.id);
              const title = conversation.isGroup ? (conversation.title ?? conversation.participants.map((p) => p.username).join(', ')) : peer.fullName;
              const unread = conversation.unreadCount > 0;
              return (
                <li key={conversation.id}>
                  <Link
                    href={`/messages/${conversation.id}`}
                    aria-current={conversation.id === activeId ? 'page' : undefined}
                    className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors', conversation.id === activeId ? 'nav-active' : 'hover:bg-nav-hover')}
                  >
                    <Avatar src={peer.avatarUrl} alt={peer.username} className="size-14" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', unread ? 'font-bold' : 'font-medium')}>{title}</span>
                      <span className={cn('block truncate text-xs', unread ? 'font-semibold' : 'opacity-75')}>
                        {conversation.lastMessage?.sender.id === me?.id ? `${t('you')}: ` : ''}
                        {preview(conversation.lastMessage)} · {ago(conversation.lastMessageAt)}
                      </span>
                    </span>
                    <CountBadge count={conversation.unreadCount} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
