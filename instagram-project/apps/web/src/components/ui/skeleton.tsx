import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative block overflow-hidden rounded-md bg-muted', className)}>
      <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </span>
  );
}
