/**
 * ChamadaHeader Component
 * Header with turma info, stats, and save button for chamada page
 *
 * @see .planning/phases/04-turmas-chamada/04-02-PLAN.md
 */

'use client'

import { useClassroomTranslations } from '@/i18n/classroom'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Lock, Save } from 'lucide-react'
import { getFrequencyPolicyStatus, type AttendanceBands } from '@/lib/attendance/attendance-policy'

// ============================================================================
// Types
// ============================================================================

export interface ChamadaHeaderProps {
  bands: AttendanceBands
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
  /** Close the open session and make its records immutable. */
  onClose?: () => void
  /** Prevent closing until the current draft is saved. */
  closeDisabled?: boolean
  /** Hide write controls for view-only actors. */
  canEdit?: boolean
}

function ChamadaActions({
  canEdit,
  onClose,
  closeDisabled,
  isSaving,
  onSave,
  hasUnsavedChanges,
  isLocked,
}: Pick<
  ChamadaHeaderProps,
  | 'canEdit'
  | 'onClose'
  | 'closeDisabled'
  | 'isSaving'
  | 'onSave'
  | 'hasUnsavedChanges'
  | 'isLocked'
>) {
  const t = useClassroomTranslations()
  if (!canEdit) return null
  return (
    <div className="flex items-center gap-2">
      {onClose ? (
        <Button variant="outline" onClick={onClose} disabled={closeDisabled || isSaving}>
          {t('attendance.close')}
        </Button>
      ) : null}
      <Button
        onClick={onSave}
        disabled={!hasUnsavedChanges || isLocked || isSaving}
        className="min-w-[120px]"
      >
        {isSaving ? <SavingLabel /> : <SaveLabel />}
      </Button>
    </div>
  )
}

function SavingLabel() {
  const t = useClassroomTranslations()
  return (
    <>
      <span className="animate-spin mr-2">
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </span>
      {t('attendance.saving')}
    </>
  )
}

function SaveLabel() {
  const t = useClassroomTranslations()
  return <><Save className="h-4 w-4 mr-2" />{t('attendance.save')}</>
}

function UnsavedWarning({ show }: { show: boolean }) {
  const t = useClassroomTranslations()
  if (!show) return null
  return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium">{t('attendance.unsaved')}</span>
    </div>
  )
}

function TurmaHeaderInfo({
  turma,
  isLocked,
  lockReason,
}: Pick<ChamadaHeaderProps, 'turma' | 'isLocked' | 'lockReason'>) {
  const t = useClassroomTranslations()
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-foreground">{turma.nome}</h1>
        {isLocked ? (
          <Badge variant="secondary" className="gap-1" title={lockReason || undefined}>
            <Lock className="h-3 w-3" />
            {t('attendance.locked')}
          </Badge>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{turma.serie} - {turma.escola.nome}</p>
    </div>
  )
}

function AttendanceRate({
  presentCount,
  studentCount,
  bands,
}: Pick<ChamadaHeaderProps, 'presentCount' | 'studentCount' | 'bands'>) {
  const t = useClassroomTranslations()
  const attendanceRate = studentCount > 0 ? Math.round((presentCount / studentCount) * 100) : 0
  const status = getFrequencyPolicyStatus(attendanceRate, bands)
  const color = status === 'CONFORME' ? 'text-green-600' : status === 'ATENCAO' ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="text-right">
      <p className="text-lg font-semibold tabular-nums">
        {presentCount}/{studentCount}
        <span className="text-sm font-normal text-muted-foreground ml-1">{t('attendance.presentCount')}</span>
      </p>
      <p className={cn('text-sm font-medium tabular-nums', color)}>{attendanceRate}% frequencia</p>
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

export function ChamadaHeader({
  bands,
  turma,
  studentCount,
  presentCount,
  hasUnsavedChanges,
  isLocked,
  lockReason,
  onSave,
  isSaving,
  onClose,
  closeDisabled = false,
  canEdit = true,
}: ChamadaHeaderProps) {
  return (
    <div className="space-y-3">
      <UnsavedWarning show={hasUnsavedChanges && !isLocked} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <TurmaHeaderInfo {...{ turma, isLocked, lockReason }} />
        <div className="flex items-center gap-4">
          <AttendanceRate {...{ presentCount, studentCount, bands }} />

          <ChamadaActions
            {...{ canEdit, onClose, closeDisabled, isSaving, onSave, hasUnsavedChanges, isLocked }}
          />
        </div>
      </div>
    </div>
  )
}

export default ChamadaHeader
