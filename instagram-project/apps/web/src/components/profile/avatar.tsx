import { UserRound } from 'lucide-react';
import { mediaUrl } from '@/lib/config';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src: string | null;
  alt: string;
  className?: string;
}

export function Avatar({ src, alt, className }: AvatarProps) {
  const url = mediaUrl(src);
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted', className)}>
      {url ? (
        <img src={url} alt={alt} className="size-full object-cover" />
      ) : (
        <UserRound aria-label={alt} className="size-1/2 text-muted-foreground" strokeWidth={1.5} />
      )}
    </span>
  );
}
