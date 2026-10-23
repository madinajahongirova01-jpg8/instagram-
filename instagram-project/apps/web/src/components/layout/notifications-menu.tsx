'use client';

import { useTranslations } from 'next-intl';
import { Heart, Send } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { CountBadge } from '@/components/ui/count-badge';
import { useMessagesUnreadCountQuery, useNotificationsUnreadCountQuery } from '@/store/api';

const iconLink = 'relative inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-nav-hover';

export function NotificationsIconLink() {
  const t = useTranslations('nav');
  const { data } = useNotificationsUnreadCountQuery();
  const count = data?.count ?? 0;
  return (
    <Link href="/notifications" aria-label={count > 0 ? t('notificationsUnread', { count }) : t('notifications')} className={iconLink}>
      <Heart className="size-7" strokeWidth={1.8} />
      <CountBadge count={count} className="absolute -right-0.5 -top-0.5" />
    </Link>
  );
}

export function MessagesIconLink() {
  const t = useTranslations('nav');
  const { data } = useMessagesUnreadCountQuery();
  const count = data?.count ?? 0;
  return (
    <Link href="/messages" aria-label={count > 0 ? t('messagesUnread', { count }) : t('messages')} className={iconLink}>
      <Send className="size-7" strokeWidth={1.8} />
      <CountBadge count={count} className="absolute -right-0.5 -top-0.5" />
    </Link>
  );
}
