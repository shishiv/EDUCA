import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-educa text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary - solid brand color from the primary token
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',

        // Secondary - outlined in the brand color
        secondary:
          'border-2 border-primary text-primary bg-background hover:bg-primary/5',

        // Ghost - minimal; brand color on hover
        ghost: 'text-muted-foreground hover:text-primary hover:bg-primary/5',

        // Destructive
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',

        // Outline - neutral border variant
        outline:
          'border border-input bg-background text-foreground hover:bg-muted hover:border-ring',

        // Link - text link style
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        // Touch-friendly size for mobile (44px minimum per WCAG)
        touch: 'h-11 min-w-[44px] px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
