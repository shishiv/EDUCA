/**
 * VivenciasReference Component
 * Sidebar component for referencing vivencias while writing reports
 *
 * Features:
 * - Filter tabs/buttons by Campo de Experiencia
 * - Compact vivencia cards with date, campos, description
 * - Click to expand full description in place
 * - Scrollable content area
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-03-PLAN.md
 */

'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'

// Components
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Types
import {
  type Vivencia,
  type CampoType,
  CAMPOS_EXPERIENCIA,
  getCampoBadgeVariant,
  getAllCampos,
} from '@/types/diario-infantil'

// ============================================================================
// Types
// ============================================================================

export interface VivenciasReferenceProps {
  /** List of vivencias to display */
  vivencias: Vivencia[]
  /** Currently selected campo filter (syncs with report writer) */
  selectedCampo?: CampoType | null
  /** Callback when filter changes */
  onFilterChange?: (campo: CampoType | null) => void
  /** Additional class name */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function VivenciasReference({
  vivencias,
  selectedCampo,
  onFilterChange,
  className,
}: VivenciasReferenceProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filter vivencias based on selected campo
  const filteredVivencias = useMemo(() => {
    if (!selectedCampo) return vivencias
    return vivencias.filter((v) =>
      v.campos_experiencia.includes(selectedCampo)
    )
  }, [vivencias, selectedCampo])

  // Group vivencias by date for display
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Vivencia[]>()
    filteredVivencias.forEach((v) => {
      const existing = groups.get(v.data_vivencia) || []
      groups.set(v.data_vivencia, [...existing, v])
    })
    // Sort by date descending
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredVivencias])

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleFilterClick = (campo: CampoType | null) => {
    onFilterChange?.(campo)
  }

  const campos = getAllCampos()

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white border-l border-gray-200',
        className
      )}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 space-y-3">
        {/* Title with count */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-600" />
            Vivencias Registradas
          </h3>
          <Badge variant="secondary" className="text-xs">
            {filteredVivencias.length}
          </Badge>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedCampo === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterClick(null)}
            className="h-7 text-xs"
          >
            Todos
          </Button>
          {campos.map((campo) => {
            const isSelected = selectedCampo === campo.key
            const count = vivencias.filter((v) =>
              v.campos_experiencia.includes(campo.key)
            ).length
            return (
              <Button
                key={campo.key}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterClick(campo.key)}
                className={cn(
                  'h-7 text-xs gap-1',
                  isSelected && 'ring-2 ring-offset-1',
                  isSelected && campo.key === 'eu' && 'ring-pink-400',
                  isSelected && campo.key === 'corpo' && 'ring-orange-400',
                  isSelected && campo.key === 'tracos' && 'ring-violet-400',
                  isSelected && campo.key === 'escuta' && 'ring-sky-400',
                  isSelected && campo.key === 'espacos' && 'ring-emerald-400'
                )}
                title={campo.name}
              >
                <span>{campo.emoji}</span>
                {count > 0 && (
                  <span className="text-[10px] opacity-70">({count})</span>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {groupedByDate.length === 0 ? (
            <EmptyState selectedCampo={selectedCampo} />
          ) : (
            groupedByDate.map(([date, dateVivencias]) => (
              <div key={date} className="space-y-2">
                {/* Date header */}
                <time
                  dateTime={date}
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  {formatShortDate(date)}
                </time>

                {/* Vivencia cards for this date */}
                <div className="space-y-2">
                  {dateVivencias.map((vivencia) => (
                    <CompactVivenciaCard
                      key={vivencia.id}
                      vivencia={vivencia}
                      isExpanded={expandedId === vivencia.id}
                      onToggleExpand={() => handleToggleExpand(vivencia.id)}
                      highlightCampo={selectedCampo}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// CompactVivenciaCard Sub-component
// ============================================================================

interface CompactVivenciaCardProps {
  vivencia: Vivencia
  isExpanded: boolean
  onToggleExpand: () => void
  highlightCampo?: CampoType | null
}

function CompactVivenciaCard({
  vivencia,
  isExpanded,
  onToggleExpand,
  highlightCampo,
}: CompactVivenciaCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-100 bg-gray-50/50 p-3',
        'transition-all duration-200',
        'hover:border-gray-200 hover:bg-white',
        isExpanded && 'border-gray-200 bg-white shadow-sm'
      )}
    >
      {/* Campo badges (small) */}
      <div className="flex flex-wrap gap-1 mb-2">
        {vivencia.campos_experiencia.map((campo) => (
          <SmallCampoBadge
            key={campo}
            campo={campo}
            isHighlighted={highlightCampo === campo}
          />
        ))}
      </div>

      {/* Description (truncated or full) */}
      <p
        className={cn(
          'text-sm text-foreground leading-relaxed',
          !isExpanded && 'line-clamp-2'
        )}
      >
        {vivencia.descricao}
      </p>

      {/* Expand/collapse button */}
      {vivencia.descricao.length > 100 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="mt-2 h-6 text-xs text-muted-foreground hover:text-foreground p-0"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Ver mais
            </>
          )}
        </Button>
      )}

      {/* Observations (if expanded and present) */}
      {isExpanded && vivencia.observacoes && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-muted-foreground italic">
            {vivencia.observacoes}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SmallCampoBadge Sub-component
// ============================================================================

interface SmallCampoBadgeProps {
  campo: CampoType
  isHighlighted?: boolean
}

function SmallCampoBadge({ campo, isHighlighted }: SmallCampoBadgeProps) {
  const config = CAMPOS_EXPERIENCIA[campo]
  const variant = getCampoBadgeVariant(campo) as
    | 'campo-eu'
    | 'campo-corpo'
    | 'campo-tracos'
    | 'campo-escuta'
    | 'campo-espacos'

  return (
    <Badge
      variant={variant}
      className={cn(
        'text-[10px] px-1.5 py-0 h-5',
        isHighlighted && 'ring-2 ring-offset-1 ring-current'
      )}
    >
      {config.emoji}
    </Badge>
  )
}

// ============================================================================
// EmptyState Sub-component
// ============================================================================

interface EmptyStateProps {
  selectedCampo?: CampoType | null
}

function EmptyState({ selectedCampo }: EmptyStateProps) {
  const campoName = selectedCampo
    ? CAMPOS_EXPERIENCIA[selectedCampo].shortName
    : null

  return (
    <div className="text-center py-8 text-muted-foreground">
      <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">
        {selectedCampo
          ? `Nenhuma vivencia registrada para "${campoName}"`
          : 'Nenhuma vivencia registrada'}
      </p>
      <p className="text-xs mt-1">
        Registre vivencias no Diario para usar como referencia
      </p>
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date for short display (e.g., "17 Jan")
 */
function formatShortDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return format(date, "d MMM", { locale: ptBR })
  } catch {
    return dateStr
  }
}

export default VivenciasReference
