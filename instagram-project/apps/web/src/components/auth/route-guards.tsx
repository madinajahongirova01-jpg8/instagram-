'use client';

import { useEffect, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useAppSelector } from '@/store';

function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAppSelector((state) => state.auth.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') {
      router.replace('/login');
    }
  }, [status, router]);

  return status === 'authenticated' ? <>{children}</> : <FullScreenSpinner />;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const status = useAppSelector((state) => state.auth.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  return status === 'guest' ? <>{children}</> : <FullScreenSpinner />;
}
