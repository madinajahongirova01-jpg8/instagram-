'use client';

import { useCallback } from 'react';
import type { SerializedError } from '@reduxjs/toolkit';
import { useTranslations } from 'next-intl';
import { isApiQueryError } from './errors';
import type { ApiQueryError } from '@/store/base-query';

type Overrides = Partial<Record<number, string>>;

export function useApiErrors() {
  const t = useTranslations('errors');

  return useCallback(
    (error: ApiQueryError | SerializedError | undefined, overrides: Overrides = {}): string[] => {
      if (!error) {
        return [];
      }
      if (!isApiQueryError(error)) {
        return [t('generic')];
      }
      const override = overrides[error.status];
      if (override) {
        return [override];
      }
      if (error.status === 0) {
        return [t('network')];
      }
      if (error.status === 429) {
        return [t('tooMany')];
      }
      if (error.status >= 500 || error.messages.length === 0) {
        return [t('generic')];
      }
      return error.messages;
    },
    [t],
  );
}
