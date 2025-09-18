/**
 * Structured Error Handling for Educational Management System
 *
 * Features:
 * - Educational-domain specific error types
 * - Consistent error formatting and user messages
 * - Error recovery strategies
 * - Integration with logging service
 * - User-friendly error communication
 */

import { toast } from 'sonner'
import { logger, LogContext } from './logger'

// Educational-specific error types
export enum EducationalErrorType {
  // Authentication & Authorization
  AUTHENTICATION_FAILED = 'authentication_failed',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  SESSION_EXPIRED = 'session_expired',

  // Student Management
  STUDENT_NOT_FOUND = 'student_not_found',
  STUDENT_ALREADY_ENROLLED = 'student_already_enrolled',
  INVALID_STUDENT_DATA = 'invalid_student_data',
  ENROLLMENT_LIMIT_EXCEEDED = 'enrollment_limit_exceeded',

  // Attendance System
  ATTENDANCE_ALREADY_MARKED = 'attendance_already_marked',
  ATTENDANCE_PERIOD_CLOSED = 'attendance_period_closed',
  INVALID_ATTENDANCE_DATE = 'invalid_attendance_date',
  CLASS_NOT_STARTED = 'class_not_started',

  // Class Management
  CLASS_NOT_FOUND = 'class_not_found',
  CLASS_CAPACITY_EXCEEDED = 'class_capacity_exceeded',
  TEACHER_NOT_ASSIGNED = 'teacher_not_assigned',
  INVALID_CLASS_SCHEDULE = 'invalid_class_schedule',

  // Data Integrity
  DUPLICATE_RECORD = 'duplicate_record',
  INVALID_CPF = 'invalid_cpf',
  INVALID_PHONE = 'invalid_phone',
  REQUIRED_FIELD_MISSING = 'required_field_missing',

  // System Errors
  NETWORK_ERROR = 'network_error',
  DATABASE_ERROR = 'database_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface EducationalError {
  type: EducationalErrorType
  message: string
  userMessage: string
  severity: ErrorSeverity
  code?: string
  context?: LogContext
  originalError?: Error
  timestamp: string
  recoverable: boolean
  suggestions?: string[]
}

export interface ErrorRecoveryAction {
  label: string
  action: () => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'danger'
}

