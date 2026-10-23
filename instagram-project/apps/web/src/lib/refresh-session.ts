import type { AuthResponse } from '@insta/shared';
import { http } from './http';

let inflight: Promise<AuthResponse | null> | null = null;

export function refreshSession(): Promise<AuthResponse | null> {
  if (!inflight) {
    inflight = http
      .post<AuthResponse>('/auth/refresh')
      .then((response) => response.data)
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
