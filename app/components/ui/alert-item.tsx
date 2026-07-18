/**
 * AlertItem Component
 * Simple alert item with severity-based styling for dashboard alerts
 */
import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export interface AlertItemProps {
  severity: 'warning' | 'error' | 'info' | 'success'
  children: React.ReactNode
  className?: string
}

const severityConfig = {
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconColor: 'text-amber-500',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-500',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconColor: 'text-green-500',
  },
}

export function AlertItem({ severity, children, className }: AlertItemProps) {
  const config = severityConfig[severity]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        config.bg,
        config.border,
        config.text,
        className
      )}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.iconColor)} />
      <div className="flex-1 text-sm">{children}</div>
    </div>
  )
}
