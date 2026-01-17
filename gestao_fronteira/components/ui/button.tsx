import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-educa text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary - Green gradient like mockup buttons
        default:
          'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 shadow-sm',

        // Secondary - Outlined with green border
        secondary:
          'border-2 border-green-600 text-green-700 bg-white hover:bg-green-50',

        // Ghost - Minimal, just text
        ghost: 'text-gray-600 hover:text-green-600 hover:bg-green-50',

        // Destructive - Keep existing, already good
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',

        // Outline - Gray border variant
        outline:
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400',

        // Link - Text link style
        link: 'text-green-600 underline-offset-4 hover:underline',
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
