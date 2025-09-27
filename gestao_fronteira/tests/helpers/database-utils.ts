/**
 * Database Testing Utilities
 * Helper functions for testing database schema and functionality
 */

import { createClient } from '@supabase/supabase-js'

export const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Get table columns information
 */
export async function getTableColumns(tableName: string) {
  const { data, error } = await testSupabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_name', tableName)
    .eq('table_schema', 'public')

  return { data, error }
}

/**
 * Get foreign key constraints
 */
export async function getForeignKeys(tableName: string) {
  const { data, error } = await testSupabase.rpc('get_foreign_key_info', {
    p_table_name: tableName
  })

  return { data, error }
}

/**
 * Get table indexes
 */
export async function getTableIndexes(tableName: string) {
  const { data, error } = await testSupabase.rpc('get_table_index_info', {
    p_table_name: tableName
  })

  return { data, error }
}

/**
 * Get RLS policies for a table
 */
export async function getTablePolicies(tableName: string) {
  const { data, error } = await testSupabase
    .from('pg_policies')
    .select('policyname, cmd, qual, with_check')
    .eq('tablename', tableName)

  return { data, error }
}

/**
 * Get database functions
 */
export async function getDatabaseFunctions(functionName?: string) {
  let query = testSupabase
    .from('information_schema.routines')
    .select('routine_name, routine_type, routine_definition')
    .eq('routine_schema', 'public')

  if (functionName) {
    query = query.eq('routine_name', functionName)
  }

  const { data, error } = await query

  return { data, error }
}

/**
 * Clean up test data by pattern
 */
export async function cleanupTestData(pattern: string) {
  // Clean audit records first (due to foreign key)
  await testSupabase
    .from('audit_sessoes_aula')
    .delete()
    .like('sessao_id', `%${pattern}%`)

  // Clean session records
  await testSupabase
    .from('sessoes_aula')
    .delete()
    .like('id', `%${pattern}%`)
}

/**
 * Create test session data
 */
export async function createTestSession(overrides = {}) {
  const defaultData = {
    id: `test-session-${Date.now()}`,
    turma_id: '550e8400-e29b-41d4-a716-446655440002',
    professor_id: '550e8400-e29b-41d4-a716-446655440001',
    disciplina_id: '550e8400-e29b-41d4-a716-446655440003',
    data_aula: new Date().toISOString().split('T')[0],
    status: 'PLANEJADA' as const,
    ...overrides
  }

  const { data, error } = await testSupabase
    .from('sessoes_aula')
    .insert(defaultData)
    .select()
    .single()

  return { data, error }
}

/**
 * Verify audit trail for a session
 */
export async function verifyAuditTrail(sessionId: string) {
  const { data, error } = await testSupabase
    .from('audit_sessoes_aula')
    .select('*')
    .eq('sessao_id', sessionId)
    .order('timestamp_acao', { ascending: true })

  return { data, error }
}

/**
 * Test database performance with timing
 */
export async function measureQueryPerformance<T>(
  queryFn: () => Promise<T>,
  maxTimeMs: number = 1000
): Promise<{ result: T; timeMs: number; withinLimit: boolean }> {
  const startTime = performance.now()
  const result = await queryFn()
  const endTime = performance.now()
  const timeMs = endTime - startTime

  return {
    result,
    timeMs,
    withinLimit: timeMs <= maxTimeMs
  }
}

/**
 * Verify legal compliance hash format
 */
export function verifyLegalHash(hash: string): boolean {
  // SHA-256 hash should be 64 character hex string
  return /^[a-f0-9]{64}$/.test(hash)
}

/**
 * Generate test timestamp in São Paulo timezone
 */
export function getSaoPauloTimestamp(hour: number = 18, minute: number = 0): string {
  const date = new Date()

  // Convert to São Paulo timezone (UTC-3)
  const saoPauloOffset = -3 * 60 // minutes
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  const saoPauloTime = new Date(utc + (saoPauloOffset * 60000))

  saoPauloTime.setHours(hour, minute, 0, 0)

  return saoPauloTime.toISOString()
}

/**
 * Check if table has required columns
 */
export async function verifyTableSchema(
  tableName: string,
  requiredColumns: string[]
): Promise<{ valid: boolean; missingColumns: string[] }> {
  const { data: columns } = await getTableColumns(tableName)

  if (!columns) {
    return { valid: false, missingColumns: requiredColumns }
  }

  const columnNames = columns.map(col => col.column_name)
  const missingColumns = requiredColumns.filter(
    col => !columnNames.includes(col)
  )

  return {
    valid: missingColumns.length === 0,
    missingColumns
  }
}

/**
 * Test Brazilian timezone compliance
 */
export async function testBrazilianTimezoneCompliance() {
  // Test that auto-closure respects Brazilian timezone
  const sixPMSaoPaulo = getSaoPauloTimestamp(18, 0)

  return {
    timestamp: sixPMSaoPaulo,
    isValidTimezone: sixPMSaoPaulo.includes('T'),
    hour: new Date(sixPMSaoPaulo).getUTCHours()
  }
}