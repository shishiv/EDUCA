import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export interface AuthenticatedUser {
  id: string
  role: 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'
  escola_id: string
  name: string
  email: string
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp: string
}

export class AuthenticationError extends Error {
  constructor(public code: string, message: string, public details?: any) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(public code: string, message: string, public details?: any) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class ValidationError extends Error {
  constructor(public code: string, message: string, public details?: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Middleware de autenticação para APIs
 * Verifica se o usuário está autenticado e retorna dados do usuário
 */
export async function authenticateUser(): Promise<AuthenticatedUser> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new AuthenticationError('AUTH_REQUIRED', 'Autenticação obrigatória')
  }

  // Buscar dados completos do usuário
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, escola_id, name, email')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    throw new AuthenticationError('USER_NOT_FOUND', 'Usuário não encontrado no sistema')
  }

  return userData as AuthenticatedUser
}

/**
 * Middleware de autorização por role
 * Verifica se o usuário tem uma das roles permitidas
 */
export function requireRole(user: AuthenticatedUser, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError(
      'INSUFFICIENT_PERMISSIONS',
      `Acesso negado. Roles necessárias: ${allowedRoles.join(', ')}`,
      { userRole: user.role, allowedRoles }
    )
  }
}

/**
 * Middleware de autorização por escola
 * Verifica se o recurso pertence à mesma escola do usuário
 */
export function requireSameSchool(user: AuthenticatedUser, resourceSchoolId: string): void {
  if (user.escola_id !== resourceSchoolId) {
    throw new AuthorizationError(
      'SCHOOL_ACCESS_DENIED',
      'Acesso negado. Recurso não pertence à sua escola',
      { userSchoolId: user.escola_id, resourceSchoolId }
    )
  }
}

/**
 * Wrapper para handlers de API com tratamento de erro padronizado
 */
export function withAuth<T = any>(
  handler: (user: AuthenticatedUser, request: NextRequest, params?: any) => Promise<T>,
  options?: {
    allowedRoles?: string[]
    requireProfessor?: boolean
    requireAdmin?: boolean
  }
) {
  return async (request: NextRequest, context?: { params?: any }): Promise<NextResponse> => {
    try {
      // Autenticar usuário
      const user = await authenticateUser()

      // Verificar roles se especificado
      if (options?.allowedRoles) {
        requireRole(user, options.allowedRoles)
      }

      if (options?.requireProfessor) {
        requireRole(user, ['professor'])
      }

      if (options?.requireAdmin) {
        requireRole(user, ['admin', 'diretor'])
      }

      // Executar handler
      const result = await handler(user, request, context?.params)

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponse<T>)

    } catch (error) {
      console.error('API Error:', error)

      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details
            },
            timestamp: new Date().toISOString()
          } as ApiResponse,
          { status: 401 }
        )
      }

      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details
            },
            timestamp: new Date().toISOString()
          } as ApiResponse,
          { status: 403 }
        )
      }

      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details
            },
            timestamp: new Date().toISOString()
          } as ApiResponse,
          { status: 422 }
        )
      }

      // Erro genérico
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          },
          timestamp: new Date().toISOString()
        } as ApiResponse,
        { status: 500 }
      )
    }
  }
}

/**
 * Função para criar respostas de erro padronizadas
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: new Date().toISOString()
    } as ApiResponse,
    { status }
  )
}

/**
 * Função para criar respostas de sucesso padronizadas
 */
export function createSuccessResponse<T>(data: T): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  } as ApiResponse<T>)
}

/**
 * Middleware específico para endpoints de aula
 * Verifica se o professor tem acesso à turma
 */
export async function validateClassAccess(
  user: AuthenticatedUser,
  turmaId: string
): Promise<any> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: turma, error } = await supabase
    .from('turmas')
    .select('id, nome, ano, escola_id, professor_id')
    .eq('id', turmaId)
    .single()

  if (error || !turma) {
    throw new ValidationError('TURMA_NOT_FOUND', 'Turma não encontrada')
  }

  // Verificar se pertence à mesma escola
  requireSameSchool(user, turma.escola_id)

  // Se for professor, verificar se está atribuído à turma
  if (user.role === 'professor' && turma.professor_id !== user.id) {
    throw new AuthorizationError(
      'PROFESSOR_NOT_ASSIGNED',
      'Professor não está atribuído a esta turma'
    )
  }

  return turma
}

/**
 * Middleware específico para endpoints de aula aberta
 * Verifica se o professor tem acesso à sessão de aula
 */
export async function validateSessionAccess(
  user: AuthenticatedUser,
  aulaId: string
): Promise<any> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: aula, error } = await supabase
    .from('aulas_abertas')
    .select(`
      id,
      status,
      professor_id,
      turma_id,
      fechada_em,
      tempo_limite_minutos,
      turmas!inner(escola_id)
    `)
    .eq('id', aulaId)
    .single()

  if (error || !aula) {
    throw new ValidationError('SESSION_NOT_FOUND', 'Sessão de aula não encontrada')
  }

  // Verificar se pertence à mesma escola
  requireSameSchool(user, aula.turmas.escola_id)

  // Se for professor, verificar se é o professor da sessão
  if (user.role === 'professor' && aula.professor_id !== user.id) {
    throw new AuthorizationError(
      'SESSION_ACCESS_DENIED',
      'Você não tem permissão para acessar esta sessão'
    )
  }

  return aula
}

/**
 * Verificar se uma sessão pode ser modificada
 */
export function validateSessionModifiable(aula: any): void {
  if (aula.status === 'travada') {
    throw new AuthorizationError(
      'SESSION_LOCKED',
      'Esta sessão está travada e não pode ser alterada'
    )
  }

  // Verificar tempo limite se a sessão está fechada
  if (aula.status === 'fechada' && aula.fechada_em && aula.tempo_limite_minutos) {
    const fechadaEm = new Date(aula.fechada_em)
    const seraTravadasEm = new Date(fechadaEm.getTime() + (aula.tempo_limite_minutos * 60 * 1000))
    const agora = new Date()

    if (agora >= seraTravadasEm) {
      throw new AuthorizationError(
        'SESSION_EXPIRED',
        'O tempo limite para alterações expirou. A sessão foi travada automaticamente.'
      )
    }
  }
}