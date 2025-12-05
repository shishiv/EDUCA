/**
 * GradeGrid Component - Grade Entry Grid for Classes
 * Task 3.1.5: Create grid for grade entry
 *
 * Features:
 * - Rows: students in the class
 * - Columns: 4 bimesters + average
 * - Inline editing
 * - Automatic average calculation
 * - Touch-friendly design for tablets
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 * @see types/grades.ts for Grade types
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Save, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GradeInput, GradeDisplay, AverageDisplay } from './GradeInput'
import {
  type GradeGridRow,
  type Bimester,
  formatGrade,
  getGradeColor,
  roundGrade,
  BIMESTER_OPTIONS,
  getDisciplineName,
} from '@/types/grades'

// ============================================================================
// TYPES
// ============================================================================

export interface GradeGridProps {
  /** Class ID (turma_id) */
  turmaId: string
  /** Class name for display */
  turmaNome: string
  /** Discipline code */
  disciplina: string
  /** Academic year */
  anoLetivo: number
  /** Grid rows (students with grades) */
  rows: GradeGridRow[]
  /** Whether the grid is loading */
  isLoading?: boolean
  /** Whether the grid is read-only */
  readOnly?: boolean
  /** Callback when a grade changes */
  onGradeChange?: (
    matriculaId: string,
    bimestre: Bimester,
    nota: number | null,
    gradeId: string | null
  ) => void
  /** Callback to save all changes */
  onSave?: () => void
  /** Whether there are unsaved changes */
  hasUnsavedChanges?: boolean
  /** Save in progress */
  isSaving?: boolean
  /** Error message */
  error?: string | null
}

export interface GradeChange {
  matriculaId: string
  bimestre: Bimester
  nota: number | null
  gradeId: string | null
  isNew: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate average from bimester grades
 */
function calculateRowAverage(row: GradeGridRow): number | null {
  const grades = [row.bimestre1, row.bimestre2, row.bimestre3, row.bimestre4].filter(
    (g): g is number => g !== null
  )

  if (grades.length === 0) return null

  const sum = grades.reduce((acc, g) => acc + g, 0)
  return roundGrade(sum / grades.length)
}

/**
 * Get bimester value from row
 */
function getBimesterValue(row: GradeGridRow, bimestre: Bimester): number | null {
  switch (bimestre) {
    case 1:
      return row.bimestre1
    case 2:
      return row.bimestre2
    case 3:
      return row.bimestre3
    case 4:
      return row.bimestre4
    default:
      return null
  }
}

/**
 * Get grade ID from row
 */
function getGradeId(row: GradeGridRow, bimestre: Bimester): string | null {
  switch (bimestre) {
    case 1:
      return row.gradeIds.bimestre1
    case 2:
      return row.gradeIds.bimestre2
    case 3:
      return row.gradeIds.bimestre3
    case 4:
      return row.gradeIds.bimestre4
    default:
      return null
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Header row for the grade grid
 */
function GradeGridHeader() {
  return (
    <div className="grid grid-cols-[1fr,repeat(5,80px)] gap-2 px-4 py-3 bg-gray-50 border-b font-medium text-sm text-gray-700">
      <div>Aluno</div>
      {BIMESTER_OPTIONS.map((opt) => (
        <div key={opt.value} className="text-center">
          {opt.value}o Bim
        </div>
      ))}
      <div className="text-center font-bold">Media</div>
    </div>
  )
}

/**
 * Single row in the grade grid
 */
function GradeGridRowComponent({
  row,
  readOnly,
  onGradeChange,
}: {
  row: GradeGridRow
  readOnly: boolean
  onGradeChange?: (bimestre: Bimester, nota: number | null) => void
}) {
  const average = useMemo(() => calculateRowAverage(row), [row])

  return (
    <div className="grid grid-cols-[1fr,repeat(5,80px)] gap-2 px-4 py-2 border-b hover:bg-gray-50 items-center min-h-[52px]">
      {/* Student name */}
      <div className="flex items-center gap-2">
        {row.aluno_numero && (
          <span className="text-xs text-gray-400 w-5">{row.aluno_numero}.</span>
        )}
        <span className="text-sm font-medium truncate" title={row.aluno_nome}>
          {row.aluno_nome}
        </span>
      </div>

      {/* Bimester grades */}
      {([1, 2, 3, 4] as Bimester[]).map((bimestre) => (
        <div key={bimestre} className="flex justify-center">
          {readOnly ? (
            <GradeDisplay
              value={getBimesterValue(row, bimestre)}
              size="sm"
              showColor
            />
          ) : (
            <GradeInput
              value={getBimesterValue(row, bimestre)}
              onChange={(nota) => onGradeChange?.(bimestre, nota)}
              size="sm"
              showColor
              ariaLabel={`Nota ${row.aluno_nome} ${bimestre}o Bimestre`}
            />
          )}
        </div>
      ))}

      {/* Average */}
      <div className="flex justify-center">
        <AverageDisplay value={average} size="sm" showColor label="" />
      </div>
    </div>
  )
}

/**
 * Loading skeleton for the grid
 */
function GradeGridSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <div className="space-y-0">
      <GradeGridHeader />
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr,repeat(5,80px)] gap-2 px-4 py-2 border-b items-center"
        >
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-8 w-16 mx-auto" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state when no students
 */
function GradeGridEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <AlertCircle className="h-12 w-12 mb-4 text-gray-300" />
      <p className="text-lg font-medium">Nenhum aluno matriculado</p>
      <p className="text-sm">Nao ha alunos nesta turma para lancar notas</p>
    </div>
  )
}

