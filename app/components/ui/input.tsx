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
          'flex h-10 w-full rounded-educa border bg-white px-3 py-2 text-sm text-gray-900',
          'placeholder:text-gray-400',
          'transition-colors duration-150',
          // File input styles
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          // Focus states (visible per ACESS-02)
          'focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500',
          'focus-visible:ring-2 focus-visible:ring-green-500/30 focus-visible:border-green-500',
          // Disabled state
          'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400',
          // Default border
          !error && 'border-gray-300',
          // Error state
          error && 'border-red-500 focus:ring-red-500/30 focus:border-red-500 focus-visible:ring-red-500/30 focus-visible:border-red-500',
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
