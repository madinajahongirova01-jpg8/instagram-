'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LOCALES, type Locale } from '@insta/shared';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('locale');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const change = (next: Locale) => {
    const query = typeof window !== 'undefined' ? window.location.search : '';
    router.replace(`${pathname}${query}`, { locale: next });
  };

  return (
    <nav aria-label={t('label')} className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => change(code)}
          aria-current={code === locale ? 'true' : undefined}
          className={cn(
            'rounded px-2 py-1 transition-colors hover:text-foreground',
            code === locale && 'font-semibold text-foreground',
          )}
        >
          {t(code)}
        </button>
      ))}
    </nav>
  );
}
