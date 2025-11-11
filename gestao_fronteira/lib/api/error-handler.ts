import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { logger } from '@/lib/logger'

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

/**
 * Códigos de erro padronizados para o sistema educacional
 */
export const ERROR_CODES = {
  // Autenticação e Autorização
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  SCHOOL_ACCESS_DENIED: 'SCHOOL_ACCESS_DENIED',
  PROFESSOR_NOT_ASSIGNED: 'PROFESSOR_NOT_ASSIGNED',
  SESSION_ACCESS_DENIED: 'SESSION_ACCESS_DENIED',

  // Validação
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_UUID: 'INVALID_UUID',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Aulas e Sessões
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_ALREADY_OPEN: 'SESSION_ALREADY_OPEN',
  SESSION_ALREADY_CLOSED: 'SESSION_ALREADY_CLOSED',
  SESSION_LOCKED: 'SESSION_LOCKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TURMA_NOT_FOUND: 'TURMA_NOT_FOUND',

  // Frequência
  ATTENDANCE_ALREADY_MARKED: 'ATTENDANCE_ALREADY_MARKED',
  STUDENT_NOT_ENROLLED: 'STUDENT_NOT_ENROLLED',
  INVALID_ATTENDANCE_DATA: 'INVALID_ATTENDANCE_DATA',

  // Sistema
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION'
} as const

/**
 * Mapeamento de códigos de erro para status HTTP
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  [ERROR_CODES.AUTH_REQUIRED]: 401,
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 403,
  [ERROR_CODES.USER_NOT_FOUND]: 404,
  [ERROR_CODES.SCHOOL_ACCESS_DENIED]: 403,
  [ERROR_CODES.PROFESSOR_NOT_ASSIGNED]: 403,
  [ERROR_CODES.SESSION_ACCESS_DENIED]: 403,

  [ERROR_CODES.VALIDATION_ERROR]: 422,
  [ERROR_CODES.INVALID_UUID]: 422,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 422,

  [ERROR_CODES.SESSION_NOT_FOUND]: 404,
  [ERROR_CODES.SESSION_ALREADY_OPEN]: 409,
  [ERROR_CODES.SESSION_ALREADY_CLOSED]: 409,
  [ERROR_CODES.SESSION_LOCKED]: 403,
  [ERROR_CODES.SESSION_EXPIRED]: 403,
  [ERROR_CODES.TURMA_NOT_FOUND]: 404,

  [ERROR_CODES.ATTENDANCE_ALREADY_MARKED]: 409,
  [ERROR_CODES.STUDENT_NOT_ENROLLED]: 422,
  [ERROR_CODES.INVALID_ATTENDANCE_DATA]: 422,

  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 422
}

/**
 * Mensagens de erro amigáveis em português
 */
const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTH_REQUIRED]: 'Autenticação obrigatória',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Permissões insuficientes',
  [ERROR_CODES.USER_NOT_FOUND]: 'Usuário não encontrado',
  [ERROR_CODES.SCHOOL_ACCESS_DENIED]: 'Acesso negado - recurso não pertence à sua escola',
  [ERROR_CODES.PROFESSOR_NOT_ASSIGNED]: 'Professor não está atribuído a esta turma',
  [ERROR_CODES.SESSION_ACCESS_DENIED]: 'Acesso negado a esta sessão',

  [ERROR_CODES.VALIDATION_ERROR]: 'Dados inválidos',
  [ERROR_CODES.INVALID_UUID]: 'Identificador inválido',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Campo obrigatório não informado',

  [ERROR_CODES.SESSION_NOT_FOUND]: 'Sessão de aula não encontrada',
  [ERROR_CODES.SESSION_ALREADY_OPEN]: 'Já existe uma aula aberta para esta turma',
  [ERROR_CODES.SESSION_ALREADY_CLOSED]: 'Esta sessão já foi fechada',
  [ERROR_CODES.SESSION_LOCKED]: 'Sessão travada - não pode ser alterada',
  [ERROR_CODES.SESSION_EXPIRED]: 'Tempo limite expirado - sessão foi travada',
  [ERROR_CODES.TURMA_NOT_FOUND]: 'Turma não encontrada',

  [ERROR_CODES.ATTENDANCE_ALREADY_MARKED]: 'Frequência já foi marcada para este aluno',
  [ERROR_CODES.STUDENT_NOT_ENROLLED]: 'Aluno não está matriculado nesta turma',
  [ERROR_CODES.INVALID_ATTENDANCE_DATA]: 'Dados de frequência inválidos',

  [ERROR_CODES.DATABASE_ERROR]: 'Erro interno do banco de dados',
  [ERROR_CODES.INTERNAL_ERROR]: 'Erro interno do servidor',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Muitas requisições - tente novamente em alguns instantes',
  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 'Operação viola regras de negócio'
}

