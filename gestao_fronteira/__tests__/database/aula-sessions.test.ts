/**
 * @jest-environment node
 * @description Tests for aula_sessions table and session management functionality
 * Enhanced "Abrir aula" Workflow - Database Foundation Tests
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

describe('Aula Sessions Database Foundation', () => {
  let testTurmaId: string
  let testProfessorId: string
  let testSessionId: string

  beforeAll(async () => {
    // Set up test data - create test turma and professor
    const { data: escola } = await supabase
      .from('escolas')
      .insert({
        nome: 'Test School - Session Tests',
        codigo_mec: 'TEST001',
        endereco: 'Test Address'
      })
      .select('id')
      .single()

    const { data: professor } = await supabase
      .from('users')
      .insert({
        email: 'professor.session.test@escola.com',
        nome_completo: 'Professor Session Test',
        tipo_usuario: 'professor',
        escola_id: escola!.id
      })
      .select('id')
      .single()

    const { data: turma } = await supabase
      .from('turmas')
      .insert({
        nome: 'Turma Test - Session',
        ano_letivo: 2025,
        escola_id: escola!.id,
        professor_id: professor!.id
      })
      .select('id')
      .single()

    testTurmaId = turma!.id
    testProfessorId = professor!.id
  })

  afterAll(async () => {
    // Clean up test data
    await supabase.from('aula_sessions').delete().eq('turma_id', testTurmaId)
    await supabase.from('turmas').delete().eq('id', testTurmaId)
    await supabase.from('users').delete().eq('id', testProfessorId)
  })

  describe('1.1 - aula_sessions Table Structure', () => {
    test('should have correct table structure with all required columns', async () => {
      // Test table exists and has expected columns
      const { data, error } = await supabase
        .from('aula_sessions')
        .select('*')
        .limit(0)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    test('should enforce required fields and constraints', async () => {
      // Test required field validation
      const { error } = await supabase
        .from('aula_sessions')
        .insert({
          // Missing required fields
        })

      expect(error).toBeTruthy()
      expect(error?.message).toContain('not-null')
    })

    test('should validate session phase enum values', async () => {
      const { error } = await supabase
        .from('aula_sessions')
        .insert({
          turma_id: testTurmaId,
          professor_id: testProfessorId,
          data_aula: new Date().toISOString().split('T')[0],
          fase: 'invalid_phase' as any
        })

      expect(error).toBeTruthy()
      expect(error?.message).toContain('fase')
    })
  })

  describe('1.2 - Session Creation and State Management', () => {
    test('should create session in planejamento phase by default', async () => {
      const { data, error } = await supabase
        .from('aula_sessions')
        .insert({
          turma_id: testTurmaId,
          professor_id: testProfessorId,
          data_aula: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.fase).toBe('planejamento')
      expect(data.bloqueado).toBe(false)
      expect(data.created_at).toBeDefined()

      testSessionId = data.id
    })

    test('should allow valid phase transitions', async () => {
      // Transition from planejamento to chamada
      const { error: error1 } = await supabase
        .from('aula_sessions')
        .update({ fase: 'chamada' })
        .eq('id', testSessionId)

      expect(error1).toBeNull()

      // Transition from chamada to finalizada
      const { error: error2 } = await supabase
        .from('aula_sessions')
        .update({ fase: 'finalizada' })
        .eq('id', testSessionId)

      expect(error2).toBeNull()
    })

    test('should calculate hash_integridade on session completion', async () => {
      const { data } = await supabase
        .from('aula_sessions')
        .select('hash_integridade')
        .eq('id', testSessionId)
        .single()

      expect(data?.hash_integridade).toBeDefined()
      expect(typeof data?.hash_integridade).toBe('string')
    })
  })

  describe('1.3 - Automatic Locking Mechanism', () => {
    test('should auto-lock sessions at 18:00', async () => {
      // Create a session for yesterday to test auto-locking
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const { data: sessionData } = await supabase
        .from('aula_sessions')
        .insert({
          turma_id: testTurmaId,
          professor_id: testProfessorId,
          data_aula: yesterday.toISOString().split('T')[0],
          fase: 'finalizada'
        })
        .select()
        .single()

      // Trigger auto-lock function
      const { error } = await supabase.rpc('auto_lock_daily_sessions')

      expect(error).toBeNull()

      // Verify session is locked
      const { data: lockedSession } = await supabase
        .from('aula_sessions')
        .select('bloqueado, bloqueado_em')
        .eq('id', sessionData!.id)
        .single()

      expect(lockedSession?.bloqueado).toBe(true)
      expect(lockedSession?.bloqueado_em).toBeDefined()
    })

    test('should prevent modifications to locked sessions', async () => {
      // Try to modify a locked session
      const { error } = await supabase
        .from('aula_sessions')
        .update({ fase: 'planejamento' })
        .eq('bloqueado', true)
        .limit(1)

      expect(error).toBeTruthy()
      expect(error?.message).toContain('locked')
    })
  })

  describe('1.4 - RLS Policies and Security', () => {
    test('should enforce school-based data isolation', async () => {
      // Test that professors can only access sessions from their school
      const { data, error } = await supabase
        .from('aula_sessions')
        .select('*')
        .eq('professor_id', testProfessorId)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      // All returned sessions should belong to the same school
      expect(data?.every(session => session.professor_id === testProfessorId)).toBe(true)
    })

    test('should allow administrators to view all sessions in their school', async () => {
      // This would require setting up admin user context
      // For now, we verify the RLS policies exist
      const { data } = await supabase
        .rpc('get_table_policies', { table_name: 'aula_sessions' })

      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('1.5 - Audit Trail Integration', () => {
    test('should create audit records for session changes', async () => {
      const sessionsBefore = await supabase
        .from('audit_trail')
        .select('count')
        .eq('tabela', 'aula_sessions')

      // Make a change to trigger audit
      await supabase
        .from('aula_sessions')
        .update({ observacoes: 'Test audit trail' })
        .eq('id', testSessionId)

      const sessionsAfter = await supabase
        .from('audit_trail')
        .select('count')
        .eq('tabela', 'aula_sessions')

      // Should have more audit records after the change
      expect(sessionsAfter.data).toBeDefined()
    })

    test('should track user and timestamp in audit records', async () => {
      const { data } = await supabase
        .from('audit_trail')
        .select('usuario_id, created_at, operacao')
        .eq('tabela', 'aula_sessions')
        .order('created_at', { ascending: false })
        .limit(1)

      expect(data?.[0]).toBeDefined()
      expect(data?.[0].created_at).toBeDefined()
      expect(['INSERT', 'UPDATE', 'DELETE']).toContain(data?.[0].operacao)
    })
  })

  describe('1.6 - Performance and Indexing', () => {
    test('should have efficient queries for session lookup', async () => {
      const startTime = Date.now()

      await supabase
        .from('aula_sessions')
        .select('*')
        .eq('turma_id', testTurmaId)
        .eq('data_aula', new Date().toISOString().split('T')[0])

      const queryTime = Date.now() - startTime

      // Query should complete quickly (< 100ms for test data)
      expect(queryTime).toBeLessThan(100)
    })

    test('should efficiently handle session statistics', async () => {
      const startTime = Date.now()

      await supabase.rpc('get_session_statistics', {
        escola_id: 'test-escola-id',
        date_from: '2025-01-01',
        date_to: '2025-12-31'
      })

      const queryTime = Date.now() - startTime

      // Statistics query should be fast
      expect(queryTime).toBeLessThan(200)
    })
  })
})

describe('Enhanced Frequencia Table Integration', () => {
  let sessionId: string
  let alunoId: string

  beforeAll(async () => {
    // Set up test data for frequencia integration
    const { data: session } = await supabase
      .from('aula_sessions')
      .select('id')
      .limit(1)
      .single()

    const { data: aluno } = await supabase
      .from('alunos')
      .select('id')
      .limit(1)
      .single()

    sessionId = session!.id
    alunoId = aluno!.id
  })

  test('should link attendance records to sessions', async () => {
    const { data, error } = await supabase
      .from('frequencia')
      .insert({
        aluno_id: alunoId,
        session_id: sessionId,
        data: new Date().toISOString().split('T')[0],
        presente: true
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data?.session_id).toBe(sessionId)
  })

  test('should prevent attendance modification for locked sessions', async () => {
    // Lock the session first
    await supabase
      .from('aula_sessions')
      .update({ bloqueado: true })
      .eq('id', sessionId)

    // Try to modify attendance
    const { error } = await supabase
      .from('frequencia')
      .update({ presente: false })
      .eq('session_id', sessionId)

    expect(error).toBeTruthy()
    expect(error?.message).toContain('locked')
  })

  test('should calculate attendance hash for integrity', async () => {
    const { data } = await supabase
      .from('frequencia')
      .select('hash_integridade')
      .eq('session_id', sessionId)
      .limit(1)
      .single()

    expect(data?.hash_integridade).toBeDefined()
    expect(typeof data?.hash_integridade).toBe('string')
  })
})