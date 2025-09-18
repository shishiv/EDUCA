/**
 * Audit API client for user activity tracking
 * Handles user activity logs and audit trail functionality
 */

import { supabase } from '@/lib/supabase'

export interface UserActivity {
  id: string
  user_id: string
  type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view'
  description: string
  timestamp: string
  ip_address?: string
  user_agent?: string
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
  created_at: string
}

class AuditApi {
  /**
   * Get user activities for a specific user
   */
  async getUserActivities(userId: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      // For now, return mock data until the audit_logs table is created
      // This will be replaced when the database schema is updated
      return this.generateMockActivities(userId, limit)
    } catch (error) {
      // console.error('Error fetching user activities:', error)
      throw error
    }
  }

  /**
   * Log a user activity
   */
  async logActivity(activity: Omit<UserActivity, 'id' | 'created_at'>): Promise<UserActivity> {
    try {
      // For now, return mock data until the audit_logs table is created
      const mockActivity: UserActivity = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...activity
      }

      // console.log('Activity logged (mock):', mockActivity)
      return mockActivity
    } catch (error) {
      // console.error('Error logging activity:', error)
      throw error
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  async getAuditLogs(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    try {
      // For now, return mock data until the audit_logs table is created
      return this.generateMockAuditLogs(resourceType, resourceId)
    } catch (error) {
      // console.error('Error fetching audit logs:', error)
      throw error
    }
  }

  /**
   * Log an audit event
   */
  async logAudit(audit: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    try {
      // For now, return mock data until the audit_logs table is created
      const mockAudit: AuditLog = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...audit
      }

      // console.log('Audit logged (mock):', mockAudit)
      return mockAudit
    } catch (error) {
      // console.error('Error logging audit:', error)
      throw error
    }
  }

  /**
   * Get system-wide activity summary
   */
  async getActivitySummary(startDate?: Date, endDate?: Date): Promise<{
    totalActivities: number
    activitiesByType: Record<string, number>
    activitiesByUser: Record<string, number>
    recentActivities: UserActivity[]
  }> {
    try {
      // Mock summary data
      return {
        totalActivities: 1250,
        activitiesByType: {
          login: 580,
          logout: 520,
          create: 85,
          update: 45,
          delete: 12,
          view: 8
        },
        activitiesByUser: {
          'admin': 300,
          'diretor': 250,
          'professor': 400,
          'secretario': 200,
          'responsavel': 100
        },
        recentActivities: this.generateMockActivities('recent', 10)
      }
    } catch (error) {
      // console.error('Error fetching activity summary:', error)
      throw error
    }
  }

  /**
   * Generate mock activities for demonstration
   * This will be removed when real database integration is implemented
   */
  private generateMockActivities(userId: string, limit: number): UserActivity[] {
    const activities: UserActivity[] = []
    const now = new Date()

    for (let i = 0; i < limit; i++) {
      const activityTime = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)) // 2 hours apart

      activities.push({
        id: `activity_${i + 1}`,
        user_id: userId,
        type: this.getRandomActivityType(),
        description: this.getRandomActivityDescription(),
        timestamp: activityTime.toISOString(),
        ip_address: '192.168.1.' + (100 + Math.floor(Math.random() * 50)),
        user_agent: 'Chrome 120.0.0.0',
        created_at: activityTime.toISOString()
      })
    }

    return activities
  }

  /**
   * Generate mock audit logs for demonstration
   */
  private generateMockAuditLogs(resourceType: string, resourceId: string): AuditLog[] {
    const logs: AuditLog[] = []
    const now = new Date()

    for (let i = 0; i < 5; i++) {
      const logTime = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)) // 1 day apart

      logs.push({
        id: `audit_${i + 1}`,
        user_id: 'current_user',
        action: 'update',
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: { status: 'draft' },
        new_values: { status: 'published' },
        ip_address: '192.168.1.100',
        user_agent: 'Chrome 120.0.0.0',
        timestamp: logTime.toISOString(),
        created_at: logTime.toISOString()
      })
    }

    return logs
  }

  private getRandomActivityType(): UserActivity['type'] {
    const types: UserActivity['type'][] = ['login', 'logout', 'create', 'update', 'delete', 'view']
    return types[Math.floor(Math.random() * types.length)]
  }

  private getRandomActivityDescription(): string {
    const descriptions = [
      'Login realizado com sucesso',
      'Logout realizado',
      'Cadastrou novo aluno: Maria Silva',
      'Atualizou dados do aluno João Santos',
      'Visualizou relatório de frequência',
      'Marcou presença da turma 5º Ano A',
      'Criou nova turma para o ano letivo',
      'Atualizou configurações da escola',
      'Exportou relatório de alunos',
      'Visualizou perfil do usuário'
    ]

    return descriptions[Math.floor(Math.random() * descriptions.length)]
  }
}

export const auditApi = new AuditApi()