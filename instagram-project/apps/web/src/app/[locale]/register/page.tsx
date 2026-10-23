import { setRequestLocale } from 'next-intl/server';
import { GuestOnly } from '@/components/auth/route-guards';
import { RegisterForm } from '@/components/auth/register-form';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('register');

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <GuestOnly>
      <RegisterForm />
    </GuestOnly>
  );
}
