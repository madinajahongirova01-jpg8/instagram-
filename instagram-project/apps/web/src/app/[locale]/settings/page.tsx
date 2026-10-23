import { setRequestLocale } from 'next-intl/server';
import { ProtectedPage } from '@/components/layout/protected-page';
import { SettingsView } from '@/components/settings/settings-view';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('settings');

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <SettingsView />
    </ProtectedPage>
  );
}
