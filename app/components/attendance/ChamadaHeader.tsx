/**
 * ChamadaHeader Component
 * Header with turma info, stats, and save button for chamada page
 *
 * @see .planning/phases/04-turmas-chamada/04-02-PLAN.md
 */

'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Lock, Save } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface ChamadaHeaderProps {
  turma: {
    nome: string
    serie: string
    escola: { nome: string }
  }
  date: Date
  studentCount: number
  presentCount: number
  hasUnsavedChanges: boolean
  isLocked: boolean
  lockReason?: string | null
  onSave: () => void
  isSaving: boolean
}

// ============================================================================
// Component
// ============================================================================

export function ChamadaHeader({
  turma,
  date,
  studentCount,
  presentCount,
  hasUnsavedChanges,
  isLocked,
  lockReason,
  onSave,
  isSaving,
}: ChamadaHeaderProps) {
  const attendanceRate = studentCount > 0
    ? Math.round((presentCount / studentCount) * 100)
    : 0

  return (
    <div className="space-y-3">
      {/* Unsaved changes warning */}
      {hasUnsavedChanges && !isLocked && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">Alteracoes nao salvas</span>
        </div>
      )}

      {/* Main header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Turma info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{turma.nome}</h1>
            {isLocked && (
              <Badge variant="secondary" className="gap-1" title={lockReason || undefined}>
                <Lock className="h-3 w-3" />
                Travada
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {turma.serie} - {turma.escola.nome}
          </p>
        </div>

        {/* Right: Stats + Save button */}
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">
              {presentCount}/{studentCount}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                presentes
              </span>
            </p>
            <p className={cn(
              "text-sm font-medium tabular-nums",
              attendanceRate >= 75 && "text-green-600",
              attendanceRate >= 60 && attendanceRate < 75 && "text-amber-600",
              attendanceRate < 60 && "text-red-600"
            )}>
              {attendanceRate}% frequencia
            </p>
          </div>

          {/* Save button */}
          <Button
            onClick={onSave}
            disabled={!hasUnsavedChanges || isLocked || isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChamadaHeader
