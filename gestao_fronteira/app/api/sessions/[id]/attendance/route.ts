/**
 * Session-based Attendance API - Enhanced "Abrir aula" Workflow
 * Handles attendance operations within session context
 * Brazilian Educational Compliance Implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schemas
const SessionParamsSchema = z.object({
  id: z.string().uuid('Invalid session ID')
})

const AttendanceRecordSchema = z.object({
  aluno_id: z.string().uuid('Invalid student ID'),
  presente: z.boolean(),
  observacoes: z.string().optional()
})

const BatchAttendanceSchema = z.object({
  attendance: z.array(AttendanceRecordSchema).min(1, 'At least one attendance record required')
})

const UpdateAttendanceSchema = z.object({
  presente: z.boolean(),
  observacoes: z.string().optional()
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

// Validate user authentication
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

/**
 * GET /api/sessions/[id]/attendance
 * Get attendance records for a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    const validatedParams = SessionParamsSchema.parse(params)

    // First validate session access
    const { data: session, error: sessionError } = await supabase
      .from('aula_sessions')
      .select(`
        id,
        turma_id,
        professor_id,
        fase,
        bloqueado,
        data_aula,
        turmas:turma_id (
          id,
          nome,
          escola_id
        )
      `)
      .eq('id', validatedParams.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Access control validation
    const canAccess = checkSessionAccess(session, profile)
    if (!canAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get attendance records with student information
    const { data: attendance, error } = await supabase
      .from('frequencia')
      .select(`
        id,
        aluno_id,
        presente,
        observacoes,
        is_locked,
        hash_integridade,
        created_at,
        updated_at,
        alunos:aluno_id (
          id,
          nome_completo,
          numero_matricula,
          data_nascimento,
          responsaveis:alunos_responsaveis (
            responsaveis:responsavel_id (
              nome_completo,
              telefone
            )
          )
        )
      `)
      .eq('session_id', validatedParams.id)
      .order('alunos(nome_completo)', { ascending: true })

    if (error) {
      console.error('Error fetching attendance:', error)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    // Get all enrolled students for this class to show missing attendance
    const { data: allStudents } = await supabase
      .from('matriculas')
      .select(`
        aluno_id,
        numero_chamada,
        alunos:aluno_id (
          id,
          nome_completo,
          numero_matricula,
          data_nascimento
        )
      `)
      .eq('turma_id', session.turma_id)
      .eq('ativo', true)
      .order('numero_chamada', { ascending: true })

    // Create complete attendance list with marked and unmarked students
    const attendanceMap = new Map(attendance?.map(a => [a.aluno_id, a]) || [])

    const completeAttendance = (allStudents || []).map(student => {
      const attendanceRecord = attendanceMap.get(student.aluno_id)

      return {
        aluno_id: student.aluno_id,
        numero_chamada: student.numero_chamada,
        student: student.alunos,
        attendance: attendanceRecord ? {
          id: attendanceRecord.id,
          presente: attendanceRecord.presente,
          observacoes: attendanceRecord.observacoes,
          is_locked: attendanceRecord.is_locked,
          hash_integridade: attendanceRecord.hash_integridade,
          created_at: attendanceRecord.created_at,
          updated_at: attendanceRecord.updated_at
        } : null,
        marked: !!attendanceRecord,
        can_modify: canModifyAttendance(session, attendanceRecord, profile)
      }
    })

    // Calculate statistics
    const stats = {
      total_students: completeAttendance.length,
      marked_attendance: attendance?.length || 0,
      present_count: attendance?.filter(a => a.presente).length || 0,
      absent_count: attendance?.filter(a => !a.presente).length || 0,
      pending_count: completeAttendance.length - (attendance?.length || 0),
      locked_count: attendance?.filter(a => a.is_locked).length || 0,
      completion_percentage: completeAttendance.length > 0
        ? ((attendance?.length || 0) / completeAttendance.length) * 100
        : 0
    }

    return NextResponse.json({
      session: {
        id: session.id,
        turma_id: session.turma_id,
        turma_nome: session.turmas?.nome,
        fase: session.fase,
        bloqueado: session.bloqueado,
        data_aula: session.data_aula
      },
      attendance: completeAttendance,
      statistics: stats,
      can_modify_session: !session.bloqueado && checkSessionModifyAccess(session, profile),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Attendance fetch error:', error)

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
 * POST /api/sessions/[id]/attendance
 * Mark attendance for multiple students in batch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    const validatedParams = SessionParamsSchema.parse(params)
    const body = await request.json()
    const validatedData = BatchAttendanceSchema.parse(body)

    // Validate session and permissions
    const { data: session, error: sessionError } = await supabase
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

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Access control validation
    const canModify = checkSessionModifyAccess(session, profile)
    if (!canModify) {
      return NextResponse.json({ error: 'Insufficient permissions to modify attendance' }, { status: 403 })
    }

    // Cannot modify locked sessions
    if (session.bloqueado) {
      return NextResponse.json({
        error: 'Cannot modify attendance for locked session',
        compliance_note: 'Brazilian educational law: attendance records are immutable after locking'
      }, { status: 400 })
    }

    // Session must be in active phase to mark attendance
    if (session.fase !== 'chamada') {
      return NextResponse.json({
        error: 'Can only mark attendance during active session phase',
        current_phase: session.fase,
        required_phase: 'chamada'
      }, { status: 400 })
    }

    // Validate all students belong to this class
    const studentIds = validatedData.attendance.map(a => a.aluno_id)
    const { data: validStudents } = await supabase
      .from('matriculas')
      .select('aluno_id')
      .eq('turma_id', session.turma_id)
      .eq('ativo', true)
      .in('aluno_id', studentIds)

    const validStudentIds = new Set(validStudents?.map(s => s.aluno_id) || [])
    const invalidStudents = studentIds.filter(id => !validStudentIds.has(id))

    if (invalidStudents.length > 0) {
      return NextResponse.json({
        error: 'Some students are not enrolled in this class',
        invalid_students: invalidStudents
      }, { status: 400 })
    }

    // Prepare attendance records for upsert
    const attendanceRecords = validatedData.attendance.map(record => ({
      session_id: validatedParams.id,
      aluno_id: record.aluno_id,
      data: session.data_aula,
      presente: record.presente,
      observacoes: record.observacoes || null,
      is_locked: false // Will be set by triggers when session locks
    }))

    // Upsert attendance records (insert or update if exists)
    const { data: upsertedRecords, error: upsertError } = await supabase
      .from('frequencia')
      .upsert(attendanceRecords, {
        onConflict: 'session_id,aluno_id',
        ignoreDuplicates: false
      })
      .select(`
        id,
        aluno_id,
        presente,
        observacoes,
        is_locked,
        created_at,
        updated_at,
        alunos:aluno_id (
          nome_completo,
          numero_matricula
        )
      `)

    if (upsertError) {
      console.error('Attendance upsert error:', upsertError)

      if (upsertError.message.includes('locked')) {
        return NextResponse.json({
          error: 'Cannot modify locked attendance records',
          compliance_note: 'Some attendance records are already locked'
        }, { status: 400 })
      }

      return NextResponse.json({ error: 'Failed to save attendance records' }, { status: 500 })
    }

    // Update session statistics
    await supabase.rpc('update_session_stats', {
      session_uuid: validatedParams.id
    })

    // Get updated statistics
    const { data: updatedSession } = await supabase
      .from('aula_sessions')
      .select('total_alunos, total_presentes, total_ausentes')
      .eq('id', validatedParams.id)
      .single()

    return NextResponse.json({
      message: 'Attendance records saved successfully',
      saved_records: upsertedRecords?.length || 0,
      attendance_records: upsertedRecords,
      session_stats: updatedSession,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Attendance creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid attendance data',
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
 * PATCH /api/sessions/[id]/attendance
 * Update specific attendance record
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
    const { aluno_id, ...updateData } = body
    const validatedUpdate = UpdateAttendanceSchema.parse(updateData)

    if (!aluno_id) {
      return NextResponse.json({ error: 'aluno_id is required' }, { status: 400 })
    }

    // Validate session and permissions
    const { data: session, error: sessionError } = await supabase
      .from('aula_sessions')
      .select(`
        id,
        turma_id,
        professor_id,
        fase,
        bloqueado,
        turmas:turma_id (
          escola_id
        )
      `)
      .eq('id', validatedParams.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Access control validation
    const canModify = checkSessionModifyAccess(session, profile)
    if (!canModify) {
      return NextResponse.json({ error: 'Insufficient permissions to modify attendance' }, { status: 403 })
    }

    // Cannot modify locked sessions
    if (session.bloqueado) {
      return NextResponse.json({
        error: 'Cannot modify attendance for locked session',
        compliance_note: 'Brazilian educational law: attendance records are immutable after locking'
      }, { status: 400 })
    }

    // Get existing attendance record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('frequencia')
      .select('id, is_locked, presente, observacoes')
      .eq('session_id', validatedParams.id)
      .eq('aluno_id', aluno_id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching attendance record:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch attendance record' }, { status: 500 })
    }

    // Cannot modify locked individual records
    if (existingRecord?.is_locked) {
      return NextResponse.json({
        error: 'Cannot modify locked attendance record',
        compliance_note: 'This attendance record is permanently locked'
      }, { status: 400 })
    }

    let result
    if (existingRecord) {
      // Update existing record
      const { data: updatedRecord, error: updateError } = await supabase
        .from('frequencia')
        .update({
          presente: validatedUpdate.presente,
          observacoes: validatedUpdate.observacoes
        })
        .eq('id', existingRecord.id)
        .select(`
          id,
          aluno_id,
          presente,
          observacoes,
          is_locked,
          updated_at,
          alunos:aluno_id (
            nome_completo,
            numero_matricula
          )
        `)
        .single()

      if (updateError) {
        console.error('Attendance update error:', updateError)

        if (updateError.message.includes('locked')) {
          return NextResponse.json({
            error: 'Cannot modify locked attendance record'
          }, { status: 400 })
        }

        return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 })
      }

      result = updatedRecord
    } else {
      // Create new record
      const { data: newRecord, error: insertError } = await supabase
        .from('frequencia')
        .insert({
          session_id: validatedParams.id,
          aluno_id: aluno_id,
          data: session.data_aula,
          presente: validatedUpdate.presente,
          observacoes: validatedUpdate.observacoes
        })
        .select(`
          id,
          aluno_id,
          presente,
          observacoes,
          is_locked,
          created_at,
          alunos:aluno_id (
            nome_completo,
            numero_matricula
          )
        `)
        .single()

      if (insertError) {
        console.error('Attendance insert error:', insertError)
        return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 })
      }

      result = newRecord
    }

    // Update session statistics
    await supabase.rpc('update_session_stats', {
      session_uuid: validatedParams.id
    })

    return NextResponse.json({
      message: 'Attendance record updated successfully',
      attendance_record: result,
      action: existingRecord ? 'updated' : 'created'
    })

  } catch (error) {
    console.error('Attendance update error:', error)

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

function canModifyAttendance(session: any, attendanceRecord: any, profile: any): boolean {
  // Cannot modify if session is locked
  if (session.bloqueado) return false

  // Cannot modify if individual record is locked
  if (attendanceRecord?.is_locked) return false

  // Check user permissions
  return checkSessionModifyAccess(session, profile)
}