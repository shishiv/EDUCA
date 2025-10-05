'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

/**
 * Enhanced session status type with three-phase workflow
 * PLANEJADA → ABERTA → FECHADA (or CANCELADA)
 */
export interface SessaoStatus {
  id: string
  turma_id: string
  professor_id: string
  escola_id: string
  disciplina_id?: string
  data_aula: string
  hora_inicio?: string
  hora_fim?: string

  // Three-phase workflow status
  status: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'

  // Timestamps for legal compliance
  criada_em: string
  aberta_em?: string
  fechada_em?: string
  cancelada_em?: string

  // Brazilian compliance fields
  auto_fechamento_agendado?: string
  observacoes_fechamento?: string
  conteudo_ministrado?: string
  hash_legal?: string

  created_at: string
  updated_at: string
}

interface SessaoRealtimeState {
  sessao: SessaoStatus | null
  loading: boolean
  error: string | null
  remainingMinutes: number | null
  autoCloseTime: string | null
}

interface UseSessaoRealtimeOptions {
  turmaId: string
  professorId: string
  sessaoId?: string
  enableAutoRefresh?: boolean
  onStatusChange?: (sessao: SessaoStatus | null) => void
  onError?: (error: string) => void
}

/**
 * Enhanced real-time hook for sessoes_aula table
 * Supports three-phase workflow and auto-closure scheduling
 */
