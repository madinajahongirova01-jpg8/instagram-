import { setRequestLocale } from 'next-intl/server';
import { HashtagView } from '@/components/explore/hashtag-view';
import { ProtectedPage } from '@/components/layout/protected-page';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('explore');

export default async function HashtagPage({ params }: { params: Promise<{ locale: string; name: string }> }) {
  const { locale, name } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <HashtagView name={decodeURIComponent(name)} />
    </ProtectedPage>
  );
}
