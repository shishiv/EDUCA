/**
 * AuditChecklist model for production readiness validation
 * Implements checklist items for Brazilian educational system compliance
 * Updated with Zod validation schemas and proper TypeScript integration
 */

import { z } from 'zod'

/**
 * Zod validation schemas
 */
export const AuditChecklistItemSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(['security', 'performance', 'accessibility', 'compliance', 'documentation', 'testing']),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  description: z.string().min(1, 'Descrição é obrigatória').max(1000, 'Descrição muito longa'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
  completedBy: z.string().uuid().optional(),
  evidence: z.string().max(2000, 'Evidência muito longa').optional(),
  notes: z.string().max(1000, 'Notas muito longas').optional(),
  requirement: z.string().min(1, 'Requisito é obrigatório').max(500, 'Requisito muito longo'),
  validationMethod: z.enum(['automated', 'manual', 'review', 'testing']),
  estimatedEffort: z.number().min(0).max(1000).optional(),
  relatedDocuments: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const AuditChecklistSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  description: z.string().min(1, 'Descrição é obrigatória').max(1000, 'Descrição muito longa'),
  version: z.string().min(1, 'Versão é obrigatória'),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  type: z.enum(['production-readiness', 'security-audit', 'compliance-check', 'accessibility-audit']),
  targetEnvironment: z.enum(['development', 'staging', 'production']),
  created_by: z.string().uuid(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().datetime().optional(),
  completion_percentage: z.number().min(0).max(100),
  items: z.array(AuditChecklistItemSchema),
  metadata: z.object({
    project_name: z.string().optional(),
    project_version: z.string().optional(),
    framework: z.string().optional(),
    regulatory_context: z.enum(['brazilian_education', 'lgpd', 'lbi_13146']).optional(),
    educational_domain: z.object({
      user_roles: z.array(z.string()).optional(),
      school_types: z.array(z.string()).optional(),
      compliance_requirements: z.array(z.string()).optional()
    }).optional()
  }).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

/**
 * TypeScript types derived from Zod schemas
 */
export type AuditChecklistItem = z.infer<typeof AuditChecklistItemSchema>
export type AuditChecklist = z.infer<typeof AuditChecklistSchema>

/**
 * Input types for creating new items/checklists
 */
export type CreateAuditChecklistItemInput = z.input<typeof AuditChecklistItemSchema>
export type CreateAuditChecklistInput = z.input<typeof AuditChecklistSchema>

/**
 * AuditChecklistModel class with enhanced validation and error handling
 */
export class AuditChecklistModel {
  private checklist: AuditChecklist

  constructor(checklist: AuditChecklist) {
    // Validate the checklist on construction
    const validation = AuditChecklistSchema.safeParse(checklist)
    if (!validation.success) {
      throw new Error(`Invalid checklist data: ${validation.error.message}`)
    }
    this.checklist = validation.data
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    if (this.checklist.items.length === 0) return 0
    const completedItems = this.checklist.items.filter(item => item.completed).length
    return Math.round((completedItems / this.checklist.items.length) * 100)
  }

  /**
   * Get items by category
   */
  getItemsByCategory(category: AuditChecklistItem['category']): AuditChecklistItem[] {
    return this.checklist.items.filter(item => item.category === category)
  }

  /**
   * Get items by priority
   */
  getItemsByPriority(priority: AuditChecklistItem['priority']): AuditChecklistItem[] {
    return this.checklist.items.filter(item => item.priority === priority)
  }

  /**
   * Get pending critical items
   */
  getPendingCriticalItems(): AuditChecklistItem[] {
    return this.checklist.items.filter(item =>
      !item.completed && item.priority === 'critical'
    )
  }

  /**
   * Mark item as completed with validation
   */
  completeItem(itemId: string, completedBy: string, evidence?: string, notes?: string): boolean {
    const item = this.checklist.items.find(item => item.id === itemId)
    if (!item) return false

    // Validate completedBy is a valid UUID
    const uuidSchema = z.string().uuid()
    const validatedUserId = uuidSchema.safeParse(completedBy)
    if (!validatedUserId.success) {
      throw new Error('Invalid user ID format')
    }

    // Validate evidence and notes if provided
    if (evidence && evidence.length > 2000) {
      throw new Error('Evidence text too long (max 2000 characters)')
    }
    if (notes && notes.length > 1000) {
      throw new Error('Notes text too long (max 1000 characters)')
    }

    item.completed = true
    item.completedAt = new Date().toISOString()
    item.completedBy = validatedUserId.data
    if (evidence) item.evidence = evidence
    if (notes) item.notes = notes
    item.updated_at = new Date().toISOString()

    this.updateCompletionPercentage()
    this.updateTimestamp()
    return true
  }

  /**
   * Add new checklist item with validation
   */
  addItem(item: Omit<AuditChecklistItem, 'id' | 'created_at' | 'updated_at'>): string {
    const now = new Date().toISOString()
    const newItem: AuditChecklistItem = {
      ...item,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    }

    // Validate the new item
    const validation = AuditChecklistItemSchema.safeParse(newItem)
    if (!validation.success) {
      throw new Error(`Invalid item data: ${validation.error.message}`)
    }

    this.checklist.items.push(validation.data)
    this.updateCompletionPercentage()
    this.updateTimestamp()
    return newItem.id
  }

  /**
   * Update checklist item with validation
   */
  updateItem(itemId: string, updates: Partial<AuditChecklistItem>): boolean {
    const itemIndex = this.checklist.items.findIndex(item => item.id === itemId)
    if (itemIndex === -1) return false

    const updatedItem = {
      ...this.checklist.items[itemIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }

    // Validate the updated item
    const validation = AuditChecklistItemSchema.safeParse(updatedItem)
    if (!validation.success) {
      throw new Error(`Invalid item updates: ${validation.error.message}`)
    }

    this.checklist.items[itemIndex] = validation.data
    this.updateCompletionPercentage()
    this.updateTimestamp()
    return true
  }

  /**
   * Remove checklist item
   */
  removeItem(itemId: string): boolean {
    const initialLength = this.checklist.items.length
    this.checklist.items = this.checklist.items.filter(item => item.id !== itemId)

    if (this.checklist.items.length < initialLength) {
      this.updateCompletionPercentage()
      this.updateTimestamp()
      return true
    }
    return false
  }

  /**
   * Get validation summary
   */
  getValidationSummary(): {
    total: number
    completed: number
    pending: number
    critical_pending: number
    categories: Record<string, { total: number; completed: number }>
  } {
    const categories: Record<string, { total: number; completed: number }> = {}

    this.checklist.items.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = { total: 0, completed: 0 }
      }
      categories[item.category].total++
      if (item.completed) {
        categories[item.category].completed++
      }
    })

    return {
      total: this.checklist.items.length,
      completed: this.checklist.items.filter(item => item.completed).length,
      pending: this.checklist.items.filter(item => !item.completed).length,
      critical_pending: this.getPendingCriticalItems().length,
      categories
    }
  }

  /**
   * Generate production readiness report
   */
  generateProductionReadinessReport(): {
    ready_for_production: boolean
    blockers: AuditChecklistItem[]
    warnings: AuditChecklistItem[]
    recommendations: string[]
    summary: ReturnType<AuditChecklistModel['getValidationSummary']>
  } {
    const summary = this.getValidationSummary()
    const blockers = this.getPendingCriticalItems()
    const warnings = this.getItemsByPriority('high').filter(item => !item.completed)

    const recommendations: string[] = []

    if (summary.critical_pending > 0) {
      recommendations.push(`Complete ${summary.critical_pending} critical items before production deployment`)
    }

    if (warnings.length > 0) {
      recommendations.push(`Address ${warnings.length} high-priority items for optimal production readiness`)
    }

    // Brazilian educational system specific recommendations
    if (this.checklist.metadata?.regulatory_context === 'brazilian_education') {
      const accessibilityItems = this.getItemsByCategory('accessibility').filter(item => !item.completed)
      if (accessibilityItems.length > 0) {
        recommendations.push('Complete accessibility validations for LBI 13.146/2015 compliance')
      }

      const complianceItems = this.getItemsByCategory('compliance').filter(item => !item.completed)
      if (complianceItems.length > 0) {
        recommendations.push('Validate LGPD and educational data protection requirements')
      }
    }

    return {
      ready_for_production: blockers.length === 0,
      blockers,
      warnings,
      recommendations,
      summary
    }
  }

  /**
   * Validate entire checklist
   */
  validate(): { valid: boolean; errors: string[] } {
    const validation = AuditChecklistSchema.safeParse(this.checklist)
    if (validation.success) {
      return { valid: true, errors: [] }
    }

    const errors = validation.error.errors.map(err =>
      `${err.path.join('.')}: ${err.message}`
    )
    return { valid: false, errors }
  }

  /**
   * Export to JSON with validation
   */
  toJSON(): AuditChecklist {
    const validation = this.validate()
    if (!validation.valid) {
      throw new Error(`Cannot export invalid checklist: ${validation.errors.join(', ')}`)
    }
    return { ...this.checklist }
  }

  /**
   * Create from JSON with validation
   */
  static fromJSON(data: any): AuditChecklistModel {
    const validation = AuditChecklistSchema.safeParse(data)
    if (!validation.success) {
      throw new Error(`Invalid checklist JSON: ${validation.error.message}`)
    }
    return new AuditChecklistModel(validation.data)
  }

  /**
   * Get checklist metadata
   */
  getMetadata(): AuditChecklist['metadata'] {
    return this.checklist.metadata
  }

  /**
   * Update checklist metadata with validation
   */
  updateMetadata(metadata: AuditChecklist['metadata']): boolean {
    try {
      const updatedChecklist = {
        ...this.checklist,
        metadata,
        updated_at: new Date().toISOString()
      }

      const validation = AuditChecklistSchema.safeParse(updatedChecklist)
      if (!validation.success) {
        throw new Error(validation.error.message)
      }

      this.checklist = validation.data
      return true
    } catch (error) {
      // console.error('Failed to update metadata:', error)
      return false
    }
  }

  private updateCompletionPercentage(): void {
    this.checklist.completion_percentage = this.getCompletionPercentage()
  }

  private updateTimestamp(): void {
    this.checklist.updated_at = new Date().toISOString()
  }
}

