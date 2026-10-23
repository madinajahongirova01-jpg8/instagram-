'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const EXIT_MS = 150;

export function usePresence(open: boolean): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) {
      return;
    }
    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  return { mounted, closing };
}

export function useAnimatedClose(onClose: () => void): { closing: boolean; requestClose: () => void } {
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
    }
  }, []);

  const requestClose = useCallback(() => {
    if (timer.current) {
      return;
    }
    setClosing(true);
    timer.current = window.setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  return { closing, requestClose };
}
