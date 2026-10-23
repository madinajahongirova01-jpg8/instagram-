import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type MetaKey =
  | 'home'
  | 'post'
  | 'explore'
  | 'search'
  | 'reels'
  | 'create'
  | 'stories'
  | 'notifications'
  | 'settings'
  | 'messages'
  | 'login' | 'register' | 'profile' | 'logout' | 'changePassword' | 'forgotPassword';

export function pageMetadata(key: MetaKey) {
  return async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });
    return { title: t(key) };
  };
}