class EducationalErrorHandler {
  private errorMap: Map<EducationalErrorType, Partial<EducationalError>> = new Map([
    // Authentication Errors
    [EducationalErrorType.AUTHENTICATION_FAILED, {
      userMessage: 'Falha na autenticação. Verifique suas credenciais.',
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      suggestions: ['Verifique email e senha', 'Tente fazer login novamente', 'Entre em contato com o administrador']
    }],
    [EducationalErrorType.INSUFFICIENT_PERMISSIONS, {
      userMessage: 'Você não tem permissão para realizar esta ação.',
      severity: ErrorSeverity.MEDIUM,
      recoverable: false,
      suggestions: ['Entre em contato com o administrador', 'Verifique se está logado com a conta correta']
    }],
    [EducationalErrorType.SESSION_EXPIRED, {
      userMessage: 'Sua sessão expirou. Faça login novamente.',
      severity: ErrorSeverity.LOW,
      recoverable: true,
      suggestions: ['Clique em "Fazer Login" para continuar']
    }],

    // Student Management Errors
    [EducationalErrorType.STUDENT_NOT_FOUND, {
      userMessage: 'Aluno não encontrado no sistema.',
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      suggestions: ['Verifique se o nome está correto', 'Tente buscar por CPF', 'Verifique se o aluno está ativo']
    }],
    [EducationalErrorType.STUDENT_ALREADY_ENROLLED, {
      userMessage: 'Este aluno já está matriculado nesta turma.',
      severity: ErrorSeverity.LOW,
      recoverable: true,
      suggestions: ['Verifique a turma de destino', 'Consulte as matrículas existentes do aluno']
    }],
    [EducationalErrorType.INVALID_STUDENT_DATA, {
      userMessage: 'Os dados do aluno contêm erros. Verifique as informações.',
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      suggestions: ['Verifique CPF', 'Confirme data de nascimento', 'Revise dados do responsável']
    }],

    // Attendance Errors
    [EducationalErrorType.ATTENDANCE_ALREADY_MARKED, {
      userMessage: 'A frequência já foi registrada para esta data.',
      severity: ErrorSeverity.LOW,
      recoverable: false,
      suggestions: ['Consulte o registro existente', 'Entre em contato com a coordenação se precisar alterar']
    }],
    [EducationalErrorType.ATTENDANCE_PERIOD_CLOSED, {
      userMessage: 'O período para registro de frequência está fechado.',
      severity: ErrorSeverity.MEDIUM,
      recoverable: false,
      suggestions: ['Entre em contato com a coordenação', 'Verifique o calendário escolar']
    }],
    [EducationalErrorType.CLASS_NOT_STARTED, {
      userMessage: 'A aula precisa ser aberta antes de registrar a frequência.',
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      suggestions: ['Clique em "Abrir Aula" primeiro', 'Verifique se é o horário correto da aula']
    }],

    // System Errors
    [EducationalErrorType.NETWORK_ERROR, {
      userMessage: 'Problema de conexão. Verifique sua internet.',
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      suggestions: ['Verifique sua conexão com a internet', 'Tente novamente em alguns instantes', 'Recarregue a página']
    }],
    [EducationalErrorType.DATABASE_ERROR, {
      userMessage: 'Erro interno do sistema. Tente novamente.',
      severity: ErrorSeverity.HIGH,
      recoverable: true,
      suggestions: ['Tente novamente em alguns minutos', 'Entre em contato com o suporte se o problema persistir']
    }],
    [EducationalErrorType.VALIDATION_ERROR, {
      userMessage: 'Dados inválidos. Verifique as informações inseridas.',
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      suggestions: ['Revise todos os campos obrigatórios', 'Verifique formatos de CPF e telefone']
    }]
  ])

  createError(
    type: EducationalErrorType,
    message?: string,
    context?: LogContext,
    originalError?: Error
  ): EducationalError {
    const template = this.errorMap.get(type)
    const timestamp = new Date().toISOString()

    const error: EducationalError = {
      type,
      message: message || `Educational error: ${type}`,
      userMessage: template?.userMessage || 'Ocorreu um erro inesperado.',
      severity: template?.severity || ErrorSeverity.MEDIUM,
      timestamp,
      recoverable: template?.recoverable ?? true,
      suggestions: template?.suggestions,
      context,
      originalError
    }

    return error
  }

  handleError(
    error: EducationalError | Error | unknown,
    context?: LogContext,
    showToast: boolean = true
  ): EducationalError {
    let educationalError: EducationalError

    if (error instanceof Error) {
      // Convert regular Error to EducationalError
      educationalError = this.createError(
        this.detectErrorType(error),
        error.message,
        context,
        error
      )
    } else if (this.isEducationalError(error)) {
      educationalError = error
    } else {
      // Unknown error type
      educationalError = this.createError(
        EducationalErrorType.UNKNOWN_ERROR,
        String(error),
        context
      )
    }

    // Log the error
    this.logError(educationalError)

    // Show user notification if requested
    if (showToast) {
      this.showErrorToast(educationalError)
    }

    return educationalError
  }

  private detectErrorType(error: Error): EducationalErrorType {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return EducationalErrorType.NETWORK_ERROR
    }

