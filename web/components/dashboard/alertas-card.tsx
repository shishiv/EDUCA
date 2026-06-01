'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Clock, TrendingUp, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import type { DashboardAlert } from '@/app/api/dashboard/alerts/route'

const alertConfig = {
  warning: {
    icon: AlertCircle,
    containerClass: 'bg-jardim-yellow-100 border-jardim-yellow-300',
    iconClass: 'bg-jardim-yellow-400',
  },
  error: {
    icon: AlertTriangle,
    containerClass: 'bg-red-50 border-red-200',
    iconClass: 'bg-red-500',
  },
  info: {
    icon: Info,
    containerClass: 'bg-jardim-blue-50 border-jardim-blue-100',
    iconClass: 'bg-jardim-blue-500',
  },
  success: {
    icon: TrendingUp,
    containerClass: 'bg-jardim-green-50 border-jardim-green-100',
    iconClass: 'bg-jardim-green-500',
  },
}

export function AlertasCard() {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/dashboard/alerts')
        if (res.ok) {
          const data = await res.json()
          setAlerts(data.alerts || [])
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  if (loading) {
    return (
      <Card className="bg-white rounded-card border border-gray-200 shadow-card">
        <CardHeader className="border-b border-gray-100 px-6 py-5">
          <CardTitle className="font-display font-semibold text-gray-800">
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white rounded-card border border-gray-200 shadow-card">
      <CardHeader className="border-b border-gray-100 px-6 py-5">
        <CardTitle className="font-display font-semibold text-gray-800">
          Alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-3">
        {alerts.length === 0 ? (
          <div className="flex items-start gap-3 p-3 bg-jardim-green-50 border border-jardim-green-100 rounded-xl">
            <div className="w-8 h-8 bg-jardim-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-800">
                <strong>Tudo certo!</strong> Nenhum alerta no momento.
              </p>
            </div>
          </div>
        ) : (
          alerts.slice(0, 4).map((alert) => {
            const config = alertConfig[alert.type]
            const Icon = config.icon
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 border rounded-xl ${config.containerClass}`}
              >
                <div className={`w-8 h-8 ${config.iconClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
                  <p className="text-sm text-gray-600">{alert.description}</p>
                  {alert.action && (
                    <Link
                      href={alert.action.href}
                      className="text-xs text-jardim-green-600 hover:underline mt-1 inline-block"
                    >
                      {alert.action.label} →
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
