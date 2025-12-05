/**
 * DiarySkeletons - Loading state skeletons for Diario de Classe feature
 * Task 5.2.2: Implement loading states and skeletons
 *
 * Components:
 * - LessonCardListSkeleton: Skeleton for the lesson cards list
 * - AttendanceGridSkeleton: Skeleton for the attendance grid
 * - LessonDetailPanelSkeleton: Skeleton for the detail panel
 * - FrequencyControlsSkeleton: Skeleton for the frequency controls
 * - DiaryPageSkeleton: Full page skeleton for initial load
 *
 * Uses shadcn/ui Skeleton component for consistent animation
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md - Task 5.2.2
 */

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ============================================================================
// LessonCardListSkeleton - Skeleton for lesson cards list
// ============================================================================

interface LessonCardListSkeletonProps {
  /** Number of skeleton cards to display */
  count?: number
  /** Additional class names */
  className?: string
}

export function LessonCardListSkeleton({
  count = 5,
  className,
}: LessonCardListSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <LessonCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Single lesson card skeleton
 * Matches LessonCard component structure
 */
export function LessonCardSkeleton() {
  return (
    <div className="relative bg-white rounded-xl p-3 sm:p-4 border-l-4 border-l-gray-200 border border-gray-100 shadow-sm animate-pulse">
      {/* Date Row Skeleton */}
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
        <Skeleton className="h-4 w-24 sm:w-32" />
        <Skeleton className="hidden sm:block h-4 w-20" />
      </div>

      {/* Title Skeleton */}
      <Skeleton className="h-4 sm:h-5 w-3/4 mb-2" />

      {/* Summary Skeleton - hidden on mobile */}
      <div className="hidden sm:block space-y-1.5 mb-3">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>

      {/* Footer Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Skeleton className="h-4 w-16 sm:w-24" />
          <Skeleton className="hidden xs:block h-4 w-12" />
        </div>
        <Skeleton className="h-5 w-10 sm:w-12 rounded-full" />
      </div>
    </div>
  )
}

// ============================================================================
// AttendanceGridSkeleton - Skeleton for attendance grid
// ============================================================================

interface AttendanceGridSkeletonProps {
  /** Number of student rows to display */
  studentCount?: number
  /** Show header stats */
  showStats?: boolean
  /** Additional class names */
  className?: string
}

export function AttendanceGridSkeleton({
  studentCount = 10,
  showStats = true,
  className,
}: AttendanceGridSkeletonProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4 flex-wrap gap-y-2">
            {/* Title */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-32 sm:w-40" />
            </div>
            {/* Status indicators */}
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          {/* Search */}
          <Skeleton className="h-10 w-full sm:w-48 rounded-md" />
        </div>

        {/* Statistics Summary */}
        {showStats && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: studentCount }).map((_, i) => (
            <AttendanceRowSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Single attendance row skeleton
 * Matches AttendanceGrid row structure
 */
export function AttendanceRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-100 bg-gray-50">
      <div className="flex items-center space-x-3 flex-1">
        {/* Checkbox */}
        <Skeleton className="h-5 w-5 rounded" />
        {/* Avatar */}
        <Skeleton className="h-10 w-10 rounded-full" />
        {/* Student info */}
        <div className="flex-1 min-w-0 space-y-1">
          <Skeleton className="h-4 w-32 sm:w-48" />
          <Skeleton className="h-3 w-20 sm:w-28" />
        </div>
        {/* Status dot */}
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
      {/* Attendance cell */}
      <Skeleton className="h-11 w-11 sm:h-12 sm:w-12 rounded-lg ml-3" />
    </div>
  )
}

// ============================================================================
// LessonDetailPanelSkeleton - Skeleton for lesson detail panel
// ============================================================================

interface LessonDetailPanelSkeletonProps {
  /** Additional class names */
  className?: string
}

export function LessonDetailPanelSkeleton({
  className,
}: LessonDetailPanelSkeletonProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4 sm:p-6 h-fit',
        'lg:sticky lg:top-24',
        className
      )}
    >
      <div className="space-y-4 sm:space-y-6 animate-pulse">
        {/* Header - Title and Date */}
        <div className="pb-3 sm:pb-4 border-b border-gray-100">
          <Skeleton className="h-5 sm:h-6 w-3/4 mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
            <Skeleton className="h-4 w-32 sm:w-40" />
          </div>
          <Skeleton className="h-3.5 w-24 mt-1" />
        </div>

        {/* Content Section */}
        <div className="space-y-3 sm:space-y-4">
          {/* Objetivo */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="pl-5 sm:pl-6 space-y-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          </div>

          {/* Conteudo */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="pl-5 sm:pl-6">
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>

          {/* BNCC Skills */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex flex-wrap gap-1 pl-5 sm:pl-6">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>

        {/* Separator */}
        <Skeleton className="h-px w-full" />

        {/* Attendance Section */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <Skeleton className="h-14 sm:h-16 rounded-lg" />
            <Skeleton className="h-14 sm:h-16 rounded-lg" />
            <Skeleton className="h-14 sm:h-16 rounded-lg" />
          </div>
          <Skeleton className="h-12 sm:h-14 rounded-lg" />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-3 sm:pt-4">
          <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
          <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// FrequencyControlsSkeleton - Skeleton for frequency controls panel
// ============================================================================

interface FrequencyControlsSkeletonProps {
  /** Additional class names */
  className?: string
}

export function FrequencyControlsSkeleton({
  className,
}: FrequencyControlsSkeletonProps) {
  return (
    <Card className={cn('p-4 sm:p-6', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Turma Selector */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Date Navigation */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-10" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </div>

        {/* Period View Toggle */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Summary Stats */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-14" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-16 rounded-md" />
            <Skeleton className="h-10 w-16 rounded-md" />
            <Skeleton className="h-10 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </Card>
  )
}

// ============================================================================
// DiaryPageSkeleton - Full page skeleton for initial load
// ============================================================================

interface DiaryPageSkeletonProps {
  /** Type of diary page */
  pageType?: 'diario' | 'frequencia'
  /** Additional class names */
  className?: string
}

export function DiaryPageSkeleton({
  pageType = 'diario',
  className,
}: DiaryPageSkeletonProps) {
  if (pageType === 'frequencia') {
    return (
      <div className={cn('space-y-6 pb-24', className)}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>

        {/* User Info Alert */}
        <Skeleton className="h-14 w-full rounded-lg" />

        {/* Controls Panel */}
        <FrequencyControlsSkeleton />

        {/* Attendance Grid */}
        <AttendanceGridSkeleton studentCount={8} />

        {/* Legend */}
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    )
  }

  // Default: Diario page skeleton
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-4 w-56" />
        </div>
        {/* Turma Selector */}
        <Skeleton className="h-10 w-full md:w-52 rounded-md" />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lesson List (2/3) */}
        <div className="lg:col-span-2">
          {/* Subheader */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-36" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="hidden lg:block h-10 w-10 rounded-md" />
            </div>
          </div>

          {/* Lesson Cards */}
          <LessonCardListSkeleton count={5} />
        </div>

        {/* Right Column - Detail Panel (1/3) */}
        <div className="hidden lg:block">
          <LessonDetailPanelSkeleton />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// RiskAlertSkeleton - Skeleton for risk alert component
// ============================================================================

interface RiskAlertSkeletonProps {
  /** Number of student items */
  studentCount?: number
  /** Additional class names */
  className?: string
}

export function RiskAlertSkeleton({
  studentCount = 3,
  className,
}: RiskAlertSkeletonProps) {
  return (
    <Card className={cn('border-yellow-200 bg-yellow-50', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: studentCount }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-100"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Export all skeletons
// ============================================================================

export {
  LessonCardSkeleton as LessonCardSkeletonAlias,
  AttendanceRowSkeleton as AttendanceRowSkeletonAlias,
}
