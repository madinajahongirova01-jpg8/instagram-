import type { MouseEvent } from 'react';

let origin: string | null = null;

export function rememberStoryOrigin(event: MouseEvent<HTMLElement>): void {
  const rect = event.currentTarget.getBoundingClientRect();
  origin = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
}

export function storyOrigin(): string {
  return origin ?? 'center';
}

export function clearStoryOrigin(): void {
  origin = null;
}
