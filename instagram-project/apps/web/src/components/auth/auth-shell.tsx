import type { ReactNode } from 'react';
import { HeroPanel } from './hero-panel';
import { LocaleSwitcher } from '@/components/locale-switcher';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-sm animate-fade-in md:grid-cols-2">
        <section className="flex animate-fade-up flex-col justify-center px-6 py-10 sm:px-10">
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
          </header>
          {children}
        </section>
        <HeroPanel />
      </div>
      <LocaleSwitcher className="mt-6" />
    </main>
  );
}
