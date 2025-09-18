/**
 * Services index - Central export for all service classes
 * Brazilian Educational Management System services with validation and audit
 */

// Audit service
export * from './audit-service'
export type {
  AuditServiceResponse,
  ChecklistSearchFilters
} from './audit-service'

// Mockup scan service
export * from './mockup-scan-service'
export type {
  ScanResult,
  MockAPIDetection,
  MockDataFile,
  ComponentDetection,
  PageDetection,
  AccessibilityIssue,
  ComplianceIssue,
  PerformanceIssue,
  ScanSummary,
  ScanRecommendation,
  ScanServiceResponse
} from './mockup-scan-service'

/**
 * Service factory functions for creating service instances
 */
export const ServiceFactory = {
  /**
   * Create audit service instance
   */
  createAuditService: (userId: string, schoolId?: string) => {
    const { createAuditService } = require('./audit-service')
    return createAuditService(userId, schoolId)
  },

  /**
   * Create mockup scan service instance
   */
  createMockupScanService: (userId: string, schoolId?: string) => {
    const { createMockupScanService } = require('./mockup-scan-service')
    return createMockupScanService(userId, schoolId)
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
    // console.error(`Service error in ${operation}:`, error)

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
      // Basic checks for service availability
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
    auditManagement: ['admin', 'diretor'],
    scanOperations: ['admin', 'diretor', 'secretario'],
    configurationChanges: ['admin'],
    reportGeneration: ['admin', 'diretor', 'secretario']
  },

  /**
   * Brazilian compliance validation rules
   */
  complianceRules: {
    requireAuditLogging: true,
    requireSchoolIsolation: true,
    requireLGPDValidation: true,
    requireLBIAccessibility: true,
    requireAttendanceValidation: true
  },

  /**
   * Performance thresholds for educational applications
   */
  performanceThresholds: {
    maxDashboardLoadTime: 3000, // 3 seconds
    maxAttendanceMarkingTime: 1000, // 1 second per student
    maxReportGenerationTime: 10000, // 10 seconds
    maxScanOperationTime: 300000 // 5 minutes
  }
}

/**
 * Service event types for audit logging
 */
export const ServiceEventTypes = {
  // Audit service events
  AUDIT_CHECKLIST_CREATED: 'audit_checklist_created',
  AUDIT_CHECKLIST_UPDATED: 'audit_checklist_updated',
  AUDIT_CHECKLIST_DELETED: 'audit_checklist_deleted',
  AUDIT_ITEM_COMPLETED: 'audit_item_completed',
  AUDIT_REPORT_GENERATED: 'audit_report_generated',

  // Scan service events
  SCAN_STARTED: 'scan_started',
  SCAN_COMPLETED: 'scan_completed',
  SCAN_CANCELLED: 'scan_cancelled',
  SCAN_FAILED: 'scan_failed',
  MOCK_ANALYSIS_COMPLETED: 'mock_analysis_completed',
  COMPLIANCE_CHECK_COMPLETED: 'compliance_check_completed',

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