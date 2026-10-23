'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clapperboard, Compass, Heart, House, Search, Send, SquarePlus, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { CountBadge } from '@/components/ui/count-badge';
import { cn } from '@/lib/utils';
import { useMeQuery, useMessagesUnreadCountQuery, useNotificationsUnreadCountQuery } from '@/store/api';
import { Logo } from './logo';
import { PromoCard } from './promo-card';
import { useNavActive } from './use-nav-active';

const itemClass =
  'group relative z-10 flex h-14 items-center gap-4 rounded-2xl px-4 text-[17px] transition-colors md:justify-center md:px-0 lg:justify-start lg:px-4';

const ITEM_STEP_PX = 62;

let lastActiveIndex = -1;

function ActiveHighlight({ index }: { index: number }) {
  const [shown, setShown] = useState(lastActiveIndex >= 0 ? lastActiveIndex : index);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShown(index));
    lastActiveIndex = index;
    return () => window.cancelAnimationFrame(frame);
  }, [index]);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'nav-active pointer-events-none absolute inset-x-0 top-0 h-14 rounded-2xl transition-[transform,opacity] duration-300 ease-spring',
        index < 0 && 'opacity-0',
      )}
      style={{ transform: `translateY(${Math.max(0, shown) * ITEM_STEP_PX}px)` }}
    />
  );
}

interface NavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
}

function NavLink({ href, label, icon: Icon, active, badge = 0 }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(itemClass, active ? 'font-semibold text-nav-active-fg' : 'hover:bg-nav-hover')}
    >
      <Icon className={cn('size-7 shrink-0 transition-transform duration-200 group-hover:scale-110', active && (href === '/' || href === '/notifications') && 'fill-current')} strokeWidth={active ? 2.2 : 1.8} />
      <span className="hidden lg:inline">{label}</span>
      <CountBadge count={badge} className="absolute right-3 top-2 lg:static lg:ml-auto" />
    </Link>
  );
}

export function Sidebar() {
  const t = useTranslations('nav');
  const isActive = useNavActive();
  const { data: me } = useMeQuery();
  const { data: messages } = useMessagesUnreadCountQuery();
  const { data: notifications } = useNotificationsUnreadCountQuery();

  const links = [
    { href: '/', label: t('home'), icon: House },
    { href: '/search', label: t('search'), icon: Search },
    { href: '/explore', label: t('explore'), icon: Compass },
    { href: '/reels', label: t('reels'), icon: Clapperboard },
    { href: '/messages', label: t('messages'), icon: Send, badge: messages?.count ?? 0 },
    { href: '/notifications', label: t('notifications'), icon: Heart, badge: notifications?.count ?? 0 },
    { href: '/create', label: t('create'), icon: SquarePlus },
  ];
  const activeIndex = [...links.map((link) => link.href), '/profile'].findIndex((href) => isActive(href));

  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 md:block md:w-22 lg:w-68 xl:w-72 dark:py-4">
      <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar px-3 py-7 lg:px-5 dark:rounded-[28px] dark:border">
        <Logo compact className="mb-9 h-12 justify-center text-[40px] lg:justify-start lg:px-3" />
        <nav aria-label={t('main')} className="relative grid gap-1.5">
          <ActiveHighlight index={activeIndex} />
          {links.map((link) => (
            <NavLink key={link.href} {...link} active={isActive(link.href)} />
          ))}
          <Link
            href="/profile"
            aria-current={isActive('/profile') ? 'page' : undefined}
            className={cn(itemClass, isActive('/profile') ? 'font-semibold text-nav-active-fg' : 'hover:bg-nav-hover')}
          >
            <Avatar src={me?.avatarUrl ?? null} alt={me?.username ?? ''} className="size-8 transition-transform duration-200 group-hover:scale-110" />
            <span className="hidden lg:inline">{t('profile')}</span>
          </Link>
        </nav>
        <div className="mt-auto pt-8 [@media(max-height:860px)]:hidden">
          <PromoCard />
        </div>
      </div>
    </aside>
  );
}
