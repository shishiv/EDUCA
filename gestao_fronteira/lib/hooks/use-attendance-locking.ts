/**
 * React Hook for Attendance Locking Management
 * Provides UI state and actions for managing attendance record locks
 */

import { useState, useEffect, useCallback } from 'react'
import { attendanceLocking, LockingStatus, LockingRule, UnlockRequest, UnlockPermission } from '@/lib/services/attendance-locking'
import { toast } from 'sonner'

interface UseAttendanceLockingOptions {
  sessionId: string
  userId: string
  autoRefresh?: boolean
  refreshIntervalMs?: number
}

interface LockingActions {
  // Status management
  refreshStatus: () => Promise<void>

  // Locking actions
  lockSession: (reason: string, ruleId?: string) => Promise<boolean>
  requestUnlock: (request: Omit<UnlockRequest, 'userId'>) => Promise<UnlockPermission>
  executeUnlock: (approvalId?: string, temporary?: boolean, durationMinutes?: number) => Promise<boolean>

  // Rule management
  getRules: () => Promise<LockingRule[]>
  updateRule: (ruleId: string, updates: Partial<LockingRule>) => Promise<boolean>

  // Emergency actions
  requestEmergencyUnlock: (justification: string) => Promise<UnlockPermission>

  // Utility
  formatTimeRemaining: (minutes?: number) => string
  canRequestUnlock: () => boolean
}

