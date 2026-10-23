'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { usePresence } from './use-presence';

interface DropdownProps {
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  className?: string;
  children: (close: () => void) => ReactNode;
}

export function Dropdown({ label, trigger, triggerClassName, panelClassName, className, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { mounted, closing } = usePresence(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {mounted ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute z-50 origin-top rounded-2xl border bg-popover text-popover-foreground shadow-2xl',
            closing ? 'pointer-events-none animate-menu-out' : 'animate-menu-in',
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
