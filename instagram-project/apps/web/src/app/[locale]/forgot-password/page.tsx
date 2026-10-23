import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { ForgotPasswordFlow } from '@/components/auth/forgot-password-form';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('forgotPassword');

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense>
      <ForgotPasswordFlow />
    </Suspense>
  );
}
