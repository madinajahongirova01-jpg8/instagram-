import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { ProtectedPage } from '@/components/layout/protected-page';
import { SearchView } from '@/components/search/search-view';
import { Spinner } from '@/components/ui/states';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('search');

export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <Suspense fallback={<Spinner />}>
        <SearchView />
      </Suspense>
    </ProtectedPage>
  );
}
