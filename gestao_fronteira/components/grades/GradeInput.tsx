/**
 * GradeInput Component - Numeric Input for Grades (0-10)
 * Task 3.1.4: Create GradeInput component
 *
 * Features:
 * - Numeric input 0-10 with one decimal place
 * - Inline validation
 * - Color coding: green >= 7, yellow >= 5, red < 5
 * - Touch-friendly design
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 * @see types/grades.ts for Grade types
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  getGradeColor,
  parseGrade,
  formatGrade,
  isValidGrade,
  GRADE_RANGE,
  GRADE_COLOR_CLASSES,
  type GradeColor,
} from '@/types/grades'

export interface GradeInputProps {
  /** Current grade value (0-10 or null) */
  value: number | null
  /** Callback when grade changes */
  onChange: (value: number | null) => void
  /** Whether the input is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
  /** Show validation error */
  error?: string | null
  /** Auto-save on blur */
  autoSave?: boolean
  /** Callback when saving (for auto-save) */
  onSave?: (value: number | null) => void
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show color indicator */
  showColor?: boolean
  /** Aria label for accessibility */
  ariaLabel?: string
  /** Input ID */
  id?: string
}

/**
 * Size configuration for the input
 */
const SIZE_CLASSES = {
  sm: 'h-8 w-16 text-sm px-2',
  md: 'h-10 w-20 text-base px-3',
  lg: 'h-12 w-24 text-lg px-4',
} as const

/**
 * GradeInput - Specialized input for Brazilian grade system (0-10)
 *
 * Features:
 * - Input validation (0-10, one decimal place)
 * - Color coding based on grade value
 * - Keyboard navigation (arrow keys to increment/decrement)
 * - Touch-friendly design
 */
export function GradeInput({
  value,
  onChange,
  disabled = false,
  placeholder = '-',
  className = '',
  error = null,
  autoSave = false,
  onSave,
  size = 'md',
  showColor = true,
  ariaLabel,
  id,
}: GradeInputProps) {
  // Internal state for the input text
  const [inputValue, setInputValue] = useState<string>(value !== null ? formatGrade(value) : '')
  const [isFocused, setIsFocused] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync internal state with external value
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value !== null ? formatGrade(value) : '')
    }
  }, [value, isFocused])

  // Get color based on current value
  const gradeColor: GradeColor | null = value !== null ? getGradeColor(value) : null
  const colorClasses = gradeColor ? GRADE_COLOR_CLASSES[gradeColor] : null

  /**
   * Handle input change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value

      // Allow empty input
      if (rawValue === '' || rawValue === '-') {
        setInputValue(rawValue)
        setLocalError(null)
        return
      }

      // Allow typing in progress (numbers, comma, dot)
      if (/^[0-9,.\-]*$/.test(rawValue)) {
        setInputValue(rawValue)

        // Try to parse and validate
        const parsed = parseGrade(rawValue)
        if (parsed !== null) {
          setLocalError(null)
          onChange(parsed)
        } else {
          // Check if it's a valid partial input
          const normalized = rawValue.replace(',', '.')
          const num = parseFloat(normalized)
          if (!isNaN(num) && (num < GRADE_RANGE.min || num > GRADE_RANGE.max)) {
            setLocalError(`Nota deve ser entre ${GRADE_RANGE.min} e ${GRADE_RANGE.max}`)
          }
        }
      }
    },
    [onChange]
  )

  /**
   * Handle blur - finalize value and auto-save
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false)

    // Parse final value
    if (inputValue === '' || inputValue === '-') {
      onChange(null)
      if (autoSave && onSave) {
        onSave(null)
      }
      return
    }

    const parsed = parseGrade(inputValue)
    if (parsed !== null) {
      setInputValue(formatGrade(parsed))
      onChange(parsed)
      setLocalError(null)
      if (autoSave && onSave) {
        onSave(parsed)
      }
    } else {
      // Reset to previous valid value
      setInputValue(value !== null ? formatGrade(value) : '')
      setLocalError(null)
    }
  }, [inputValue, value, onChange, autoSave, onSave])

  /**
   * Handle focus
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    // Select all text on focus for easy editing
    setTimeout(() => {
      inputRef.current?.select()
    }, 0)
  }, [])

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Arrow up: increment by 0.5
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const currentValue = value ?? 0
        const newValue = Math.min(currentValue + 0.5, GRADE_RANGE.max)
        onChange(newValue)
        setInputValue(formatGrade(newValue))
      }
      // Arrow down: decrement by 0.5
      else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const currentValue = value ?? 0
        const newValue = Math.max(currentValue - 0.5, GRADE_RANGE.min)
        onChange(newValue)
        setInputValue(formatGrade(newValue))
      }
      // Enter: blur to save
      else if (e.key === 'Enter') {
        inputRef.current?.blur()
      }
      // Escape: reset to previous value
      else if (e.key === 'Escape') {
        setInputValue(value !== null ? formatGrade(value) : '')
        setLocalError(null)
        inputRef.current?.blur()
      }
    },
    [value, onChange]
  )

  const displayError = error || localError

  return (
    <div className="relative inline-block">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel || 'Nota (0-10)'}
        aria-invalid={!!displayError}
        aria-describedby={displayError ? `${id}-error` : undefined}
        className={cn(
          // Base styles
          SIZE_CLASSES[size],
          'text-center font-medium',
          'transition-all duration-200',
          // Color coding based on grade
          showColor && gradeColor && !disabled && [
            colorClasses?.bg,
            colorClasses?.border,
            colorClasses?.text,
            'border-2',
          ],
          // Error state
          displayError && 'border-red-500 focus:ring-red-500',
          // Disabled state
          disabled && 'bg-gray-100 text-gray-400 cursor-not-allowed',
          // Custom classes
          className
        )}
      />
      {displayError && (
        <p
          id={`${id}-error`}
          className="absolute -bottom-5 left-0 text-xs text-red-500 whitespace-nowrap"
          role="alert"
        >
          {displayError}
        </p>
      )}
    </div>
  )
}

/**
 * GradeDisplay - Read-only display of a grade with color coding
 */
