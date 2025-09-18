/**
 * Enhanced Brazilian Input Components
 * Real-time formatting for CPF, Phone, and CEP inputs
 * Optimized for mobile and accessibility
 */

'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatCPF, formatBrazilianPhone, formatCEP, validateCPF, validateBrazilianPhone, validateCEP } from '@/lib/validators/brazilian'

interface BrazilianInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFormattedChange?: (value: string, rawValue: string) => void
}

/**
 * CPF Input with real-time formatting and validation
 * Formats as user types: 123.456.789-09
 */
export const CPFInput = React.forwardRef<HTMLInputElement, BrazilianInputProps>(
  ({ className, onFormattedChange, onChange, ...props }, ref) => {
    const [rawValue, setRawValue] = React.useState('')
    const [isValid, setIsValid] = React.useState<boolean | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numeric = inputValue.replace(/\D/g, '')

      // Limit to 11 digits
      const limitedNumeric = numeric.slice(0, 11)
      const formatted = formatCPF(limitedNumeric)

      setRawValue(limitedNumeric)

      // Update validation state
      if (limitedNumeric.length === 11) {
        setIsValid(validateCPF(limitedNumeric))
      } else if (limitedNumeric.length > 0) {
        setIsValid(null) // Incomplete
      } else {
        setIsValid(null) // Empty
      }

      // Update the input value
      e.target.value = formatted

      // Call callbacks
      onFormattedChange?.(formatted, limitedNumeric)
      onChange?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (rawValue.length > 0 && rawValue.length < 11) {
        setIsValid(false)
      }
      props.onBlur?.(e)
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="000.000.000-00"
        maxLength={14} // Formatted length
        className={cn(
          // Base classes
          className,
          // Validation states
          isValid === false && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          isValid === true && 'border-green-500 focus:border-green-500 focus:ring-green-500'
        )}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label="CPF - Cadastro de Pessoa Física"
        aria-describedby={props.id ? `${props.id}-help` : undefined}
        aria-invalid={isValid === false}
        {...props}
      />
    )
  }
)
CPFInput.displayName = 'CPFInput'

/**
 * Brazilian Phone Input with real-time formatting
 * Handles both mobile (11 digits) and landline (10 digits)
 * Formats as: (34) 99999-9999 or (34) 9999-9999
 */
export const BrazilianPhoneInput = React.forwardRef<HTMLInputElement, BrazilianInputProps>(
  ({ className, onFormattedChange, onChange, ...props }, ref) => {
    const [rawValue, setRawValue] = React.useState('')
    const [isValid, setIsValid] = React.useState<boolean | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numeric = inputValue.replace(/\D/g, '')

      // Limit to 11 digits (mobile) or 10 digits (landline)
      const limitedNumeric = numeric.slice(0, 11)
      const formatted = formatBrazilianPhone(limitedNumeric)

      setRawValue(limitedNumeric)

      // Update validation state
      if (limitedNumeric.length === 10 || limitedNumeric.length === 11) {
        setIsValid(validateBrazilianPhone(limitedNumeric))
      } else if (limitedNumeric.length > 0) {
        setIsValid(null) // Incomplete
      } else {
        setIsValid(null) // Empty
      }

      // Update the input value
      e.target.value = formatted

      // Call callbacks
      onFormattedChange?.(formatted, limitedNumeric)
      onChange?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (rawValue.length > 0 && rawValue.length < 10) {
        setIsValid(false)
      }
      props.onBlur?.(e)
    }

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        placeholder="(34) 99999-9999"
        maxLength={15} // Formatted length for mobile
        className={cn(
          className,
          isValid === false && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          isValid === true && 'border-green-500 focus:border-green-500 focus:ring-green-500'
        )}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label="Telefone brasileiro - celular ou fixo"
        aria-describedby={props.id ? `${props.id}-help` : undefined}
        aria-invalid={isValid === false}
        {...props}
      />
    )
  }
)
BrazilianPhoneInput.displayName = 'BrazilianPhoneInput'

/**
 * CEP Input with real-time formatting
 * Formats as: 12345-678
 */
