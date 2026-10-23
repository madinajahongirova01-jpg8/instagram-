export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_REGEX = /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-z0-9._]{3,30}$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const PASSWORD_REGEX = /^(?=.*[A-Za-zА-Яа-яЁёҲҳҶҷҚқҒғӮӯӢӣ])(?=.*\d).{8,72}$/;

export const FULL_NAME_MAX = 60;
export const BIO_MAX = 150;
export const CAPTION_MAX = 2200;
export const COMMENT_MAX = 1000;
export const MESSAGE_MAX = 2000;
export const SEARCH_QUERY_MAX = 50;

export const PAGE_LIMIT_DEFAULT = 20;
export const PAGE_LIMIT_MAX = 50;

export const POST_MEDIA_MAX = 10;
export const STORY_TTL_HOURS = 24;

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
export const AUDIO_MIME_TYPES = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4'] as const;

export function isValidUsername(value: string): boolean {
  return USERNAME_REGEX.test(value);
}

export function isStrongPassword(value: string): boolean {
  return PASSWORD_REGEX.test(value);
}