/**
 * Classe base para erros da API
 */
export class ApiErrorBase extends Error {
  constructor(
    public code: string,
    message?: string,
    public details?: any
  ) {
    super(message || ERROR_MESSAGES[code] || 'Erro desconhecido')
    this.name = this.constructor.name
  }
}

/**
 * Classes específicas de erro
 */
export class AuthenticationError extends ApiErrorBase {}
export class AuthorizationError extends ApiErrorBase {}
export class ValidationError extends ApiErrorBase {}
export class NotFoundError extends ApiErrorBase {}
export class ConflictError extends ApiErrorBase {}
export class BusinessRuleError extends ApiErrorBase {}
export class DatabaseError extends ApiErrorBase {}

/**
 * Função principal para tratamento de erros
 */
export function handleApiError(error: unknown): NextResponse {
  logger.error('API Error', error as Error)

  // Erro customizado da API
  if (error instanceof ApiErrorBase) {
    const status = ERROR_STATUS_MAP[error.code] || 500
    return createErrorResponse(error.code, error.message, status, error.details)
  }

  // Erro de validação Zod
  if (error instanceof ZodError) {
    return createErrorResponse(
      ERROR_CODES.VALIDATION_ERROR,
      'Dados de entrada inválidos',
      422,
      error.errors
    )
  }

  // Erro de PostgreSQL/Supabase
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as any

    // Violation of unique constraint
    if (pgError.code === '23505') {
      return createErrorResponse(
        ERROR_CODES.BUSINESS_RULE_VIOLATION,
        'Violação de restrição única - dados já existem',
        409,
        { constraint: pgError.constraint }
      )
    }

    // Foreign key violation
    if (pgError.code === '23503') {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Referência inválida - registro relacionado não encontrado',
        422,
        { constraint: pgError.constraint }
      )
    }

    // Check constraint violation
    if (pgError.code === '23514') {
      return createErrorResponse(
        ERROR_CODES.BUSINESS_RULE_VIOLATION,
        'Violação de regra de negócio',
        422,
        { constraint: pgError.constraint }
      )
    }
  }

  // Erro genérico
  return createErrorResponse(
    ERROR_CODES.INTERNAL_ERROR,
    'Erro interno do servidor',
    500
  )
}

/**
 * Criar resposta de erro padronizada
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
 * Criar resposta de sucesso padronizada
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    } as ApiResponse<T>,
    { status }
  )
}

/**
 * Wrapper para handlers de API com tratamento automático de erros
 */
export function withErrorHandler<T = any>(
  handler: (...args: any[]) => Promise<T>
) {
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      const result = await handler(...args)
      return createSuccessResponse(result)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Validar UUID
 */
export function validateUuid(value: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    throw new ValidationError(
      ERROR_CODES.INVALID_UUID,
      `${fieldName} deve ser um UUID válido`,
      { field: fieldName, value }
    )
  }
}

/**
 * Validar campos obrigatórios
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      `Campo ${fieldName} é obrigatório`,
      { field: fieldName }
    )
  }
}

/**
 * Log estruturado para auditoria de ações educacionais
 */
export interface AuditLog {
  user_id: string
  action: string
  resource_type: 'aula' | 'frequencia' | 'aluno' | 'turma'
  resource_id: string
  metadata?: any
  escola_id: string
  timestamp: string
}

export function logEducationalAction(
  userId: string,
  action: string,
  resourceType: AuditLog['resource_type'],
  resourceId: string,
  escolaId: string,
  metadata?: any
): void {
  const logEntry: AuditLog = {
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
    escola_id: escolaId,
    timestamp: new Date().toISOString()
  }

  // Em produção, isso seria enviado para um sistema de logging
  console.log('AUDIT_LOG:', JSON.stringify(logEntry))
}