export const CEPInput = React.forwardRef<HTMLInputElement, BrazilianInputProps>(
  ({ className, onFormattedChange, onChange, ...props }, ref) => {
    const [rawValue, setRawValue] = React.useState('')
    const [isValid, setIsValid] = React.useState<boolean | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numeric = inputValue.replace(/\D/g, '')

      // Limit to 8 digits
      const limitedNumeric = numeric.slice(0, 8)
      const formatted = formatCEP(limitedNumeric)

      setRawValue(limitedNumeric)

      // Update validation state
      if (limitedNumeric.length === 8) {
        setIsValid(validateCEP(limitedNumeric))
      } else if (limitedNumeric.length > 0) {
        setIsValid(null) // Incomplete
      } else {
        setIsValid(null) // Empty
      }

      // Update the input value
      e.target.value = formatted

      // Call callbacks
      onFormattedChange?.(formatted, limitedNumeric)
      onChange?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (rawValue.length > 0 && rawValue.length < 8) {
        setIsValid(false)
      }
      props.onBlur?.(e)
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="12345-678"
        maxLength={9} // Formatted length
        className={cn(
          className,
          isValid === false && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          isValid === true && 'border-green-500 focus:border-green-500 focus:ring-green-500'
        )}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label="CEP - Código de Endereçamento Postal"
        aria-describedby={props.id ? `${props.id}-help` : undefined}
        aria-invalid={isValid === false}
        {...props}
      />
    )
  }
)
CEPInput.displayName = 'CEPInput'

/**
 * Brazilian Date Input optimized for DD/MM/YYYY format
 * Common in Brazilian educational systems
 */
export const BrazilianDateInput = React.forwardRef<HTMLInputElement, BrazilianInputProps>(
  ({ className, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numeric = inputValue.replace(/\D/g, '')

      // Format as DD/MM/YYYY
      let formatted = numeric
      if (numeric.length >= 2) {
        formatted = numeric.slice(0, 2) + '/' + numeric.slice(2)
      }
      if (numeric.length >= 4) {
        formatted = numeric.slice(0, 2) + '/' + numeric.slice(2, 4) + '/' + numeric.slice(4, 8)
      }

      // Limit to 10 characters (DD/MM/YYYY)
      formatted = formatted.slice(0, 10)

      // Update the input value
      e.target.value = formatted
      onChange?.(e)
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        className={cn(className)}
        onChange={handleChange}
        aria-label="Data no formato brasileiro DD/MM/AAAA"
        {...props}
      />
    )
  }
)
BrazilianDateInput.displayName = 'BrazilianDateInput'

/**
 * Helper component for Brazilian input validation messages
 */
interface BrazilianInputHelpProps {
  id: string
  type: 'cpf' | 'phone' | 'cep' | 'date'
  isValid?: boolean | null
  customMessage?: string
}

export function BrazilianInputHelp({ id, type, isValid, customMessage }: BrazilianInputHelpProps) {
  const getDefaultMessage = () => {
    switch (type) {
      case 'cpf':
        return 'Apenas para alunos acima de 16 anos'
      case 'phone':
        return 'Celular ou telefone fixo'
      case 'cep':
        return 'Código postal brasileiro'
      case 'date':
        return 'Formato: DD/MM/AAAA'
      default:
        return ''
    }
  }

  const getErrorMessage = () => {
    switch (type) {
      case 'cpf':
        return 'CPF inválido'
      case 'phone':
        return 'Telefone inválido'
      case 'cep':
        return 'CEP inválido'
      case 'date':
        return 'Data inválida'
      default:
        return 'Formato inválido'
    }
  }

  return (
    <div id={id} className="text-sm mt-1">
      {isValid === false ? (
        <span className="text-red-600" role="alert">
          {customMessage || getErrorMessage()}
        </span>
      ) : (
        <span className="text-gray-500">
          {customMessage || getDefaultMessage()}
        </span>
      )}
    </div>
  )
}

export { CPFInput, BrazilianPhoneInput, CEPInput, BrazilianDateInput }