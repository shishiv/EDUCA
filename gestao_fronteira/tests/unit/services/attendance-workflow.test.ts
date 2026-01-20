import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  AttendanceWorkflowManager,
  createAttendanceWorkflow,
  WorkflowPhase
} from '@/lib/services/attendance-workflow'

// Additional mocks for dependencies
vi.mock('@/lib/services/attendance-immutability', () => ({
  attendanceImmutability: {
    validateModificationPermission: vi.fn().mockResolvedValue({ allowed: true }),
    createImmutableAttendanceRecords: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('@/lib/services/attendance-bulk-operations', () => ({
  attendanceBulkOperations: {
    markAllPresent: vi.fn().mockResolvedValue({ success: true, errors: [], performance: {} }),
    markAllAbsent: vi.fn().mockResolvedValue({ success: true, errors: [], performance: {} }),
    smartBulkMarkAttendance: vi.fn().mockResolvedValue({ success: true, errors: [], performance: {} }),
  },
}))

describe('AttendanceWorkflowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Inicializacao', () => {
    it('deve criar workflow no estado PREPARATION', () => {
      const workflow = createAttendanceWorkflow('turma-1', 'professor-1', '2026-01-19')
      const state = workflow.getState()

      expect(state.phase).toBe('PREPARATION')
      expect(state.classId).toBe('turma-1')
      expect(state.teacherId).toBe('professor-1')
      expect(state.date).toBe('2026-01-19')
      expect(state.errors).toHaveLength(0)
      expect(state.warnings).toHaveLength(0)
    })

    it('deve registrar timestamps de inicio', () => {
      const workflow = createAttendanceWorkflow('turma-1', 'professor-1', '2026-01-19')
      const state = workflow.getState()

      expect(state.started_at).toBeDefined()
      expect(state.current_phase_started).toBeDefined()
      expect(new Date(state.started_at).getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('Transicoes de fase', () => {
    it('deve retornar erro para transicao invalida de PREPARATION', async () => {
      const workflow = createAttendanceWorkflow('turma-1', 'professor-1', '2026-01-19')

      // Tentar fechar sessao sem abrir primeiro
      const result = await workflow.executeTransition('close_session')

      expect(result.success).toBe(false)
      expect(result.error).toContain('não permitido')
    })

    it('deve listar acoes disponiveis para fase PREPARATION', () => {
      const workflow = createAttendanceWorkflow('turma-1', 'professor-1', '2026-01-19')
      const actions = workflow.getAvailableActions()

      expect(actions).toContain('open_session')
      expect(actions).not.toContain('close_session')
      expect(actions).not.toContain('start_marking')
    })
  })

  describe('Progresso do workflow', () => {
    it('deve calcular progresso inicial como 0%', () => {
      const workflow = createAttendanceWorkflow('turma-1', 'professor-1', '2026-01-19')
      expect(workflow.getOverallProgress()).toBe(0)
    })
  })

  describe('Dados de abertura', () => {
    it('deve aceitar dados de abertura da sessao', () => {
      const workflow = createAttendanceWorkflow('turma-1', 'professor-1', '2026-01-19')

      workflow.setOpeningData({
        conteudo_programatico: 'Matematica basica',
        metodologia: 'Exposicao dialogada',
        duracao_minutos: 50,
      })

      const state = workflow.getState()
      expect(state.openingData).toBeDefined()
      expect(state.openingData?.conteudo_programatico).toBe('Matematica basica')
      expect(state.openingData?.duracao_minutos).toBe(50)
    })
  })

  describe('Marcacao de frequencia', () => {
    it('deve rejeitar marcacao quando nao esta na fase MARKING', async () => {
      const workflow = createAttendanceWorkflow('turma-1', 'professor-1', '2026-01-19')

      // Workflow esta em PREPARATION, nao MARKING
      const result = await workflow.markStudentAttendance('aluno-1', 'presente')

      expect(result.success).toBe(false)
      expect(result.error).toContain('não está na fase de marcação')
    })
  })

  describe('Estado do workflow', () => {
    it('deve retornar copia do estado (imutabilidade)', () => {
      const workflow = createAttendanceWorkflow('turma-1', 'professor-1', '2026-01-19')
      const state1 = workflow.getState()
      const state2 = workflow.getState()

      expect(state1).not.toBe(state2) // Diferentes referencias
      expect(state1).toEqual(state2) // Mesmo conteudo
    })
  })
})
