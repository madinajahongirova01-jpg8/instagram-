'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreamElement } from './use-call-media';

const MARGIN = 16;

interface Point {
  x: number;
  y: number;
}

interface LocalPreviewProps {
  stream: MediaStream | null;
  cameraOn: boolean;
  fullscreen: boolean;
  label: string;
}

export function LocalPreview({ stream, cameraOn, fullscreen, label }: LocalPreviewProps) {
  const videoRef = useStreamElement<HTMLVideoElement>(stream);
  const box = useRef<HTMLDivElement>(null);
  const grab = useRef<Point | null>(null);
  const [position, setPosition] = useState<Point | null>(null);

  const clamp = useCallback((point: Point): Point => {
    const element = box.current;
    const parent = element?.parentElement;
    if (!element || !parent) {
      return point;
    }
    const maxX = Math.max(MARGIN, parent.clientWidth - element.offsetWidth - MARGIN);
    const maxY = Math.max(MARGIN, parent.clientHeight - element.offsetHeight - MARGIN);
    return { x: Math.min(Math.max(MARGIN, point.x), maxX), y: Math.min(Math.max(MARGIN, point.y), maxY) };
  }, []);

  useEffect(() => {
    const onResize = () => setPosition((current) => (current ? clamp(current) : current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const element = box.current;
    if (fullscreen || !element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    grab.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    element.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const parent = box.current?.parentElement;
    if (!grab.current || !parent) {
      return;
    }
    const rect = parent.getBoundingClientRect();
    setPosition(clamp({ x: event.clientX - rect.left - grab.current.x, y: event.clientY - rect.top - grab.current.y }));
  };

  const onPointerUp = () => {
    grab.current = null;
  };

  return (
    <div
      ref={box}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={!fullscreen && position ? { left: position.x, top: position.y } : undefined}
      className={cn(
        'absolute overflow-hidden bg-neutral-800',
        fullscreen
          ? 'inset-0'
          : cn('z-10 h-44 w-28 cursor-grab touch-none rounded-2xl border border-white/20 shadow-2xl active:cursor-grabbing sm:h-56 sm:w-40', !position && 'right-4 top-20'),
      )}
    >
      <video ref={videoRef} autoPlay playsInline muted className={cn('size-full -scale-x-100 object-cover', !cameraOn && 'invisible')} />
      {cameraOn ? null : (
        <span className="absolute inset-0 flex items-center justify-center text-white/70">
          <VideoOff className="size-6" />
        </span>
      )}
    </div>
  );
}
