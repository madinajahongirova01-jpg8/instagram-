import { setRequestLocale } from 'next-intl/server';
import { ProtectedPage } from '@/components/layout/protected-page';
import { NotificationsView } from '@/components/notifications/notifications-view';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('notifications');

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <NotificationsView />
    </ProtectedPage>
  );
}
