'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

export interface FormFieldProps {
  /** The label text displayed above the input */
  label: string;
  /** The id of the input element (for label association) */
  htmlFor: string;
  /** Error message to display below the input */
  error?: string;
  /** Helper text to display below the input (hidden when error is shown) */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** The input element(s) to wrap */
  children: React.ReactNode;
  /** Additional CSS classes for the wrapper */
  className?: string;
}

/**
 * FormField - Accessible form field wrapper
 *
 * Provides proper label association (ACESS-02) and error message display (ACESS-03).
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Email"
 *   htmlFor="email"
 *   required
 *   error={errors.email?.message}
 * >
 *   <Input
 *     id="email"
 *     error={!!errors.email}
 *     aria-describedby={errors.email ? "email-error" : undefined}
 *   />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={htmlFor}
        className={cn(
          'text-sm font-medium text-gray-700',
          error && 'text-red-600'
        )}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {children}

      {description && !error && (
        <p
          className="text-sm text-gray-500"
          id={`${htmlFor}-description`}
        >
          {description}
        </p>
      )}

      {error && (
        <p
          className="text-sm text-red-600"
          id={`${htmlFor}-error`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
