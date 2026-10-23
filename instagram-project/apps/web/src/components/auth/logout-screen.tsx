'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useLogoutMutation } from '@/store/api';
import { signedOut } from '@/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/store';

export function LogoutScreen() {
  const t = useTranslations('logout');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);
  const [logout] = useLogoutMutation();
  const started = useRef(false);

  useEffect(() => {
    if (status === 'unknown' || started.current) {
      return;
    }
    started.current = true;
    void logout()
      .unwrap()
      .catch(() => dispatch(signedOut()))
      .finally(() => router.replace('/login'));
  }, [status, logout, dispatch, router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3" aria-busy="true">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t('inProgress')}</p>
    </main>
  );
}