export function useSessaoRealtime({
  turmaId,
  professorId,
  sessaoId,
  enableAutoRefresh = true,
  onStatusChange,
  onError
}: UseSessaoRealtimeOptions) {
  const [state, setState] = useState<SessaoRealtimeState>({
    sessao: null,
    loading: true,
    error: null,
    remainingMinutes: null,
    autoCloseTime: null
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Calculate remaining time until auto-closure (6 PM São Paulo)
   */
  const calculateRemainingTime = useCallback((sessao: SessaoStatus): number | null => {
    if (!sessao || sessao.status !== 'ABERTA') return null

    const autoCloseTime = sessao.auto_fechamento_agendado
      ? new Date(sessao.auto_fechamento_agendado)
      : null

    if (!autoCloseTime) return null

    const now = new Date()
    const remainingMs = autoCloseTime.getTime() - now.getTime()

    if (remainingMs <= 0) return 0

    return Math.floor(remainingMs / (1000 * 60)) // Convert to minutes
  }, [])

  /**
   * Fetch current session status from database
   */
  const fetchSessaoStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      if (!sessaoId) {
        // Find today's session for this class and teacher
        const hoje = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('sessoes_aula')
          .select('*')
          .eq('turma_id', turmaId)
          .eq('professor_id', professorId)
          .eq('data_aula', hoje)
          .order('criada_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          throw error
        }

        const sessao = data as SessaoStatus | null
        const remainingMinutes = sessao ? calculateRemainingTime(sessao) : null
        const autoCloseTime = sessao?.auto_fechamento_agendado
          ? new Date(sessao.auto_fechamento_agendado).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo'
            })
          : null

        setState(prev => ({
          ...prev,
          sessao,
          remainingMinutes,
          autoCloseTime,
          loading: false
        }))

        onStatusChange?.(sessao)

      } else {
        // Fetch specific session by ID
        const { data, error } = await supabase
          .from('sessoes_aula')
          .select('*')
          .eq('id', sessaoId)
          .single()

        if (error) {
          throw error
        }

        const sessao = data as SessaoStatus
        const remainingMinutes = calculateRemainingTime(sessao)
        const autoCloseTime = sessao.auto_fechamento_agendado
          ? new Date(sessao.auto_fechamento_agendado).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo'
            })
          : null

        setState(prev => ({
          ...prev,
          sessao,
          remainingMinutes,
          autoCloseTime,
          loading: false
        }))

        onStatusChange?.(sessao)
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao buscar status da sessão'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      onError?.(errorMessage)
    }
  }, [turmaId, professorId, sessaoId, calculateRemainingTime, onStatusChange, onError])

  /**
   * Handle real-time database updates
   */
  const handleRealtimeUpdate = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    // Only handle changes relevant to this teacher and class
    const isRelevant = (record: any) =>
      record?.turma_id === turmaId && record?.professor_id === professorId

    switch (eventType) {
      case 'INSERT':
        if (isRelevant(newRecord)) {
          const sessao = newRecord as SessaoStatus
          const remainingMinutes = calculateRemainingTime(sessao)
          const autoCloseTime = sessao.auto_fechamento_agendado
            ? new Date(sessao.auto_fechamento_agendado).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
              })
            : null

          setState(prev => ({ ...prev, sessao, remainingMinutes, autoCloseTime }))
          onStatusChange?.(sessao)

          logger.info(`Sessão ${sessao.status}: ${sessao.id}`)
        }
        break

      case 'UPDATE':
        if (isRelevant(newRecord)) {
          const sessao = newRecord as SessaoStatus
          const remainingMinutes = calculateRemainingTime(sessao)
          const autoCloseTime = sessao.auto_fechamento_agendado
            ? new Date(sessao.auto_fechamento_agendado).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
              })
            : null

          setState(prev => ({ ...prev, sessao, remainingMinutes, autoCloseTime }))
          onStatusChange?.(sessao)

          logger.info(`Sessão atualizada: ${oldRecord.status} → ${sessao.status}`)
        }
        break

      case 'DELETE':
        if (isRelevant(oldRecord)) {
          setState(prev => ({ ...prev, sessao: null, remainingMinutes: null, autoCloseTime: null }))
          onStatusChange?.(null)

          logger.info(`Sessão deletada: ${oldRecord.id}`)
        }
        break
    }
  }, [turmaId, professorId, calculateRemainingTime, onStatusChange])

  /**
   * Setup real-time subscription to sessoes_aula table
   */
  const setupRealTimeSubscription = useCallback(() => {
    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create new subscription
    const channel = supabase
      .channel(`sessoes_aula:turma_id=eq.${turmaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessoes_aula',
          filter: `turma_id=eq.${turmaId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Real-time subscription active for sessoes_aula')
        } else if (status === 'CLOSED') {
          logger.info('Real-time subscription closed')
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Real-time subscription error')
          setState(prev => ({ ...prev, error: 'Erro na conexão em tempo real' }))
        }
      })

    channelRef.current = channel
  }, [turmaId, handleRealtimeUpdate])

  /**
   * Start countdown timer for auto-closure
   */
  const startCountdownTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.sessao || prev.sessao.status !== 'ABERTA') {
          return prev
        }

        const newRemainingMinutes = calculateRemainingTime(prev.sessao)

        // If time expired, optimistically update to FECHADA
        if (newRemainingMinutes !== null && newRemainingMinutes <= 0) {
          logger.info('Auto-closure time reached, session should be FECHADA')

          // The backend auto-closure job will update the database
          // This is just an optimistic UI update
          return {
            ...prev,
            remainingMinutes: 0,
            sessao: {
              ...prev.sessao,
              status: 'FECHADA' as const,
              fechada_em: new Date().toISOString()
            }
          }
        }

        return {
          ...prev,
          remainingMinutes: newRemainingMinutes
        }
      })
    }, 60000) // Update every minute
  }, [calculateRemainingTime])

  /**
   * Manual refresh function
   */
  const refreshStatus = useCallback(() => {
    fetchSessaoStatus()
  }, [fetchSessaoStatus])

  /**
   * Initialize on mount
   */
  useEffect(() => {
    fetchSessaoStatus()

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
  }, [fetchSessaoStatus, enableAutoRefresh, setupRealTimeSubscription])

  /**
   * Start countdown timer when session becomes ABERTA
   */
  useEffect(() => {
    if (state.sessao?.status === 'ABERTA') {
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
  }, [state.sessao?.status, startCountdownTimer])

  return {
    sessao: state.sessao,
    loading: state.loading,
    error: state.error,
    remainingMinutes: state.remainingMinutes,
    autoCloseTime: state.autoCloseTime,
    refreshStatus,

    // Convenience status flags
    isPlanejada: state.sessao?.status === 'PLANEJADA',
    isAberta: state.sessao?.status === 'ABERTA',
    isFechada: state.sessao?.status === 'FECHADA',
    isCancelada: state.sessao?.status === 'CANCELADA',

    // Warning flag for approaching auto-closure
    isApproachingClosure: state.remainingMinutes !== null && state.remainingMinutes <= 30 && state.remainingMinutes > 0
  }
}
