import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { CreateView } from '@/components/create/create-view';
import { ProtectedPage } from '@/components/layout/protected-page';
import { Spinner } from '@/components/ui/states';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('create');

export default async function CreatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <Suspense fallback={<Spinner />}>
        <CreateView />
      </Suspense>
    </ProtectedPage>
  );
}
