/**
 * Attendance Locking Mechanism Service
 * Implements time-based and manual locking for attendance records
 * Enforces "não existe o esquecer" principle after daily closure
 */

import { supabase } from '@/lib/supabase'
import { attendanceImmutability } from './attendance-immutability'
import { AttendanceSession } from '@/lib/api/attendance'

export interface LockingRule {
  id: string
  name: string
  description: string
  type: 'time_based' | 'manual' | 'automatic' | 'legal'
  enabled: boolean
  priority: number

  // Time-based rules
  lockTime?: string // HH:MM format (e.g., "18:00")
  timezone?: string // Default: "America/Sao_Paulo"

  // Automatic rules
  autoLockAfterMinutes?: number

  // Legal rules
  legalReference?: string
  complianceLevel: 'mandatory' | 'recommended' | 'optional'
}

export interface LockingStatus {
  sessionId: string
  isLocked: boolean
  lockedAt?: string
  lockedBy?: string
  lockingReason: string
  canUnlock: boolean
  remainingGracePeriod?: number // minutes
  activeLockingRules: LockingRule[]
  nextAutoLock?: string
}

export interface UnlockRequest {
  sessionId: string
  userId: string
  reason: string
  justification: string
  emergency?: boolean
}

export interface UnlockPermission {
  allowed: boolean
  reason?: string
  requiresApproval?: boolean
  approvalWorkflow?: {
    approvers: string[]
    requiredApprovals: number
    timeoutHours: number
  }
  temporaryUnlock?: {
    durationMinutes: number
    restrictions: string[]
  }
}

/**
 * Service for managing attendance record locking and unlocking
 */
export class AttendanceLockingService {
  private readonly BRAZILIAN_TIMEZONE = 'America/Sao_Paulo'
  private readonly DEFAULT_LOCK_TIME = '18:00' // 6 PM Brazilian time
  private readonly GRACE_PERIOD_MINUTES = 30 // Grace period after lock time

  private defaultRules: LockingRule[] = [
    {
      id: 'daily_auto_lock',
      name: 'Fechamento Diário Automático',
      description: 'Bloqueia registros automaticamente às 18:00 (horário brasileiro)',
      type: 'time_based',
      enabled: true,
      priority: 1,
      lockTime: '18:00',
      timezone: this.BRAZILIAN_TIMEZONE,
      complianceLevel: 'mandatory',
      legalReference: 'Lei de Diretrizes e Bases da Educação Nacional'
    },
    {
      id: 'past_date_lock',
      name: 'Bloqueio de Datas Passadas',
      description: 'Impede modificações em registros de dias anteriores',
      type: 'automatic',
      enabled: true,
      priority: 2,
      complianceLevel: 'mandatory',
      legalReference: 'Princípio "não existe o esquecer"'
    },
    {
      id: 'session_closure_lock',
      name: 'Bloqueio por Fechamento de Sessão',
      description: 'Bloqueia registros quando a sessão é oficialmente fechada',
      type: 'manual',
      enabled: true,
      priority: 3,
      complianceLevel: 'mandatory',
      legalReference: 'Integridade de registros educacionais'
    },
    {
      id: 'extended_period_lock',
      name: 'Bloqueio por Período Estendido',
      description: 'Bloqueia automaticamente após 4 horas sem atividade',
      type: 'automatic',
      enabled: false,
      priority: 4,
      autoLockAfterMinutes: 240,
      complianceLevel: 'recommended'
    }
  ]

