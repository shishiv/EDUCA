/**
 * StudentReport Component - Report Card for Fundamental Education
 * Task Group 3.3.1: Boletim do Aluno (Ensino Fundamental)
 *
 * This component displays a student's report card with:
 * - Grades table by discipline/bimester
 * - Automatically calculated final average
 * - Status: approved/failed/in progress
 *
 * Features:
 * - Professional print layout
 * - Color-coded grades
 * - Summary statistics
 * - Export to PDF capability
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 * @see types/grades.ts for Grade types
 */

'use client'

import React, { useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  GraduationCap,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  School,
  Calendar,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Bimester,
  formatGrade,
  getGradeColor,
  roundGrade,
  GRADE_THRESHOLDS,
  GRADE_COLOR_CLASSES,
  getDisciplineName,
  BIMESTER_OPTIONS,
} from '@/types/grades'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Student information for report header
 */
export interface StudentInfo {
  id: string
  nome: string
  dataNascimento?: string
  turma: string
  serie: string
  escola: string
  anoLetivo: number
  numero?: number
}

/**
 * Discipline grade data for the report
 */
export interface DisciplineGrade {
  disciplina: string
  disciplinaNome?: string
  bimestre1: number | null
  bimestre2: number | null
  bimestre3: number | null
  bimestre4: number | null
  media: number | null
}

/**
 * Attendance summary for the report
 */
export interface AttendanceSummary {
  totalAulas: number
  presencas: number
  faltas: number
  atestados: number
  percentual: number
}

/**
 * Props for StudentReport component
 */
