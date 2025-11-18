/**
 * AuditService - Comprehensive audit and checklist management service
 * Integrates with Supabase for Brazilian educational compliance tracking
 *
 * Features:
 * - Checklist CRUD operations with audit logging
 * - Production readiness validation
 * - Brazilian educational compliance tracking
 * - Integration with existing audit system
 */

import { z } from 'zod'
import { supabase, type Tables, type Inserts, type Updates } from '../supabase'
import { logAuditEvent, type AuditAction } from '../audit'
import {
  AuditChecklist,
  AuditChecklistItem,
  AuditChecklistModel,
  createDefaultProductionReadinessChecklist
} from '../models/audit-checklist'

/**
 * Zod validation schemas for audit checklist operations
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
 * Service response types
 */
export interface AuditServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  validationErrors?: z.ZodError
}

export interface ChecklistSearchFilters {
  status?: AuditChecklist['status']
  type?: AuditChecklist['type']
  assignedTo?: string
  schoolId?: string
  targetEnvironment?: AuditChecklist['targetEnvironment']
  dueDateBefore?: string
  dueDateAfter?: string
  createdBy?: string
  completionPercentageMin?: number
  completionPercentageMax?: number
}

/**
 * Main AuditService class
 */
export class AuditService {
  private currentUserId: string
  private currentSchoolId?: string

  constructor(userId: string, schoolId?: string) {
    this.currentUserId = userId
    this.currentSchoolId = schoolId
  }

