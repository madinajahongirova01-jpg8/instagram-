import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BottomNav, MobileHeader } from './mobile-nav';
import { RightColumn } from './right-column';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="app-backdrop min-h-dvh">
      <MobileHeader />
      <div className="mx-auto flex w-full max-w-[1680px] md:gap-6 md:pr-4 xl:gap-8 xl:pr-6 md:dark:pl-4">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <div className={cn('mx-auto w-full', wide ? 'max-w-[1200px]' : 'max-w-[780px]')}>
            <TopBar />
            <main className="pb-24 md:pb-10">{children}</main>
          </div>
        </div>
        {wide ? null : <RightColumn />}
      </div>
      <BottomNav />
    </div>
  );
}
