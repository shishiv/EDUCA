/**
 * Services index - Central export for active service classes
 * Brazilian Educational Management System services with validation
 *
 * ACTIVE SERVICES (MVP):
 * - attendance-workflow: 3-phase attendance workflow management
 * - attendance-locking: Attendance locking for legal compliance
 * - attendance-immutability: Immutability enforcement (não existe o esquecer)
 * - attendance-bulk-operations: Bulk attendance operations
 *
 * PLANNED SERVICES (Phase 2):
 * See lib/services/planned/ for future features:
 * - audit-service: Audit checklist management
 * - attendance-history: Comprehensive audit trail
 * - mockup-scan-service: Code analysis tooling
 */

// Active attendance services exported for production use
export {
  AttendanceWorkflowManager,
  type WorkflowPhase,
  type WorkflowState,
  type WorkflowTransition,
  createAttendanceWorkflow
} from './attendance-workflow'

export {
  attendanceLocking,
  type LockingStatus,
  type LockingRule,
  type UnlockRequest,
  type UnlockPermission
} from './attendance-locking'

export {
  attendanceImmutability,
  type ImmutabilityViolation,
  type ImmutabilityStatus
} from './attendance-immutability'

export {
  AttendanceBulkOperationsService,
  type BulkOperationResult,
  type BulkMarkingRequest
} from './attendance-bulk-operations'

/**
 * Service factory functions for creating service instances
 */
export const ServiceFactory = {
  /**
   * Create attendance workflow manager instance
   */
  createAttendanceWorkflow: (classId: string, teacherId: string, date: string) => {
    const { AttendanceWorkflowManager } = require('./attendance-workflow')
    return new AttendanceWorkflowManager(classId, teacherId, date)
  }
}

/**
 * Service utilities for common operations
 */
export const ServiceUtils = {
  /**
   * Validate user ID format
   */
  validateUserId: (userId: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(userId)
  },

  /**
   * Validate school ID format
   */
  validateSchoolId: (schoolId: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(schoolId)
  },

  /**
   * Create service response
   */
  createResponse: <T>(success: boolean, data?: T, error?: string): {
    success: boolean
    data?: T
    error?: string
    timestamp: string
  } => ({
    success,
    data,
    error,
    timestamp: new Date().toISOString()
  }),

  /**
   * Handle service errors
   */
  handleServiceError: (error: any, operation: string): {
    success: false
    error: string
    timestamp: string
  } => {
    let errorMessage = 'Erro interno do servidor'

    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        errorMessage = 'Dados inválidos fornecidos'
      } else if (error.message.includes('not found')) {
        errorMessage = 'Recurso não encontrado'
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permissão negada'
      } else if (error.message.includes('network')) {
        errorMessage = 'Erro de conexão'
      }
    }

    return {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }
  },

  /**
   * Check if service is available (basic health check)
   */
  checkServiceHealth: () => {
    try {
      const hasLocalStorage = typeof window !== 'undefined' && window.localStorage
      const hasCrypto = typeof crypto !== 'undefined' && crypto.randomUUID
      const hasDateSupport = !isNaN(new Date().getTime())

      return {
        available: true,
        features: {
          localStorage: hasLocalStorage,
          crypto: hasCrypto,
          dateSupport: hasDateSupport
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        available: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * Brazilian Educational System service configuration
 */
export const BrazilianEducationalServiceConfig = {
  /**
   * Default timeout for service operations (ms)
   */
  defaultTimeout: 30000,

  /**
   * Maximum retries for failed operations
   */
  maxRetries: 3,

  /**
   * Required user roles for service operations
   */
  requiredRoles: {
    attendanceManagement: ['admin', 'diretor', 'professor'],
    workflowOperations: ['admin', 'diretor', 'professor'],
    configurationChanges: ['admin', 'diretor'],
    reportGeneration: ['admin', 'diretor', 'secretario']
  },

  /**
   * Brazilian compliance validation rules
   */
  complianceRules: {
    requireImmutabilityEnforcement: true,
    requireSchoolIsolation: true,
    requireLGPDValidation: true,
    requireLBIAccessibility: true,
    requireAttendanceValidation: true
  },

  /**
   * Performance thresholds for educational applications
   */
  performanceThresholds: {
    maxDashboardLoadTime: 3000,
    maxAttendanceMarkingTime: 1000,
    maxBulkOperationTime: 5000,
    maxSessionTransitionTime: 2000
  }
}

/**
 * Service event types for audit logging
 */
export const ServiceEventTypes = {
  // Attendance workflow events
  WORKFLOW_INITIALIZED: 'workflow_initialized',
  PHASE_TRANSITIONED: 'phase_transitioned',
  SESSION_OPENED: 'session_opened',
  MARKING_STARTED: 'marking_started',
  SESSION_CLOSED: 'session_closed',
  WORKFLOW_COMPLETED: 'workflow_completed',

  // Attendance marking events
  STUDENT_MARKED: 'student_marked',
  BULK_MARKING_EXECUTED: 'bulk_marking_executed',

  // Locking events
  SESSION_LOCKED: 'session_locked',
  SESSION_UNLOCKED: 'session_unlocked',
  UNLOCK_REQUESTED: 'unlock_requested',

  // Immutability events
  IMMUTABILITY_ENFORCED: 'immutability_enforced',
  ILLEGAL_MODIFICATION_PREVENTED: 'illegal_modification_prevented',

  // General service events
  SERVICE_ERROR: 'service_error',
  SERVICE_HEALTH_CHECK: 'service_health_check',
  SERVICE_PERFORMANCE_WARNING: 'service_performance_warning'
} as const

/**
 * Integration helpers for gestao_fronteira specific features
 */
export const GestaoFronteiraIntegration = {
  /**
   * Extract user context from Supabase session
   */
  extractUserContext: (user: any) => ({
    userId: user?.id || '',
    email: user?.email || '',
    role: user?.user_metadata?.role || 'unknown',
    schoolId: user?.user_metadata?.escola_id || undefined
  }),

  /**
   * Validate Brazilian educational data requirements
   */
  validateEducationalContext: (context: {
    userId: string
    schoolId?: string
    userRole: string
  }): {
    valid: boolean
    errors: string[]
  } => {
    const errors: string[] = []

    if (!ServiceUtils.validateUserId(context.userId)) {
      errors.push('ID de usuário inválido')
    }

    if (context.schoolId && !ServiceUtils.validateSchoolId(context.schoolId)) {
      errors.push('ID da escola inválido')
    }

    const validRoles = ['admin', 'diretor', 'secretario', 'professor', 'responsavel']
    if (!validRoles.includes(context.userRole)) {
      errors.push('Papel de usuário inválido')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  },

  /**
   * Check if user has permission for operation
   */
  hasPermission: (
    userRole: string,
    operation: keyof typeof BrazilianEducationalServiceConfig.requiredRoles
  ): boolean => {
    const requiredRoles = BrazilianEducationalServiceConfig.requiredRoles[operation]
    return requiredRoles.includes(userRole as any)
  }
}
