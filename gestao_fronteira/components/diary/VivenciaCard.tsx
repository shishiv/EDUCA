/**
 * VivenciaCard Component
 * Displays a single child observation (vivencia) with campo badges
 *
 * Features:
 * - Date display (formatted in Portuguese)
 * - Campo de Experiencia colored badges
 * - Description text (truncated to 3 lines)
 * - Optional observations in smaller text
 * - Edit/Delete action buttons
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-02-PLAN.md
 */

'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Edit2, Trash2, MoreHorizontal } from 'lucide-react'

// Components
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Types
import {
  type Vivencia,
  type CampoType,
  CAMPOS_EXPERIENCIA,
  getCampoBadgeVariant,
} from '@/types/diario-infantil'

// ============================================================================
// Types
// ============================================================================

export interface VivenciaCardProps {
  /** The vivencia to display */
  vivencia: Vivencia
  /** Edit callback (shows edit button if provided) */
  onEdit?: () => void
  /** Delete callback (shows delete button if provided) */
  onDelete?: () => void
  /** Show date in card (for non-timeline views) */
  showDate?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function VivenciaCard({
  vivencia,
  onEdit,
  onDelete,
  showDate = true,
  className,
}: VivenciaCardProps) {
  const hasActions = onEdit || onDelete
  const formattedDate = formatDate(vivencia.data_vivencia)

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-4',
        'transition-all duration-200',
        'hover:shadow-md hover:shadow-black/[0.05] hover:border-gray-200',
        className
      )}
    >
      {/* Header: Date + Actions */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {showDate && (
          <time
            dateTime={vivencia.data_vivencia}
            className="text-sm text-muted-foreground"
          >
            {formattedDate}
          </time>
        )}

        {/* Actions dropdown */}
        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                aria-label="Opcoes"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Campo badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {vivencia.campos_experiencia.map((campo) => (
          <CampoBadge key={campo} campo={campo} />
        ))}
      </div>

      {/* Description (truncated to 3 lines) */}
      <p className="text-sm text-foreground line-clamp-3 leading-relaxed">
        {vivencia.descricao}
      </p>

      {/* Observations (if present) */}
      {vivencia.observacoes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-muted-foreground italic line-clamp-2">
            {vivencia.observacoes}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CampoBadge Sub-component
// ============================================================================

interface CampoBadgeProps {
  campo: CampoType
}

function CampoBadge({ campo }: CampoBadgeProps) {
  const config = CAMPOS_EXPERIENCIA[campo]
  const variant = getCampoBadgeVariant(campo) as
    | 'campo-eu'
    | 'campo-corpo'
    | 'campo-tracos'
    | 'campo-escuta'
    | 'campo-espacos'

  return (
    <Badge variant={variant} className="text-xs gap-1">
      <span>{config.emoji}</span>
      <span>{config.shortName}</span>
    </Badge>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date for display in Portuguese
 */
function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return format(date, "d 'de' MMMM", { locale: ptBR })
  } catch {
    return dateStr
  }
}

export default VivenciaCard
