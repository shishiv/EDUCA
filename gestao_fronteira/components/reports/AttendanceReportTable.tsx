/**
 * AttendanceReportTable Component - Attendance Report Table
 * Task Group 4.1.3: AttendanceReportTable component
 * OpenSpec Change: 2025-12-04-diario-de-classe
 *
 * Features:
 * - Table with: student name, presences, absences, attestados, percentage
 * - Column sorting
 * - Highlight for at-risk students (< 80%)
 * - Responsive design
 * - Print-optimized layout
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 * @see lib/reports/attendance-reports.ts
 */

'use client'

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Users,
  UserX,
  Printer,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusPresenca } from '@/types/diario-classe'

// ============================================================================
// TYPES
// ============================================================================

export interface AttendanceTableRow {
  matriculaId: string
  alunoId: string
  nome: string
  nis?: string | null
  presencas: number
  faltas: number
  atestados: number
  totalAulas: number
  percentual: number
  emRisco?: boolean
}

export interface AttendanceReportTableProps {
  /** List of students with attendance data */
  data: AttendanceTableRow[]
  /** Class/turma name for the header */
  turmaName?: string
  /** Period description */
  periodoLabel?: string
  /** Risk threshold percentage (default: 80) */
  riskThreshold?: number
  /** Whether the table is loading */
  isLoading?: boolean
  /** Whether to show NIS column (for Bolsa Família) */
  showNis?: boolean
  /** Whether to show print-optimized layout */
  printMode?: boolean
  /** Callback when row is clicked */
  onRowClick?: (row: AttendanceTableRow) => void
  /** Callback for print action */
  onPrint?: () => void
  /** Callback for PDF export */
  onExportPDF?: () => void
  /** CSS class for the container */
  className?: string
}

type SortField = 'nome' | 'presencas' | 'faltas' | 'atestados' | 'percentual'
type SortDirection = 'asc' | 'desc'

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RISK_THRESHOLD = 80
const CRITICAL_THRESHOLD = 75

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get badge variant based on attendance percentage
 */
function getAttendanceBadgeClass(percentual: number, threshold: number): string {
  if (percentual >= threshold) {
    return 'bg-green-100 text-green-800 border-green-300'
  }
  if (percentual >= CRITICAL_THRESHOLD) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }
  return 'bg-red-100 text-red-800 border-red-300'
}

/**
 * Get row highlight class based on risk status
 */
function getRowClass(percentual: number, threshold: number): string {
  if (percentual < CRITICAL_THRESHOLD) {
    return 'bg-red-50 hover:bg-red-100'
  }
  if (percentual < threshold) {
    return 'bg-yellow-50 hover:bg-yellow-100'
  }
  return 'hover:bg-gray-50'
}

/**
 * Format percentage for display
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Sort header button
 */
function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string
  field: SortField
  currentSort: SortField
  currentDirection: SortDirection
  onSort: (field: SortField) => void
}) {
  const isActive = currentSort === field

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 font-semibold -ml-2"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        currentDirection === 'asc' ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400" />
      )}
    </Button>
  )
}

/**
 * Summary statistics bar
 */
function SummaryBar({
  data,
  riskThreshold,
}: {
  data: AttendanceTableRow[]
  riskThreshold: number
}) {
  const stats = useMemo(() => {
    const total = data.length
    const atRisk = data.filter((row) => row.percentual < riskThreshold).length
    const critical = data.filter((row) => row.percentual < CRITICAL_THRESHOLD).length
    const healthy = total - atRisk

    const avgAttendance =
      total > 0
        ? Math.round(data.reduce((sum, row) => sum + row.percentual, 0) / total)
        : 0

    return { total, atRisk, critical, healthy, avgAttendance }
  }, [data, riskThreshold])

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 print:grid-cols-5 print:gap-2">
      <div className="p-3 bg-blue-50 rounded-lg text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Users className="h-4 w-4 text-blue-600" />
        </div>
        <div className="text-xl font-bold text-blue-700">{stats.total}</div>
        <div className="text-xs text-blue-600">Total de Alunos</div>
      </div>

      <div className="p-3 bg-green-50 rounded-lg text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </div>
        <div className="text-xl font-bold text-green-700">{stats.healthy}</div>
        <div className="text-xs text-green-600">Frequencia OK</div>
      </div>

      <div className="p-3 bg-yellow-50 rounded-lg text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        </div>
        <div className="text-xl font-bold text-yellow-700">{stats.atRisk - stats.critical}</div>
        <div className="text-xs text-yellow-600">Em Alerta</div>
      </div>

      <div className="p-3 bg-red-50 rounded-lg text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <UserX className="h-4 w-4 text-red-600" />
        </div>
        <div className="text-xl font-bold text-red-700">{stats.critical}</div>
        <div className="text-xs text-red-600">Critico (&lt;75%)</div>
      </div>

      <div
        className={cn(
          'p-3 rounded-lg text-center',
          stats.avgAttendance >= riskThreshold
            ? 'bg-green-100'
            : stats.avgAttendance >= CRITICAL_THRESHOLD
              ? 'bg-yellow-100'
              : 'bg-red-100'
        )}
      >
        <div className="text-xl font-bold">
          {formatPercentage(stats.avgAttendance)}
        </div>
        <div className="text-xs">Media da Turma</div>
      </div>
    </div>
  )
}

