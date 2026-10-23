import { setRequestLocale } from 'next-intl/server';
import { ProtectedPage } from '@/components/layout/protected-page';
import { ReelsFeed } from '@/components/reels/reels-feed';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('reels');

export default async function ReelsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <ReelsFeed />
    </ProtectedPage>
  );
}
