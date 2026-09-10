'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useEscola } from '@/contexts/escola-context'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import {
  createSupabaseSessionSource,
  SessionRealtimeManager,
  type SessionConnectionStatus,
} from '@/lib/realtime/session-realtime'

const source = createSupabaseSessionSource(supabase)
const SessionRealtimeContext = createContext<{ connectionStatus: SessionConnectionStatus } | null>(null)

interface SessionRealtimeProviderProps {
  children: ReactNode
  user: { id: string; tipo_usuario: string; escola_id: string | null }
}

export function SessionRealtimeProvider({ children, user }: SessionRealtimeProviderProps) {
  const t = useTranslations('layout.realtime')
  const { selectedEscolaId } = useEscola()
  const schoolId = selectedEscolaId ?? user.escola_id
  const teacherId = user.tipo_usuario === 'professor' ? user.id : null
  const [connectionStatus, setConnectionStatus] = useState<SessionConnectionStatus>('disconnected')

  useEffect(() => {
    const manager = new SessionRealtimeManager(source, {
      onConnectionStatus: setConnectionStatus,
      onSessionLocked: () => { toast.info(t('sessionLocked')) },
    })
    const reportFailure = (error: Error) => {
      logger.error('Session realtime connection failed', error)
      setConnectionStatus('error')
    }
    const connect = () => {
      void manager.reconnect().catch(error => reportFailure(error instanceof Error ? error : new Error(String(error))))
    }
    const disconnect = () => setConnectionStatus('disconnected')
    void manager.subscribe({ schoolId, teacherId })
      .catch(error => reportFailure(error instanceof Error ? error : new Error(String(error))))
    window.addEventListener('online', connect)
    window.addEventListener('offline', disconnect)
    return () => {
      window.removeEventListener('online', connect)
      window.removeEventListener('offline', disconnect)
      void manager.dispose().catch(error => {
        logger.error('Session realtime cleanup failed', error instanceof Error ? error : new Error(String(error)))
      })
    }
  }, [schoolId, teacherId, t])

  return <SessionRealtimeContext.Provider value={{ connectionStatus }}>{children}</SessionRealtimeContext.Provider>
}

export function useSessionRealtime() {
  const context = useContext(SessionRealtimeContext)
  if (!context) throw new Error('useSessionRealtime must be used within a SessionRealtimeProvider')
  return context
}
