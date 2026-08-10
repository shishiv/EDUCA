/**
 * RiskAlert Component - Display students at risk of Bolsa Familia non-compliance
 * Task 1.4.3: Implement the canonical frequency policy alert
 *
 * Features:
 * - Highlight the canonical Bolsa Família compliance and municipal attention bands
 * - Red badge showing absence count
 * - Link to student details
 * - Visual distinction between preventive attention (80% to < 85%) and non-compliance (< 80%)
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see planning/visuals/frequencia.html
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, ExternalLink, UserX, FileWarning } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ATENCAO, CONFORMIDADE } from '@/lib/attendance/attendance-policy'

// ============================================================================
// Types
// ============================================================================

export interface StudentAtRisk {
  /** Student unique identifier */
  id: string
  /** Student full name */
  nome: string
  /** Student NIS (Numero de Identificacao Social) for Bolsa Familia */
  nis?: string | null
  /** Student's current attendance percentage */
  frequenciaPercentual: number
  /** Total absences count */
  totalFaltas: number
  /** Total excused absences (attestados) */
  totalAtestados?: number
  /** Matricula ID for linking */
  matriculaId?: string
  /** Turma name for display */
  turmaNome?: string
}

export interface RiskAlertProps {
  /** List of students below the canonical attention threshold */
  studentsAtRisk: StudentAtRisk[]
  /** Whether to show detailed information */
  showDetails?: boolean
  /** Custom title for the alert */
  title?: string
  /** Callback when a student is clicked */
  onStudentClick?: (student: StudentAtRisk) => void
  /** Whether the component is in loading state */
  loading?: boolean
  /** Whether to show link to student details */
  showStudentLink?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get risk level based on attendance percentage
 * - Critical: below the Bolsa Família compliance threshold
 * - Warning: preventive municipal attention below the attention threshold
 */
function getRiskLevel(percentage: number): 'critical' | 'warning' | 'safe' {
  if (percentage >= ATENCAO) return 'safe'
  if (percentage < CONFORMIDADE) return 'critical'
  return 'warning'
}

/**
 * Get badge styling based on risk level
 */
function getBadgeVariant(riskLevel: 'critical' | 'warning' | 'safe') {
  switch (riskLevel) {
    case 'critical':
      return 'destructive'
    case 'warning':
      return 'default' // Will use custom yellow styling
    default:
      return 'secondary'
  }
}

/**
 * Get icon based on risk level
 */
function getRiskIcon(riskLevel: 'critical' | 'warning' | 'safe') {
  switch (riskLevel) {
    case 'critical':
      return <AlertCircle className="h-4 w-4" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4" />
    default:
      return null
  }
}

// ============================================================================
// Component
// ============================================================================

export function RiskAlert({
  studentsAtRisk,
  showDetails = true,
  title = `Atenção de frequência (abaixo de ${ATENCAO}%)`,
  onStudentClick,
  loading = false,
  showStudentLink = true,
}: RiskAlertProps) {
  // Don't render if no students at risk
  if (!studentsAtRisk || studentsAtRisk.length === 0) {
    return null
  }

  // Sort students by attendance percentage (lowest first)
  const sortedStudents = [...studentsAtRisk].sort(
    (a, b) => a.frequenciaPercentual - b.frequenciaPercentual
  )

  // Count critical vs warning
  const criticalCount = sortedStudents.filter(s => s.frequenciaPercentual < CONFORMIDADE).length
  const warningCount = sortedStudents.filter(s => s.frequenciaPercentual >= CONFORMIDADE && s.frequenciaPercentual < ATENCAO).length

  return (
    <Alert
      variant="destructive"
      className={cn(
        'border-l-4',
        criticalCount > 0 ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-1 rounded',
          criticalCount > 0 ? 'bg-red-100' : 'bg-yellow-100'
        )}>
          {criticalCount > 0 ? (
            <AlertCircle className={cn('h-5 w-5', 'text-red-600')} />
          ) : (
            <AlertTriangle className={cn('h-5 w-5', 'text-yellow-600')} />
          )}
        </div>

        <div className="flex-1">
          <AlertTitle className={cn(
            'font-semibold mb-3',
            criticalCount > 0 ? 'text-red-900' : 'text-yellow-900'
          )}>
            {title}
          </AlertTitle>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <AlertDescription className="space-y-2">
              {/* Summary badges */}
              <div className="flex gap-2 mb-3">
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {criticalCount} critico{criticalCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge className="bg-yellow-500 hover:bg-yellow-500 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {warningCount} em atenção preventiva
                  </Badge>
                )}
              </div>

              {/* Student list */}
              <div className="space-y-2">
                {sortedStudents.map((student) => {
                  const riskLevel = getRiskLevel(student.frequenciaPercentual)
                  const isClickable = onStudentClick || showStudentLink

                  const StudentRow = (
                    <div
                      key={student.id}
                      className={cn(
                        'flex items-center justify-between py-2 px-3 rounded-md transition-colors',
                        riskLevel === 'critical' ? 'bg-red-100/50' : 'bg-yellow-100/50',
                        isClickable && 'cursor-pointer hover:bg-opacity-70'
                      )}
                      onClick={() => onStudentClick?.(student)}
                      role={isClickable ? 'button' : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <UserX className={cn(
                          'h-4 w-4',
                          riskLevel === 'critical' ? 'text-red-600' : 'text-yellow-600'
                        )} />
                        <div>
                          <span className={cn(
                            'font-medium text-sm',
                            riskLevel === 'critical' ? 'text-red-800' : 'text-yellow-800'
                          )}>
                            {student.nome}
                          </span>
                          <span className={cn(
                            'text-sm ml-2',
                            riskLevel === 'critical' ? 'text-red-700' : 'text-yellow-700'
                          )}>
                            - {student.frequenciaPercentual.toFixed(0)}%
                          </span>
                          {student.nis && (
                            <span className="text-xs text-gray-500 ml-2">
                              (NIS: {student.nis})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getBadgeVariant(riskLevel)}
                          className={cn(
                            'text-xs',
                            riskLevel === 'warning' && 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200'
                          )}
                        >
                          {getRiskIcon(riskLevel)}
                          <span className="ml-1">
                            {student.totalFaltas} falta{student.totalFaltas !== 1 ? 's' : ''}
                          </span>
                        </Badge>

                        {showStudentLink && (
                          <ExternalLink className={cn(
                            'h-4 w-4',
                            riskLevel === 'critical' ? 'text-red-500' : 'text-yellow-500'
                          )} />
                        )}
                      </div>
                    </div>
                  )

                  // Wrap with Link if showStudentLink is true and no custom onClick
                  if (showStudentLink && !onStudentClick && student.matriculaId) {
                    return (
                      <Link
                        key={student.id}
                        href={`/dashboard/alunos/${student.id}`}
                        className="block"
                      >
                        {StudentRow}
                      </Link>
                    )
                  }

                  return StudentRow
                })}
              </div>

              {/* Show details toggle for many students */}
              {sortedStudents.length > 5 && showDetails && (
                <div className="pt-2 border-t border-red-200">
                  <p className={cn(
                    'text-xs',
                    criticalCount > 0 ? 'text-red-600' : 'text-yellow-600'
                  )}>
                    Total de {sortedStudents.length} alunos em acompanhamento abaixo de {ATENCAO}%
                  </p>
                </div>
              )}
            </AlertDescription>
          )}
        </div>
      </div>
    </Alert>
  )
}

/**
 * Compact version of RiskAlert for use in smaller spaces
 */
export function RiskAlertCompact({
  count,
  criticalCount = 0,
  onClick,
}: {
  count: number
  criticalCount?: number
  onClick?: () => void
}) {
  if (count === 0) return null

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      className={cn(
        'gap-2',
        criticalCount > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600'
      )}
    >
      {criticalCount > 0 ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <span>{count} aluno{count !== 1 ? 's' : ''} em risco</span>
    </Button>
  )
}

export default RiskAlert
