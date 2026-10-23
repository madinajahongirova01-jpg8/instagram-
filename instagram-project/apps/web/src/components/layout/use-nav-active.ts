'use client';

import { usePathname } from '@/i18n/navigation';

export function useNavActive(): (href: string) => boolean {
  const pathname = usePathname();
  return (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));
}
