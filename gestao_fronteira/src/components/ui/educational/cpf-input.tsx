"use client";

import React, { forwardRef, useState, useCallback } from "react";
import { Input } from "../../../../components/ui/input";
import { cn } from "@/lib/utils";
import { formatCPF, validateCPF, removeCPFMask, isCPFComplete } from "@/lib/validators/brazilian/cpf";

export interface CPFInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  /** Current CPF value (can be formatted or unformatted) */
  value?: string;
  /** Callback when CPF value changes */
  onChange?: (value: string, isValid: boolean) => void;
  /** Show validation state immediately (default: false) */
  showValidation?: boolean;
  /** Custom error message for invalid CPF */
  errorMessage?: string;
  /** Additional CSS classes */
  className?: string;
  /** Disable automatic formatting */
  disableFormatting?: boolean;
}

/**
 * CPF Input Component with Brazilian CPF validation and formatting
 *
 * Features:
 * - Real-time CPF formatting (XXX.XXX.XXX-XX)
 * - CPF validation using Brazilian algorithm
 * - Accessibility support with proper ARIA labels
 * - Mobile-optimized input with numeric keyboard
 * - Visual feedback for validation states
 * - Supports both controlled and uncontrolled usage
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CPFInput
 *   value={cpf}
 *   onChange={(value, isValid) => setCpf(value)}
 *   placeholder="Digite o CPF"
 * />
 *
 * // With validation feedback
 * <CPFInput
 *   value={cpf}
 *   onChange={(value, isValid) => setCpf(value)}
 *   showValidation={true}
 *   errorMessage="CPF inválido"
 * />
 * ```
 */
export const CPFInput = forwardRef<HTMLInputElement, CPFInputProps>(
  (
    {
      value = "",
      onChange,
      showValidation = false,
      errorMessage = "CPF inválido",
      className,
      disableFormatting = false,
      placeholder = "000.000.000-00",
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value);
    const [isTouched, setIsTouched] = useState(false);

    // Use controlled value if provided, otherwise use internal state
    const currentValue = value !== undefined ? value : internalValue;

    // Validation state
    const isComplete = isCPFComplete(currentValue);
    const isValid = isComplete ? validateCPF(currentValue) : true; // Don't show invalid until complete
    const shouldShowError = showValidation && isTouched && isComplete && !isValid;

    /**
     * Handle input value changes with formatting and validation
     */
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;

        // Remove non-numeric characters and limit to 11 digits
        const cleanValue = removeCPFMask(inputValue).slice(0, 11);

        // Apply formatting if enabled
        const formattedValue = disableFormatting ? cleanValue : formatCPF(cleanValue);

        // Update internal state if uncontrolled
        if (value === undefined) {
          setInternalValue(formattedValue);
        }

        // Trigger onChange callback with validation result
        if (onChange) {
          const isValidCPF = isCPFComplete(cleanValue) ? validateCPF(cleanValue) : false;
          onChange(formattedValue, isValidCPF);
        }
      },
      [onChange, value, disableFormatting]
    );

    /**
     * Handle blur event to mark field as touched
     */
    const handleBlur = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        setIsTouched(true);
        props.onBlur?.(event);
      },
      [props.onBlur]
    );

    /**
     * Handle paste events to clean and format pasted CPF
     */
    const handlePaste = useCallback(
      (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();

        const pastedData = event.clipboardData.getData("text");
        const cleanValue = removeCPFMask(pastedData).slice(0, 11);
        const formattedValue = disableFormatting ? cleanValue : formatCPF(cleanValue);

        // Create synthetic change event
        const syntheticEvent = {
          target: { value: formattedValue }
        } as React.ChangeEvent<HTMLInputElement>;

        handleChange(syntheticEvent);
      },
      [handleChange, disableFormatting]
    );

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9.-]*"
          value={currentValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={placeholder}
          maxLength={disableFormatting ? 11 : 14} // 14 for formatted (XXX.XXX.XXX-XX)
          className={cn(
            "transition-colors",
            shouldShowError && "border-red-500 focus-visible:ring-red-500",
            isComplete && isValid && isTouched && "border-green-500 focus-visible:ring-green-500",
            className
          )}
          aria-label="Campo de CPF"
          aria-describedby={shouldShowError ? `${props.id}-error` : undefined}
          aria-invalid={shouldShowError}
          autoComplete="off"
          data-testid="cpf-input"
          {...props}
        />

        {/* Validation feedback */}
        {shouldShowError && (
          <div
            id={`${props.id}-error`}
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
            aria-live="polite"
          >
            {errorMessage}
          </div>
        )}

        {/* Success indicator for screen readers */}
        {isComplete && isValid && isTouched && (
          <div className="sr-only" aria-live="polite">
            CPF válido
          </div>
        )}
      </div>
    );
  }
);

CPFInput.displayName = "CPFInput";

export default CPFInput;