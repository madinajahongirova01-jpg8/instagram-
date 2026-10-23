import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { GuestOnly } from '@/components/auth/route-guards';
import { EmailVerifier, LoginForm } from '@/components/auth/login-form';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('login');

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Suspense>
        <EmailVerifier />
      </Suspense>
      <GuestOnly>
        <LoginForm />
      </GuestOnly>
    </>
  );
}
