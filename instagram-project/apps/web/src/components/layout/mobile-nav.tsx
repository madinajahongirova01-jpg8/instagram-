'use client';

import { useTranslations } from 'next-intl';
import { Clapperboard, House, Search, SquarePlus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { cn } from '@/lib/utils';
import { useMeQuery } from '@/store/api';
import { AccountMenu } from './account-menu';
import { Logo } from './logo';
import { MessagesIconLink, NotificationsIconLink } from './notifications-menu';
import { useNavActive } from './use-nav-active';

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden">
      <Logo className="text-[30px]" />
      <div className="flex items-center gap-2">
        <NotificationsIconLink />
        <MessagesIconLink />
        <AccountMenu compact />
      </div>
    </header>
  );
}

export function BottomNav() {
  const t = useTranslations('nav');
  const isActive = useNavActive();
  const { data: me } = useMeQuery();

  const links = [
    { href: '/', label: t('home'), icon: House },
    { href: '/search', label: t('search'), icon: Search },
    { href: '/create', label: t('create'), icon: SquarePlus },
    { href: '/reels', label: t('reels'), icon: Clapperboard },
  ];

  return (
    <nav
      aria-label={t('main')}
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn('inline-flex size-11 items-center justify-center rounded-xl transition-transform duration-200 active:scale-90', active && 'text-nav-active-fg')}
          >
            <Icon className={cn('size-7', active && href === '/' && 'fill-current')} strokeWidth={active ? 2.3 : 1.8} />
          </Link>
        );
      })}
      <Link
        href="/profile"
        aria-label={t('profile')}
        aria-current={isActive('/profile') ? 'page' : undefined}
        className="inline-flex size-11 items-center justify-center"
      >
        <Avatar
          src={me?.avatarUrl ?? null}
          alt={me?.username ?? ''}
          className={cn('size-7', isActive('/profile') && 'ring-2 ring-foreground ring-offset-2 ring-offset-background')}
        />
      </Link>
    </nav>
  );
}
