'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { AccountMenu } from './account-menu';
import { MessagesIconLink, NotificationsIconLink } from './notifications-menu';

export function SearchField() {
  const t = useTranslations('shell');
  const router = useRouter();
  const [value, setValue] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <form role="search" onSubmit={submit} className="relative min-w-0 flex-1 md:max-w-[520px]">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        maxLength={50}
        className="h-12 w-full rounded-full border border-surface-border bg-surface pl-12 pr-4 text-[15px] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
    </form>
  );
}

export function TopBar() {
  return (
    <header className="hidden items-center gap-6 py-5 md:flex">
      <SearchField />
      <div className="ml-auto flex items-center gap-3">
        <NotificationsIconLink />
        <MessagesIconLink />
        <div className="xl:hidden">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
