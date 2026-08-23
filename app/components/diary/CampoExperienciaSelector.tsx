/**
 * CampoExperienciaSelector Component
 * Multi-select grid of 5 BNCC Campos de Experiencia cards
 *
 * Used in VivenciaForm to allow teachers to tag observations
 * with multiple experience fields.
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-02-PLAN.md
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import {
  CAMPOS_EXPERIENCIA,
  getAllCampos,
  type CampoType,
} from '@/types/diario-infantil'

// ============================================================================
// Types
// ============================================================================

export interface CampoExperienciaSelectorProps {
  /** Currently selected campos */
  selectedCampos: CampoType[]
  /** Callback when selection changes */
  onSelectionChange: (campos: CampoType[]) => void
  /** Disable all interactions */
  disabled?: boolean
  /** Additional class name */
  className?: string
  /** Show compact version (smaller cards) */
  compact?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function CampoExperienciaSelector({
  selectedCampos,
  onSelectionChange,
  disabled = false,
  className,
  compact = false,
}: CampoExperienciaSelectorProps) {
  const campos = getAllCampos()

  /**
   * Toggle a campo selection
   */
  const handleToggle = React.useCallback((campo: CampoType) => {
    if (disabled) return

    const isSelected = selectedCampos.includes(campo)
    if (isSelected) {
      // Remove from selection
      onSelectionChange(selectedCampos.filter(c => c !== campo))
    } else {
      // Add to selection
      onSelectionChange([...selectedCampos, campo])
    }
  }, [selectedCampos, onSelectionChange, disabled])

  /**
   * Handle keyboard interaction
   */
  const handleKeyDown = React.useCallback((
    e: React.KeyboardEvent,
    campo: CampoType
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle(campo)
    }
  }, [handleToggle])

  return (
    <div
      className={cn(
        // Responsive grid: 2 columns on mobile, 3 on tablet, 5 on desktop
        'grid gap-3',
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
        className
      )}
      role="group"
      aria-label="Selecione os Campos de Experiencia"
    >
      {campos.map((campo) => {
        const isSelected = selectedCampos.includes(campo.key)

        return (
          <CampoCard
            key={campo.key}
            campo={campo}
            isSelected={isSelected}
            disabled={disabled}
            compact={compact}
            onClick={() => handleToggle(campo.key)}
            onKeyDown={(e) => handleKeyDown(e, campo.key)}
          />
        )
      })}
    </div>
  )
}

// ============================================================================
// CampoCard Sub-component
// ============================================================================

interface CampoCardProps {
  campo: typeof CAMPOS_EXPERIENCIA[keyof typeof CAMPOS_EXPERIENCIA]
  isSelected: boolean
  disabled: boolean
  compact: boolean
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

function CampoCard({
  campo,
  isSelected,
  disabled,
  compact,
  onClick,
  onKeyDown,
}: CampoCardProps) {
  // Dynamic background based on campo
  const bgColorClass: Record<CampoType, string> = {
    eu: 'bg-pink-100',
    corpo: 'bg-orange-100',
    tracos: 'bg-violet-100',
    escuta: 'bg-sky-100',
    espacos: 'bg-emerald-100',
  }

  const ringColorClass: Record<CampoType, string> = {
    eu: 'ring-pink-500',
    corpo: 'ring-orange-500',
    tracos: 'ring-violet-500',
    escuta: 'ring-sky-500',
    espacos: 'ring-emerald-500',
  }

  const checkBgClass: Record<CampoType, string> = {
    eu: 'bg-pink-500',
    corpo: 'bg-orange-500',
    tracos: 'bg-violet-500',
    escuta: 'bg-sky-500',
    espacos: 'bg-emerald-500',
  }

  return (
    <div
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${campo.name} - ${campo.description}`}
      tabIndex={disabled ? -1 : 0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        // Base styles
        'relative rounded-2xl border-2 transition-all text-center',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        // Size based on compact mode
        compact ? 'p-3' : 'p-4 sm:p-5',
        // Background
        'bg-white',
        // Border color
        isSelected
          ? cn('border-transparent ring-2', ringColorClass[campo.key])
          : 'border-gray-100',
        // Interactive states
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.08]',
        // Focus ring color
        `focus-visible:${ringColorClass[campo.key]}`
      )}
    >
      {/* Selection checkmark overlay */}
      {isSelected && (
        <div
          className={cn(
            'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center',
            checkBgClass[campo.key]
          )}
        >
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Emoji icon */}
      <div
        className={cn(
          'mx-auto mb-2 rounded-xl flex items-center justify-center',
          bgColorClass[campo.key],
          compact ? 'w-10 h-10 text-xl' : 'w-14 h-14 text-2xl'
        )}
      >
        {campo.emoji}
      </div>

      {/* Title */}
      <h4
        className={cn(
          'font-display font-semibold text-gray-800 leading-tight',
          compact ? 'text-xs' : 'text-[0.85rem]'
        )}
      >
        {campo.shortName}
      </h4>

      {/* Description (only in non-compact mode) */}
      {!compact && (
        <p className="mt-1 text-[0.65rem] text-gray-500 line-clamp-2">
          {campo.description}
        </p>
      )}
    </div>
  )
}

export default CampoExperienciaSelector
