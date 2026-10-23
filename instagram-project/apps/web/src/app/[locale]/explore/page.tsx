import { setRequestLocale } from 'next-intl/server';
import { ExploreView } from '@/components/explore/explore-view';
import { ProtectedPage } from '@/components/layout/protected-page';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('explore');

export default async function ExplorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <ExploreView />
    </ProtectedPage>
  );
}
