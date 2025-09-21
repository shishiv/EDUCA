/**
 * Brazilian Compliance Warning Banner
 * Critical alerts for educational compliance violations
 * Automatic "Não existe o esquecer" enforcement notifications
 */

'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, X, Clock, Shield, FileText, Eye, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Types
interface ComplianceWarning {
  id: string
  type: 'critical' | 'warning' | 'info'
  category: 'attendance_lock' | 'inep_deadline' | 'educacenso_missing' | 'lgpd_violation' | 'bolsa_familia_risk'
  title: string
  message: string
  deadline?: Date
  actionRequired: boolean
  actionUrl?: string
  actionText?: string
  dismissible: boolean
  autoHide?: number // milliseconds
  created_at: Date
}

interface ComplianceWarningBannerProps {
  warnings?: ComplianceWarning[]
  position?: 'top' | 'bottom' | 'inline'
  maxVisible?: number
  autoRefresh?: boolean
  refreshInterval?: number
  onWarningClick?: (warning: ComplianceWarning) => void
  onWarningDismiss?: (warningId: string) => void
}

// Mock warnings data - In production, this would come from real compliance monitoring
const mockWarnings: ComplianceWarning[] = [
  {
    id: 'attendance-lock-pending',
    type: 'critical',
    category: 'attendance_lock',
    title: 'Bloqueio Automático de Frequência',
    message: 'As sessões de hoje serão bloqueadas automaticamente às 18:00. Confirme toda a frequência antes deste horário.',
    deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    actionRequired: true,
    actionUrl: '/dashboard/frequencia',
    actionText: 'Verificar Frequência',
    dismissible: false,
    created_at: new Date()
  },
  {
    id: 'educacenso-deadline',
    type: 'warning',
    category: 'educacenso_missing',
    title: 'Prazo Educacenso 2025',
    message: 'Primeira etapa de coleta termina em 15 dias. Verifique se todos os dados de matrícula estão atualizados.',
    deadline: new Date('2025-07-31'),
    actionRequired: true,
    actionUrl: '/dashboard/relatorios/educacenso',
    actionText: 'Revisar Dados',
    dismissible: true,
    created_at: new Date()
  },
  {
    id: 'inep-compliance',
    type: 'info',
    category: 'inep_deadline',
    title: 'INEP - Dados Atualizados',
    message: 'Todos os requisitos do Censo Escolar estão em conformidade. Próxima verificação em 30 dias.',
    actionRequired: false,
    dismissible: true,
    autoHide: 10000,
    created_at: new Date()
  }
]

