const BOUNDARY = `(?:^|[\\s([{,;:!?"'«])`;
const HASHTAG_REGEX = new RegExp(`${BOUNDARY}#([\\p{L}\\p{N}_]{1,50})`, 'gu');
const MENTION_REGEX = new RegExp(`${BOUNDARY}@([a-z0-9._]{3,30})`, 'giu');

export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) {
    return [];
  }
  const found = new Set<string>();
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    found.add(match[1].toLowerCase());
  }
  return [...found].slice(0, 30);
}

export function extractMentions(text: string | null | undefined): string[] {
  if (!text) {
    return [];
  }
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_REGEX)) {
    found.add(match[1].toLowerCase().replace(/\.+$/, ''));
  }
  return [...found].slice(0, 20);
}

export function preview(text: string | null | undefined, max = 80): string | null {
  if (!text) {
    return null;
  }
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/^[@#]+/, '').slice(0, 50);
}
