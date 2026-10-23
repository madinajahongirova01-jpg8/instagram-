import { setRequestLocale } from 'next-intl/server';
import { RequireAuth } from '@/components/auth/route-guards';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('changePassword');

export default async function ChangePasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RequireAuth>
      <ChangePasswordForm />
    </RequireAuth>
  );
}
