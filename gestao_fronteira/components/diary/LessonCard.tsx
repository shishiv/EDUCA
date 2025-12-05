/**
 * LessonCard Component - Card-based lesson display
 * Task 2.3.2: Create LessonCard component
 * Task 2.3.5: Implement responsiveness
 * Task 5.3.2: Add subtle hover animations
 * Task 5.3.3: Improve accessibility (WCAG 2.1 AA)
 *
 * Features:
 * - Blue left border (matching mockup)
 * - Smooth hover with elevation/shadow (Task 5.3.2)
 * - Display: date, discipline/theme, summary, attendance rate
 * - Active state when selected
 * - Responsive: adapts to mobile, tablet, desktop
 * - Keyboard navigation support (Task 5.3.3)
 * - Proper focus indicators (Task 5.3.3)
 * - Screen reader optimized (Task 5.3.3)
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see planning/visuals/diario.html
 */

'use client'

import React, { useCallback, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Users, ChevronRight, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// Types
// ============================================================================

export interface LessonCardData {
  id: string
  data_aula: string
  tema: string
  disciplina?: string | null
  resumo?: string | null
  objetivo?: string | null
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  total_atestados?: number
  status?: string
}

interface LessonCardProps {
  lesson: LessonCardData
  isSelected?: boolean
  onClick?: (lesson: LessonCardData) => void
  className?: string
  /** Compact mode for mobile */
  compact?: boolean
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get attendance rate badge color with WCAG 2.1 AA contrast
 */
function getRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-700 bg-green-100 border-green-200'
  if (rate >= 75) return 'text-amber-700 bg-amber-100 border-amber-200'
  return 'text-red-700 bg-red-100 border-red-200'
}

// ============================================================================
// Component
// ============================================================================

export function LessonCard({
  lesson,
  isSelected = false,
  onClick,
  className,
  compact = false,
}: LessonCardProps) {
  // State for hover animation
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Calculate attendance rate
  const attendanceRate =
    lesson.total_alunos > 0
      ? Math.round(
          ((lesson.total_presentes + (lesson.total_atestados || 0)) /
            lesson.total_alunos) *
            100
        )
      : 0

  // Format date
  const lessonDate = new Date(lesson.data_aula + 'T12:00:00')
  const formattedDate = format(lessonDate, "dd 'de' MMMM, yyyy", { locale: ptBR })
  const formattedDateShort = format(lessonDate, 'dd/MM/yyyy', { locale: ptBR })
  const dayOfWeek = format(lessonDate, 'EEEE', { locale: ptBR })
  const dayOfWeekShort = format(lessonDate, 'EEE', { locale: ptBR })

  // Create summary from objetivo or tema
  const summary = lesson.resumo || lesson.objetivo || lesson.tema

  // Handle click with keyboard support
  const handleClick = useCallback(() => {
    onClick?.(lesson)
  }, [onClick, lesson])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.(lesson)
      }
    },
    [onClick, lesson]
  )

  // Build accessible label
  const ariaLabel = `Aula: ${lesson.tema}. Data: ${formattedDate}. Presenca: ${attendanceRate}%. ${
    isSelected ? 'Selecionada.' : ''
  }`

  return (
    <article
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={cn(
        // Base styles
        'relative bg-white rounded-xl cursor-pointer',
        // Padding: smaller on mobile
        compact ? 'p-3' : 'p-3 sm:p-4',
        // Left border accent (blue) - thicker when selected
        'border-l-4',
        isSelected ? 'border-l-blue-700' : 'border-l-blue-500',
        // Shadow and hover effects (Task 5.3.2)
        'shadow-sm',
        // Smooth transitions for all properties
        'transition-all duration-200 ease-out',
        // Hover state - elevation and shadow
        (isHovered || isFocused) && !isSelected && 'shadow-lg -translate-y-1',
        // Border for card
        'border border-gray-100',
        (isHovered || isFocused) && 'border-gray-200',
        // Active/selected state
        isSelected && 'bg-blue-50 shadow-md ring-2 ring-blue-200',
        // Focus visible indicator (Task 5.3.3)
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        // Touch-friendly: min height for mobile
        'min-h-[44px]',
        className
      )}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={ariaLabel}
      data-lesson-id={lesson.id}
      data-selected={isSelected}
    >
      <div className="flex items-start gap-3">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Date Row - Responsive */}
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Calendar
              className={cn(
                'h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0',
                // Animated color change on hover
                'transition-colors duration-200',
                isHovered || isSelected ? 'text-blue-500' : 'text-gray-400'
              )}
              aria-hidden="true"
            />
            {/* Full date on sm+, short on mobile */}
            <time
              dateTime={lesson.data_aula}
              className="hidden sm:inline text-sm font-semibold text-gray-700"
            >
              {formattedDate}
            </time>
            <time
              dateTime={lesson.data_aula}
              className="sm:hidden text-xs font-semibold text-gray-700"
            >
              {formattedDateShort}
            </time>
            {/* Day of week - hidden on mobile */}
            <span className="hidden sm:inline text-sm text-gray-500" aria-hidden="true">
              | {dayOfWeek}
            </span>
            <span className="hidden xs:inline sm:hidden text-xs text-gray-500" aria-hidden="true">
              | {dayOfWeekShort}
            </span>
          </div>

          {/* Subject/Theme Title - Responsive font size */}
          <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1 sm:mb-2 line-clamp-2">
            {lesson.disciplina && (
              <span className="text-blue-600">{lesson.disciplina} - </span>
            )}
            {lesson.tema}
          </h3>

          {/* Summary - truncated, hidden on compact mobile */}
          {!compact && summary && (
            <p className="hidden sm:block text-sm text-gray-600 leading-snug mb-3 line-clamp-2">
              {summary}
            </p>
          )}

          {/* Footer - Attendance Stats - Responsive */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {lesson.total_presentes}/{lesson.total_alunos} presentes
                </span>
                <span className="sm:hidden" aria-label={`${lesson.total_presentes} de ${lesson.total_alunos} presentes`}>
                  {lesson.total_presentes}/{lesson.total_alunos}
                </span>
              </span>
              {lesson.total_ausentes > 0 && (
                <span className="hidden xs:inline text-red-600" aria-label={`${lesson.total_ausentes} faltas`}>
                  {lesson.total_ausentes} falta{lesson.total_ausentes > 1 ? 's' : ''}
                </span>
              )}
              {(lesson.total_atestados || 0) > 0 && (
                <span className="hidden sm:inline text-amber-600" aria-label={`${lesson.total_atestados} atestados`}>
                  {lesson.total_atestados} atestado{(lesson.total_atestados || 0) > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Attendance Rate Badge */}
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-semibold flex-shrink-0',
                // Smooth transition for color change
                'transition-colors duration-200',
                getRateColor(attendanceRate)
              )}
              aria-label={`Taxa de frequencia: ${attendanceRate}%`}
            >
              {attendanceRate}%
            </Badge>
          </div>
        </div>

        {/* Mobile chevron indicator with animation */}
        <div
          className={cn(
            'lg:hidden flex-shrink-0 self-center',
            // Animated movement on hover
            'transition-transform duration-200',
            isHovered && 'translate-x-1'
          )}
          aria-hidden="true"
        >
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Screen reader only: additional context */}
      <span className="sr-only">
        Clique para ver detalhes da aula
      </span>
    </article>
  )
}

