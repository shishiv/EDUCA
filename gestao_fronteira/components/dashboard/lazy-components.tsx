'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Loading components for better UX during lazy loading
export const StatsCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-24" />
    </CardContent>
  </Card>
)

export const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
)

export const TableSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </CardContent>
  </Card>
)

// Lazy loaded components with loading fallbacks
export const LazyStatsCard = dynamic(
  () => import('./stats-card').then(mod => ({ default: mod.StatsCard })),
  {
    loading: () => <StatsCardSkeleton />,
    ssr: false
  }
)

export const LazyFrequencyChart = dynamic(
  () => import('./frequency-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
)

export const LazyAttendanceGrid = dynamic(
  () => import('../attendance/attendance-grid'),
  {
    loading: () => <TableSkeleton />,
    ssr: false
  }
)

export const LazyStudentDataTable = dynamic(
  () => import('../ui/responsive-data-table').then(mod => ({ default: mod.StudentDataTable })),
  {
    loading: () => <TableSkeleton />,
    ssr: false
  }
)

export const LazyReportsChart = dynamic(
  () => import('../reports/reports-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
)

export const LazyFileUpload = dynamic(
  () => import('../ui/file-upload'),
  {
    loading: () => (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false
  }
)

// Route-specific lazy components for code splitting
export const LazyDashboardStats = dynamic(
  () => import('./dashboard-stats'),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
    ),
    ssr: false
  }
)

export const LazyStudentManagement = dynamic(
  () => import('../students/student-management'),
  {
    loading: () => <TableSkeleton />,
    ssr: false
  }
)

export const LazyAttendanceManagement = dynamic(
  () => import('../attendance/attendance-management'),
  {
    loading: () => <TableSkeleton />,
    ssr: false
  }
)

export const LazyReportsManagement = dynamic(
  () => import('../reports/reports-management'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
)

// Performance monitoring component
export const PerformanceMonitor = dynamic(
  () => import('./performance-monitor'),
  {
    loading: () => null,
    ssr: false
  }
)