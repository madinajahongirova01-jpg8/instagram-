import { setRequestLocale } from 'next-intl/server';
import { LogoutScreen } from '@/components/auth/logout-screen';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('logout');

export default async function LogoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LogoutScreen />;
}
