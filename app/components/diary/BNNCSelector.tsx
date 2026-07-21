/**
 * BNCC Skills Selector Component
 * Task Group 2.2: Formulario de Conteudo Estruturado
 *
 * This component provides a text-free input for BNCC skill codes
 * with validation and formatting. Future enhancement could add
 * autocomplete with the full BNCC skills list.
 *
 * Features:
 * - Free text input for BNCC codes (e.g., "EF01MA06, EF01MA08")
 * - Real-time validation of skill codes
 * - Visual feedback for valid/invalid codes
 * - Support for multiple codes separated by comma or space
 *
 * BNCC Code Format:
 * - EF: Ensino Fundamental (e.g., EF01MA06)
 * - EI: Educacao Infantil (e.g., EI03EO01)
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  isValidBNNCCode,
  parseBNNCCodes,
  validateBNNCCodes,
} from '@/lib/validation/lesson-content'

export interface BNNCSelectorProps {
  /** Current value (comma-separated BNCC codes) */
  value?: string
  /** Callback when value changes */
  onChange?: (value: string) => void
  /** Label for the input */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Helper text */
  helperText?: string
  /** Error message */
  error?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Education level for context */
  educationLevel?: 'infantil' | 'fundamental'
  /** Maximum number of skills allowed */
  maxSkills?: number
  /** CSS class for the container */
  className?: string
  /** Input ID for accessibility */
  id?: string
}

export function BNNCSelector({
  value,
  onChange,
  label = 'Habilidades BNCC',
  placeholder = 'Ex: EF01MA06, EF01MA08',
  helperText,
  error,
  disabled = false,
  educationLevel = 'fundamental',
  maxSkills = 10,
  className,
  id = 'bncc-selector',
}: BNNCSelectorProps) {
  const [inputValue, setInputValue] = useState(value ?? '')
  const [isFocused, setIsFocused] = useState(false)
  const currentValue = value ?? inputValue

  // Parse and validate codes
  const parsedCodes = useMemo(() => parseBNNCCodes(currentValue), [currentValue])
  const validation = useMemo(() => validateBNNCCodes(parsedCodes), [parsedCodes])

  // Count valid codes
  const validCount = validation.validCodes.length
  const invalidCount = validation.invalidCodes.length
  const hasValidCodes = validCount > 0
  const hasInvalidCodes = invalidCount > 0
  const isOverLimit = validCount > maxSkills

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value.toUpperCase()
      if (value === undefined) setInputValue(newValue)
      onChange?.(newValue)
    },
    [onChange, value]
  )

  // Remove a specific code
  const removeCode = useCallback(
    (codeToRemove: string) => {
      const newCodes = parsedCodes.filter((code) => code !== codeToRemove)
      const newValue = newCodes.join(', ')
      if (value === undefined) setInputValue(newValue)
      onChange?.(newValue)
    },
    [parsedCodes, onChange, value]
  )

  // Get example codes based on education level
  const exampleCodes = useMemo(() => {
    if (educationLevel === 'infantil') {
      return 'EI03EO01, EI02CG01'
    }
    return 'EF01MA06, EF02LP08'
  }, [educationLevel])

  // Determine validation state
  const showValidation = currentValue.trim().length > 0 && !isFocused

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label with help tooltip */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={cn(
            'text-sm font-medium',
            error && 'text-destructive',
            disabled && 'opacity-50'
          )}
        >
          {label}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                disabled={disabled}
              >
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Ajuda sobre codigos BNCC</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-2 text-sm">
                <p className="font-medium">Formato do Codigo BNCC:</p>
                <p>
                  <code className="bg-muted px-1 rounded">EF01MA06</code> - Ensino
                  Fundamental
                </p>
                <p>
                  <code className="bg-muted px-1 rounded">EI03EO01</code> - Ed.
                  Infantil
                </p>
                <p className="text-muted-foreground">
                  Separe multiplos codigos por virgula ou espaco.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Input field */}
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={currentValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pr-10',
            error && 'border-destructive focus-visible:ring-destructive',
            hasInvalidCodes &&
              showValidation &&
              'border-yellow-500 focus-visible:ring-yellow-500',
            hasValidCodes &&
              !hasInvalidCodes &&
              showValidation &&
              'border-green-500 focus-visible:ring-green-500'
          )}
          aria-describedby={`${id}-description ${id}-error`}
          aria-invalid={!!error || hasInvalidCodes}
        />

        {/* Validation indicator */}
        {showValidation && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasInvalidCodes ? (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            ) : hasValidCodes ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text / Examples */}
      {helperText && !error && (
        <p
          id={`${id}-description`}
          className="text-sm text-muted-foreground"
        >
          {helperText}
        </p>
      )}

      {!helperText && !error && (
        <p
          id={`${id}-description`}
          className="text-sm text-muted-foreground"
        >
          Exemplo: {exampleCodes}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Validation feedback */}
      {showValidation && hasInvalidCodes && !error && (
        <p className="text-sm text-yellow-600">
          Codigos invalidos: {validation.invalidCodes.join(', ')}
        </p>
      )}

      {isOverLimit && (
        <p className="text-sm text-destructive">
          Maximo de {maxSkills} habilidades permitidas ({validCount} selecionadas)
        </p>
      )}

      {/* Code badges */}
      {hasValidCodes && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {validation.validCodes.map((code) => (
            <Badge
              key={code}
              variant="secondary"
              className={cn(
                'text-xs font-mono',
                code.startsWith('EI')
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              )}
            >
              {code}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCode(code)}
                  className="ml-1 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-offset-1"
                  aria-label={`Remover ${code}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Summary */}
      {hasValidCodes && (
        <p className="text-xs text-muted-foreground">
          {validCount} habilidade{validCount !== 1 ? 's' : ''} selecionada
          {validCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default BNNCSelector