  /**
   * Create a new audit checklist
   */
  async createChecklist(
    checklistData: Omit<AuditChecklist, 'id' | 'created_at' | 'updated_at' | 'completion_percentage'>
  ): Promise<AuditServiceResponse<AuditChecklist>> {
    try {
      // Validate input data
      const now = new Date().toISOString()
      const checklist: AuditChecklist = {
        ...checklistData,
        id: crypto.randomUUID(),
        completion_percentage: 0,
        created_at: now,
        updated_at: now
      }

      const validation = AuditChecklistSchema.safeParse(checklist)
      if (!validation.success) {
        return {
          success: false,
          error: 'Dados inválidos',
          validationErrors: validation.error
        }
      }

      // Create checklist model and save to database
      const model = new AuditChecklistModel(checklist)

      // For now, we'll save to localStorage as a fallback
      // In production, this would save to a dedicated audit_checklists table
      const { error } = await this.saveChecklistToStorage(checklist)

      if (error) {
        return {
          success: false,
          error: 'Falha ao salvar checklist no banco de dados'
        }
      }

      // Log audit event
      await logAuditEvent({
        user_id: this.currentUserId,
        action: 'checklist_created' as AuditAction,
        table_name: 'audit_checklists',
        record_id: checklist.id,
        new_values: {
          title: checklist.title,
          type: checklist.type,
          status: checklist.status
        },
        escola_id: this.currentSchoolId,
        details: {
          checklist_type: checklist.type,
          target_environment: checklist.targetEnvironment,
          total_items: checklist.items.length
        }
      })

      return {
        success: true,
        data: checklist
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  /**
   * Get checklist by ID
   */
  async getChecklist(checklistId: string): Promise<AuditServiceResponse<AuditChecklist>> {
    try {
      const checklist = await this.loadChecklistFromStorage(checklistId)

      if (!checklist) {
        return {
          success: false,
          error: 'Checklist não encontrado'
        }
      }

      return {
        success: true,
        data: checklist
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  /**
   * Update checklist
   */
  async updateChecklist(
    checklistId: string,
    updates: Partial<AuditChecklist>
  ): Promise<AuditServiceResponse<AuditChecklist>> {
    try {
      const existingChecklist = await this.loadChecklistFromStorage(checklistId)

      if (!existingChecklist) {
        return {
          success: false,
          error: 'Checklist não encontrado'
        }
      }

      const updatedChecklist: AuditChecklist = {
        ...existingChecklist,
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Validate updated data
      const validation = AuditChecklistSchema.safeParse(updatedChecklist)
      if (!validation.success) {
        return {
          success: false,
          error: 'Dados inválidos',
          validationErrors: validation.error
        }
      }

      // Save updated checklist
      const { error } = await this.saveChecklistToStorage(updatedChecklist)

      if (error) {
        return {
          success: false,
          error: 'Falha ao atualizar checklist'
        }
      }

      // Log audit event
      await logAuditEvent({
        user_id: this.currentUserId,
        action: 'checklist_updated' as AuditAction,
        table_name: 'audit_checklists',
        record_id: checklistId,
        old_values: existingChecklist,
        new_values: updates,
        escola_id: this.currentSchoolId,
        details: {
          updated_fields: Object.keys(updates),
          completion_change: updatedChecklist.completion_percentage - existingChecklist.completion_percentage
        }
      })

      return {
        success: true,
        data: updatedChecklist
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  /**
   * Delete checklist
   */
  async deleteChecklist(checklistId: string): Promise<AuditServiceResponse<void>> {
    try {
      const existingChecklist = await this.loadChecklistFromStorage(checklistId)

      if (!existingChecklist) {
        return {
          success: false,
          error: 'Checklist não encontrado'
        }
      }

      // Remove from storage
      const { error } = await this.removeChecklistFromStorage(checklistId)

      if (error) {
        return {
          success: false,
          error: 'Falha ao deletar checklist'
        }
      }

      // Log audit event
      await logAuditEvent({
        user_id: this.currentUserId,
        action: 'checklist_deleted' as AuditAction,
        table_name: 'audit_checklists',
        record_id: checklistId,
        old_values: existingChecklist,
        escola_id: this.currentSchoolId,
        details: {
          deleted_checklist_title: existingChecklist.title,
          deleted_items_count: existingChecklist.items.length
        }
      })

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  /**
   * List checklists with filtering
   */
  async listChecklists(
    filters?: ChecklistSearchFilters,
    limit = 50,
    offset = 0
  ): Promise<AuditServiceResponse<{ checklists: AuditChecklist[]; total: number }>> {
    try {
      const allChecklists = await this.loadAllChecklistsFromStorage()

      // Apply filters
      let filteredChecklists = allChecklists

      if (filters?.status) {
        filteredChecklists = filteredChecklists.filter(c => c.status === filters.status)
      }

      if (filters?.type) {
        filteredChecklists = filteredChecklists.filter(c => c.type === filters.type)
      }

      if (filters?.assignedTo) {
        filteredChecklists = filteredChecklists.filter(c => c.assigned_to === filters.assignedTo)
      }

      if (filters?.createdBy) {
        filteredChecklists = filteredChecklists.filter(c => c.created_by === filters.createdBy)
      }

      if (filters?.completionPercentageMin !== undefined) {
        filteredChecklists = filteredChecklists.filter(c => c.completion_percentage >= filters.completionPercentageMin!)
      }

      if (filters?.completionPercentageMax !== undefined) {
        filteredChecklists = filteredChecklists.filter(c => c.completion_percentage <= filters.completionPercentageMax!)
      }

      // Apply pagination
      const total = filteredChecklists.length
      const paginatedChecklists = filteredChecklists.slice(offset, offset + limit)

      return {
        success: true,
        data: {
          checklists: paginatedChecklists,
          total
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  /**
   * Complete checklist item
   */
  async completeChecklistItem(
    checklistId: string,
    itemId: string,
    evidence?: string,
    notes?: string
  ): Promise<AuditServiceResponse<AuditChecklist>> {
    try {
      const checklist = await this.loadChecklistFromStorage(checklistId)

      if (!checklist) {
        return {
          success: false,
          error: 'Checklist não encontrado'
        }
      }

      const model = new AuditChecklistModel(checklist)
      const success = model.completeItem(itemId, this.currentUserId, evidence, notes)

      if (!success) {
        return {
          success: false,
          error: 'Item não encontrado'
        }
      }

      const updatedChecklist = model.toJSON()

      // Save updated checklist
      const { error } = await this.saveChecklistToStorage(updatedChecklist)

      if (error) {
        return {
          success: false,
          error: 'Falha ao atualizar item'
        }
      }

      // Log audit event
      await logAuditEvent({
        user_id: this.currentUserId,
        action: 'checklist_item_completed' as AuditAction,
        table_name: 'audit_checklist_items',
        record_id: itemId,
        new_values: {
          completed: true,
          completedBy: this.currentUserId,
          evidence,
          notes
        },
        escola_id: this.currentSchoolId,
        details: {
          checklist_id: checklistId,
          completion_percentage: updatedChecklist.completion_percentage
        }
      })

      return {
        success: true,
        data: updatedChecklist
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  /**
   * Generate production readiness report
   */
  async generateProductionReadinessReport(
    checklistId: string
  ): Promise<AuditServiceResponse<ReturnType<AuditChecklistModel['generateProductionReadinessReport']>>> {
    try {
      const checklist = await this.loadChecklistFromStorage(checklistId)

      if (!checklist) {
        return {
          success: false,
          error: 'Checklist não encontrado'
        }
      }

      const model = new AuditChecklistModel(checklist)
      const report = model.generateProductionReadinessReport()

      // Log audit event
      await logAuditEvent({
        user_id: this.currentUserId,
        action: 'report_generated' as AuditAction,
        table_name: 'audit_reports',
        record_id: crypto.randomUUID(),
        new_values: {
          report_type: 'production_readiness',
          checklist_id: checklistId,
          ready_for_production: report.ready_for_production,
          blockers_count: report.blockers.length
        },
        escola_id: this.currentSchoolId,
        details: {
          summary: report.summary,
          blockers: report.blockers.map(b => b.title),
          warnings: report.warnings.map(w => w.title)
        }
      })

      return {
        success: true,
        data: report
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  /**
   * Create default production readiness checklist
   */
  async createDefaultProductionChecklist(
    projectName: string
  ): Promise<AuditServiceResponse<AuditChecklist>> {
    try {
      const defaultChecklist = createDefaultProductionReadinessChecklist(projectName, this.currentUserId)

      return await this.createChecklist(defaultChecklist)
    } catch (error) {
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  /**
   * Private methods for storage operations
   * In production, these would interact with dedicated Supabase tables
   */
  private async saveChecklistToStorage(checklist: AuditChecklist): Promise<{ error?: string }> {
    try {
      if (typeof window === 'undefined') return { error: 'Server-side storage not implemented' }

      const key = `audit_checklist_${checklist.id}`
      localStorage.setItem(key, JSON.stringify(checklist))

      // Also maintain a list of checklist IDs
      const existingIds = JSON.parse(localStorage.getItem('audit_checklist_ids') || '[]')
      if (!existingIds.includes(checklist.id)) {
        existingIds.push(checklist.id)
        localStorage.setItem('audit_checklist_ids', JSON.stringify(existingIds))
      }

      return {}
    } catch (error) {
      return { error: 'Storage failed' }
    }
  }

  private async loadChecklistFromStorage(checklistId: string): Promise<AuditChecklist | null> {
    try {
      if (typeof window === 'undefined') return null

      const key = `audit_checklist_${checklistId}`
      const data = localStorage.getItem(key)

      if (!data) return null

      return JSON.parse(data) as AuditChecklist
    } catch (error) {
      return null
    }
  }

  private async loadAllChecklistsFromStorage(): Promise<AuditChecklist[]> {
    try {
      if (typeof window === 'undefined') return []

      const ids = JSON.parse(localStorage.getItem('audit_checklist_ids') || '[]')
      const checklists: AuditChecklist[] = []

      for (const id of ids) {
        const checklist = await this.loadChecklistFromStorage(id)
        if (checklist) {
          checklists.push(checklist)
        }
      }

      return checklists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      return []
    }
  }

  private async removeChecklistFromStorage(checklistId: string): Promise<{ error?: string }> {
    try {
      if (typeof window === 'undefined') return { error: 'Server-side storage not implemented' }

      const key = `audit_checklist_${checklistId}`
      localStorage.removeItem(key)

      // Remove from ID list
      const existingIds = JSON.parse(localStorage.getItem('audit_checklist_ids') || '[]')
      const updatedIds = existingIds.filter((id: string) => id !== checklistId)
      localStorage.setItem('audit_checklist_ids', JSON.stringify(updatedIds))

      return {}
    } catch (error) {
      return { error: 'Remove failed' }
    }
  }
}

/**
 * Factory function to create AuditService instance
 */
export function createAuditService(userId: string, schoolId?: string): AuditService {
  return new AuditService(userId, schoolId)
}

/**
 * Utility functions for working with audit checklists
 */
export const AuditUtils = {
  /**
   * Validate checklist item data
   */
  validateChecklistItem: (item: any) => AuditChecklistItemSchema.safeParse(item),

  /**
   * Validate checklist data
   */
  validateChecklist: (checklist: any) => AuditChecklistSchema.safeParse(checklist),

  /**
   * Get Brazilian educational compliance categories
   */
  getBrazilianComplianceCategories: () => [
    'lgpd_compliance',
    'lbi_accessibility',
    'educational_standards',
    'attendance_tracking',
    'audit_trail',
    'data_security'
  ] as const,

  /**
   * Get critical checklist items for production
   */
  getCriticalItemsForProduction: (checklist: AuditChecklist) => {
    return checklist.items.filter(item =>
      item.priority === 'critical' && !item.completed
    )
  },

  /**
   * Calculate estimated completion time
   */
  calculateEstimatedTime: (checklist: AuditChecklist) => {
    return checklist.items
      .filter(item => !item.completed)
      .reduce((total, item) => total + (item.estimatedEffort || 0), 0)
  }
}