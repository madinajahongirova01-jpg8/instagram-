'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function CountBadge({ count, className }: { count: number; className?: string }) {
  const previous = useRef(count);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (count > previous.current) {
      setPulse((value) => value + 1);
    }
    previous.current = count;
  }, [count]);

  if (count <= 0) {
    return null;
  }
  return (
    <span
      key={pulse}
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-badge px-1.5 text-[11px] font-semibold leading-none text-badge-foreground',
        pulse > 0 && 'animate-badge-pulse',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
