import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-md border px-3 py-2.5 text-sm flex items-start gap-2 [&>svg]:size-4 [&>svg]:mt-0.5 [&>svg]:shrink-0', {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
      success: 'border-success/30 bg-success/5 text-success',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
