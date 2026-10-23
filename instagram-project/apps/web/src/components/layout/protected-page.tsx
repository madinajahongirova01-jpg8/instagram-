import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/route-guards';
import { AppShell } from './app-shell';

export function ProtectedPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <RequireAuth>
      <AppShell wide={wide}>{children}</AppShell>
    </RequireAuth>
  );
}
