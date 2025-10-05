'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export interface AulaStatus {
  id: string
  turma_id: string
  professor_id: string
  aberta_em: string
  fechada_em?: string
  status: 'aberta' | 'fechada' | 'travada'
  observacoes?: string
  tempo_limite_minutos: number
  travada_automaticamente?: boolean
  travada_em?: string
  conteudo_programatico?: string
  created_at: string
  updated_at: string
}

interface AulaRealtimeState {
  status: AulaStatus | null
  loading: boolean
  error: string | null
  remainingTime: number | null
}

interface UseAulaRealtimeOptions {
  turmaId: string
  professorId: string
  aulaId?: string
  enableAutoRefresh?: boolean
  onStatusChange?: (status: AulaStatus | null) => void
  onError?: (error: string) => void
}

export function useAulaRealtime({
  turmaId,
  professorId,
  aulaId,
  enableAutoRefresh = true,
  onStatusChange,
  onError
}: UseAulaRealtimeOptions) {
  const [state, setState] = useState<AulaRealtimeState>({
    status: null,
    loading: true,
    error: null,
    remainingTime: null
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const calculateRemainingTime = useCallback((aulaStatus: AulaStatus): number | null => {
    if (!aulaStatus || aulaStatus.status !== 'aberta') return null

    const abertaEm = new Date(aulaStatus.aberta_em)
    const tempoLimiteMs = aulaStatus.tempo_limite_minutos * 60 * 1000
    const agora = new Date()
    const tempoDecorridoMs = agora.getTime() - abertaEm.getTime()
    const tempoRestanteMs = tempoLimiteMs - tempoDecorridoMs

    if (tempoRestanteMs <= 0) return 0

    return Math.floor(tempoRestanteMs / (1000 * 60)) // minutes
  }, [])

  const fetchAulaStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      if (!aulaId) {
        // Try to find active session for today
        const hoje = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('aulas_abertas')
          .select('*')
          .eq('turma_id', turmaId)
          .eq('professor_id', professorId)
          .gte('aberta_em', `${hoje}T00:00:00`)
          .lt('aberta_em', `${hoje}T23:59:59`)
          .order('aberta_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          throw error
        }

        const aulaStatus = data as AulaStatus | null
        const remainingTime = aulaStatus ? calculateRemainingTime(aulaStatus) : null

        setState(prev => ({
          ...prev,
          status: aulaStatus,
          remainingTime,
          loading: false
        }))

        onStatusChange?.(aulaStatus)

      } else {
        // Fetch specific session
        const { data, error } = await supabase
          .from('aulas_abertas')
          .select('*')
          .eq('id', aulaId)
          .single()

        if (error) {
          throw error
        }

        const aulaStatus = data as AulaStatus
        const remainingTime = calculateRemainingTime(aulaStatus)

        setState(prev => ({
          ...prev,
          status: aulaStatus,
          remainingTime,
          loading: false
        }))

        onStatusChange?.(aulaStatus)
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao buscar status da aula'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      onError?.(errorMessage)
    }
  }, [turmaId, professorId, aulaId, calculateRemainingTime, onStatusChange, onError])

  const handleRealtimeUpdate = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    // Only handle changes relevant to this teacher and class
    const isRelevant = (record: any) =>
      record?.turma_id === turmaId && record?.professor_id === professorId

    switch (eventType) {
      case 'INSERT':
        if (isRelevant(newRecord)) {
          const aulaStatus = newRecord as AulaStatus
          const remainingTime = calculateRemainingTime(aulaStatus)
          setState(prev => ({ ...prev, status: aulaStatus, remainingTime }))
          onStatusChange?.(aulaStatus)
        }
        break

      case 'UPDATE':
        if (isRelevant(newRecord)) {
          const aulaStatus = newRecord as AulaStatus
          const remainingTime = calculateRemainingTime(aulaStatus)
          setState(prev => ({ ...prev, status: aulaStatus, remainingTime }))
          onStatusChange?.(aulaStatus)
        }
        break

      case 'DELETE':
        if (isRelevant(oldRecord)) {
          setState(prev => ({ ...prev, status: null, remainingTime: null }))
          onStatusChange?.(null)
        }
        break
    }
  }, [turmaId, professorId, calculateRemainingTime, onStatusChange])

  const setupRealTimeSubscription = useCallback(() => {
    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create new subscription
    const channel = supabase
      .channel(`aulas_abertas:turma_id=eq.${turmaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aulas_abertas',
          filter: `turma_id=eq.${turmaId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Real-time subscription active for aula status')
        } else if (status === 'CLOSED') {
          logger.info('Real-time subscription closed')
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Real-time subscription error')
          setState(prev => ({ ...prev, error: 'Erro na conexão em tempo real' }))
        }
      })

    channelRef.current = channel
  }, [turmaId, handleRealtimeUpdate])

  const startCountdownTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.status || prev.status.status !== 'aberta') {
          return prev
        }

        const newRemainingTime = calculateRemainingTime(prev.status)

        // Auto-lock when time runs out
        if (newRemainingTime !== null && newRemainingTime <= 0) {
          return {
            ...prev,
            remainingTime: 0,
            status: {
              ...prev.status,
              status: 'travada' as const,
              travada_automaticamente: true,
              travada_em: new Date().toISOString()
            }
          }
        }

        return {
          ...prev,
          remainingTime: newRemainingTime
        }
      })
    }, 60000) // Update every minute
  }, [calculateRemainingTime])

  // Manual refresh function
  const refreshStatus = useCallback(() => {
    fetchAulaStatus()
  }, [fetchAulaStatus])

  // Initialize
  useEffect(() => {
    fetchAulaStatus()

    if (enableAutoRefresh) {
      setupRealTimeSubscription()
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [fetchAulaStatus, enableAutoRefresh, setupRealTimeSubscription])

  // Start countdown timer when status becomes 'aberta'
  useEffect(() => {
    if (state.status?.status === 'aberta') {
      startCountdownTimer()
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [state.status?.status, startCountdownTimer])

  return {
    status: state.status,
    loading: state.loading,
    error: state.error,
    remainingTime: state.remainingTime,
    refreshStatus,
    isOpen: state.status?.status === 'aberta',
    isClosed: state.status?.status === 'fechada',
    isLocked: state.status?.status === 'travada'
  }
}