/**
 * Default production readiness checklist for Brazilian educational system
 */
export const createDefaultProductionReadinessChecklist = (
  projectName: string,
  createdBy: string
): AuditChecklist => {
  // Validate inputs
  const projectNameSchema = z.string().min(1, 'Project name is required').max(100)
  const userIdSchema = z.string().uuid('Invalid user ID format')

  const validatedProjectName = projectNameSchema.parse(projectName)
  const validatedUserId = userIdSchema.parse(createdBy)

  const defaultItems: Omit<AuditChecklistItem, 'id' | 'created_at' | 'updated_at'>[] = [
    // Security
    {
      category: 'security',
      title: 'Authentication & Authorization Tests',
      description: 'Validate JWT authentication and role-based access control for 5 user types',
      priority: 'critical',
      completed: false,
      requirement: 'Security baseline for educational data protection',
      validationMethod: 'automated',
      estimatedEffort: 4,
      tags: ['authentication', 'rbac', 'security']
    },
    {
      category: 'security',
      title: 'LGPD Compliance Validation',
      description: 'Ensure data protection and privacy controls meet LGPD requirements',
      priority: 'critical',
      completed: false,
      requirement: 'Lei Geral de Proteção de Dados (LGPD)',
      validationMethod: 'review',
      estimatedEffort: 6,
      tags: ['lgpd', 'privacy', 'compliance']
    },

    // Performance
    {
      category: 'performance',
      title: 'Dashboard Load Time < 3s',
      description: 'Validate dashboard loads within 3 seconds for optimal user experience',
      priority: 'critical',
      completed: false,
      requirement: 'Performance baseline for classroom use',
      validationMethod: 'automated',
      estimatedEffort: 2,
      tags: ['performance', 'dashboard', 'ux']
    },
    {
      category: 'performance',
      title: 'Attendance Marking < 1s per Student',
      description: 'Ensure attendance marking is fast enough for classroom workflow',
      priority: 'critical',
      completed: false,
      requirement: 'Teacher workflow optimization',
      validationMethod: 'testing',
      estimatedEffort: 3,
      tags: ['performance', 'attendance', 'workflow']
    },

    // Accessibility
    {
      category: 'accessibility',
      title: 'WCAG 2.1 AA Compliance',
      description: 'Validate accessibility standards for inclusive education',
      priority: 'high',
      completed: false,
      requirement: 'WCAG 2.1 AA guidelines',
      validationMethod: 'automated',
      estimatedEffort: 8,
      tags: ['accessibility', 'wcag', 'inclusive']
    },
    {
      category: 'accessibility',
      title: 'LBI 13.146/2015 Compliance',
      description: 'Ensure compliance with Brazilian accessibility law for educational systems',
      priority: 'high',
      completed: false,
      requirement: 'Lei Brasileira de Inclusão (LBI) 13.146/2015',
      validationMethod: 'review',
      estimatedEffort: 4,
      tags: ['accessibility', 'lbi', 'brazil', 'education']
    },

    // Compliance
    {
      category: 'compliance',
      title: 'Row Level Security (RLS) Validation',
      description: 'Verify multi-school data isolation through RLS policies',
      priority: 'critical',
      completed: false,
      requirement: 'Multi-tenancy security for educational data',
      validationMethod: 'testing',
      estimatedEffort: 4,
      tags: ['rls', 'security', 'multi-tenancy']
    },
    {
      category: 'compliance',
      title: 'Audit Trail Implementation',
      description: 'Validate comprehensive audit logging for educational records',
      priority: 'high',
      completed: false,
      requirement: 'Educational record compliance and accountability',
      validationMethod: 'testing',
      estimatedEffort: 3,
      tags: ['audit', 'logging', 'compliance']
    },

    // Testing
    {
      category: 'testing',
      title: 'API Contract Validation',
      description: 'Ensure all API endpoints meet OpenAPI specifications',
      priority: 'high',
      completed: false,
      requirement: 'API reliability and documentation',
      validationMethod: 'automated',
      estimatedEffort: 2,
      tags: ['api', 'contracts', 'testing']
    },
    {
      category: 'testing',
      title: 'End-to-End User Workflows',
      description: 'Test complete user journeys for all 5 user roles',
      priority: 'high',
      completed: false,
      requirement: 'User experience validation',
      validationMethod: 'testing',
      estimatedEffort: 12,
      tags: ['e2e', 'workflows', 'user-roles']
    },

    // Documentation
    {
      category: 'documentation',
      title: 'User Manual for Educational Staff',
      description: 'Comprehensive documentation for teachers, directors, and administrators',
      priority: 'medium',
      completed: false,
      requirement: 'User adoption and training materials',
      validationMethod: 'review',
      estimatedEffort: 16,
      tags: ['documentation', 'training', 'education']
    },
    {
      category: 'documentation',
      title: 'Technical Documentation',
      description: 'Complete API documentation, deployment guides, and maintenance procedures',
      priority: 'medium',
      completed: false,
      requirement: 'Technical maintenance and support',
      validationMethod: 'review',
      estimatedEffort: 8,
      tags: ['documentation', 'technical', 'maintenance']
    }
  ]

  const now = new Date().toISOString()

  const checklist: AuditChecklist = {
    id: crypto.randomUUID(),
    title: `Production Readiness Checklist - ${validatedProjectName}`,
    description: 'Comprehensive checklist for Brazilian educational management system production deployment',
    version: '1.0.0',
    status: 'active',
    type: 'production-readiness',
    targetEnvironment: 'production',
    created_by: validatedUserId,
    completion_percentage: 0,
    items: defaultItems.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    })),
    metadata: {
      project_name: validatedProjectName,
      framework: 'Next.js 13.5 + Supabase',
      regulatory_context: 'brazilian_education',
      educational_domain: {
        user_roles: ['admin', 'diretor', 'secretario', 'professor', 'responsavel'],
        school_types: ['municipal', 'estadual'],
        compliance_requirements: ['LGPD', 'LBI 13.146/2015', 'Educational Record Keeping']
      }
    },
    created_at: now,
    updated_at: now
  }

  // Validate the created checklist
  const validation = AuditChecklistSchema.safeParse(checklist)
  if (!validation.success) {
    throw new Error(`Failed to create valid checklist: ${validation.error.message}`)
  }

  return validation.data
}

