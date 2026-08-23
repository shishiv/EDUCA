'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import type { DashboardAlert } from '@/app/api/dashboard/alerts/route'

const alertConfig = {
  warning: { icon: AlertCircle, tone: 'warning' },
  error: { icon: AlertTriangle, tone: 'error' },
  info: { icon: Info, tone: 'info' },
  success: { icon: TrendingUp, tone: 'success' },
} as const

export function AlertasCard() {
  const t = useTranslations('platform.dashboard')
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setLoadError(false)

    try {
      const response = await fetch('/api/dashboard/alerts')
      if (!response.ok) throw new Error(`Dashboard alerts returned ${response.status}`)
      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAlerts()
  }, [fetchAlerts])

  return (
    <section className="app-panel app-alerts" aria-labelledby="alerts-title">
      <header className="app-panel__header">
        <div>
          <h2 id="alerts-title">{t('alertsTitle')}</h2>
          <p>{t('alertsSubtitle')}</p>
        </div>
        {!loading && !loadError && alerts.length > 0 ? (
          <span className="app-alerts__count">{alerts.length > 9 ? '9+' : alerts.length}</span>
        ) : null}
      </header>

      {loading ? (
        <div className="app-alerts__loading" aria-busy="true" aria-label={t('alertsLoading')}>
          {[0, 1, 2].map(item => <div key={item} className="app-skeleton h-[4.5rem]" />)}
        </div>
      ) : loadError ? (
        <div className="app-alerts__state" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>{t('alertsUnavailable')}</strong>
            <p>{t('alertsLoadError')}</p>
            <button type="button" onClick={() => void fetchAlerts()}>
              <RefreshCw aria-hidden="true" /> {t('retry')}
            </button>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="app-alerts__state app-alerts__state--success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <strong>{t('noAlerts')}</strong>
            <p>{t('noAlertsDescription')}</p>
          </div>
        </div>
      ) : (
        <ul className="app-alert-list">
          {alerts.slice(0, 4).map(alert => {
            const config = alertConfig[alert.type]
            const Icon = config.icon

            return (
              <li key={alert.id} className="app-alert-row" data-tone={config.tone}>
                <span className="app-alert-row__icon"><Icon aria-hidden="true" /></span>
                <span className="app-alert-row__copy">
                  <strong>{alert.title}</strong>
                  <small>{alert.description}</small>
                  {alert.action ? (
                    <Link href={alert.action.href}>
                      {alert.action.label} <ArrowRight aria-hidden="true" />
                    </Link>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
