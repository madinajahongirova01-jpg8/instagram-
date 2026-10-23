import type { SerializedError } from '@reduxjs/toolkit';
import type { ApiQueryError } from '@/store/base-query';

export function isApiQueryError(error: unknown): error is ApiQueryError {
  return typeof error === 'object' && error !== null && 'status' in error && 'messages' in error;
}

export function errorMessages(error: ApiQueryError | SerializedError | undefined, fallback: string): string[] {
  if (!error) {
    return [];
  }
  if (isApiQueryError(error)) {
    return error.messages.length > 0 ? error.messages : [fallback];
  }
  return [fallback];
}

export function errorStatus(error: ApiQueryError | SerializedError | undefined): number | null {
  return isApiQueryError(error) ? error.status : null;
}
