/**
 * VivenciasTimeline Component
 * Groups and displays observations by date in timeline format
 *
 * Features:
 * - Group vivencias by day or week
 * - Date headers in Portuguese (e.g., "Segunda, 17 de Janeiro")
 * - VivenciaCards under each date section
 * - Empty state message when no observations
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-02-PLAN.md
 */

'use client'

import * as React from 'react'
import { format, parseISO, startOfWeek, isSameWeek, getWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { FileText } from 'lucide-react'

// Components
import { VivenciaCard } from './VivenciaCard'

// Types
import { type Vivencia } from '@/types/diario-infantil'

// ============================================================================
// Types
// ============================================================================

export interface VivenciasTimelineProps {
  /** Array of vivencias to display */
  vivencias: Vivencia[]
  /** Group by day or week */
  groupBy?: 'day' | 'week'
  /** Edit vivencia callback */
  onEditVivencia?: (vivencia: Vivencia) => void
  /** Delete vivencia callback */
  onDeleteVivencia?: (vivencia: Vivencia) => void
  /** Additional class name */
  className?: string
}

interface VivenciaGroup {
  key: string
  label: string
  dateRange?: string
  vivencias: Vivencia[]
}

// ============================================================================
// Component
// ============================================================================

export function VivenciasTimeline({
  vivencias,
  groupBy = 'day',
  onEditVivencia,
  onDeleteVivencia,
  className,
}: VivenciasTimelineProps) {
  // Group vivencias by date
  const groups = React.useMemo(() => {
    if (groupBy === 'week') {
      return groupByWeek(vivencias)
    }
    return groupByDay(vivencias)
  }, [vivencias, groupBy])

  // Empty state
  if (vivencias.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}>
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Nenhuma vivencia registrada
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          As vivencias registradas para este aluno aparecerao aqui, organizadas por data.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          {/* Date header */}
          <div className="sticky top-0 bg-gradient-to-b from-white via-white to-transparent pb-2 z-10">
            <h3 className="text-sm font-semibold text-foreground">
              {group.label}
            </h3>
            {group.dateRange && (
              <p className="text-xs text-muted-foreground">{group.dateRange}</p>
            )}
          </div>

          {/* Vivencia cards */}
          <div className="space-y-3 pl-4 border-l-2 border-gray-100">
            {group.vivencias.map((vivencia) => (
              <VivenciaCard
                key={vivencia.id}
                vivencia={vivencia}
                showDate={groupBy === 'week'} // Show date in card when grouping by week
                onEdit={onEditVivencia ? () => onEditVivencia(vivencia) : undefined}
                onDelete={onDeleteVivencia ? () => onDeleteVivencia(vivencia) : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ============================================================================
// Grouping Functions
// ============================================================================

/**
 * Group vivencias by day
 */
function groupByDay(vivencias: Vivencia[]): VivenciaGroup[] {
  const groups = new Map<string, Vivencia[]>()

  // Sort vivencias by date (newest first)
  const sorted = [...vivencias].sort((a, b) =>
    b.data_vivencia.localeCompare(a.data_vivencia)
  )

  sorted.forEach((v) => {
    const key = v.data_vivencia
    const existing = groups.get(key) || []
    groups.set(key, [...existing, v])
  })

  return Array.from(groups.entries()).map(([dateStr, vivs]) => ({
    key: dateStr,
    label: formatDayHeader(dateStr),
    vivencias: vivs,
  }))
}

/**
 * Group vivencias by week
 */
function groupByWeek(vivencias: Vivencia[]): VivenciaGroup[] {
  const groups = new Map<string, { vivencias: Vivencia[]; startDate: Date }>()

  // Sort vivencias by date (newest first)
  const sorted = [...vivencias].sort((a, b) =>
    b.data_vivencia.localeCompare(a.data_vivencia)
  )

  sorted.forEach((v) => {
    const date = parseISO(v.data_vivencia)
    const weekStart = startOfWeek(date, { locale: ptBR })
    const key = format(weekStart, 'yyyy-MM-dd')

    const existing = groups.get(key) || { vivencias: [], startDate: weekStart }
    groups.set(key, {
      vivencias: [...existing.vivencias, v],
      startDate: weekStart,
    })
  })

  return Array.from(groups.entries()).map(([key, { vivencias: vivs, startDate }]) => ({
    key,
    label: formatWeekHeader(startDate),
    dateRange: formatWeekRange(startDate),
    vivencias: vivs,
  }))
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format day header (e.g., "Segunda, 17 de Janeiro")
 */
function formatDayHeader(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
      // Capitalize first letter
      .replace(/^./, (str) => str.toUpperCase())
  } catch {
    return dateStr
  }
}

/**
 * Format week header (e.g., "Semana 3 - Janeiro")
 */
function formatWeekHeader(startDate: Date): string {
  const weekNum = getWeek(startDate, { locale: ptBR })
  const month = format(startDate, 'MMMM', { locale: ptBR })
    .replace(/^./, (str) => str.toUpperCase())
  return `Semana ${weekNum} - ${month}`
}

/**
 * Format week date range (e.g., "13/01 - 19/01")
 */
function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  return `${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM')}`
}

export default VivenciasTimeline