/**
 * Stats summary row
 */
function GradeGridStats({ rows }: { rows: GradeGridRow[] }) {
  const stats = useMemo(() => {
    const total = rows.length
    const withGrades = rows.filter((r) => calculateRowAverage(r) !== null).length
    const passing = rows.filter((r) => {
      const avg = calculateRowAverage(r)
      return avg !== null && avg >= 7
    }).length
    const failing = rows.filter((r) => {
      const avg = calculateRowAverage(r)
      return avg !== null && avg < 5
    }).length

    return { total, withGrades, passing, failing }
  }, [rows])

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-gray-50 border-t text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Total:</span>
        <span className="font-medium">{stats.total} alunos</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Com notas:</span>
        <span className="font-medium">{stats.withGrades}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-green-500" />
        <span className="text-gray-500">Aprovados:</span>
        <span className="font-medium text-green-700">{stats.passing}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-red-500" />
        <span className="text-gray-500">Reprovados:</span>
        <span className="font-medium text-red-700">{stats.failing}</span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * GradeGrid - Main component for grade entry
 *
 * Displays a grid of students and their grades for a specific
 * discipline, with inline editing and automatic average calculation.
 */
export function GradeGrid({
  turmaId,
  turmaNome,
  disciplina,
  anoLetivo,
  rows,
  isLoading = false,
  readOnly = false,
  onGradeChange,
  onSave,
  hasUnsavedChanges = false,
  isSaving = false,
  error = null,
}: GradeGridProps) {
  // Local state for optimistic updates
  const [localRows, setLocalRows] = useState<GradeGridRow[]>(rows)

  // Sync with external rows
  React.useEffect(() => {
    setLocalRows(rows)
  }, [rows])

  /**
   * Handle grade change for a specific student and bimester
   */
  const handleGradeChange = useCallback(
    (matriculaId: string, bimestre: Bimester, nota: number | null) => {
      // Update local state optimistically
      setLocalRows((prevRows) =>
        prevRows.map((row) => {
          if (row.matricula_id !== matriculaId) return row

          const newRow = { ...row }
          switch (bimestre) {
            case 1:
              newRow.bimestre1 = nota
              break
            case 2:
              newRow.bimestre2 = nota
              break
            case 3:
              newRow.bimestre3 = nota
              break
            case 4:
              newRow.bimestre4 = nota
              break
          }
          // Recalculate average
          newRow.media = calculateRowAverage(newRow)
          return newRow
        })
      )

      // Find the grade ID for this cell
      const row = rows.find((r) => r.matricula_id === matriculaId)
      const gradeId = row ? getGradeId(row, bimestre) : null

      // Notify parent
      onGradeChange?.(matriculaId, bimestre, nota, gradeId)
    },
    [rows, onGradeChange]
  )

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Lancamento de Notas
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {turmaNome} - {getDisciplineName(disciplina)} - {anoLetivo}
            </p>
          </div>

          {/* Save button */}
          {!readOnly && onSave && (
            <Button
              onClick={onSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={cn(
                'gap-2',
                hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700' : ''
              )}
            >
              {isSaving ? (
                <>
                  <span className="animate-spin">
                    <Save className="h-4 w-4" />
                  </span>
                  Salvando...
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Notas
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvo
                </>
              )}
            </Button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <GradeGridSkeleton rowCount={5} />
        ) : localRows.length === 0 ? (
          <GradeGridEmpty />
        ) : (
          <>
            {/* Grid header */}
            <GradeGridHeader />

            {/* Grid rows */}
            <div className="max-h-[500px] overflow-y-auto">
              {localRows.map((row) => (
                <GradeGridRowComponent
                  key={row.matricula_id}
                  row={row}
                  readOnly={readOnly}
                  onGradeChange={(bimestre, nota) =>
                    handleGradeChange(row.matricula_id, bimestre, nota)
                  }
                />
              ))}
            </div>

            {/* Stats row */}
            <GradeGridStats rows={localRows} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default GradeGrid
