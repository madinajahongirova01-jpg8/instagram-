'use client';

import { useEffect, useState } from 'react';

export function useStreamElement<T extends HTMLMediaElement>(stream: MediaStream | null): (element: T | null) => void {
  const [element, setElement] = useState<T | null>(null);

  useEffect(() => {
    if (!element) {
      return;
    }
    if (element.srcObject !== stream) {
      element.srcObject = stream;
    }
    if (stream) {
      void element.play().catch(() => undefined);
    }
  }, [element, stream]);

  return setElement;
}

export function hasLiveVideo(stream: MediaStream | null): boolean {
  return Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live'));
}

function format(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function useCallDuration(startedAt: number | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) {
      return;
    }
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  return startedAt ? format(Math.max(0, Math.floor((now - startedAt) / 1000))) : null;
}