export interface StudentReportProps {
  /** Student information */
  student: StudentInfo
  /** Grades by discipline */
  grades: DisciplineGrade[]
  /** Attendance summary (optional) */
  attendance?: AttendanceSummary
  /** Report generation date */
  reportDate?: Date
  /** Whether the report is loading */
  isLoading?: boolean
  /** Callback when print is clicked */
  onPrint?: () => void
  /** Callback when PDF export is clicked */
  onExportPDF?: () => void
  /** CSS class for the container */
  className?: string
  /** Whether to show in print-optimized mode */
  printMode?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Passing grade threshold
 */
const PASSING_GRADE = 6.0

/**
 * Minimum attendance percentage
 */
const MINIMUM_ATTENDANCE = 75

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate status from grades and attendance
 */
function calculateStatus(
  grades: DisciplineGrade[],
  attendance?: AttendanceSummary
): 'aprovado' | 'reprovado' | 'em_curso' {
  // Check if all grades are complete
  const hasIncompleteGrades = grades.some(
    (g) =>
      g.bimestre1 === null ||
      g.bimestre2 === null ||
      g.bimestre3 === null ||
      g.bimestre4 === null
  )

  if (hasIncompleteGrades) {
    return 'em_curso'
  }

  // Check attendance
  if (attendance && attendance.percentual < MINIMUM_ATTENDANCE) {
    return 'reprovado'
  }

  // Check if any discipline has failing average
  const hasFailingGrade = grades.some((g) => g.media !== null && g.media < PASSING_GRADE)

  if (hasFailingGrade) {
    return 'reprovado'
  }

  return 'aprovado'
}

/**
 * Calculate overall average
 */
function calculateOverallAverage(grades: DisciplineGrade[]): number | null {
  const validAverages = grades
    .map((g) => g.media)
    .filter((m): m is number => m !== null)

  if (validAverages.length === 0) return null

  const sum = validAverages.reduce((acc, m) => acc + m, 0)
  return roundGrade(sum / validAverages.length)
}

/**
 * Get status badge config
 */
function getStatusConfig(status: 'aprovado' | 'reprovado' | 'em_curso') {
  switch (status) {
    case 'aprovado':
      return {
        label: 'Aprovado',
        icon: CheckCircle2,
        className: 'bg-green-100 text-green-800 border-green-300',
      }
    case 'reprovado':
      return {
        label: 'Reprovado',
        icon: XCircle,
        className: 'bg-red-100 text-red-800 border-red-300',
      }
    case 'em_curso':
      return {
        label: 'Em Curso',
        icon: Clock,
        className: 'bg-blue-100 text-blue-800 border-blue-300',
      }
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Get grade cell class based on value
 */
function getGradeCellClass(grade: number | null): string {
  if (grade === null) return 'text-gray-400'

  const color = getGradeColor(grade)
  return cn(
    GRADE_COLOR_CLASSES[color].text,
    grade >= GRADE_THRESHOLDS.passing && 'font-semibold'
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Report header with student info
 */
function ReportHeader({
  student,
  reportDate,
  printMode,
}: {
  student: StudentInfo
  reportDate?: Date
  printMode?: boolean
}) {
  return (
    <div className={cn('space-y-4', printMode && 'print:space-y-2')}>
      {/* School and Year Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <School className={cn('h-5 w-5 text-blue-600', printMode && 'print:h-4 print:w-4')} />
          <h2 className={cn('text-lg font-semibold text-gray-900', printMode && 'print:text-base')}>
            {student.escola}
          </h2>
        </div>
        <p className="text-sm text-gray-600">
          Ano Letivo: {student.anoLetivo}
        </p>
      </div>

      <Separator />

      {/* Student Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Aluno(a):</span>
          </div>
          <p className="font-semibold text-gray-900 pl-6">{student.nome}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Turma:</span>
          </div>
          <p className="font-semibold text-gray-900 pl-6">
            {student.serie} - {student.turma}
            {student.numero && ` (No ${student.numero})`}
          </p>
        </div>

        {student.dataNascimento && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Data de Nascimento:</span>
            </div>
            <p className="font-semibold text-gray-900 pl-6">
              {formatDate(student.dataNascimento)}
            </p>
          </div>
        )}

        {reportDate && (
          <div className="space-y-2">
            <span className="text-sm text-gray-600">Data de Emissao:</span>
            <p className="font-semibold text-gray-900">
              {formatDate(reportDate)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Grades table component
 */
function GradesTable({
  grades,
  printMode,
}: {
  grades: DisciplineGrade[]
  printMode?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Disciplina</TableHead>
            {BIMESTER_OPTIONS.map((opt) => (
              <TableHead key={opt.value} className="text-center font-semibold w-20">
                {opt.value}o Bim
              </TableHead>
            ))}
            <TableHead className="text-center font-bold w-20 bg-gray-100">Media</TableHead>
            <TableHead className="text-center font-semibold w-24">Situacao</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grades.map((grade) => {
            const isPassingAverage = grade.media !== null && grade.media >= PASSING_GRADE
            const disciplineName = grade.disciplinaNome || getDisciplineName(grade.disciplina)

            return (
              <TableRow key={grade.disciplina}>
                <TableCell className="font-medium">{disciplineName}</TableCell>
                <TableCell className={cn('text-center', getGradeCellClass(grade.bimestre1))}>
                  {formatGrade(grade.bimestre1)}
                </TableCell>
                <TableCell className={cn('text-center', getGradeCellClass(grade.bimestre2))}>
                  {formatGrade(grade.bimestre2)}
                </TableCell>
                <TableCell className={cn('text-center', getGradeCellClass(grade.bimestre3))}>
                  {formatGrade(grade.bimestre3)}
                </TableCell>
                <TableCell className={cn('text-center', getGradeCellClass(grade.bimestre4))}>
                  {formatGrade(grade.bimestre4)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-center font-bold bg-gray-50',
                    getGradeCellClass(grade.media)
                  )}
                >
                  {formatGrade(grade.media)}
                </TableCell>
                <TableCell className="text-center">
                  {grade.media !== null ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        isPassingAverage
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : 'bg-red-50 text-red-700 border-red-300'
                      )}
                    >
                      {isPassingAverage ? 'Aprovado' : 'Reprovado'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Em Curso
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Attendance summary component
 */
function AttendanceSummaryCard({
  attendance,
  printMode,
}: {
  attendance: AttendanceSummary
  printMode?: boolean
}) {
  const isAttendanceOk = attendance.percentual >= MINIMUM_ATTENDANCE

  return (
    <Card className={cn('border-gray-200', printMode && 'print:border print:shadow-none')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          Frequencia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-700">{attendance.totalAulas}</div>
            <div className="text-xs text-blue-600">Total de Aulas</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-700">{attendance.presencas}</div>
            <div className="text-xs text-green-600">Presencas</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-xl font-bold text-red-700">{attendance.faltas}</div>
            <div className="text-xs text-red-600">Faltas</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="text-xl font-bold text-yellow-700">{attendance.atestados}</div>
            <div className="text-xs text-yellow-600">Atestados</div>
          </div>
          <div
            className={cn(
              'p-3 rounded-lg',
              isAttendanceOk ? 'bg-green-100' : 'bg-red-100'
            )}
          >
            <div
              className={cn(
                'text-xl font-bold',
                isAttendanceOk ? 'text-green-800' : 'text-red-800'
              )}
            >
              {attendance.percentual.toFixed(1)}%
            </div>
            <div
              className={cn(
                'text-xs',
                isAttendanceOk ? 'text-green-700' : 'text-red-700'
              )}
            >
              Frequencia
            </div>
          </div>
        </div>

        {!isAttendanceOk && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Atencao: Frequencia abaixo do minimo exigido (75%)
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Summary footer component
 */
function ReportSummary({
  grades,
  attendance,
  printMode,
}: {
  grades: DisciplineGrade[]
  attendance?: AttendanceSummary
  printMode?: boolean
}) {
  const status = calculateStatus(grades, attendance)
  const overallAverage = calculateOverallAverage(grades)
  const statusConfig = getStatusConfig(status)
  const StatusIcon = statusConfig.icon

  return (
    <Card className={cn('border-gray-200', printMode && 'print:border print:shadow-none')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resultado Final</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Media Geral</div>
              <div
                className={cn(
                  'text-3xl font-bold',
                  overallAverage !== null && getGradeCellClass(overallAverage)
                )}
              >
                {overallAverage !== null ? overallAverage.toFixed(1).replace('.', ',') : '-'}
              </div>
            </div>

            {attendance && (
              <>
                <Separator orientation="vertical" className="h-12" />
                <div className="text-center">
                  <div className="text-sm text-gray-600">Frequencia</div>
                  <div
                    className={cn(
                      'text-3xl font-bold',
                      attendance.percentual >= MINIMUM_ATTENDANCE
                        ? 'text-green-700'
                        : 'text-red-700'
                    )}
                  >
                    {attendance.percentual.toFixed(1)}%
                  </div>
                </div>
              </>
            )}
          </div>

          <Badge
            variant="outline"
            className={cn('text-lg px-6 py-2 flex items-center gap-2', statusConfig.className)}
          >
            <StatusIcon className="h-5 w-5" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton
 */
function ReportSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-24" />
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * StudentReport - Report Card Component for Fundamental Education
 *
 * Displays a complete report card with grades, attendance,
 * and final status for Ensino Fundamental students.
 */
export function StudentReport({
  student,
  grades,
  attendance,
  reportDate = new Date(),
  isLoading = false,
  onPrint,
  onExportPDF,
  className,
  printMode = false,
}: StudentReportProps) {
  const reportRef = useRef<HTMLDivElement>(null)

  // Calculate status
  const status = useMemo(() => calculateStatus(grades, attendance), [grades, attendance])
  const statusConfig = getStatusConfig(status)

  // Handle print
  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  if (isLoading) {
    return <ReportSkeleton />
  }

  return (
    <div className={cn('space-y-6', className)} ref={reportRef}>
      {/* Main Report Card */}
      <Card className={cn('border-gray-200', printMode && 'print:border print:shadow-none')}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                Boletim Escolar
              </CardTitle>
              <CardDescription className="mt-1">
                Ensino Fundamental - Anos Iniciais
              </CardDescription>
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

        <CardContent className="space-y-6">
          {/* Student Header */}
          <ReportHeader student={student} reportDate={reportDate} printMode={printMode} />

          <Separator />

          {/* Grades Table */}
          <div>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              Desempenho Academico
            </h3>
            <GradesTable grades={grades} printMode={printMode} />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 border-t pt-4">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-green-500" />
              <span>{'Aprovado (>= 7,0)'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-yellow-500" />
              <span>{'Atencao (>= 5,0)'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-red-500" />
              <span>{'Reprovado (< 5,0)'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">-</span>
              <span>Nota nao lancada</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      {attendance && (
        <AttendanceSummaryCard attendance={attendance} printMode={printMode} />
      )}

      {/* Final Summary */}
      <ReportSummary grades={grades} attendance={attendance} printMode={printMode} />

      {/* Print footer */}
      {printMode && (
        <div className="text-center text-xs text-gray-500 border-t pt-4">
          <p>Documento gerado em {formatDate(reportDate)} - Sistema de Gestao Escolar EDUCA</p>
          <p>Prefeitura Municipal de Fronteira/MG</p>
        </div>
      )}
    </div>
  )
}

export default StudentReport
