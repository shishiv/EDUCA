/**
 * Session Management API - Enhanced "Abrir aula" Workflow
 * Handles CRUD operations for aula_sessions
 * Brazilian Educational Compliance Implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schemas
const CreateSessionSchema = z.object({
  turma_id: z.string().uuid('Invalid turma ID'),
  professor_id: z.string().uuid('Invalid professor ID'),
  data_aula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  observacoes: z.string().optional()
})

const UpdateSessionSchema = z.object({
  fase: z.enum(['planejamento', 'chamada', 'finalizada', 'bloqueada']).optional(),
  observacoes: z.string().optional()
})

const SessionListSchema = z.object({
  turma_id: z.string().uuid().optional(),
  professor_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fase: z.enum(['planejamento', 'chamada', 'finalizada', 'bloqueada']).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional()
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

  // Get user profile with school information
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
    'chamada': ['finalizada'],
    'finalizada': ['bloqueada'],
    'bloqueada': [] // No transitions allowed from locked state
  }

  return validTransitions[currentPhase]?.includes(newPhase) ?? false
}

/**
 * GET /api/sessions
 * List sessions with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const validatedQuery = SessionListSchema.parse(queryParams)

    // Build query based on user role and filters
    let query = supabase
      .from('aula_sessions')
      .select(`
        id,
        turma_id,
        professor_id,
        data_aula,
        fase,
        bloqueado,
        bloqueado_em,
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
          escola_id
        ),
        users:professor_id (
          id,
          nome_completo
        )
      `)

    // Apply access control based on user role
    if (profile.tipo_usuario === 'professor') {
      query = query.eq('professor_id', profile.id)
    } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
      // Directors and secretaries can see all sessions in their school
      query = query.in('turma_id',
        supabase
          .from('turmas')
          .select('id')
          .eq('escola_id', profile.escola_id)
      )
    } else if (profile.tipo_usuario !== 'admin') {
      // Non-admin users without proper roles get no access
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Apply filters
    if (validatedQuery.turma_id) {
      query = query.eq('turma_id', validatedQuery.turma_id)
    }

    if (validatedQuery.professor_id) {
      query = query.eq('professor_id', validatedQuery.professor_id)
    }

    if (validatedQuery.date_from) {
      query = query.gte('data_aula', validatedQuery.date_from)
    }

    if (validatedQuery.date_to) {
      query = query.lte('data_aula', validatedQuery.date_to)
    }

    if (validatedQuery.fase) {
      query = query.eq('fase', validatedQuery.fase)
    }

    // Apply pagination
    const limit = validatedQuery.limit || 20
    const offset = validatedQuery.offset || 0

    query = query
      .order('data_aula', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Add compliance status to each session
    const enhancedSessions = sessions?.map(session => ({
      ...session,
      compliance_status: getComplianceStatus(session),
      can_modify: canModifySession(session, profile)
    }))

    return NextResponse.json({
      sessions: enhancedSessions,
      pagination: {
        limit,
        offset,
        total: enhancedSessions?.length || 0
      }
    })

  } catch (error) {
    console.error('Session list error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid query parameters',
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
 * POST /api/sessions
 * Create a new session
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    const body = await request.json()
    const validatedData = CreateSessionSchema.parse(body)

    // Verify user can create sessions for this turma
    const { data: turma } = await supabase
      .from('turmas')
      .select('id, escola_id, professor_id')
      .eq('id', validatedData.turma_id)
      .single()

    if (!turma) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Access control: professors can only create sessions for their classes
    if (profile.tipo_usuario === 'professor' && turma.professor_id !== profile.id) {
      return NextResponse.json({ error: 'Cannot create session for another professor\'s class' }, { status: 403 })
    }

    // Directors/secretaries can create sessions for any class in their school
    if (['diretor', 'secretario'].includes(profile.tipo_usuario) && turma.escola_id !== profile.escola_id) {
      return NextResponse.json({ error: 'Cannot create session for class outside your school' }, { status: 403 })
    }

    // Check for existing session on the same date
    const { data: existingSession } = await supabase
      .from('aula_sessions')
      .select('id')
      .eq('turma_id', validatedData.turma_id)
      .eq('data_aula', validatedData.data_aula)
      .single()

    if (existingSession) {
      return NextResponse.json({
        error: 'Session already exists for this class on this date',
        existing_session_id: existingSession.id
      }, { status: 409 })
    }

    // Validate date is not in the future beyond reasonable limits
    const maxFutureDate = new Date()
    maxFutureDate.setDate(maxFutureDate.getDate() + 30) // Allow up to 30 days in advance

    if (new Date(validatedData.data_aula) > maxFutureDate) {
      return NextResponse.json({
        error: 'Cannot create sessions more than 30 days in advance'
      }, { status: 400 })
    }

    // Create the session
    const { data: newSession, error } = await supabase
      .from('aula_sessions')
      .insert({
        turma_id: validatedData.turma_id,
        professor_id: validatedData.professor_id,
        data_aula: validatedData.data_aula,
        observacoes: validatedData.observacoes,
        fase: 'planejamento' // Always start in planning phase
      })
      .select(`
        id,
        turma_id,
        professor_id,
        data_aula,
        fase,
        bloqueado,
        observacoes,
        created_at,
        turmas:turma_id (
          nome,
          ano_letivo
        ),
        users:professor_id (
          nome_completo
        )
      `)
      .single()

    if (error) {
      console.error('Error creating session:', error)

      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({
          error: 'Session already exists for this class on this date'
        }, { status: 409 })
      }

      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({
      session: {
        ...newSession,
        compliance_status: 'pending',
        can_modify: true
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Session creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid session data',
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
  // Cannot modify locked sessions
  if (session.bloqueado) {
    return false
  }

  // Professors can only modify their own sessions
  if (profile.tipo_usuario === 'professor' && session.professor_id !== profile.id) {
    return false
  }

  // Check if session is from the same school for directors/secretaries
  if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    return session.turmas?.escola_id === profile.escola_id
  }

  // Admins can modify any non-locked session
  return profile.tipo_usuario === 'admin'
}