/**
 * Loading skeleton
 */
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-500">
      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p className="text-lg font-medium">Nenhum dado de frequencia</p>
      <p className="text-sm mt-1">
        Nao ha registros de frequencia para o periodo selecionado.
      </p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AttendanceReportTable - Attendance Report Table Component
 *
 * Displays a sortable table of student attendance data with
 * risk highlighting and summary statistics.
 */
export function AttendanceReportTable({
  data,
  turmaName,
  periodoLabel,
  riskThreshold = DEFAULT_RISK_THRESHOLD,
  isLoading = false,
  showNis = false,
  printMode = false,
  onRowClick,
  onPrint,
  onExportPDF,
  className,
}: AttendanceReportTableProps) {
  const [sortField, setSortField] = useState<SortField>('nome')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'nome':
          comparison = a.nome.localeCompare(b.nome, 'pt-BR')
          break
        case 'presencas':
          comparison = a.presencas - b.presencas
          break
        case 'faltas':
          comparison = a.faltas - b.faltas
          break
        case 'atestados':
          comparison = a.atestados - b.atestados
          break
        case 'percentual':
          comparison = a.percentual - b.percentual
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortField, sortDirection])

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handle print
  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  if (isLoading) {
    return <TableSkeleton rows={8} />
  }

  return (
    <Card className={cn('border-gray-200', className, printMode && 'print:border print:shadow-none')}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Relatorio de Frequencia
              {turmaName && (
                <Badge variant="outline" className="ml-2 font-normal">
                  {turmaName}
                </Badge>
              )}
            </CardTitle>
            {periodoLabel && (
              <CardDescription className="mt-1">
                Periodo: {periodoLabel}
              </CardDescription>
            )}
          </div>

          {/* Action buttons - hidden in print */}
          {!printMode && (
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              {onExportPDF && (
                <Button variant="outline" size="sm" onClick={onExportPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary Statistics */}
        <SummaryBar data={data} riskThreshold={riskThreshold} />

        {/* Table */}
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead className="min-w-[200px]">
                    <SortableHeader
                      label="Aluno"
                      field="nome"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {showNis && <TableHead className="w-32">NIS</TableHead>}
                  <TableHead className="text-center w-24">
                    <SortableHeader
                      label="Presencas"
                      field="presencas"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-center w-20">
                    <SortableHeader
                      label="Faltas"
                      field="faltas"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-center w-24">
                    <SortableHeader
                      label="Atestados"
                      field="atestados"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-center w-20">Total</TableHead>
                  <TableHead className="text-center w-28">
                    <SortableHeader
                      label="Frequencia"
                      field="percentual"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-center w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, index) => {
                  const isAtRisk = row.percentual < riskThreshold
                  const isCritical = row.percentual < CRITICAL_THRESHOLD

                  return (
                    <TableRow
                      key={row.matriculaId}
                      className={cn(
                        getRowClass(row.percentual, riskThreshold),
                        onRowClick && 'cursor-pointer'
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      <TableCell className="text-gray-500 text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isCritical && (
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                          {row.nome}
                        </div>
                      </TableCell>
                      {showNis && (
                        <TableCell className="text-gray-600 font-mono text-sm">
                          {row.nis || '-'}
                        </TableCell>
                      )}
                      <TableCell className="text-center font-medium text-green-700">
                        {row.presencas}
                      </TableCell>
                      <TableCell className="text-center font-medium text-red-700">
                        {row.faltas}
                      </TableCell>
                      <TableCell className="text-center font-medium text-yellow-700">
                        {row.atestados}
                      </TableCell>
                      <TableCell className="text-center text-gray-600">
                        {row.totalAulas}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-semibold',
                            getAttendanceBadgeClass(row.percentual, riskThreshold)
                          )}
                        >
                          {formatPercentage(row.percentual)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {isCritical ? (
                          <Badge className="bg-red-500 text-white">Critico</Badge>
                        ) : isAtRisk ? (
                          <Badge className="bg-yellow-500 text-white">Alerta</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-white">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-4 pt-4 border-t print:text-[10px]">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-green-500" />
            <span>Frequencia OK ({'>='} {riskThreshold}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-yellow-500" />
            <span>Em Alerta ({CRITICAL_THRESHOLD}% - {riskThreshold}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-red-500" />
            <span>Critico ({'<'} {CRITICAL_THRESHOLD}%)</span>
          </div>
        </div>

        {/* Print footer */}
        {printMode && (
          <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t">
            <p>Documento gerado em {new Date().toLocaleDateString('pt-BR')} - Sistema de Gestao Escolar EDUCA</p>
            <p>Prefeitura Municipal de Fronteira/MG</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AttendanceReportTable
