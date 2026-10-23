import { setRequestLocale } from 'next-intl/server';
import { HomeFeed } from '@/components/feed/home-feed';
import { ProtectedPage } from '@/components/layout/protected-page';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('home');

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <HomeFeed />
    </ProtectedPage>
  );
}
