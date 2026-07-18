/**
 * StudentReportInfantil Component - Report Card for Early Childhood Education
 * Task Group 3.3.2: Boletim do Aluno (Educacao Infantil)
 *
 * This component displays a student's descriptive report for
 * Early Childhood Education (Educacao Infantil) based on BNCC's
 * 5 Experience Fields (Campos de Experiencia).
 *
 * Features:
 * - Summary of descriptive reports
 * - Organization by semester
 * - Visualization of Experience Fields
 * - Professional print layout
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 * @see types/descriptive-report.ts for DescriptiveReport types
 */

'use client'

import React, { useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Baby,
  Printer,
  Download,
  CheckCircle2,
  PenLine,
  School,
  Calendar,
  User,
  BookOpen,
  Heart,
  Music,
  MessageCircle,
  Shapes,
  Info,
  Clock,
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { municipalConfig } from "@/lib/config"
import {
  EXPERIENCE_FIELDS_CONFIG,
  REPORT_STATUS_CONFIG,
  SEMESTER_CONFIG,
  type SemestreType,
  type ReportStatus,
  type ExperienceFieldKey,
  type DescriptiveReport,
  calculateReportCompletion,
} from '@/types/descriptive-report'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Student information for report header
 */
export interface StudentInfoInfantil {
  id: string
  nome: string
  dataNascimento?: string
  turma: string
  faixaEtaria?: string
  escola: string
  anoLetivo: number
}

/**
 * Descriptive report summary for display
 */
export interface ReportSummary {
  id: string
  semestre: SemestreType
  anoLetivo: number
  status: ReportStatus
  professorNome?: string
  finalizadoEm?: string
  campoEuOutroNos: string | null
  campoCorpoGestos: string | null
  campoTracosSons: string | null
  campoEscutaFala: string | null
  campoEspacosTempos: string | null
  observacoesGerais: string | null
}

/**
 * Props for StudentReportInfantil component
 */
export interface StudentReportInfantilProps {
  /** Student information */
  student: StudentInfoInfantil
  /** Reports by semester */
  reports: ReportSummary[]
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
 * Icons for each Experience Field
 */
const EXPERIENCE_FIELD_ICONS: Record<ExperienceFieldKey, React.ComponentType<{ className?: string }>> = {
  campo_eu_outro_nos: Heart,
  campo_corpo_gestos: User,
  campo_tracos_sons: Music,
  campo_escuta_fala: MessageCircle,
  campo_espacos_tempos: Shapes,
}

/**
 * Colors for each Experience Field
 */
const EXPERIENCE_FIELD_COLORS: Record<ExperienceFieldKey, { bg: string; text: string; border: string }> = {
  campo_eu_outro_nos: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
  },
  campo_corpo_gestos: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  campo_tracos_sons: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  campo_escuta_fala: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  campo_espacos_tempos: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
 * Get report value from field key
 */
function getReportFieldValue(report: ReportSummary, key: ExperienceFieldKey): string | null {
  switch (key) {
    case 'campo_eu_outro_nos':
      return report.campoEuOutroNos
    case 'campo_corpo_gestos':
      return report.campoCorpoGestos
    case 'campo_tracos_sons':
      return report.campoTracosSons
    case 'campo_escuta_fala':
      return report.campoEscutaFala
    case 'campo_espacos_tempos':
      return report.campoEspacosTempos
    default:
      return null
  }
}

/**
 * Calculate completion from report
 */
function calculateCompletion(report: ReportSummary): number {
  const fields = [
    report.campoEuOutroNos,
    report.campoCorpoGestos,
    report.campoTracosSons,
    report.campoEscutaFala,
    report.campoEspacosTempos,
  ]

  const filled = fields.filter((f) => f && f.trim().length >= 50).length
  return Math.round((filled / 5) * 100)
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
  student: StudentInfoInfantil
  reportDate?: Date
  printMode?: boolean
}) {
  return (
    <div className={cn('space-y-4', printMode && 'print:space-y-2')}>
      {/* School and Year Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <School className={cn('h-5 w-5 text-purple-600', printMode && 'print:h-4 print:w-4')} />
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
            <span className="text-sm text-gray-600">Crianca:</span>
          </div>
          <p className="font-semibold text-gray-900 pl-6">{student.nome}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Baby className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Turma:</span>
          </div>
          <p className="font-semibold text-gray-900 pl-6">
            {student.turma}
            {student.faixaEtaria && ` - ${student.faixaEtaria}`}
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
 * Experience Field Card
 */
function ExperienceFieldCard({
  fieldKey,
  content,
  printMode,
}: {
  fieldKey: ExperienceFieldKey
  content: string | null
  printMode?: boolean
}) {
  const fieldConfig = EXPERIENCE_FIELDS_CONFIG.find((f) => f.key === fieldKey)
  const colors = EXPERIENCE_FIELD_COLORS[fieldKey]
  const Icon = EXPERIENCE_FIELD_ICONS[fieldKey]

  if (!fieldConfig) return null

  const hasContent = content && content.trim().length >= 50

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        colors.border,
        hasContent ? colors.bg : 'bg-gray-50'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            colors.bg
          )}
        >
          <Icon className={cn('h-5 w-5', colors.text)} />
        </div>
        <div className="flex-1">
          <h4 className={cn('font-semibold', colors.text)}>{fieldConfig.label}</h4>
          <p className="text-xs text-gray-500">{fieldConfig.description}</p>
        </div>
        {hasContent && (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'text-sm leading-relaxed',
        hasContent ? 'text-gray-700' : 'text-gray-400 italic'
      )}>
        {hasContent ? content : 'Nenhuma observacao registrada para este campo.'}
      </div>
    </div>
  )
}

/**
 * Semester Report Card
 */
function SemesterReportCard({
  report,
  printMode,
}: {
  report: ReportSummary
  printMode?: boolean
}) {
  const semesterConfig = SEMESTER_CONFIG[report.semestre]
  const statusConfig = REPORT_STATUS_CONFIG[report.status]
  const completion = calculateCompletion(report)
  const isFinalized = report.status === 'finalizado'

  return (
    <Card className={cn('border-purple-200', printMode && 'print:border print:shadow-none')}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              {semesterConfig.label} de {report.anoLetivo}
            </CardTitle>
            <CardDescription className="mt-1">
              Periodo: {semesterConfig.months}
            </CardDescription>
          </div>

          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1.5',
              isFinalized
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-yellow-300 bg-yellow-50 text-yellow-700'
            )}
          >
            {isFinalized ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Finalizado
              </>
            ) : (
              <>
                <PenLine className="h-3 w-3" />
                Rascunho
              </>
            )}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Campos preenchidos</span>
            <span className="font-medium text-purple-700">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
        </div>

        {/* Teacher and date info */}
        {(report.professorNome || report.finalizadoEm) && (
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
            {report.professorNome && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Professor(a): {report.professorNome}
              </div>
            )}
            {report.finalizadoEm && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Finalizado em: {formatDate(report.finalizadoEm)}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Experience Fields */}
        {EXPERIENCE_FIELDS_CONFIG.map((field) => (
          <ExperienceFieldCard
            key={field.key}
            fieldKey={field.key}
            content={getReportFieldValue(report, field.key)}
            printMode={printMode}
          />
        ))}

        {/* General Observations */}
        {report.observacoesGerais && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-700">Observacoes Gerais</span>
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">
              {report.observacoesGerais}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Empty state for no reports
 */
function EmptyReportsState() {
  return (
    <Alert className="border-purple-200 bg-purple-50">
      <BookOpen className="h-4 w-4 text-purple-600" />
      <AlertTitle className="text-purple-800">Nenhum Relatorio Encontrado</AlertTitle>
      <AlertDescription className="text-purple-700">
        Nao ha relatorios descritivos registrados para esta crianca.
        Os relatorios sao preenchidos pelo professor ao final de cada semestre.
      </AlertDescription>
    </Alert>
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
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * StudentReportInfantil - Report Card Component for Early Childhood Education
 *
 * Displays descriptive reports organized by semester with
 * BNCC's 5 Experience Fields for Educacao Infantil students.
 */
export function StudentReportInfantil({
  student,
  reports,
  reportDate = new Date(),
  isLoading = false,
  onPrint,
  onExportPDF,
  className,
  printMode = false,
}: StudentReportInfantilProps) {
  const reportRef = useRef<HTMLDivElement>(null)

  // Sort reports by year and semester (most recent first)
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      if (a.anoLetivo !== b.anoLetivo) {
        return b.anoLetivo - a.anoLetivo
      }
      return a.semestre === 'segundo' ? -1 : 1
    })
  }, [reports])

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
      <Card className={cn('border-purple-200', printMode && 'print:border print:shadow-none')}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Baby className="h-5 w-5 text-purple-600" />
                Relatorio de Desenvolvimento
              </CardTitle>
              <CardDescription className="mt-1">
                Educacao Infantil - Campos de Experiencia (BNCC)
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

          {/* Experience Fields Legend */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Campos de Experiencia (BNCC)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {EXPERIENCE_FIELDS_CONFIG.map((field) => {
                const colors = EXPERIENCE_FIELD_COLORS[field.key]
                const Icon = EXPERIENCE_FIELD_ICONS[field.key]
                return (
                  <div key={field.key} className="flex items-center gap-2">
                    <div className={cn('p-1 rounded', colors.bg)}>
                      <Icon className={cn('h-3 w-3', colors.text)} />
                    </div>
                    <span className="text-gray-700">{field.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports by Semester */}
      {sortedReports.length === 0 ? (
        <EmptyReportsState />
      ) : (
        <div className="space-y-6">
          {sortedReports.map((report) => (
            <SemesterReportCard
              key={report.id}
              report={report}
              printMode={printMode}
            />
          ))}
        </div>
      )}

      {/* Print footer */}
      {printMode && (
        <div className="text-center text-xs text-gray-500 border-t pt-4">
          <p>Documento gerado em {formatDate(reportDate)} - Sistema de Gestao Escolar EDUCA</p>
          <p>{municipalConfig.nome}</p>
        </div>
      )}
    </div>
  )
}

export default StudentReportInfantil