/**
 * Utility functions for audit checklist operations
 */
export const AuditChecklistUtils = {
  /**
   * Validate checklist item
   */
  validateItem: (item: any) => AuditChecklistItemSchema.safeParse(item),

  /**
   * Validate full checklist
   */
  validateChecklist: (checklist: any) => AuditChecklistSchema.safeParse(checklist),

  /**
   * Create minimal valid checklist
   */
  createMinimalChecklist: (title: string, createdBy: string): AuditChecklist => {
    const now = new Date().toISOString()
    return {
      id: crypto.randomUUID(),
      title,
      description: 'Basic audit checklist',
      version: '1.0.0',
      status: 'draft',
      type: 'production-readiness',
      targetEnvironment: 'development',
      created_by: createdBy,
      completion_percentage: 0,
      items: [],
      created_at: now,
      updated_at: now
    }
  },

  /**
   * Calculate effort estimation
   */
  calculateTotalEffort: (checklist: AuditChecklist): number => {
    return checklist.items.reduce((total, item) => total + (item.estimatedEffort || 0), 0)
  },

  /**
   * Get items by validation method
   */
  getItemsByValidationMethod: (
    checklist: AuditChecklist,
    method: AuditChecklistItem['validationMethod']
  ): AuditChecklistItem[] => {
    return checklist.items.filter(item => item.validationMethod === method)
  }
}

// Export aliases for API compatibility
export const auditChecklistSchema = AuditChecklistSchema