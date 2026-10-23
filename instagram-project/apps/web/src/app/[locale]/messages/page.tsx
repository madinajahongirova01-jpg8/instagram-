import { setRequestLocale } from 'next-intl/server';
import { ProtectedPage } from '@/components/layout/protected-page';
import { MessagesView } from '@/components/messages/messages-view';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('messages');

export default async function MessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage wide>
      <MessagesView />
    </ProtectedPage>
  );
}
