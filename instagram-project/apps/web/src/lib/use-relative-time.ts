'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { relativeTime } from './time';

export function useRelativeTime(): (iso: string) => string {
  const t = useTranslations('time');
  return useCallback(
    (iso: string) => {
      const { unit, count } = relativeTime(iso);
      return t(unit, { count });
    },
    [t],
  );
}
