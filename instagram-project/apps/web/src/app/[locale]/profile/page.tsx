import { setRequestLocale } from 'next-intl/server';
import { ProtectedPage } from '@/components/layout/protected-page';
import { ProfileView } from '@/components/profile/profile-view';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('profile');

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <ProfileView />
    </ProtectedPage>
  );
}
