/**
 * LessonDetailPanel Component - Sticky detail panel for lesson info
 * Task 2.3.3: Create lesson details panel
 * Task 2.3.5: Implement responsiveness
 *
 * Features:
 * - Title, date, discipline
 * - Content section
 * - Attendance summary section
 * - Observations section
 * - Edit/Delete buttons
 * - Responsive: adapts padding/sizing for mobile sheet usage
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see planning/visuals/diario.html
 */

'use client'

import React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BookOpen,
  Calendar,
  Users,
  MessageSquare,
  Pencil,
  Trash2,
  Target,
  ClipboardList,
  FileText,
  AlertCircle,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { LessonContent } from '@/types/lesson-content'

// ============================================================================
// Types
// ============================================================================

export interface LessonDetailData {
  id: string
  sessao_id?: string
  data_aula: string
  tema: string
  disciplina?: string | null
  objetivo?: string | null
  metodologia?: string | null
  recursos?: string | null
  observacoes?: string | null
  habilidades_bncc?: string[]
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  total_atestados?: number
  status?: string
  professor_nome?: string
  turma_nome?: string
}

interface LessonDetailPanelProps {
  lesson: LessonDetailData | null
  onEdit?: (lesson: LessonDetailData) => void
  onDelete?: (lesson: LessonDetailData) => void
  loading?: boolean
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function LessonDetailPanel({
  lesson,
  onEdit,
  onDelete,
  loading = false,
  className,
}: LessonDetailPanelProps) {
  // Calculate attendance rate
  const attendanceRate = lesson
    ? lesson.total_alunos > 0
      ? Math.round(
          ((lesson.total_presentes + (lesson.total_atestados || 0)) /
            lesson.total_alunos) *
            100
        )
      : 0
    : 0

  // Get attendance rate color
  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-700'
    if (rate >= 75) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  // Empty state
  if (!lesson && !loading) {
    return (
      <div
        className={cn(
          'bg-white rounded-lg border border-gray-200 p-4 sm:p-6 h-fit',
          // Sticky on desktop
          'lg:sticky lg:top-24',
          className
        )}
      >
        <div className="text-center py-8 sm:py-12">
          <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">
            Selecione uma aula
          </h3>
          <p className="text-sm text-gray-500">
            Clique em um card a esquerda para visualizar detalhes
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          'bg-white rounded-lg border border-gray-200 p-4 sm:p-6 h-fit',
          'lg:sticky lg:top-24',
          className
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <Separator />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
          <Separator />
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="h-14 sm:h-16 bg-gray-200 rounded" />
            <div className="h-14 sm:h-16 bg-gray-200 rounded" />
            <div className="h-14 sm:h-16 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!lesson) return null

  // Format date
  const lessonDate = new Date(lesson.data_aula + 'T12:00:00')
  const formattedDate = format(lessonDate, "dd 'de' MMMM, yyyy", { locale: ptBR })
  const formattedDateShort = format(lessonDate, 'dd/MM/yyyy', { locale: ptBR })
  const dayOfWeek = format(lessonDate, 'EEEE', { locale: ptBR })

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4 sm:p-6 h-fit',
        'lg:sticky lg:top-24',
        className
      )}
    >
      <ScrollArea className="max-h-[calc(100vh-140px)]">
        <div className="space-y-4 sm:space-y-6">
          {/* Header - Title and Date */}
          <div className="pb-3 sm:pb-4 border-b border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              {lesson.disciplina ? `${lesson.disciplina} - ` : ''}
              {lesson.tema}
            </h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {/* Full date on sm+, short on mobile */}
              <span className="hidden sm:inline">{formattedDate}</span>
              <span className="sm:hidden">{formattedDateShort}</span>
              <span>|</span>
              <span className="capitalize">{dayOfWeek}</span>
            </div>
            {lesson.turma_nome && (
              <div className="text-xs sm:text-sm text-gray-500 mt-1">
                Turma: {lesson.turma_nome}
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="space-y-3 sm:space-y-4">
            {/* Objetivo */}
            {lesson.objetivo && (
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  Objetivo
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-5 sm:pl-6">
                  {lesson.objetivo}
                </p>
              </div>
            )}

            {/* Conteudo */}
            <div className="space-y-1.5 sm:space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                Conteudo
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-5 sm:pl-6">
                {lesson.tema}
              </p>
            </div>

            {/* BNCC Skills */}
            {lesson.habilidades_bncc && lesson.habilidades_bncc.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  Habilidades BNCC
                </h3>
                <div className="flex flex-wrap gap-1 pl-5 sm:pl-6">
                  {lesson.habilidades_bncc.map((code) => (
                    <Badge
                      key={code}
                      variant="outline"
                      className="text-[10px] sm:text-xs font-mono"
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metodologia */}
            {lesson.metodologia && (
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  Metodologia
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-5 sm:pl-6">
                  {lesson.metodologia}
                </p>
              </div>
            )}

            {/* Recursos */}
            {lesson.recursos && (
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  Recursos
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-5 sm:pl-6">
                  {lesson.recursos}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Attendance Section */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
              Frequencia
            </h3>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-base sm:text-lg font-bold text-gray-900">
                  {lesson.total_alunos}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500">Total</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-base sm:text-lg font-bold text-green-600">
                  {lesson.total_presentes}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500">Presentes</div>
              </div>
              <div className="bg-red-50 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-base sm:text-lg font-bold text-red-600">
                  {lesson.total_ausentes}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500">Ausentes</div>
              </div>
            </div>

            {(lesson.total_atestados || 0) > 0 && (
              <div className="bg-yellow-50 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-base sm:text-lg font-bold text-yellow-600">
                  {lesson.total_atestados}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500">Atestados</div>
              </div>
            )}

            {/* Attendance Rate */}
            <div
              className={cn(
                'rounded-lg p-3 sm:p-4 flex items-center justify-between',
                getAttendanceColor(attendanceRate)
              )}
            >
              <span className="text-xs sm:text-sm font-medium">Taxa de Frequencia</span>
              <span className="text-lg sm:text-xl font-bold">{attendanceRate}%</span>
            </div>

            {attendanceRate < 75 && (
              <div className="flex items-start gap-2 text-xs sm:text-sm text-red-600 bg-red-50 rounded-lg p-2 sm:p-3">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                <span>Atencao: Frequencia abaixo do minimo legal de 75%</span>
              </div>
            )}
          </div>

          {/* Observations Section */}
          {lesson.observacoes && (
            <>
              <Separator />
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  Observacoes
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-5 sm:pl-6 bg-gray-50 p-2 sm:p-3 rounded-lg">
                  {lesson.observacoes}
                </p>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-3 sm:pt-4 space-y-2">
            <Button
              variant="default"
              className="w-full bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 text-sm"
              onClick={() => onEdit?.(lesson)}
            >
              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              Editar Aula
            </Button>
            <Button
              variant="outline"
              className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 h-9 sm:h-10 text-sm"
              onClick={() => onDelete?.(lesson)}
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              Excluir Aula
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// Skeleton variant
// ============================================================================

export function LessonDetailPanelSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 h-fit lg:sticky lg:top-24 animate-pulse">
      <div className="space-y-4 sm:space-y-6">
        <div className="pb-3 sm:pb-4 border-b border-gray-100">
          <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="h-3.5 sm:h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-3.5 sm:h-4 bg-gray-200 rounded w-full" />
            <div className="h-3.5 sm:h-4 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="h-14 sm:h-16 bg-gray-200 rounded" />
          <div className="h-14 sm:h-16 bg-gray-200 rounded" />
          <div className="h-14 sm:h-16 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2 pt-3 sm:pt-4">
          <div className="h-9 sm:h-10 bg-gray-200 rounded" />
          <div className="h-9 sm:h-10 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}
