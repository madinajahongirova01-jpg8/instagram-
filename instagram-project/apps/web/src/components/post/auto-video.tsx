'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoVideoProps {
  src: string | undefined;
  poster?: string;
  className?: string;
}

export function AutoVideo({ src, poster, className }: AutoVideoProps) {
  const t = useTranslations('post');
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const node = video.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void node.play().catch(() => undefined);
        } else {
          node.pause();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn('relative size-full bg-overlay', className)}>
      <video
        ref={video}
        src={src ? `${src}#t=0.1` : undefined}
        poster={poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setLoaded(true)}
        onClick={() => setMuted((value) => !value)}
        className={cn('size-full cursor-pointer object-contain transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
      />
      {loaded ? null : (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <Loader2 className="size-8 animate-spin text-overlay-foreground/80" />
        </span>
      )}
      <button
        type="button"
        aria-label={muted ? t('unmute') : t('mute')}
        onClick={() => setMuted((value) => !value)}
        className="absolute bottom-3 right-3 rounded-full bg-overlay p-2 text-overlay-foreground transition-transform hover:scale-110 active:scale-90"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  );
}
