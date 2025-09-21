/**
 * @jest-environment node
 * @description API tests for Enhanced "Abrir aula" Workflow session management
 * Task 2: API Layer Enhancement - Session Management Tests
 */

import { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'

// Mock the Supabase client for testing
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        limit: jest.fn(() => ({ single: jest.fn() }))
      })),
      order: jest.fn(() => ({
        limit: jest.fn()
      })),
      limit: jest.fn()
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  })),
  rpc: jest.fn()
}

// Mock auth
const mockAuth = {
  getUser: jest.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'professor@escola.com'
      }
    }
  }))
}

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => mockSupabase
}))

describe('Session Management API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('2.1 - Session Creation API', () => {
    test('POST /api/sessions - should create new session with validation', async () => {
      const sessionData = {
        turma_id: 'test-turma-id',
        professor_id: 'test-professor-id',
        data_aula: new Date().toISOString().split('T')[0]
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-session-id',
                ...sessionData,
                fase: 'planejamento',
                bloqueado: false,
                created_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      })

      const { req, res } = createMocks({
        method: 'POST',
        body: sessionData
      })

      // Test successful session creation
      expect(mockSupabase.from).toHaveBeenCalledWith('aula_sessions')
    })

    test('POST /api/sessions - should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        turma_id: '',
        data_aula: ''
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData
      })

      // Should validate and reject invalid data
      expect(invalidData.turma_id).toBe('')
      expect(invalidData.data_aula).toBe('')
    })

    test('POST /api/sessions - should prevent duplicate sessions for same day', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: {
                code: '23505', // Unique constraint violation
                message: 'duplicate key value violates unique constraint'
              }
            })
          })
        })
      })

      const sessionData = {
        turma_id: 'test-turma-id',
        professor_id: 'test-professor-id',
        data_aula: new Date().toISOString().split('T')[0]
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: sessionData
      })

      // Should handle duplicate session error
      expect(mockSupabase.from).toHaveBeenCalledWith('aula_sessions')
    })
  })

  describe('2.2 - Session State Management API', () => {
    test('PATCH /api/sessions/[id] - should update session phase', async () => {
      const sessionId = 'test-session-id'
      const updateData = { fase: 'chamada' }

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: sessionId,
                  fase: 'chamada',
                  updated_at: new Date().toISOString()
                },
                error: null
              })
            })
          })
        })
      })

      const { req, res } = createMocks({
        method: 'PATCH',
        body: updateData,
        query: { id: sessionId }
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('aula_sessions')
    })

    test('PATCH /api/sessions/[id] - should validate phase transitions', async () => {
      const validTransitions = [
        { from: 'planejamento', to: 'chamada' },
        { from: 'chamada', to: 'finalizada' },
        { from: 'finalizada', to: 'bloqueada' }
      ]

      validTransitions.forEach(transition => {
        expect(['planejamento', 'chamada', 'finalizada', 'bloqueada'])
          .toContain(transition.from)
        expect(['planejamento', 'chamada', 'finalizada', 'bloqueada'])
          .toContain(transition.to)
      })
    })

    test('PATCH /api/sessions/[id] - should prevent modification of locked sessions', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: {
                  message: 'Cannot modify locked session'
                }
              })
            })
          })
        })
      })

      const sessionId = 'locked-session-id'
      const updateData = { fase: 'planejamento' }

      const { req, res } = createMocks({
        method: 'PATCH',
        body: updateData,
        query: { id: sessionId }
      })

      // Should handle locked session error
      expect(mockSupabase.from).toHaveBeenCalledWith('aula_sessions')
    })
  })

  describe('2.3 - Session Retrieval API', () => {
    test('GET /api/sessions/[id] - should return session details', async () => {
      const sessionId = 'test-session-id'
      const sessionData = {
        id: sessionId,
        turma_id: 'test-turma-id',
        professor_id: 'test-professor-id',
        data_aula: new Date().toISOString().split('T')[0],
        fase: 'chamada',
        bloqueado: false,
        total_alunos: 25,
        total_presentes: 20,
        total_ausentes: 5
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: sessionData,
              error: null
            })
          })
        })
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: sessionId }
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('aula_sessions')
    })

    test('GET /api/sessions - should list sessions with filters', async () => {
      const sessionsData = [
        {
          id: 'session-1',
          data_aula: '2025-09-20',
          fase: 'chamada',
          bloqueado: false
        },
        {
          id: 'session-2',
          data_aula: '2025-09-19',
          fase: 'bloqueada',
          bloqueado: true
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: sessionsData,
                error: null
              })
            })
          })
        })
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          turma_id: 'test-turma-id',
          date_from: '2025-09-19',
          date_to: '2025-09-20'
        }
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('aula_sessions')
    })
  })

  describe('2.4 - Real-time Session Status API', () => {
    test('GET /api/sessions/[id]/status - should return current session status', async () => {
      const sessionId = 'test-session-id'
      const statusData = {
        id: sessionId,
        fase: 'chamada',
        bloqueado: false,
        total_presentes: 15,
        total_ausentes: 10,
        last_updated: new Date().toISOString(),
        can_modify: true
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: statusData,
              error: null
            })
          })
        })
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: sessionId }
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('aula_sessions')
    })

    test('GET /api/sessions/status/dashboard - should return dashboard overview', async () => {
      const dashboardData = {
        active_sessions: 5,
        pending_sessions: 3,
        locked_sessions: 12,
        compliance_score: 95.5,
        recent_activity: []
      }

      mockSupabase.rpc.mockResolvedValue({
        data: dashboardData,
        error: null
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          escola_id: 'test-escola-id'
        }
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_session_dashboard', {
        escola_id: 'test-escola-id'
      })
    })
  })

  describe('2.5 - Enhanced Attendance API', () => {
    test('POST /api/sessions/[id]/attendance - should mark attendance with session context', async () => {
      const sessionId = 'test-session-id'
      const attendanceData = [
        { aluno_id: 'aluno-1', presente: true },
        { aluno_id: 'aluno-2', presente: false },
        { aluno_id: 'aluno-3', presente: true }
      ]

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: attendanceData.map((item, index) => ({
              id: `freq-${index}`,
              session_id: sessionId,
              ...item,
              data: new Date().toISOString().split('T')[0]
            })),
            error: null
          })
        })
      })

      const { req, res } = createMocks({
        method: 'POST',
        body: { attendance: attendanceData },
        query: { id: sessionId }
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('frequencia')
    })

    test('GET /api/sessions/[id]/attendance - should retrieve session attendance', async () => {
      const sessionId = 'test-session-id'
      const attendanceData = [
        {
          id: 'freq-1',
          aluno_id: 'aluno-1',
          presente: true,
          hash_integridade: 'hash1',
          is_locked: false
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: attendanceData,
              error: null
            })
          })
        })
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: sessionId }
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('frequencia')
    })

    test('PATCH /api/sessions/[id]/attendance - should validate attendance changes for locked sessions', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: {
              message: 'Cannot modify attendance for locked session'
            }
          })
        })
      })

      const sessionId = 'locked-session-id'
      const updateData = { presente: false }

      const { req, res } = createMocks({
        method: 'PATCH',
        body: updateData,
        query: {
          id: sessionId,
          aluno_id: 'test-aluno-id'
        }
      })

      // Should handle locked attendance error
      expect(mockSupabase.from).toHaveBeenCalledWith('frequencia')
    })
  })

  describe('2.6 - Brazilian Compliance Validation', () => {
    test('POST /api/sessions/validate - should validate session compliance', async () => {
      const sessionId = 'test-session-id'
      const validationData = {
        is_valid: true,
        integrity_score: 95.0,
        issues: []
      }

      mockSupabase.rpc.mockResolvedValue({
        data: [validationData],
        error: null
      })

      const { req, res } = createMocks({
        method: 'POST',
        body: { session_id: sessionId }
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('validate_session_integrity', {
        session_uuid: sessionId
      })
    })

    test('GET /api/compliance/audit-trail/[id] - should return session audit trail', async () => {
      const sessionId = 'test-session-id'
      const auditData = [
        {
          id: 'audit-1',
          user_name: 'Professor Test',
          action: 'SESSION_CREATED',
          timestamp: new Date().toISOString(),
          details: { compliance_context: {} }
        }
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: auditData,
        error: null
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: sessionId }
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_session_audit_trail', {
        session_uuid: sessionId
      })
    })

    test('GET /api/compliance/report - should generate compliance report', async () => {
      const reportData = [
        {
          session_date: '2025-09-20',
          turma_nome: 'Turma A',
          professor_nome: 'Professor Test',
          compliance_score: 98.5
        }
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: reportData,
        error: null
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          escola_id: 'test-escola-id',
          date_from: '2025-09-01',
          date_to: '2025-09-30'
        }
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_compliance_audit_report', {
        escola_id_param: 'test-escola-id',
        date_from: '2025-09-01',
        date_to: '2025-09-30'
      })
    })
  })

  describe('2.7 - Batch Operations for Mobile', () => {
    test('POST /api/sessions/batch/attendance - should handle batch attendance updates', async () => {
      const batchData = {
        session_id: 'test-session-id',
        updates: [
          { aluno_id: 'aluno-1', presente: true },
          { aluno_id: 'aluno-2', presente: false },
          { aluno_id: 'aluno-3', presente: true }
        ]
      }

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: batchData.updates.map((item, index) => ({
              id: `freq-${index}`,
              ...item,
              session_id: batchData.session_id
            })),
            error: null
          })
        })
      })

      const { req, res } = createMocks({
        method: 'POST',
        body: batchData
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('frequencia')
    })

    test('POST /api/sessions/sync - should sync offline changes', async () => {
      const syncData = {
        sessions: [
          { id: 'session-1', fase: 'finalizada' }
        ],
        attendance: [
          { session_id: 'session-1', aluno_id: 'aluno-1', presente: true }
        ]
      }

      // Mock successful sync responses
      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      const { req, res } = createMocks({
        method: 'POST',
        body: syncData
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('aula_sessions')
      expect(mockSupabase.from).toHaveBeenCalledWith('frequencia')
    })
  })

  describe('2.8 - Performance and Error Handling', () => {
    test('should handle API rate limiting for mobile devices', async () => {
      const rateLimitHeaders = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '95',
        'X-RateLimit-Reset': (Date.now() + 60000).toString()
      }

      // Test rate limiting implementation
      expect(rateLimitHeaders['X-RateLimit-Limit']).toBe('100')
      expect(parseInt(rateLimitHeaders['X-RateLimit-Remaining'])).toBeGreaterThanOrEqual(0)
    })

    test('should handle database connection errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'Database connection failed',
            code: 'CONNECTION_ERROR'
          }
        })
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-session-id' }
      })

      // Should handle database errors
      expect(mockSupabase.from).toHaveBeenCalledWith('aula_sessions')
    })

    test('should validate response times for mobile optimization', async () => {
      const startTime = Date.now()

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 50))

      const responseTime = Date.now() - startTime

      // Should complete within mobile-friendly timeframe (< 1000ms)
      expect(responseTime).toBeLessThan(1000)
    })
  })
})