'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnimatedClose } from './use-presence';

interface ModalProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ title, closeLabel, onClose, children, className }: ModalProps) {
  const { closing, requestClose } = useAnimatedClose(onClose);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [requestClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4',
        closing ? 'animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border bg-popover p-5 text-popover-foreground shadow-2xl sm:max-w-md sm:rounded-3xl',
          closing ? 'animate-menu-out' : 'animate-menu-in',
          className,
        )}
      >
        <header className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" aria-label={closeLabel} onClick={requestClose} className="rounded-full p-1 hover:bg-nav-hover">
            <X className="size-5" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
