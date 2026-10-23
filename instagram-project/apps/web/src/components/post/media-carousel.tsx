'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import type { MediaDto } from '@insta/shared';
import { mediaUrl } from '@/lib/config';
import { cn } from '@/lib/utils';
import { AutoVideo } from './auto-video';

interface MediaCarouselProps {
  media: MediaDto[];
  alt: string;
  onDoubleClick?: () => void;
  burst?: number;
  className?: string;
}

export function MediaCarousel({ media, alt, onDoubleClick, burst = 0, className }: MediaCarouselProps) {
  const t = useTranslations('post');
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = media.length > 1;

  const go = (next: number) => {
    const node = track.current;
    if (node) {
      node.scrollTo({ left: next * node.clientWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div
        ref={track}
        onScroll={(event) => {
          const node = event.currentTarget;
          setIndex(Math.round(node.scrollLeft / Math.max(1, node.clientWidth)));
        }}
        onDoubleClick={onDoubleClick}
        className="flex aspect-4/5 snap-x sm:aspect-16/11 snap-mandatory overflow-x-auto overflow-y-hidden bg-muted [scrollbar-width:none] sm:rounded-2xl"
      >
        {media.map((item, i) => {
          const src = mediaUrl(item.url) ?? undefined;
          return (
            <div key={item.id} className="relative size-full shrink-0 snap-center">
              {item.kind === 'VIDEO' ? (
                <AutoVideo src={src} />
              ) : (
                <img src={src} alt={`${alt} ${i + 1}`} loading="lazy" draggable={false} className="size-full object-cover" />
              )}
            </div>
          );
        })}
      </div>
      {burst > 0 ? (
        <Heart
          key={burst}
          aria-hidden="true"
          strokeWidth={0}
          className="pointer-events-none absolute left-1/2 top-1/2 size-28 animate-heart-burst fill-overlay-foreground opacity-0 drop-shadow-2xl"
        />
      ) : null}
      {many ? (
        <>
          <span className="absolute right-3 top-3 rounded-full bg-overlay px-2.5 py-1 text-xs font-semibold text-overlay-foreground">
            {index + 1}/{media.length}
          </span>
          {index > 0 ? (
            <button
              type="button"
              aria-label={t('previous')}
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-popover/90 text-popover-foreground shadow sm:flex"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : null}
          {index < media.length - 1 ? (
            <button
              type="button"
              aria-label={t('next')}
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-popover/90 text-popover-foreground shadow sm:flex"
            >
              <ChevronRight className="size-5" />
            </button>
          ) : null}
        </>
      ) : null}
      {many ? (
        <div className="pointer-events-none absolute inset-x-0 -bottom-6 flex justify-center gap-1.5" aria-hidden="true">
          {media.map((item, i) => (
            <span key={item.id} className={cn('size-1.5 rounded-full', i === index ? 'bg-dot-active' : 'bg-dot')} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