// ============================================================================
// Skeleton variant for loading states (Task 5.3.2)
// ============================================================================

export function LessonCardSkeleton() {
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl p-3 sm:p-4',
        'border-l-4 border-l-gray-200 border border-gray-100 shadow-sm',
        // Skeleton animation
        'animate-pulse'
      )}
      role="status"
      aria-label="Carregando informacoes da aula..."
    >
      {/* Date Row Skeleton */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 bg-gray-200 rounded" />
        <div className="h-4 w-24 sm:w-32 bg-gray-200 rounded" />
        <div className="hidden sm:block h-4 w-20 bg-gray-200 rounded" />
      </div>

      {/* Title Skeleton */}
      <div className="h-4 sm:h-5 w-3/4 bg-gray-200 rounded mb-2" />

      {/* Summary Skeleton - hidden on mobile */}
      <div className="hidden sm:block space-y-1.5 mb-3">
        <div className="h-3.5 w-full bg-gray-200 rounded" />
        <div className="h-3.5 w-4/5 bg-gray-200 rounded" />
      </div>

      {/* Footer Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 sm:w-28 bg-gray-200 rounded" />
        <div className="h-5 w-10 sm:w-12 bg-gray-200 rounded" />
      </div>

      {/* Screen reader text */}
      <span className="sr-only">Carregando...</span>
    </div>
  )
}

// ============================================================================
// Empty State for no lessons
// ============================================================================

interface LessonCardEmptyProps {
  message?: string
  showIcon?: boolean
  className?: string
}

export function LessonCardEmpty({
  message = 'Nenhuma aula registrada',
  showIcon = true,
  className,
}: LessonCardEmptyProps) {
  return (
    <div
      className={cn(
        'bg-gray-50 rounded-xl p-6 sm:p-8',
        'border-2 border-dashed border-gray-200',
        'flex flex-col items-center justify-center text-center',
        className
      )}
      role="status"
    >
      {showIcon && (
        <BookOpen
          className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mb-3"
          aria-hidden="true"
        />
      )}
      <p className="text-sm sm:text-base text-gray-500">{message}</p>
    </div>
  )
}
