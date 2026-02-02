import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AttendanceLockingService, LockingRule } from '@/lib/services/attendance-locking'

describe('AttendanceLockingService', () => {
  let service: AttendanceLockingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AttendanceLockingService()
  })

  describe('Regras de bloqueio padrao', () => {
    it('deve retornar regras de bloqueio configuradas', async () => {
      const rules = await service.getLockingRules()

      expect(rules).toBeInstanceOf(Array)
      expect(rules.length).toBeGreaterThan(0)
    })

    it('deve incluir regra de fechamento diario as 18:00', async () => {
      const rules = await service.getLockingRules()
      const dailyRule = rules.find(r => r.id === 'daily_auto_lock')

      expect(dailyRule).toBeDefined()
      expect(dailyRule?.type).toBe('time_based')
      expect(dailyRule?.lockTime).toBe('18:00')
      expect(dailyRule?.timezone).toBe('America/Sao_Paulo')
      expect(dailyRule?.complianceLevel).toBe('mandatory')
    })

    it('deve incluir regra de bloqueio de datas passadas', async () => {
      const rules = await service.getLockingRules()
      const pastDateRule = rules.find(r => r.id === 'past_date_lock')

      expect(pastDateRule).toBeDefined()
      expect(pastDateRule?.type).toBe('automatic')
      expect(pastDateRule?.complianceLevel).toBe('mandatory')
      expect(pastDateRule?.legalReference).toContain('não existe o esquecer')
    })

    it('deve incluir regra de fechamento manual de sessao', async () => {
      const rules = await service.getLockingRules()
      const manualRule = rules.find(r => r.id === 'session_closure_lock')

      expect(manualRule).toBeDefined()
      expect(manualRule?.type).toBe('manual')
      expect(manualRule?.complianceLevel).toBe('mandatory')
    })
  })

  describe('Atualizacao de regras', () => {
    it('deve impedir desabilitar regras obrigatorias', async () => {
      const result = await service.updateLockingRule('daily_auto_lock', {
        enabled: false,
        complianceLevel: 'mandatory',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('obrigatórias')
    })

    it('deve permitir atualizar regras opcionais', async () => {
      const result = await service.updateLockingRule('extended_period_lock', {
        autoLockAfterMinutes: 180, // Alterar de 240 para 180
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Validacao de desbloqueio emergencial', () => {
    it('deve rejeitar desbloqueio sem justificativa detalhada', async () => {
      // Mock para simular sessao bloqueada
      const request = {
        sessionId: 'sessao-1',
        userId: 'professor-1',
        reason: 'emergencia',
        justification: 'curto', // Menos de 50 caracteres
        emergency: true,
      }

      const permission = await service.requestUnlock(request)

      // Sem justificativa detalhada, deve exigir aprovacao
      expect(permission.allowed).toBe(false)
      expect(permission.requiresApproval).toBe(true)
    })
  })

  describe('Horario brasileiro', () => {
    it('deve usar timezone America/Sao_Paulo', async () => {
      const rules = await service.getLockingRules()
      const timeBasedRules = rules.filter(r => r.type === 'time_based')

      for (const rule of timeBasedRules) {
        if (rule.timezone) {
          expect(rule.timezone).toBe('America/Sao_Paulo')
        }
      }
    })
  })

  describe('Compliance educacional', () => {
    it('deve ter referencias legais nas regras obrigatorias', async () => {
      const rules = await service.getLockingRules()
      const mandatoryRules = rules.filter(r => r.complianceLevel === 'mandatory')

      expect(mandatoryRules.length).toBeGreaterThan(0)

      for (const rule of mandatoryRules) {
        expect(rule.legalReference).toBeDefined()
        expect(rule.legalReference?.length).toBeGreaterThan(0)
      }
    })
  })
})
