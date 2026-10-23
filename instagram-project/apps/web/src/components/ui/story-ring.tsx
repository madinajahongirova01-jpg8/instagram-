import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StoryRing({ seen = false, className, children }: { seen?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('relative isolate inline-flex shrink-0 overflow-hidden rounded-full p-[2.5px]', seen && 'bg-story-seen', className)}>
      {seen ? null : <span aria-hidden="true" className="story-ring absolute -inset-1/4 -z-10 animate-story-spin" />}
      <span className="inline-flex rounded-full bg-background p-[2.5px]">{children}</span>
    </span>
  );
}
