import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          'flex h-10 w-full rounded-educa border bg-background px-3 py-2 text-sm text-foreground',
          'placeholder:text-muted-foreground',
          'transition-colors duration-150',
          // File input styles
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          // Focus states (visible per ACESS-02) - brand ring from the token
          'focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring',
          'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring',
          // Disabled state
          'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
          // Default border
          !error && 'border-input',
          // Error state
          error && 'border-destructive focus:ring-destructive/30 focus:border-destructive focus-visible:ring-destructive/30 focus-visible:border-destructive',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
