'use client'

import { ReactNode } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from './skeleton'
import { Button } from './button'

// Basic loading spinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <Loader2
      className={cn('animate-spin text-primary', sizeClasses[size], className)}
    />
  )
}

// Centered loading state
interface LoadingCenterProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingCenter({
  message = 'Carregando...',
  size = 'md',
  className
}: LoadingCenterProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <LoadingSpinner size={size} />
      {message && (
        <p className="mt-3 text-sm text-gray-600 text-center">{message}</p>
      )}
    </div>
  )
}

// Page loading state
interface PageLoadingProps {
  title?: string
  message?: string
}

export function PageLoading({
  title = 'Carregando',
  message = 'Aguarde enquanto carregamos os dados...'
}: PageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600 max-w-sm">{message}</p>
      </div>
    </div>
  )
}

// Table loading skeleton
interface TableLoadingProps {
  rows?: number
  columns?: number
  showHeader?: boolean
}

export function TableLoading({ rows = 5, columns = 4, showHeader = true }: TableLoadingProps) {
  return (
    <div className="w-full">
      {showHeader && (
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-8 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Card loading skeleton
export function CardLoading() {
  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}

// List loading skeleton
interface ListLoadingProps {
  items?: number
}

export function ListLoading({ items = 5 }: ListLoadingProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

// Button loading state
interface LoadingButtonProps {
  loading?: boolean
  children: ReactNode
  className?: string
  [key: string]: any
}

export function LoadingButton({
  loading = false,
  children,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      {...props}
      disabled={loading || props.disabled}
      className={className}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </Button>
  )
}

// Inline loading state for async operations
interface InlineLoadingProps {
  loading: boolean
  children: ReactNode
  fallback?: ReactNode
  className?: string
}

export function InlineLoading({
  loading,
  children,
  fallback,
  className
}: InlineLoadingProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {fallback || (
          <>
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-600">Carregando...</span>
          </>
        )}
      </div>
    )
  }

  return <>{children}</>
}

// Refresh button with loading state
interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>
  loading?: boolean
  className?: string
}

export function RefreshButton({ onRefresh, loading = false, className }: RefreshButtonProps) {
  const handleRefresh = async () => {
    try {
      await onRefresh()
    } catch (error) {
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={loading}
      className={className}
    >
      <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      {loading ? 'Atualizando...' : 'Atualizar'}
    </Button>
  )
}

// Full screen overlay loading
interface OverlayLoadingProps {
  show: boolean
  message?: string
  onCancel?: () => void
}

export function OverlayLoading({
  show,
  message = 'Processando...',
  onCancel
}: OverlayLoadingProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
        <LoadingSpinner size="lg" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Aguarde</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>

        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="mt-4 w-full"
          >
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}