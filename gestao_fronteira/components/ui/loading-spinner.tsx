/**
 * Loading Spinner Component
 * Task 5.3.2: Add loading spinners with subtle animations
 *
 * Provides consistent loading indicators across the application.
 * Includes various sizes and variants for different contexts.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="status" for screen readers
 * - aria-label descriptions
 * - Reduced motion support via prefers-reduced-motion
 */

'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type SpinnerVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize
  /** Color variant */
  variant?: SpinnerVariant
  /** Custom label for screen readers */
  label?: string
  /** Additional class names */
  className?: string
  /** Center the spinner in its container */
  centered?: boolean
}

// ============================================================================
// Size Configuration
// ============================================================================

const SIZE_CONFIG: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
}

// ============================================================================
// Variant Configuration
// ============================================================================

const VARIANT_CONFIG: Record<SpinnerVariant, string> = {
  default: 'text-gray-500',
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-amber-500',
  error: 'text-red-600',
}

// ============================================================================
// Component
// ============================================================================

/**
 * Simple spinning loader icon
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  label = 'Carregando...',
  className,
  centered = false,
}: LoadingSpinnerProps) {
  const content = (
    <Loader2
      className={cn(
        SIZE_CONFIG[size],
        VARIANT_CONFIG[variant],
        // Animation with reduced motion support
        'animate-spin',
        'motion-reduce:animate-[spin_1.5s_linear_infinite]',
        className
      )}
      aria-hidden="true"
    />
  )

  if (centered) {
    return (
      <div
        className="flex items-center justify-center"
        role="status"
        aria-label={label}
      >
        {content}
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  return (
    <div role="status" aria-label={label} className="inline-flex">
      {content}
      <span className="sr-only">{label}</span>
    </div>
  )
}

// ============================================================================
// Full Page Loading Overlay
// ============================================================================

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible?: boolean
  /** Loading message */
  message?: string
  /** Size of the spinner */
  size?: SpinnerSize
  /** Whether to show backdrop blur */
  blur?: boolean
}

/**
 * Full page loading overlay with backdrop
 */
export function LoadingOverlay({
  visible = true,
  message = 'Carregando...',
  size = 'lg',
  blur = true,
}: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'flex flex-col items-center justify-center',
        'bg-white/80',
        blur && 'backdrop-blur-sm',
        // Animation
        'animate-in fade-in duration-200'
      )}
      role="status"
      aria-label={message}
    >
      <LoadingSpinner size={size} variant="primary" />
      <p className="mt-4 text-sm text-gray-600 font-medium">{message}</p>
    </div>
  )
}

// ============================================================================
// Inline Loading State
// ============================================================================

interface LoadingInlineProps {
  /** Loading message */
  message?: string
  /** Size of the spinner */
  size?: SpinnerSize
  /** Color variant */
  variant?: SpinnerVariant
  /** Additional class names */
  className?: string
}

/**
 * Inline loading indicator with text
 */
export function LoadingInline({
  message = 'Carregando...',
  size = 'sm',
  variant = 'default',
  className,
}: LoadingInlineProps) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="status"
      aria-label={message}
    >
      <LoadingSpinner size={size} variant={variant} />
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  )
}

// ============================================================================
// Button Loading State
// ============================================================================

interface ButtonLoadingProps {
  /** Loading message */
  message?: string
  /** Size of the spinner (matches button size) */
  size?: 'sm' | 'md'
}

/**
 * Loading indicator for inside buttons
 */
export function ButtonLoading({
  message = 'Salvando...',
  size = 'sm',
}: ButtonLoadingProps) {
  return (
    <>
      <Loader2
        className={cn(
          'animate-spin mr-2',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
        )}
        aria-hidden="true"
      />
      <span>{message}</span>
    </>
  )
}

// ============================================================================
// Card Loading Skeleton
// ============================================================================

interface LoadingCardProps {
  /** Number of lines to show */
  lines?: number
  /** Whether to show avatar placeholder */
  showAvatar?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Loading skeleton for card content
 */
export function LoadingCard({
  lines = 3,
  showAvatar = false,
  className,
}: LoadingCardProps) {
  return (
    <div
      className={cn('animate-pulse', className)}
      role="status"
      aria-label="Carregando conteudo..."
    >
      <div className="flex gap-3">
        {showAvatar && (
          <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0" />
        )}
        <div className="flex-1 space-y-3">
          {/* Title line */}
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          {/* Content lines */}
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <div
              key={i}
              className="h-3 bg-gray-200 rounded"
              style={{ width: `${100 - (i + 1) * 15}%` }}
            />
          ))}
        </div>
      </div>
      <span className="sr-only">Carregando conteudo...</span>
    </div>
  )
}

// ============================================================================
// Table Loading Skeleton
// ============================================================================

interface LoadingTableProps {
  /** Number of rows */
  rows?: number
  /** Number of columns */
  columns?: number
  /** Additional class names */
  className?: string
}

/**
 * Loading skeleton for table content
 */
export function LoadingTable({
  rows = 5,
  columns = 4,
  className,
}: LoadingTableProps) {
  return (
    <div
      className={cn('animate-pulse', className)}
      role="status"
      aria-label="Carregando tabela..."
    >
      {/* Header */}
      <div className="flex gap-4 p-3 bg-gray-50 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 bg-gray-300 rounded flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 p-3 border-b"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 bg-gray-200 rounded flex-1"
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Carregando tabela...</span>
    </div>
  )
}

// ============================================================================
// Progress Indicator
// ============================================================================

interface LoadingProgressProps {
  /** Progress percentage (0-100) */
  progress?: number
  /** Progress message */
  message?: string
  /** Whether progress is indeterminate */
  indeterminate?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Progress bar loading indicator
 */
export function LoadingProgress({
  progress = 0,
  message,
  indeterminate = false,
  className,
}: LoadingProgressProps) {
  return (
    <div
      className={cn('w-full', className)}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={message || `Progresso: ${progress}%`}
    >
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full bg-blue-600 rounded-full',
            'transition-all duration-300 ease-out',
            indeterminate && 'animate-[progress_1.5s_ease-in-out_infinite] w-1/3'
          )}
          style={indeterminate ? {} : { width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {message && (
        <p className="mt-2 text-sm text-gray-600 text-center">{message}</p>
      )}
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default LoadingSpinner
