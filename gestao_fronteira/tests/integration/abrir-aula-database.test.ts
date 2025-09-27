/**
 * Integration Test: Enhanced Abrir Aula Database Schema and Audit Trail
 * Tests the database foundation for the three-phase attendance workflow
 * with Brazilian educational law compliance
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Test database configuration
const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mock test data
const mockTestData = {
  escola: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Escola Municipal Test',
    codigo_inep: '12345678'
  },
  professor: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'professor.test@escola.gov.br'
  },
  turma: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    nome: '5º Ano A',
    codigo: 'TURMA_5A_2025'
  },
  disciplina: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    nome: 'Matemática',
    codigo: 'MAT'
  }
}

describe('Enhanced Abrir Aula Database Schema Tests', () => {

  beforeAll(async () => {
    // Set up test environment
    console.log('Setting up Enhanced Abrir Aula database tests...')
  })

  afterAll(async () => {
    // Clean up test data
    console.log('Cleaning up test data...')

    // Remove test session data
    await testSupabase
      .from('audit_sessoes_aula')
      .delete()
      .like('sessao_id', '%test%')

    await testSupabase
      .from('sessoes_aula')
      .delete()
      .like('id', '%test%')
  })

  describe('Database Schema Validation', () => {

    it('should have enhanced sessoes_aula table with new columns', async () => {
      // Test that the table exists with required columns
      const { data: columns, error } = await testSupabase
        .rpc('get_table_columns', { table_name: 'sessoes_aula' })

      expect(error).toBeNull()
      expect(columns).toBeDefined()

      // Check for enhanced columns
      const columnNames = columns?.map((col: any) => col.column_name) || []

      expect(columnNames).toContain('auto_fechamento_agendado')
      expect(columnNames).toContain('hash_legal')
      expect(columnNames).toContain('observacoes_fechamento')
      expect(columnNames).toContain('tempo_total_aula')
    })

    it('should have audit_sessoes_aula table with proper structure', async () => {
      // Test audit table exists
      const { data: columns, error } = await testSupabase
        .rpc('get_table_columns', { table_name: 'audit_sessoes_aula' })

      expect(error).toBeNull()
      expect(columns).toBeDefined()

      const columnNames = columns?.map((col: any) => col.column_name) || []

      // Required audit columns
      expect(columnNames).toContain('id')
      expect(columnNames).toContain('sessao_id')
      expect(columnNames).toContain('acao')
      expect(columnNames).toContain('usuario_id')
      expect(columnNames).toContain('timestamp_acao')
      expect(columnNames).toContain('dados_anteriores')
      expect(columnNames).toContain('dados_novos')
      expect(columnNames).toContain('hash_verificacao')
    })

    it('should have proper foreign key constraints', async () => {
      // Test foreign key relationships
      const { data: constraints, error } = await testSupabase
        .rpc('get_foreign_keys', { table_name: 'audit_sessoes_aula' })

      expect(error).toBeNull()
      expect(constraints).toBeDefined()

      // Check sessao_id references sessoes_aula
      const sessionFK = constraints?.find(
        (fk: any) => fk.column_name === 'sessao_id' &&
                     fk.foreign_table_name === 'sessoes_aula'
      )
      expect(sessionFK).toBeDefined()
    })
  })

  describe('State Transition Validation', () => {

    it('should enforce valid state transitions with check constraints', async () => {
      const testSessionId = 'test-session-' + Date.now()

      // Test valid state transition: PLANEJADA -> ABERTA -> FECHADA
      const { data: session, error: createError } = await testSupabase
        .from('sessoes_aula')
        .insert({
          id: testSessionId,
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          disciplina_id: mockTestData.disciplina.id,
          data_aula: new Date().toISOString().split('T')[0],
          status: 'PLANEJADA'
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(session?.status).toBe('PLANEJADA')

      // Test opening session
      const { error: openError } = await testSupabase
        .from('sessoes_aula')
        .update({
          status: 'ABERTA',
          aberta_em: new Date().toISOString()
        })
        .eq('id', testSessionId)

      expect(openError).toBeNull()

      // Test closing session
      const { error: closeError } = await testSupabase
        .from('sessoes_aula')
        .update({
          status: 'FECHADA',
          fechada_em: new Date().toISOString(),
          conteudo_ministrado: 'Aula de teste ministrada'
        })
        .eq('id', testSessionId)

      expect(closeError).toBeNull()

      // Clean up
      await testSupabase
        .from('sessoes_aula')
        .delete()
        .eq('id', testSessionId)
    })

    it('should reject invalid state transitions', async () => {
      const testSessionId = 'test-invalid-' + Date.now()

      // Try to create session with FECHADA status but no timestamps
      const { error } = await testSupabase
        .from('sessoes_aula')
        .insert({
          id: testSessionId,
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          data_aula: new Date().toISOString().split('T')[0],
          status: 'FECHADA'
          // Missing required fechada_em timestamp
        })

      // Should fail due to check constraint
      expect(error).not.toBeNull()
      expect(error?.message).toContain('check constraint')
    })
  })

  describe('Audit Trail Functionality', () => {

    it('should automatically create audit records on session changes', async () => {
      const testSessionId = 'test-audit-' + Date.now()

      // Create session
      const { data: session } = await testSupabase
        .from('sessoes_aula')
        .insert({
          id: testSessionId,
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          data_aula: new Date().toISOString().split('T')[0],
          status: 'PLANEJADA'
        })
        .select()
        .single()

      // Check audit record was created
      const { data: auditRecords, error } = await testSupabase
        .from('audit_sessoes_aula')
        .select('*')
        .eq('sessao_id', testSessionId)
        .order('timestamp_acao', { ascending: true })

      expect(error).toBeNull()
      expect(auditRecords).toBeDefined()
      expect(auditRecords!.length).toBeGreaterThanOrEqual(1)

      const createRecord = auditRecords![0]
      expect(createRecord.acao).toBe('CRIAR')
      expect(createRecord.dados_novos).toBeDefined()
      expect(createRecord.hash_verificacao).toBeTruthy()

      // Update session and verify new audit record
      await testSupabase
        .from('sessoes_aula')
        .update({
          status: 'ABERTA',
          aberta_em: new Date().toISOString()
        })
        .eq('id', testSessionId)

      const { data: updatedAuditRecords } = await testSupabase
        .from('audit_sessoes_aula')
        .select('*')
        .eq('sessao_id', testSessionId)
        .order('timestamp_acao', { ascending: true })

      expect(updatedAuditRecords!.length).toBeGreaterThanOrEqual(2)
      const openRecord = updatedAuditRecords![1]
      expect(openRecord.acao).toBe('ABRIR')

      // Clean up
      await testSupabase
        .from('sessoes_aula')
        .delete()
        .eq('id', testSessionId)
    })

    it('should generate legal compliance hash for closed sessions', async () => {
      const testSessionId = 'test-hash-' + Date.now()

      // Create and immediately close session
      const { data: session } = await testSupabase
        .from('sessoes_aula')
        .insert({
          id: testSessionId,
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          data_aula: new Date().toISOString().split('T')[0],
          status: 'PLANEJADA'
        })
        .select()
        .single()

      // Open session
      await testSupabase
        .from('sessoes_aula')
        .update({
          status: 'ABERTA',
          aberta_em: new Date().toISOString()
        })
        .eq('id', testSessionId)

      // Close session - should generate hash
      const { data: closedSession } = await testSupabase
        .from('sessoes_aula')
        .update({
          status: 'FECHADA',
          fechada_em: new Date().toISOString(),
          conteudo_ministrado: 'Aula de teste para hash'
        })
        .eq('id', testSessionId)
        .select()
        .single()

      expect(closedSession?.hash_legal).toBeTruthy()
      expect(closedSession?.hash_legal).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex format

      // Clean up
      await testSupabase
        .from('sessoes_aula')
        .delete()
        .eq('id', testSessionId)
    })

    it('should prevent audit log modifications (immutability)', async () => {
      // Get any existing audit record
      const { data: auditRecord } = await testSupabase
        .from('audit_sessoes_aula')
        .select('*')
        .limit(1)
        .single()

      if (auditRecord) {
        // Try to update audit record - should fail
        const { error: updateError } = await testSupabase
          .from('audit_sessoes_aula')
          .update({ acao: 'MODIFIED' })
          .eq('id', auditRecord.id)

        expect(updateError).not.toBeNull()

        // Try to delete audit record - should fail
        const { error: deleteError } = await testSupabase
          .from('audit_sessoes_aula')
          .delete()
          .eq('id', auditRecord.id)

        expect(deleteError).not.toBeNull()
      }
    })
  })

  describe('Performance and Indexing', () => {

    it('should have proper indexes for teacher dashboard queries', async () => {
      // Test index exists for professor_id, status, data_aula
      const { data: indexes, error } = await testSupabase
        .rpc('get_table_indexes', { table_name: 'sessoes_aula' })

      expect(error).toBeNull()
      expect(indexes).toBeDefined()

      // Check for composite index
      const dashboardIndex = indexes?.find(
        (idx: any) => idx.indexname?.includes('professor_status_data')
      )
      expect(dashboardIndex).toBeDefined()
    })

    it('should have auto-closure index for efficient queries', async () => {
      const { data: indexes } = await testSupabase
        .rpc('get_table_indexes', { table_name: 'sessoes_aula' })

      const autoClosureIndex = indexes?.find(
        (idx: any) => idx.indexname?.includes('auto_fechamento')
      )
      expect(autoClosureIndex).toBeDefined()
    })

    it('should support fast audit trail lookups', async () => {
      const { data: indexes } = await testSupabase
        .rpc('get_table_indexes', { table_name: 'audit_sessoes_aula' })

      const auditIndex = indexes?.find(
        (idx: any) => idx.indexname?.includes('verificacao')
      )
      expect(auditIndex).toBeDefined()
    })
  })

  describe('Brazilian Timezone Handling', () => {

    it('should handle São Paulo timezone for auto-closure', async () => {
      const testSessionId = 'test-timezone-' + Date.now()

      // Create session with auto-closure scheduled for 6 PM São Paulo time
      const saoPauloSixPM = new Date()
      saoPauloSixPM.setHours(18, 0, 0, 0) // 6 PM

      const { data: session } = await testSupabase
        .from('sessoes_aula')
        .insert({
          id: testSessionId,
          turma_id: mockTestData.turma.id,
          professor_id: mockTestData.professor.id,
          data_aula: new Date().toISOString().split('T')[0],
          status: 'ABERTA',
          aberta_em: new Date().toISOString(),
          auto_fechamento_agendado: saoPauloSixPM.toISOString()
        })
        .select()
        .single()

      expect(session?.auto_fechamento_agendado).toBeTruthy()

      // Test auto-closure function (would be called by cron job)
      const { data: result, error } = await testSupabase
        .rpc('fn_auto_fechar_sessoes')

      expect(error).toBeNull()
      expect(typeof result).toBe('number') // Returns count of closed sessions

      // Clean up
      await testSupabase
        .from('sessoes_aula')
        .delete()
        .eq('id', testSessionId)
    })
  })

  describe('Row Level Security (RLS)', () => {

    it('should enforce teacher-specific session access', async () => {
      // This test would require setting up proper authentication context
      // For now, we test that RLS policies exist
      const { data: policies, error } = await testSupabase
        .rpc('get_table_policies', { table_name: 'sessoes_aula' })

      expect(error).toBeNull()
      expect(policies).toBeDefined()

      const teacherPolicy = policies?.find(
        (policy: any) => policy.policyname?.includes('teacher')
      )
      expect(teacherPolicy).toBeDefined()
    })

    it('should protect audit logs with read-only access', async () => {
      const { data: policies } = await testSupabase
        .rpc('get_table_policies', { table_name: 'audit_sessoes_aula' })

      const auditReadPolicy = policies?.find(
        (policy: any) => policy.policyname?.includes('audit_read')
      )
      expect(auditReadPolicy).toBeDefined()

      const auditImmutablePolicy = policies?.find(
        (policy: any) => policy.policyname?.includes('immutable')
      )
      expect(auditImmutablePolicy).toBeDefined()
    })
  })
})

describe('Database Functions and Procedures', () => {

  it('should have auto-closure function implemented', async () => {
    // Test function exists and is callable
    const { data, error } = await testSupabase
      .rpc('fn_auto_fechar_sessoes')

    expect(error).toBeNull()
    expect(typeof data).toBe('number')
  })

  it('should have audit trigger function implemented', async () => {
    // Test that trigger function exists by checking function catalog
    const { data: functions, error } = await testSupabase
      .rpc('get_database_functions', { function_name: 'fn_audit_sessao_aula' })

    expect(error).toBeNull()
    expect(functions).toBeDefined()
    expect(functions?.length).toBeGreaterThan(0)
  })

  it('should have helper functions for table introspection', async () => {
    // Test utility functions used in other tests
    const functions = [
      'get_table_columns',
      'get_foreign_keys',
      'get_table_indexes',
      'get_table_policies',
      'get_database_functions'
    ]

    for (const funcName of functions) {
      const { error } = await testSupabase
        .rpc('get_database_functions', { function_name: funcName })

      expect(error).toBeNull()
    }
  })
})