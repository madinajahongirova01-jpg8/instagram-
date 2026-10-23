export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api`;

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  return /^https?:\/\//.test(path) ? path : `${API_ORIGIN}${path}`;
}