export function useAttendanceLocking({
  sessionId,
  userId,
  autoRefresh = true,
  refreshIntervalMs = 30000 // 30 seconds
}: UseAttendanceLockingOptions) {
  const [lockingStatus, setLockingStatus] = useState<LockingStatus | null>(null)
  const [lockingRules, setLockingRules] = useState<LockingRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !sessionId) return

    const interval = setInterval(() => {
      refreshStatus()
    }, refreshIntervalMs)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshIntervalMs, sessionId])

  // Initial load
  useEffect(() => {
    if (sessionId) {
      refreshStatus()
      loadRules()
    }
  }, [sessionId])

  // Refresh locking status
  const refreshStatus = useCallback(async () => {
    if (!sessionId) return

    setLoading(true)
    setError(null)

    try {
      const status = await attendanceLocking.getSessionLockingStatus(sessionId)
      setLockingStatus(status)
      setLastRefresh(new Date().toISOString())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      toast.error('Erro ao atualizar status de bloqueio: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Load locking rules
  const loadRules = useCallback(async () => {
    try {
      const rules = await attendanceLocking.getLockingRules()
      setLockingRules(rules)
    } catch (err) {
      console.warn('Failed to load locking rules:', err)
    }
  }, [])

  // Manual lock session
  const lockSession = useCallback(async (reason: string, ruleId?: string): Promise<boolean> => {
    if (!sessionId || !userId) return false

    setLoading(true)

    try {
      const result = await attendanceLocking.lockSession(sessionId, userId, reason, ruleId)

      if (result.success) {
        toast.success('Sessão bloqueada com sucesso')
        await refreshStatus()
        return true
      } else {
        toast.error(result.error || 'Erro ao bloquear sessão')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      toast.error('Erro ao bloquear: ' + errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [sessionId, userId, refreshStatus])

  // Request session unlock
  const requestUnlock = useCallback(async (
    request: Omit<UnlockRequest, 'userId'>
  ): Promise<UnlockPermission> => {
    if (!sessionId || !userId) {
      return {
        allowed: false,
        reason: 'Dados de sessão ou usuário não disponíveis'
      }
    }

    setLoading(true)

    try {
      const permission = await attendanceLocking.requestUnlock({
        ...request,
        sessionId,
        userId
      })

      if (permission.allowed) {
        toast.success('Solicitação de desbloqueio aprovada')
      } else if (permission.requiresApproval) {
        toast.info('Desbloqueio requer aprovação administrativa')
      } else {
        toast.warning(permission.reason || 'Desbloqueio não permitido')
      }

      return permission
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      toast.error('Erro na solicitação: ' + errorMessage)

      return {
        allowed: false,
        reason: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }, [sessionId, userId])

  // Execute approved unlock
  const executeUnlock = useCallback(async (
    approvalId?: string,
    temporary = false,
    durationMinutes = 60
  ): Promise<boolean> => {
    if (!sessionId || !userId) return false

    setLoading(true)

    try {
      const result = await attendanceLocking.executeUnlock(
        sessionId,
        userId,
        approvalId,
        temporary,
        durationMinutes
      )

      if (result.success) {
        const message = temporary
          ? `Desbloqueio temporário aplicado (${durationMinutes} minutos)`
          : 'Sessão desbloqueada com sucesso'

        toast.success(message)

        if (result.temporaryUntil) {
          const unlockUntil = new Date(result.temporaryUntil).toLocaleTimeString('pt-BR')
          toast.info(`Desbloqueio válido até: ${unlockUntil}`)
        }

        await refreshStatus()
        return true
      } else {
        toast.error(result.error || 'Erro ao desbloquear sessão')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      toast.error('Erro ao desbloquear: ' + errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [sessionId, userId, refreshStatus])

  // Get locking rules
  const getRules = useCallback(async (): Promise<LockingRule[]> => {
    try {
      const rules = await attendanceLocking.getLockingRules()
      setLockingRules(rules)
      return rules
    } catch (err) {
      console.warn('Failed to get locking rules:', err)
      return []
    }
  }, [])

  // Update locking rule
  const updateRule = useCallback(async (
    ruleId: string,
    updates: Partial<LockingRule>
  ): Promise<boolean> => {
    try {
      const result = await attendanceLocking.updateLockingRule(ruleId, updates)

      if (result.success) {
        toast.success('Regra atualizada com sucesso')
        await loadRules()
        return true
      } else {
        toast.error(result.error || 'Erro ao atualizar regra')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      toast.error('Erro ao atualizar regra: ' + errorMessage)
      return false
    }
  }, [loadRules])

  // Emergency unlock request
  const requestEmergencyUnlock = useCallback(async (
    justification: string
  ): Promise<UnlockPermission> => {
    return requestUnlock({
      sessionId,
      reason: 'Desbloqueio emergencial',
      justification,
      emergency: true
    })
  }, [sessionId, requestUnlock])

  // Format time remaining
  const formatTimeRemaining = useCallback((minutes?: number): string => {
    if (!minutes || minutes <= 0) return 'Expirado'

    if (minutes < 60) {
      return `${minutes} minuto${minutes !== 1 ? 's' : ''}`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    let result = `${hours} hora${hours !== 1 ? 's' : ''}`
    if (remainingMinutes > 0) {
      result += ` e ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`
    }

    return result
  }, [])

  // Check if user can request unlock
  const canRequestUnlock = useCallback((): boolean => {
    if (!lockingStatus || !lockingStatus.isLocked) return false

    // Check if in grace period
    if (lockingStatus.remainingGracePeriod && lockingStatus.remainingGracePeriod > 0) {
      return true
    }

    // Check user permissions
    return lockingStatus.canUnlock
  }, [lockingStatus])

  // Actions object
  const actions: LockingActions = {
    refreshStatus,
    lockSession,
    requestUnlock,
    executeUnlock,
    getRules,
    updateRule,
    requestEmergencyUnlock,
    formatTimeRemaining,
    canRequestUnlock
  }

  // Computed properties
  const isInGracePeriod = lockingStatus?.remainingGracePeriod && lockingStatus.remainingGracePeriod > 0
  const hasActiveMandatoryLocks = lockingStatus?.activeLockingRules.some(
    rule => rule.complianceLevel === 'mandatory'
  ) || false

  const lockingSummary = lockingStatus ? {
    isLocked: lockingStatus.isLocked,
    canUnlock: lockingStatus.canUnlock,
    isInGracePeriod,
    hasActiveMandatoryLocks,
    timeUntilNextLock: lockingStatus.nextAutoLock
      ? Math.ceil((new Date(lockingStatus.nextAutoLock).getTime() - Date.now()) / 60000)
      : null,
    primaryLockReason: lockingStatus.lockingReason,
    lockCount: lockingStatus.activeLockingRules.length
  } : null

  return {
    // State
    lockingStatus,
    lockingRules,
    loading,
    error,
    lastRefresh,

    // Computed
    lockingSummary,
    isInGracePeriod,
    hasActiveMandatoryLocks,

    // Actions
    actions
  }
}