    // Authentication errors
    if (message.includes('auth') || message.includes('login') || message.includes('token')) {
      return EducationalErrorType.AUTHENTICATION_FAILED
    }

    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized')) {
      return EducationalErrorType.INSUFFICIENT_PERMISSIONS
    }

    // Student-related errors
    if (message.includes('student') || message.includes('aluno')) {
      if (message.includes('not found')) {
        return EducationalErrorType.STUDENT_NOT_FOUND
      }
      if (message.includes('already enrolled')) {
        return EducationalErrorType.STUDENT_ALREADY_ENROLLED
      }
      return EducationalErrorType.INVALID_STUDENT_DATA
    }

    // Attendance errors
    if (message.includes('attendance') || message.includes('frequencia')) {
      if (message.includes('already marked')) {
        return EducationalErrorType.ATTENDANCE_ALREADY_MARKED
      }
      if (message.includes('closed') || message.includes('period')) {
        return EducationalErrorType.ATTENDANCE_PERIOD_CLOSED
      }
      return EducationalErrorType.INVALID_ATTENDANCE_DATE
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return EducationalErrorType.VALIDATION_ERROR
    }

    return EducationalErrorType.UNKNOWN_ERROR
  }

  private isEducationalError(error: unknown): error is EducationalError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'userMessage' in error &&
      'severity' in error
    )
  }

  private logError(error: EducationalError): void {
    const logLevel = this.getLogLevel(error.severity)

    switch (logLevel) {
      case 'critical':
        logger.critical(error.message, error.originalError, error.context)
        break
      case 'error':
        logger.error(error.message, error.originalError, error.context)
        break
      case 'warn':
        logger.warn(error.message, error.context)
        break
      default:
        logger.info(error.message, error.context)
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'info' | 'warn' | 'error' | 'critical' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'critical'
      case ErrorSeverity.HIGH:
        return 'error'
      case ErrorSeverity.MEDIUM:
        return 'warn'
      case ErrorSeverity.LOW:
      default:
        return 'info'
    }
  }

  private showErrorToast(error: EducationalError): void {
    const toastOptions = {
      description: error.suggestions?.[0],
      duration: this.getToastDuration(error.severity)
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        toast.error(error.userMessage, toastOptions)
        break
      case ErrorSeverity.MEDIUM:
        toast.warning(error.userMessage, toastOptions)
        break
      case ErrorSeverity.LOW:
      default:
        toast.info(error.userMessage, toastOptions)
        break
    }
  }

  private getToastDuration(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 10000 // 10 seconds
      case ErrorSeverity.HIGH:
        return 7000  // 7 seconds
      case ErrorSeverity.MEDIUM:
        return 5000  // 5 seconds
      case ErrorSeverity.LOW:
      default:
        return 3000  // 3 seconds
    }
  }

  // Recovery helpers
  getRecoveryActions(error: EducationalError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = []

    switch (error.type) {
      case EducationalErrorType.SESSION_EXPIRED:
        actions.push({
          label: 'Fazer Login',
          action: () => window.location.href = '/login',
          variant: 'primary'
        })
        break

      case EducationalErrorType.NETWORK_ERROR:
        actions.push({
          label: 'Tentar Novamente',
          action: () => window.location.reload(),
          variant: 'primary'
        })
        break

      case EducationalErrorType.STUDENT_NOT_FOUND:
        actions.push({
          label: 'Buscar Novamente',
          action: () => window.history.back(),
          variant: 'secondary'
        })
        break

      default:
        if (error.recoverable) {
          actions.push({
            label: 'Voltar',
            action: () => window.history.back(),
            variant: 'secondary'
          })
        }
    }

    return actions
  }
}

// Create singleton instance
export const errorHandler = new EducationalErrorHandler()

// Convenience functions
export const handleError = (
  error: Error | unknown,
  context?: LogContext,
  showToast?: boolean
): EducationalError => {
  return errorHandler.handleError(error, context, showToast)
}

export const createEducationalError = (
  type: EducationalErrorType,
  message?: string,
  context?: LogContext
): EducationalError => {
  return errorHandler.createError(type, message, context)
}

// Hook for React components
export const useErrorHandler = () => {
  const handleComponentError = (
    error: Error | unknown,
    feature?: string,
    showToast: boolean = true
  ) => {
    const context: LogContext = feature ? { feature } : undefined
    return handleError(error, context, showToast)
  }

  return {
    handleError: handleComponentError,
    createError: createEducationalError,
    ErrorType: EducationalErrorType
  }
}

// Async operation wrapper with error handling
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: LogContext,
  onError?: (error: EducationalError) => void
): Promise<T | null> => {
  try {
    return await operation()
  } catch (error) {
    const educationalError = handleError(error, context)
    onError?.(educationalError)
    return null
  }
}

export default errorHandler