  /**
   * Check if a session is currently locked
   */
  async getSessionLockingStatus(sessionId: string): Promise<LockingStatus> {
    try {
      // Get session information
      const { data: session, error } = await supabase
        .from('sessoes_aula')
        .select(`
          *,
          turma:turmas(id, nome),
          professor:users(id, nome_completo)
        `)
        .eq('id', sessionId)
        .single()

      if (error || !session) {
        throw new Error('Sessão não encontrada')
      }

      const currentTime = new Date()
      const sessionDate = new Date(session.data_aula)
      const activeLockingRules: LockingRule[] = []
      let isLocked = false
      let lockingReason = ''
      let lockedAt: string | undefined
      let lockedBy: string | undefined

      // Check each locking rule
      for (const rule of this.defaultRules) {
        if (!rule.enabled) continue

        const ruleResult = await this.evaluateLockingRule(rule, session, currentTime)

        if (ruleResult.shouldLock) {
          activeLockingRules.push(rule)

          if (!isLocked || rule.priority < activeLockingRules[0].priority) {
            isLocked = true
            lockingReason = ruleResult.reason
            lockedAt = ruleResult.lockedAt
            lockedBy = ruleResult.lockedBy
          }
        }
      }

      // Check database lock status
      if (session.status === 'fechada') {
        isLocked = true
        lockingReason = 'Sessão oficialmente fechada'
        lockedAt = session.fim_aula ?? session.updated_at ?? undefined
        lockedBy = session.professor_id
      }

      // Calculate grace period
      let remainingGracePeriod: number | undefined
      if (isLocked && activeLockingRules.some(r => r.type === 'time_based')) {
        const lockTime = this.getBrazilianTime()
        const gracePeriodEnd = new Date(lockTime.getTime() + (this.GRACE_PERIOD_MINUTES * 60000))

        if (currentTime < gracePeriodEnd) {
          remainingGracePeriod = Math.ceil((gracePeriodEnd.getTime() - currentTime.getTime()) / 60000)
        }
      }

      // Calculate next auto-lock
      let nextAutoLock: string | undefined
      if (!isLocked) {
        const tomorrow = new Date(currentTime)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(18, 0, 0, 0) // 6 PM tomorrow
        nextAutoLock = tomorrow.toISOString()
      }

      return {
        sessionId,
        isLocked,
        lockedAt,
        lockedBy,
        lockingReason,
        canUnlock: await this.canUnlockSession(sessionId, session.professor_id),
        remainingGracePeriod,
        activeLockingRules,
        nextAutoLock
      }
    } catch (error) {
      throw new Error(`Erro ao verificar status de bloqueio: ${error}`)
    }
  }

  /**
   * Manually lock a session
   */
  async lockSession(
    sessionId: string,
    userId: string,
    reason: string,
    ruleId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate user permissions
      const hasPermission = await this.validateLockPermission(sessionId, userId)
      if (!hasPermission) {
        return {
          success: false,
          error: 'Usuário não tem permissão para bloquear esta sessão'
        }
      }

      // Get session
      const { data: session, error } = await supabase
        .from('sessoes_aula')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error || !session) {
        return {
          success: false,
          error: 'Sessão não encontrada'
        }
      }

      if (session.status === 'fechada') {
        return {
          success: false,
          error: 'Sessão já está fechada'
        }
      }

      // Close session and apply lock
      const now = new Date().toISOString()
      const legalHash = `MANUAL_LOCK_${sessionId}_${userId}_${Date.now()}`

      // Note: sessoes_aula schema uses fechada_em and hash_legal (not locked_by/legal_closure_hash)
      const { error: updateError } = await supabase
        .from('sessoes_aula')
        .update({
          status: 'fechada',
          fim_aula: now,
          fechada_em: now,
          hash_legal: legalHash,
          updated_at: now
        })
        .eq('id', sessionId)

      if (updateError) {
        return {
          success: false,
          error: 'Erro ao aplicar bloqueio'
        }
      }

