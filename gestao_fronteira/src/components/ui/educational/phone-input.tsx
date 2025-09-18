"use client";

import React, { forwardRef, useState, useCallback } from "react";
import { Input } from "../../../../components/ui/input";
import { Badge } from "../../../../components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatBrazilianPhone,
  validateBrazilianPhone,
  parseBrazilianPhone,
  removeBrazilianPhoneMask,
  isBrazilianPhoneComplete,
  type BrazilianPhoneFormat
} from "@/lib/validators/brazilian/phone";

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  /** Current phone value (can be formatted or unformatted) */
  value?: string;
  /** Callback when phone value changes */
  onChange?: (value: string, isValid: boolean, phoneData: BrazilianPhoneFormat) => void;
  /** Show validation state immediately (default: false) */
  showValidation?: boolean;
  /** Show phone type badge (mobile/landline) */
  showTypeBadge?: boolean;
  /** Custom error message for invalid phone */
  errorMessage?: string;
  /** Additional CSS classes */
  className?: string;
  /** Disable automatic formatting */
  disableFormatting?: boolean;
}

/**
 * Brazilian Phone Input Component with mobile/landline detection
 *
 * Features:
 * - Real-time Brazilian phone formatting (XX) XXXX-XXXX or (XX) 9XXXX-XXXX
 * - Automatic mobile/landline detection based on 9th digit
 * - DDD (area code) validation for all Brazilian states
 * - Visual type indicator badge
 * - Accessibility support with proper ARIA labels
 * - Mobile-optimized input with numeric keyboard
 * - Visual feedback for validation states
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PhoneInput
 *   value={phone}
 *   onChange={(value, isValid, phoneData) => setPhone(value)}
 *   placeholder="Digite o telefone"
 * />
 *
 * // With type badge and validation
 * <PhoneInput
 *   value={phone}
 *   onChange={(value, isValid, phoneData) => setPhone(value)}
 *   showValidation={true}
 *   showTypeBadge={true}
 *   errorMessage="Telefone inválido"
 * />
 * ```
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value = "",
      onChange,
      showValidation = false,
      showTypeBadge = true,
      errorMessage = "Telefone inválido",
      className,
      disableFormatting = false,
      placeholder = "(00) 00000-0000",
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value);
    const [isTouched, setIsTouched] = useState(false);

    // Use controlled value if provided, otherwise use internal state
    const currentValue = value !== undefined ? value : internalValue;

    // Parse phone data for validation and type detection
    const phoneData = parseBrazilianPhone(currentValue);
    const isComplete = isBrazilianPhoneComplete(currentValue);
    const isValid = isComplete ? validateBrazilianPhone(currentValue) : true;
    const shouldShowError = showValidation && isTouched && isComplete && !isValid;

    /**
     * Get phone type badge configuration
     */
    const getTypeBadgeConfig = useCallback((type: BrazilianPhoneFormat['type']) => {
      switch (type) {
        case 'mobile':
          return {
            text: 'Celular',
            variant: 'default' as const,
            className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          };
        case 'landline':
          return {
            text: 'Fixo',
            variant: 'secondary' as const,
            className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          };
        default:
          return null;
      }
    }, []);

    /**
     * Handle input value changes with formatting and validation
     */
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;

        // Remove non-numeric characters and limit to 11 digits (DDD + 9 digits)
        const cleanValue = removeBrazilianPhoneMask(inputValue).slice(0, 11);

        // Apply formatting if enabled
        const formattedValue = disableFormatting ? cleanValue : formatBrazilianPhone(cleanValue);

        // Update internal state if uncontrolled
        if (value === undefined) {
          setInternalValue(formattedValue);
        }

        // Trigger onChange callback with validation result and phone data
        if (onChange) {
          const phoneInfo = parseBrazilianPhone(formattedValue);
          const isValidPhone = isBrazilianPhoneComplete(cleanValue) ? validateBrazilianPhone(cleanValue) : false;
          onChange(formattedValue, isValidPhone, phoneInfo);
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
     * Handle paste events to clean and format pasted phone
     */
    const handlePaste = useCallback(
      (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();

        const pastedData = event.clipboardData.getData("text");
        const cleanValue = removeBrazilianPhoneMask(pastedData).slice(0, 11);
        const formattedValue = disableFormatting ? cleanValue : formatBrazilianPhone(cleanValue);

        // Create synthetic change event
        const syntheticEvent = {
          target: { value: formattedValue }
        } as React.ChangeEvent<HTMLInputElement>;

        handleChange(syntheticEvent);
      },
      [handleChange, disableFormatting]
    );

    const typeBadgeConfig = getTypeBadgeConfig(phoneData.type);

    return (
      <div className="relative">
        <div className="relative">
          <Input
            ref={ref}
            type="tel"
            inputMode="numeric"
            pattern="[0-9()-\s]*"
            value={currentValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onPaste={handlePaste}
            placeholder={placeholder}
            maxLength={disableFormatting ? 11 : 15} // 15 for formatted (XX) 9XXXX-XXXX
            className={cn(
              "transition-colors",
              showTypeBadge && typeBadgeConfig && "pr-20", // Space for badge
              shouldShowError && "border-red-500 focus-visible:ring-red-500",
              isComplete && isValid && isTouched && "border-green-500 focus-visible:ring-green-500",
              className
            )}
            aria-label="Campo de telefone"
            aria-describedby={
              shouldShowError
                ? `${props.id}-error`
                : showTypeBadge && typeBadgeConfig
                ? `${props.id}-type`
                : undefined
            }
            aria-invalid={shouldShowError}
            autoComplete="tel"
            data-testid="phone-input"
            {...props}
          />

          {/* Phone type badge */}
          {showTypeBadge && typeBadgeConfig && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Badge
                variant={typeBadgeConfig.variant}
                className={cn("text-xs font-medium", typeBadgeConfig.className)}
                id={`${props.id}-type`}
                aria-label={`Tipo de telefone: ${typeBadgeConfig.text}`}
              >
                {typeBadgeConfig.text}
              </Badge>
            </div>
          )}
        </div>

        {/* DDD information for screen readers */}
        {phoneData.ddd && (
          <div className="sr-only" aria-live="polite">
            DDD {phoneData.ddd}
          </div>
        )}

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
            Telefone válido - {typeBadgeConfig?.text}
          </div>
        )}

        {/* Additional phone info for debugging (development only) */}
        {process.env.NODE_ENV === 'development' && phoneData.ddd && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            DDD: {phoneData.ddd} | Número: {phoneData.number} | Tipo: {phoneData.type}
          </div>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export default PhoneInput;