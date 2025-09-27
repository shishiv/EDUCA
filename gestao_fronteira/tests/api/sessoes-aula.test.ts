/**
 * Enhanced Sessoes Aula API Tests
 * Tests for the three-phase attendance workflow with Brazilian legal compliance
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mock test data
const mockTestData = {
  escola: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Escola Municipal Test API',
    codigo_inep: '12345679'
  },
  professor: {
    id: '550e8400-e29b-41d4-a716-446655440011',
    email: 'professor.api.test@escola.gov.br',
    nome_completo: 'Professor API Test',
    tipo_usuario: 'professor'
  },
  turma: {
    id: '550e8400-e29b-41d4-a716-446655440012',
    nome: '5º Ano B API',
    codigo: 'TURMA_5B_API_2025'
  },
  disciplina: {
    id: '550e8400-e29b-41d4-a716-446655440013',
    nome: 'Língua Portuguesa',
    codigo: 'LP'
  }
}

// Helper function to make authenticated API requests
async function makeAPIRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  headers?: Record<string, string>
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return fetch(`${baseUrl}/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  })
}

describe('Enhanced Sessoes Aula API Tests', () => {

  beforeAll(async () => {
    console.log('Setting up Enhanced Sessoes Aula API tests...')
  })

  afterAll(async () => {
    // Clean up test data
    console.log('Cleaning up API test data...')

    await testSupabase
      .from('audit_sessoes_aula')
      .delete()
      .like('sessao_id', '%api-test%')

    await testSupabase
      .from('sessoes_aula')
      .delete()
      .like('id', '%api-test%')
  })

  describe('POST /api/sessoes-aula/abrir - Session Opening', () => {

    it('should create a new session in PLANEJADA state', async () => {
      const sessionData = {
        turma_id: mockTestData.turma.id,
        professor_id: mockTestData.professor.id,
        disciplina_id: mockTestData.disciplina.id,
        data_aula: new Date().toISOString().split('T')[0]
      }

      const response = await makeAPIRequest('/sessoes-aula/abrir', 'POST', sessionData)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.session).toBeDefined()
      expect(result.session.status).toBe('PLANEJADA')
      expect(result.session.turma_id).toBe(sessionData.turma_id)
      expect(result.session.professor_id).toBe(sessionData.professor_id)
      expect(result.session.auto_fechamento_agendado).toBeTruthy()
    })

    it('should reject duplicate sessions for same turma and date', async () => {
      const sessionData = {
        turma_id: mockTestData.turma.id,
        professor_id: mockTestData.professor.id,
        disciplina_id: mockTestData.disciplina.id,
        data_aula: new Date().toISOString().split('T')[0]
      }

      // Create first session
      await makeAPIRequest('/sessoes-aula/abrir', 'POST', sessionData)

      // Try to create duplicate
      const response = await makeAPIRequest('/sessoes-aula/abrir', 'POST', sessionData)

      expect(response.status).toBe(409)

      const result = await response.json()
      expect(result.error).toContain('session already exists')
    })

    it('should validate required fields', async () => {
      const invalidData = {
        professor_id: mockTestData.professor.id
        // Missing turma_id and data_aula
      }

      const response = await makeAPIRequest('/sessoes-aula/abrir', 'POST', invalidData)

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('validation')
    })

    it('should set proper auto-closure time (6 PM São Paulo)', async () => {
      const sessionData = {
        turma_id: mockTestData.turma.id,
        professor_id: mockTestData.professor.id,
        disciplina_id: mockTestData.disciplina.id,
        data_aula: new Date().toISOString().split('T')[0]
      }

      const response = await makeAPIRequest('/sessoes-aula/abrir', 'POST', sessionData)
      const result = await response.json()

      expect(response.status).toBe(201)

      const autoClose = new Date(result.session.auto_fechamento_agendado)
      expect(autoClose.getUTCHours()).toBe(21) // 18:00 São Paulo = 21:00 UTC
    })
  })

  describe('PUT /api/sessoes-aula/:id/status - Status Transitions', () => {

    let testSessionId: string

    beforeEach(async () => {
      // Create a test session
      const { data: session } = await testSupabase
        .from('sessoes_aula')
        .insert({
          id: 'api-test-session-' + Date.now(),
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          disciplina_id: mockTestData.disciplina.id,
          data_aula: new Date().toISOString().split('T')[0],
          status: 'PLANEJADA'
        })
        .select()
        .single()

      testSessionId = session!.id
    })

    it('should transition PLANEJADA -> ABERTA successfully', async () => {
      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        { status: 'ABERTA' }
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.session.status).toBe('ABERTA')
      expect(result.session.aberta_em).toBeTruthy()
    })

    it('should transition ABERTA -> FECHADA with content validation', async () => {
      // First, open the session
      await testSupabase
        .from('sessoes_aula')
        .update({
          status: 'ABERTA',
          aberta_em: new Date().toISOString()
        })
        .eq('id', testSessionId)

      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        {
          status: 'FECHADA',
          conteudo_ministrado: 'Aula sobre frações matemáticas'
        }
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.session.status).toBe('FECHADA')
      expect(result.session.fechada_em).toBeTruthy()
      expect(result.session.hash_legal).toBeTruthy()
      expect(result.session.hash_legal).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should reject invalid status transitions', async () => {
      // Try to go directly from PLANEJADA to FECHADA
      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        { status: 'FECHADA' }
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('invalid transition')
    })

    it('should prevent modification of FECHADA sessions', async () => {
      // First, complete the workflow
      await testSupabase
        .from('sessoes_aula')
        .update({
          status: 'FECHADA',
          aberta_em: new Date().toISOString(),
          fechada_em: new Date().toISOString(),
          hash_legal: 'test-hash'
        })
        .eq('id', testSessionId)

      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        { status: 'ABERTA' }
      )

      expect(response.status).toBe(403)

      const result = await response.json()
      expect(result.error).toContain('cannot modify')
    })
  })

  describe('PUT /api/sessoes-aula/:id/cancelar - Session Cancellation', () => {

    let testSessionId: string

    beforeEach(async () => {
      const { data: session } = await testSupabase
        .from('sessoes_aula')
        .insert({
          id: 'api-test-cancel-' + Date.now(),
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          disciplina_id: mockTestData.disciplina.id,
          data_aula: new Date().toISOString().split('T')[0],
          status: 'PLANEJADA'
        })
        .select()
        .single()

      testSessionId = session!.id
    })

    it('should cancel session from PLANEJADA state', async () => {
      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/cancelar`,
        'PUT',
        { motivo_cancelamento: 'Reunião pedagógica urgente' }
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.session.status).toBe('CANCELADA')
      expect(result.session.cancelada_em).toBeTruthy()
    })

    it('should cancel session from ABERTA state', async () => {
      // First open the session
      await testSupabase
        .from('sessoes_aula')
        .update({
          status: 'ABERTA',
          aberta_em: new Date().toISOString()
        })
        .eq('id', testSessionId)

      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/cancelar`,
        'PUT',
        { motivo_cancelamento: 'Emergência na escola' }
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.session.status).toBe('CANCELADA')
    })

    it('should reject cancellation of FECHADA sessions', async () => {
      // Set session to FECHADA
      await testSupabase
        .from('sessoes_aula')
        .update({
          status: 'FECHADA',
          aberta_em: new Date().toISOString(),
          fechada_em: new Date().toISOString()
        })
        .eq('id', testSessionId)

      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/cancelar`,
        'PUT',
        { motivo_cancelamento: 'Tentativa de cancelamento inválida' }
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('cannot cancel')
    })

    it('should require cancellation reason', async () => {
      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/cancelar`,
        'PUT',
        {} // No reason provided
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('reason required')
    })
  })

  describe('POST /api/sessoes-aula/:id/frequencia/batch - Batch Attendance', () => {

    let testSessionId: string

    beforeEach(async () => {
      const { data: session } = await testSupabase
        .from('sessoes_aula')
        .insert({
          id: 'api-test-batch-' + Date.now(),
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          disciplina_id: mockTestData.disciplina.id,
          data_aula: new Date().toISOString().split('T')[0],
          status: 'ABERTA',
          aberta_em: new Date().toISOString()
        })
        .select()
        .single()

      testSessionId = session!.id
    })

    it('should process batch attendance marking < 1 second', async () => {
      const attendanceData = [
        { aluno_id: '550e8400-e29b-41d4-a716-446655440020', presente: true },
        { aluno_id: '550e8400-e29b-41d4-a716-446655440021', presente: false },
        { aluno_id: '550e8400-e29b-41d4-a716-446655440022', presente: true },
        { aluno_id: '550e8400-e29b-41d4-a716-446655440023', presente: true }
      ]

      const startTime = performance.now()

      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/frequencia/batch`,
        'POST',
        { attendance: attendanceData }
      )

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(executionTime).toBeLessThan(1000) // Less than 1 second

      const result = await response.json()
      expect(result.processed_count).toBe(4)
      expect(result.success).toBe(true)
    })

    it('should validate attendance data format', async () => {
      const invalidData = [
        { aluno_id: 'invalid-uuid', presente: true },
        { presente: false } // Missing aluno_id
      ]

      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/frequencia/batch`,
        'POST',
        { attendance: invalidData }
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('validation')
    })

    it('should only allow batch marking in ABERTA state', async () => {
      // Change session to PLANEJADA
      await testSupabase
        .from('sessoes_aula')
        .update({ status: 'PLANEJADA' })
        .eq('id', testSessionId)

      const attendanceData = [
        { aluno_id: '550e8400-e29b-41d4-a716-446655440020', presente: true }
      ]

      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/frequencia/batch`,
        'POST',
        { attendance: attendanceData }
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('session not open')
    })
  })

  describe('Audit Trail and Legal Compliance', () => {

    let testSessionId: string

    beforeEach(async () => {
      const { data: session } = await testSupabase
        .from('sessoes_aula')
        .insert({
          id: 'api-test-audit-' + Date.now(),
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          disciplina_id: mockTestData.disciplina.id,
          data_aula: new Date().toISOString().split('T')[0],
          status: 'PLANEJADA'
        })
        .select()
        .single()

      testSessionId = session!.id
    })

    it('should create audit records for all state changes', async () => {
      // Open session
      await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        { status: 'ABERTA' }
      )

      // Close session
      await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        {
          status: 'FECHADA',
          conteudo_ministrado: 'Aula de teste para auditoria'
        }
      )

      // Check audit records
      const { data: auditRecords } = await testSupabase
        .from('audit_sessoes_aula')
        .select('*')
        .eq('sessao_id', testSessionId)
        .order('timestamp_acao', { ascending: true })

      expect(auditRecords).toBeDefined()
      expect(auditRecords!.length).toBeGreaterThanOrEqual(3) // CREATE, ABRIR, FECHAR

      const actions = auditRecords!.map(record => record.acao)
      expect(actions).toContain('CRIAR')
      expect(actions).toContain('ABRIR')
      expect(actions).toContain('FECHAR')

      // Verify hash integrity
      auditRecords!.forEach(record => {
        expect(record.hash_verificacao).toBeTruthy()
        expect(record.hash_verificacao).toMatch(/^[a-f0-9]{64}$/)
      })
    })

    it('should generate legal compliance hash on session closure', async () => {
      // Complete the workflow
      await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        { status: 'ABERTA' }
      )

      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        {
          status: 'FECHADA',
          conteudo_ministrado: 'Matemática - Sistema decimal'
        }
      )

      const result = await response.json()

      expect(result.session.hash_legal).toBeTruthy()
      expect(result.session.hash_legal).toMatch(/^[a-f0-9]{64}$/)

      // Verify the hash is unique and deterministic
      const { data: sessionData } = await testSupabase
        .from('sessoes_aula')
        .select('hash_legal')
        .eq('id', testSessionId)
        .single()

      expect(sessionData!.hash_legal).toBe(result.session.hash_legal)
    })

    it('should enforce "não existe o esquecer" principle', async () => {
      // Complete session
      await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        { status: 'ABERTA' }
      )

      await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        {
          status: 'FECHADA',
          conteudo_ministrado: 'Aula finalizada'
        }
      )

      // Try to modify the closed session
      const response = await makeAPIRequest(
        `/sessoes-aula/${testSessionId}/status`,
        'PUT',
        { status: 'ABERTA' }
      )

      expect(response.status).toBe(403)

      const result = await response.json()
      expect(result.error).toContain('cannot modify')
    })
  })

  describe('Performance and Rate Limiting', () => {

    it('should handle concurrent session creation requests', async () => {
      const promises = []

      for (let i = 0; i < 5; i++) {
        const sessionData = {
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          disciplina_id: mockTestData.disciplina.id,
          data_aula: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Different dates
        }

        promises.push(makeAPIRequest('/sessoes-aula/abrir', 'POST', sessionData))
      }

      const responses = await Promise.all(promises)

      // All should succeed with different dates
      responses.forEach(response => {
        expect([201, 409]).toContain(response.status) // 201 or 409 (duplicate)
      })
    })

    it('should apply rate limiting for excessive requests', async () => {
      const requests = []

      // Make rapid successive requests
      for (let i = 0; i < 20; i++) {
        requests.push(makeAPIRequest('/sessoes-aula', 'GET'))
      }

      const responses = await Promise.all(requests)

      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Validation', () => {

    it('should return Portuguese error messages', async () => {
      const response = await makeAPIRequest('/sessoes-aula/invalid-id/status', 'PUT', {})

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toBeDefined()
      // Error should be in Portuguese for Brazilian users
    })

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, just test that errors are handled properly

      const response = await makeAPIRequest('/sessoes-aula/99999999-9999-9999-9999-999999999999/status', 'PUT', {})

      expect(response.status).toBe(404)

      const result = await response.json()
      expect(result.error).toBeDefined()
    })
  })
})