      // Log locking event
      await this.logLockingEvent({
        sessionId,
        action: 'LOCK',
        userId,
        reason,
        ruleId,
        timestamp: now,
        details: {
          lockType: 'manual',
          legalHash,
          previousStatus: session.status
        }
      })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Erro ao bloquear sessão: ${error}`
      }
    }
  }

  /**
   * Request session unlock
   */
  async requestUnlock(request: UnlockRequest): Promise<UnlockPermission> {
    try {
      const lockingStatus = await this.getSessionLockingStatus(request.sessionId)

      if (!lockingStatus.isLocked) {
        return {
          allowed: true,
          reason: 'Sessão não está bloqueada'
        }
      }

      // Check if unlock is possible based on locking rules
      const mandatoryRules = lockingStatus.activeLockingRules.filter(
        r => r.complianceLevel === 'mandatory'
      )

      if (mandatoryRules.length > 0 && !request.emergency) {
        // Mandatory rules require special handling
        const legalRule = mandatoryRules.find(r => r.legalReference)

        if (legalRule) {
          return {
            allowed: false,
            reason: `Bloqueio obrigatório ativo: ${legalRule.description}`,
            requiresApproval: true,
            approvalWorkflow: {
              approvers: ['diretor', 'admin'], // Role-based approvers
              requiredApprovals: 2,
              timeoutHours: 24
            }
          }
        }
      }

      // Check emergency unlock
      if (request.emergency) {
        const isValidEmergency = await this.validateEmergencyUnlock(request)

        if (isValidEmergency) {
          return {
            allowed: true,
            reason: 'Desbloqueio emergencial autorizado',
            temporaryUnlock: {
              durationMinutes: 60,
              restrictions: [
                'Apenas modificações essenciais',
                'Registro de auditoria obrigatório',
                'Aprovação posterior necessária'
              ]
            }
          }
        }
      }

      // Check grace period unlock
      if (lockingStatus.remainingGracePeriod && lockingStatus.remainingGracePeriod > 0) {
        return {
          allowed: true,
          reason: `Desbloqueio permitido durante período de graça (${lockingStatus.remainingGracePeriod} minutos restantes)`
        }
      }

      // Default: requires approval
      return {
        allowed: false,
        reason: 'Desbloqueio requer aprovação administrativa',
        requiresApproval: true,
        approvalWorkflow: {
          approvers: ['diretor'],
          requiredApprovals: 1,
          timeoutHours: 12
        }
      }
    } catch (error) {
      return {
        allowed: false,
        reason: `Erro ao processar solicitação de desbloqueio: ${error}`
      }
    }
  }

  /**
   * Execute approved unlock
   */
  async executeUnlock(
    sessionId: string,
    userId: string,
    approvalId?: string,
    temporary = false,
    durationMinutes = 60
  ): Promise<{ success: boolean; error?: string; temporaryUntil?: string }> {
    try {
      const now = new Date()
      const temporaryUntil = temporary
        ? new Date(now.getTime() + durationMinutes * 60000).toISOString()
        : undefined

      // Update session status
      // Note: sessoes_aula schema doesn't have locked_by or temporary_unlock fields
      // Using available fields: status, fim_aula, fechada_em, hash_legal
      const updateData: Record<string, unknown> = {
        status: 'aberta',
        updated_at: now.toISOString()
      }

      if (!temporary) {
        updateData.fim_aula = null
        updateData.fechada_em = null
        updateData.hash_legal = null
      }

      const { error } = await supabase
        .from('sessoes_aula')
        .update(updateData)
        .eq('id', sessionId)

      if (error) {
        return {
          success: false,
          error: 'Erro ao aplicar desbloqueio'
        }
      }

      // Log unlock event
      await this.logLockingEvent({
        sessionId,
        action: 'UNLOCK',
        userId,
        reason: temporary ? 'Desbloqueio temporário' : 'Desbloqueio definitivo',
        timestamp: now.toISOString(),
        details: {
          temporary,
          durationMinutes: temporary ? durationMinutes : undefined,
          approvalId,
          unlockUntil: temporaryUntil
        }
      })

      return {
        success: true,
        temporaryUntil
      }
    } catch (error) {
      return {
        success: false,
        error: `Erro ao executar desbloqueio: ${error}`
      }
    }
  }

  /**
   * Get locking rules configuration
   */
  async getLockingRules(): Promise<LockingRule[]> {
    try {
      // In a full implementation, this would query a configuration table
      // For now, return default rules with any customizations
      return [...this.defaultRules]
    } catch (error) {
      console.warn('Error fetching locking rules, using defaults:', error)
      return [...this.defaultRules]
    }
  }

  /**
   * Update locking rule configuration
   */
  async updateLockingRule(
    ruleId: string,
    updates: Partial<LockingRule>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate updates
      if (updates.complianceLevel === 'mandatory' && updates.enabled === false) {
        return {
          success: false,
          error: 'Regras obrigatórias não podem ser desabilitadas'
        }
      }

      // In a full implementation, this would update a configuration table
      // For now, simulate successful update
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Erro ao atualizar regra: ${error}`
      }
    }
  }

  /**
   * Run automatic locking job (called by scheduler)
   */
  async runAutoLockJob(): Promise<{ processed: number; locked: number; errors: string[] }> {
    const result = {
      processed: 0,
      locked: 0,
      errors: [] as string[]
    }

    try {
      // Find sessions that should be auto-locked
      const currentTime = this.getBrazilianTime()
      const currentDate = currentTime.toISOString().split('T')[0]
      const lockHour = parseInt(this.DEFAULT_LOCK_TIME.split(':')[0])

      const { data: sessions, error } = await supabase
        .from('sessoes_aula')
        .select('*')
        .eq('status', 'aberta')
        .or(`data_aula.lt.${currentDate},and(data_aula.eq.${currentDate},created_at.lt.${currentTime.toISOString()})`)

      if (error) {
        result.errors.push(`Erro ao buscar sessões: ${error.message}`)
        return result
      }

      if (!sessions || sessions.length === 0) {
        return result
      }

      result.processed = sessions.length

      // Process each session
      for (const session of sessions) {
        try {
          const sessionDate = new Date(session.data_aula)
          const shouldLock = this.shouldAutoLockSession(session, currentTime)

          if (shouldLock.should) {
            const lockResult = await this.lockSession(
              session.id,
              'system', // System user
              shouldLock.reason,
              shouldLock.ruleId
            )

            if (lockResult.success) {
              result.locked++
            } else {
              result.errors.push(`Erro ao bloquear sessão ${session.id}: ${lockResult.error}`)
            }
          }
        } catch (error) {
          result.errors.push(`Erro ao processar sessão ${session.id}: ${error}`)
        }
      }

      return result
    } catch (error) {
      result.errors.push(`Erro geral no job de bloqueio: ${error}`)
      return result
    }
  }

  /**
   * Evaluate a specific locking rule against a session
   */
  private async evaluateLockingRule(
    rule: LockingRule,
    session: any,
    currentTime: Date
  ): Promise<{ shouldLock: boolean; reason: string; lockedAt?: string; lockedBy?: string }> {
    const sessionDate = new Date(session.data_aula)

    switch (rule.type) {
      case 'time_based':
        if (rule.lockTime) {
          const [hour, minute] = rule.lockTime.split(':').map(Number)
          const lockTime = new Date(sessionDate)
          lockTime.setHours(hour, minute, 0, 0)

          if (currentTime >= lockTime) {
            return {
              shouldLock: true,
              reason: `Bloqueio automático por horário: ${rule.lockTime}`,
              lockedAt: lockTime.toISOString(),
              lockedBy: 'system'
            }
          }
        }
        break

      case 'automatic':
        if (sessionDate < new Date(currentTime.toDateString())) {
          return {
            shouldLock: true,
            reason: 'Bloqueio automático: data passada',
            lockedAt: new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            lockedBy: 'system'
          }
        }

        if (rule.autoLockAfterMinutes) {
          const lastActivity = new Date(session.updated_at || session.created_at)
          const autoLockTime = new Date(lastActivity.getTime() + rule.autoLockAfterMinutes * 60000)

          if (currentTime >= autoLockTime) {
            return {
              shouldLock: true,
              reason: `Bloqueio por inatividade: ${rule.autoLockAfterMinutes} minutos`,
              lockedAt: autoLockTime.toISOString(),
              lockedBy: 'system'
            }
          }
        }
        break

      case 'manual':
        if (session.status === 'fechada') {
          return {
            shouldLock: true,
            reason: 'Bloqueio manual: sessão fechada',
            lockedAt: session.fim_aula || session.updated_at,
            lockedBy: session.locked_by || session.professor_id
          }
        }
        break
    }

    return { shouldLock: false, reason: '' }
  }

  /**
   * Check if user can unlock a session
   */
  private async canUnlockSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Check user role and permissions (users table uses tipo_usuario not role)
      const { data: user } = await supabase
        .from('users')
        .select('tipo_usuario')
        .eq('id', userId)
        .single()

      // Admins and directors can always request unlock
      if (user?.tipo_usuario === 'admin' || user?.tipo_usuario === 'diretor') {
        return true
      }

      // Teachers can request unlock for their own sessions
      if (user?.tipo_usuario === 'professor') {
        const { data: session } = await supabase
          .from('sessoes_aula')
          .select('professor_id')
          .eq('id', sessionId)
          .single()

        return session?.professor_id === userId
      }

      return false
    } catch (error) {
      console.warn('Error checking unlock permission:', error)
      return false
    }
  }

  /**
   * Validate lock permission
   */
  private async validateLockPermission(sessionId: string, userId: string): Promise<boolean> {
    // Similar to unlock permission, but potentially more restrictive
    return this.canUnlockSession(sessionId, userId)
  }

  /**
   * Validate emergency unlock request
   */
  private async validateEmergencyUnlock(request: UnlockRequest): Promise<boolean> {
    // Check if reason qualifies as emergency
    const emergencyKeywords = [
      'emergencia',
      'urgente',
      'erro sistema',
      'problema tecnico',
      'auditoria',
      'inep',
      'ministerio'
    ]

    const reasonLower = request.reason.toLowerCase() + ' ' + request.justification.toLowerCase()
    const hasEmergencyKeyword = emergencyKeywords.some(keyword =>
      reasonLower.includes(keyword)
    )

    return hasEmergencyKeyword && request.justification.length >= 50 // Require detailed justification
  }

  /**
   * Determine if session should be auto-locked
   */
  private shouldAutoLockSession(session: any, currentTime: Date): {
    should: boolean
    reason: string
    ruleId: string
  } {
    const sessionDate = new Date(session.data_aula)

    // Past date rule
    if (sessionDate < new Date(currentTime.toDateString())) {
      return {
        should: true,
        reason: 'Data passada - bloqueio obrigatório',
        ruleId: 'past_date_lock'
      }
    }

    // Time-based rule
    const [lockHour] = this.DEFAULT_LOCK_TIME.split(':').map(Number)
    if (sessionDate.toDateString() === currentTime.toDateString() &&
        currentTime.getHours() >= lockHour) {
      return {
        should: true,
        reason: `Horário de bloqueio diário: ${this.DEFAULT_LOCK_TIME}`,
        ruleId: 'daily_auto_lock'
      }
    }

    return { should: false, reason: '', ruleId: '' }
  }

  /**
   * Log locking/unlocking events for audit
   * Note: audit_trail table uses Portuguese column names
   */
  private async logLockingEvent(event: {
    sessionId: string
    action: 'LOCK' | 'UNLOCK' | 'UNLOCK_REQUEST' | 'UNLOCK_APPROVED'
    userId: string
    reason: string
    ruleId?: string
    timestamp: string
    details?: Record<string, unknown>
  }): Promise<void> {
    try {
      await supabase
        .from('audit_trail')
        .insert({
          tabela: 'sessoes_aula',
          registro_id: event.sessionId,
          operacao: event.action,
          dados_anteriores: null,
          dados_novos: {
            action: event.action,
            reason: event.reason,
            ruleId: event.ruleId ?? null,
            details: event.details ? JSON.parse(JSON.stringify(event.details)) : null
          },
          usuario_id: event.userId === 'system' ? null : event.userId,
          timestamp_operacao: event.timestamp,
          justificativa: `LOCK_EVENT_${event.sessionId}_${Date.now()}`,
          nivel_criticidade: event.action === 'LOCK' ? 'alto' : 'medio'
        })
    } catch (error) {
      console.warn('Failed to log locking event:', error)
    }
  }

  /**
   * Get current time in Brazilian timezone
   */
  private getBrazilianTime(): Date {
    const now = new Date()
    // Simple conversion - in production, use proper timezone library
    const brazilOffset = -3 // UTC-3 (Brazilian standard time)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    return new Date(utc + (brazilOffset * 3600000))
  }
}

export const attendanceLocking = new AttendanceLockingService()