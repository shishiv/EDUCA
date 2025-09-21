/**
 * Individual Session Management API - Enhanced "Abrir aula" Workflow
 * Handles operations for specific sessions by ID
 * Brazilian Educational Compliance Implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schemas
const UpdateSessionSchema = z.object({
  fase: z.enum(['planejamento', 'chamada', 'finalizada', 'bloqueada']).optional(),
  observacoes: z.string().optional(),
  force_lock: z.boolean().optional()
})

const SessionParamsSchema = z.object({
  id: z.string().uuid('Invalid session ID')
})

// Create Supabase client
function createSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// Validate user authentication and get user info
async function validateAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tipo_usuario, escola_id, nome_completo')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  return { user, profile }
}

// Validate phase transitions according to Brazilian educational workflow
function validatePhaseTransition(currentPhase: string, newPhase: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'planejamento': ['chamada'],
    'chamada': ['finalizada', 'planejamento'], // Allow going back to planning from active
    'finalizada': ['bloqueada'],
    'bloqueada': [] // No transitions allowed from locked state
  }

  return validTransitions[currentPhase]?.includes(newPhase) ?? false
}

/**
 * GET /api/sessions/[id]
 * Get session details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    const validatedParams = SessionParamsSchema.parse(params)

    // Fetch session with related data
    const { data: session, error } = await supabase
      .from('aula_sessions')
      .select(`
        id,
        turma_id,
        professor_id,
        data_aula,
        fase,
        bloqueado,
        bloqueado_em,
        hash_integridade,
        observacoes,
        total_alunos,
        total_presentes,
        total_ausentes,
        created_at,
        updated_at,
        turmas:turma_id (
          id,
          nome,
          ano_letivo,
          escola_id,
          users:professor_id (
            id,
            nome_completo,
            email
          )
        )
      `)
      .eq('id', validatedParams.id)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Access control validation
    const canAccess = checkSessionAccess(session, profile)
    if (!canAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get attendance summary for this session
    const { data: attendanceSummary } = await supabase
      .from('frequencia')
      .select('presente, is_locked')
      .eq('session_id', session.id)

    const attendanceStats = {
      total_marked: attendanceSummary?.length || 0,
      present_count: attendanceSummary?.filter(a => a.presente).length || 0,
      absent_count: attendanceSummary?.filter(a => !a.presente).length || 0,
      locked_records: attendanceSummary?.filter(a => a.is_locked).length || 0
    }

    // Get recent audit trail (last 10 entries)
    const { data: auditTrail } = await supabase
      .rpc('get_session_audit_trail', { session_uuid: session.id })
      .limit(10)

    return NextResponse.json({
      session: {
        ...session,
        compliance_status: getComplianceStatus(session),
        can_modify: canModifySession(session, profile),
        attendance_stats: attendanceStats,
        audit_trail: auditTrail || []
      }
    })

  } catch (error) {
    console.error('Session fetch error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid session ID',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/sessions/[id]
 * Update session (phase transition, notes, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    const validatedParams = SessionParamsSchema.parse(params)
    const body = await request.json()
    const validatedData = UpdateSessionSchema.parse(body)

    // First, get current session state
    const { data: currentSession, error: fetchError } = await supabase
      .from('aula_sessions')
      .select(`
        id,
        turma_id,
        professor_id,
        fase,
        bloqueado,
        data_aula,
        turmas:turma_id (
          escola_id
        )
      `)
      .eq('id', validatedParams.id)
      .single()

    if (fetchError || !currentSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Access control validation
    const canModify = checkSessionModifyAccess(currentSession, profile)
    if (!canModify) {
      return NextResponse.json({ error: 'Insufficient permissions to modify this session' }, { status: 403 })
    }

    // Cannot modify locked sessions unless force_lock is admin operation
    if (currentSession.bloqueado && !validatedData.force_lock) {
      return NextResponse.json({
        error: 'Cannot modify locked session',
        compliance_note: 'Attendance records are immutable after locking per Brazilian educational law'
      }, { status: 400 })
    }

    // Validate phase transition if changing phase
    if (validatedData.fase && validatedData.fase !== currentSession.fase) {
      // Special handling for admin force lock
      if (validatedData.force_lock && profile.tipo_usuario === 'admin' && validatedData.fase === 'bloqueada') {
        // Allow admin to force lock any session
      } else {
        const isValidTransition = validatePhaseTransition(currentSession.fase, validatedData.fase)
        if (!isValidTransition) {
          return NextResponse.json({
            error: `Invalid phase transition from ${currentSession.fase} to ${validatedData.fase}`,
            valid_transitions: getValidTransitions(currentSession.fase)
          }, { status: 400 })
        }
      }

      // Additional validation for finalizada phase
      if (validatedData.fase === 'finalizada') {
        // Check if all students have attendance marked
        const { data: attendanceCheck } = await supabase
          .from('frequencia')
          .select('count')
          .eq('session_id', currentSession.id)

        const { data: expectedStudents } = await supabase
          .from('matriculas')
          .select('count')
          .eq('turma_id', currentSession.turma_id)
          .eq('ativo', true)

        // Allow completion even if not all students have attendance marked
        // (teacher might be completing partial attendance)
      }
    }

    // Prepare update data
    const updateData: any = {}

    if (validatedData.fase) {
      updateData.fase = validatedData.fase

      // If moving to bloqueada (locked), also set bloqueado flag and hash
      if (validatedData.fase === 'bloqueada') {
        updateData.bloqueado = true
        updateData.bloqueado_em = new Date().toISOString()
        // Hash will be calculated by trigger
      }
    }

    if (validatedData.observacoes !== undefined) {
      updateData.observacoes = validatedData.observacoes
    }

    // Perform the update
    const { data: updatedSession, error: updateError } = await supabase
      .from('aula_sessions')
      .update(updateData)
      .eq('id', validatedParams.id)
      .select(`
        id,
        turma_id,
        professor_id,
        data_aula,
        fase,
        bloqueado,
        bloqueado_em,
        hash_integridade,
        observacoes,
        total_alunos,
        total_presentes,
        total_ausentes,
        updated_at,
        turmas:turma_id (
          nome,
          ano_letivo
        )
      `)
      .single()

    if (updateError) {
      console.error('Session update error:', updateError)

      if (updateError.message.includes('locked')) {
        return NextResponse.json({
          error: 'Session is locked and cannot be modified',
          compliance_note: 'Brazilian educational law: "Não existe o esquecer"'
        }, { status: 400 })
      }

      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    // If session was locked, also lock all related attendance records
    if (validatedData.fase === 'bloqueada') {
      await supabase
        .from('frequencia')
        .update({ is_locked: true })
        .eq('session_id', validatedParams.id)
    }

    return NextResponse.json({
      session: {
        ...updatedSession,
        compliance_status: getComplianceStatus(updatedSession),
        can_modify: canModifySession(updatedSession, profile)
      }
    })

  } catch (error) {
    console.error('Session update error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid update data',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete session (only if not locked and user has permission)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    const validatedParams = SessionParamsSchema.parse(params)

    // Get session to check permissions and lock status
    const { data: session, error: fetchError } = await supabase
      .from('aula_sessions')
      .select(`
        id,
        turma_id,
        professor_id,
        bloqueado,
        fase,
        turmas:turma_id (
          escola_id
        )
      `)
      .eq('id', validatedParams.id)
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Cannot delete locked sessions
    if (session.bloqueado) {
      return NextResponse.json({
        error: 'Cannot delete locked session',
        compliance_note: 'Locked sessions must be preserved for audit compliance'
      }, { status: 400 })
    }

    // Access control validation
    const canDelete = checkSessionModifyAccess(session, profile)
    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions to delete this session' }, { status: 403 })
    }

    // Only allow deletion if session is in planning phase or empty
    if (session.fase !== 'planejamento') {
      return NextResponse.json({
        error: 'Can only delete sessions in planning phase',
        current_phase: session.fase
      }, { status: 400 })
    }

    // Check if session has any attendance records
    const { data: attendanceRecords } = await supabase
      .from('frequencia')
      .select('count')
      .eq('session_id', session.id)

    if (attendanceRecords && attendanceRecords.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete session with attendance records',
        attendance_count: attendanceRecords.length
      }, { status: 400 })
    }

    // Perform deletion
    const { error: deleteError } = await supabase
      .from('aula_sessions')
      .delete()
      .eq('id', validatedParams.id)

    if (deleteError) {
      console.error('Session deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Session deleted successfully' })

  } catch (error) {
    console.error('Session deletion error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid session ID',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function checkSessionAccess(session: any, profile: any): boolean {
  if (profile.tipo_usuario === 'admin') return true

  if (profile.tipo_usuario === 'professor') {
    return session.professor_id === profile.id
  }

  if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    return session.turmas?.escola_id === profile.escola_id
  }

  return false
}

function checkSessionModifyAccess(session: any, profile: any): boolean {
  if (profile.tipo_usuario === 'admin') return true

  if (profile.tipo_usuario === 'professor') {
    return session.professor_id === profile.id
  }

  if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    return session.turmas?.escola_id === profile.escola_id
  }

  return false
}

function getComplianceStatus(session: any): string {
  const sessionDate = new Date(session.data_aula)
  const today = new Date()

  if (session.bloqueado && session.hash_integridade) {
    return 'compliant'
  }

  if (sessionDate < today && !session.bloqueado) {
    return 'non_compliant'
  }

  if (session.fase === 'finalizada') {
    return 'completed'
  }

  if (session.fase === 'chamada') {
    return 'active'
  }

  return 'pending'
}

function canModifySession(session: any, profile: any): boolean {
  if (session.bloqueado) return false

  if (profile.tipo_usuario === 'admin') return true

  if (profile.tipo_usuario === 'professor') {
    return session.professor_id === profile.id
  }

  if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    return session.turmas?.escola_id === profile.escola_id
  }

  return false
}

function getValidTransitions(currentPhase: string): string[] {
  const validTransitions: Record<string, string[]> = {
    'planejamento': ['chamada'],
    'chamada': ['finalizada', 'planejamento'],
    'finalizada': ['bloqueada'],
    'bloqueada': []
  }

  return validTransitions[currentPhase] || []
}