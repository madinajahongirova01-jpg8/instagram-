import type { ReactNode } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';

export function CardShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <section className="w-full max-w-md animate-fade-up rounded-2xl border bg-card px-6 py-10 shadow-sm sm:px-10">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </header>
        {children}
      </section>
      <LocaleSwitcher className="mt-6" />
    </main>
  );
}