export default function ComplianceWarningBanner({
  warnings = mockWarnings,
  position = 'top',
  maxVisible = 3,
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes
  onWarningClick,
  onWarningDismiss
}: ComplianceWarningBannerProps) {
  const [visibleWarnings, setVisibleWarnings] = useState<ComplianceWarning[]>(warnings)
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set())

  // Auto-refresh warnings
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // In production, this would fetch from API
      console.log('Refreshing compliance warnings...')
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Auto-hide warnings
  useEffect(() => {
    warnings.forEach(warning => {
      if (warning.autoHide && !dismissedWarnings.has(warning.id)) {
        setTimeout(() => {
          handleDismiss(warning.id)
        }, warning.autoHide)
      }
    })
  }, [warnings, dismissedWarnings])

  // Filter and limit visible warnings
  useEffect(() => {
    const filtered = warnings
      .filter(warning => !dismissedWarnings.has(warning.id))
      .sort((a, b) => {
        // Sort by priority: critical > warning > info
        const priority = { critical: 3, warning: 2, info: 1 }
        return priority[b.type] - priority[a.type]
      })
      .slice(0, maxVisible)

    setVisibleWarnings(filtered)
  }, [warnings, dismissedWarnings, maxVisible])

  const handleDismiss = (warningId: string) => {
    if (onWarningDismiss) {
      onWarningDismiss(warningId)
    }
    setDismissedWarnings(prev => new Set(prev).add(warningId))
  }

  const handleWarningClick = (warning: ComplianceWarning) => {
    if (onWarningClick) {
      onWarningClick(warning)
    } else if (warning.actionUrl) {
      window.location.href = warning.actionUrl
    }
  }

  const getWarningStyles = (type: ComplianceWarning['type']) => {
    switch (type) {
      case 'critical':
        return {
          container: 'border-red-200 bg-red-50',
          icon: 'text-red-600',
          title: 'text-red-800 font-semibold',
          message: 'text-red-700',
          badge: 'bg-red-100 text-red-800 border-red-200'
        }
      case 'warning':
        return {
          container: 'border-yellow-200 bg-yellow-50',
          icon: 'text-yellow-600',
          title: 'text-yellow-800 font-semibold',
          message: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }
      case 'info':
        return {
          container: 'border-blue-200 bg-blue-50',
          icon: 'text-blue-600',
          title: 'text-blue-800 font-semibold',
          message: 'text-blue-700',
          badge: 'bg-blue-100 text-blue-800 border-blue-200'
        }
      default:
        return {
          container: 'border-gray-200 bg-gray-50',
          icon: 'text-gray-600',
          title: 'text-gray-800 font-semibold',
          message: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }
  }

  const getCategoryIcon = (category: ComplianceWarning['category']) => {
    switch (category) {
      case 'attendance_lock': return <Clock className="h-5 w-5" />
      case 'inep_deadline': return <FileText className="h-5 w-5" />
      case 'educacenso_missing': return <FileText className="h-5 w-5" />
      case 'lgpd_violation': return <Shield className="h-5 w-5" />
      case 'bolsa_familia_risk': return <Eye className="h-5 w-5" />
      default: return <AlertTriangle className="h-5 w-5" />
    }
  }

  const formatTimeRemaining = (deadline: Date) => {
    const now = new Date()
    const diff = deadline.getTime() - now.getTime()

    if (diff <= 0) return 'Vencido'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} dia${days !== 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hora${hours !== 1 ? 's' : ''}`

    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`
  }

  if (visibleWarnings.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'w-full space-y-2 z-40',
        position === 'top' && 'fixed top-16 left-0 right-0 px-4',
        position === 'bottom' && 'fixed bottom-0 left-0 right-0 px-4 pb-4',
        position === 'inline' && 'relative'
      )}
      data-testid="compliance-warning-banner"
    >
      {visibleWarnings.map((warning) => {
        const styles = getWarningStyles(warning.type)

        return (
          <Alert
            key={warning.id}
            className={cn(
              'relative transition-all duration-300 cursor-pointer',
              styles.container,
              warning.actionRequired && 'ring-2 ring-offset-2',
              warning.type === 'critical' && 'ring-red-300',
              warning.type === 'warning' && 'ring-yellow-300'
            )}
            onClick={() => handleWarningClick(warning)}
            data-testid={`compliance-warning-${warning.id}`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn('mt-0.5', styles.icon)}>
                {getCategoryIcon(warning.category)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className={cn('text-sm', styles.title)}>
                      {warning.title}
                    </h4>
                    <AlertDescription className={cn('mt-1', styles.message)}>
                      {warning.message}
                    </AlertDescription>

                    {/* Deadline info */}
                    {warning.deadline && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={cn('text-xs', styles.badge)}>
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeRemaining(warning.deadline)}
                        </Badge>
                        {warning.actionRequired && (
                          <Badge variant="outline" className="text-xs border-orange-200 bg-orange-50 text-orange-800">
                            Ação Necessária
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Action button */}
                    {warning.actionText && warning.actionUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = warning.actionUrl!
                        }}
                      >
                        {warning.actionText}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>

                  {/* Dismiss button */}
                  {warning.dismissible && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDismiss(warning.id)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress bar for deadlines */}
            {warning.deadline && warning.type === 'critical' && (
              <div className="mt-3 h-1 bg-red-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{
                    width: `${Math.max(0, Math.min(100,
                      (Date.now() - warning.created_at.getTime()) /
                      (warning.deadline.getTime() - warning.created_at.getTime()) * 100
                    ))}%`
                  }}
                />
              </div>
            )}
          </Alert>
        )
      })}
    </div>
  )
}