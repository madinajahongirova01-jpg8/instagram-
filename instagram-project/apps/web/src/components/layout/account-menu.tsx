'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, KeyRound, LogOut, Monitor, Moon, Settings, Sun, UserRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { Dropdown } from '@/components/ui/dropdown';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { useTheme } from '@/components/providers/theme-provider';
import { THEME_PREFERENCES } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useMeQuery } from '@/store/api';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
const THEME_LABELS = { light: 'themeLight', dark: 'themeDark', system: 'themeSystem' } as const;

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('account');
  const shell = useTranslations('shell');
  const { data: me } = useMeQuery();
  const { preference, setPreference } = useTheme();

  const item = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-nav-hover';

  return (
    <Dropdown
      label={shell('accountMenu')}
      triggerClassName="flex items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-nav-hover"
      panelClassName="right-0 mt-2 w-72 p-2"
      trigger={
        <>
          <Avatar src={me?.avatarUrl ?? null} alt={me?.username ?? ''} className={compact ? 'size-8' : 'size-10'} />
          {compact ? null : <ChevronDown className="size-4 text-muted-foreground" />}
        </>
      }
    >
      {(close) => (
        <div className="grid gap-1">
          {me ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar src={me.avatarUrl} alt={me.username} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{me.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{me.username}</p>
              </div>
            </div>
          ) : null}
          <Link href="/profile" onClick={close} className={item}>
            <UserRound className="size-5" />
            {t('profile')}
          </Link>
          <Link href="/settings" onClick={close} className={item}>
            <Settings className="size-5" />
            {t('settings')}
          </Link>
          <Link href="/change-password" onClick={close} className={item}>
            <KeyRound className="size-5" />
            {t('changePassword')}
          </Link>
          <div className="grid gap-2 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">{t('theme')}</p>
            <div role="group" aria-label={t('theme')} className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {THEME_PREFERENCES.map((value) => {
                const Icon = THEME_ICONS[value];
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={preference === value}
                    onClick={() => setPreference(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors',
                      preference === value ? 'bg-popover font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    {t(THEME_LABELS[value])}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-1 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">{t('language')}</p>
            <LocaleSwitcher className="-mx-2" />
          </div>
          <Link href="/logout" onClick={close} className={cn(item, 'text-destructive')}>
            <LogOut className="size-5" />
            {t('logout')}
          </Link>
        </div>
      )}
    </Dropdown>
  );
}
