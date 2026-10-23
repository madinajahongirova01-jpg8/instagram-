import { useTranslations } from 'next-intl';
import { Camera, Crown, Heart } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export function PromoCard() {
  const t = useTranslations('promo');
  return (
    <section className="promo-card relative hidden overflow-hidden rounded-3xl p-5 lg:block">
      <Heart aria-hidden="true" className="absolute -right-3 top-6 size-20 rotate-12 fill-current opacity-25 dark:opacity-40" strokeWidth={0} />
      <Heart aria-hidden="true" className="absolute -right-1 bottom-16 size-12 -rotate-12 fill-current opacity-20 dark:opacity-35" strokeWidth={0} />
      <span className="relative mb-5 inline-flex size-9 items-center justify-center rounded-full bg-promo-button/25">
        <Crown className="hidden size-5 dark:block" />
        <Camera className="size-5 dark:hidden" />
      </span>
      <h2 className="relative max-w-[11rem] text-[17px] font-semibold leading-snug">
        <span className="dark:hidden">{t('lightTitle')}</span>
        <span className="hidden dark:inline">{t('darkTitle')}</span>
      </h2>
      <p className="relative mt-2 max-w-[11rem] text-[13px] leading-relaxed opacity-90">
        <span className="dark:hidden">{t('lightText')}</span>
        <span className="hidden dark:inline">{t('darkText')}</span>
      </p>
      <Link
        href="/create"
        className="relative mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-promo-button px-7 text-sm font-semibold text-promo-button-foreground transition-opacity hover:opacity-90"
      >
        <span className="dark:hidden">{t('lightCta')}</span>
        <span className="hidden dark:inline">{t('darkCta')}</span>
      </Link>
    </section>
  );
}