export function GradeDisplay({
  value,
  size = 'md',
  showColor = true,
  className = '',
}: {
  value: number | null
  size?: 'sm' | 'md' | 'lg'
  showColor?: boolean
  className?: string
}) {
  const gradeColor: GradeColor | null = value !== null ? getGradeColor(value) : null
  const colorClasses = gradeColor ? GRADE_COLOR_CLASSES[gradeColor] : null

  const sizeClasses = {
    sm: 'h-8 min-w-[40px] text-sm px-2',
    md: 'h-10 min-w-[48px] text-base px-3',
    lg: 'h-12 min-w-[56px] text-lg px-4',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        sizeClasses[size],
        showColor && gradeColor && [
          colorClasses?.bg,
          colorClasses?.border,
          colorClasses?.text,
          'border-2',
        ],
        !gradeColor && 'bg-gray-100 text-gray-500 border border-gray-200',
        className
      )}
    >
      {value !== null ? formatGrade(value) : '-'}
    </div>
  )
}

/**
 * AverageDisplay - Display of calculated average with special styling
 */
export function AverageDisplay({
  value,
  label = 'Media',
  size = 'md',
  showColor = true,
  className = '',
}: {
  value: number | null
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showColor?: boolean
  className?: string
}) {
  const gradeColor: GradeColor | null = value !== null ? getGradeColor(value) : null
  const colorClasses = gradeColor ? GRADE_COLOR_CLASSES[gradeColor] : null

  const sizeClasses = {
    sm: 'h-8 min-w-[60px] text-sm px-2',
    md: 'h-10 min-w-[70px] text-base px-3',
    lg: 'h-12 min-w-[80px] text-lg px-4',
  }

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center rounded-md font-bold',
        sizeClasses[size],
        showColor && gradeColor && [
          colorClasses?.bg,
          colorClasses?.border,
          colorClasses?.text,
          'border-2',
        ],
        !gradeColor && 'bg-gray-100 text-gray-500 border border-gray-200',
        className
      )}
      title={label}
    >
      <span className="text-xs font-normal opacity-70">{label}</span>
      <span>{value !== null ? formatGrade(value) : '-'}</span>
    </div>
  )
}

export default GradeInput
