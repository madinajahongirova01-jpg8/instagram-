import { setRequestLocale } from 'next-intl/server';
import { ProtectedPage } from '@/components/layout/protected-page';
import { ProfileView } from '@/components/profile/profile-view';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('profile');

export default async function UserProfilePage({ params }: { params: Promise<{ locale: string; username: string }> }) {
  const { locale, username } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <ProfileView username={decodeURIComponent(username)} />
    </ProtectedPage>
  );
}
