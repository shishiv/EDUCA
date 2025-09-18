/**
 * MCPConfiguration model for Model Context Protocol integration
 * Manages MCP server configurations, tool integrations, and automation workflows
 * Updated with Zod validation schemas and enhanced TypeScript integration
 */

import { z } from 'zod'

/**
 * Zod validation schemas
 */
export const MCPServerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome do servidor é obrigatório').max(100),
  description: z.string().min(1, 'Descrição é obrigatória').max(500),
  type: z.enum(['supabase', 'shadcn-ui', 'playwright', 'github', 'bright-data', 'custom']),
  url: z.string().url().optional(),
  version: z.string().min(1, 'Versão é obrigatória'),
  status: z.enum(['active', 'inactive', 'error', 'testing']),
  connection_config: z.object({
    host: z.string().optional(),
    port: z.number().min(1).max(65535).optional(),
    protocol: z.enum(['http', 'https', 'ws', 'wss']),
    auth_method: z.enum(['api_key', 'oauth', 'bearer_token', 'none']).optional(),
    credentials: z.object({
      api_key: z.string().optional(),
      token: z.string().optional(),
      username: z.string().optional(),
      project_id: z.string().optional()
    }).optional(),
    timeout: z.number().min(100).max(300000).optional(),
    retry_attempts: z.number().min(0).max(10).optional()
  }),
  available_tools: z.array(z.string()),
  enabled_tools: z.array(z.string()),
  rate_limits: z.object({
    requests_per_minute: z.number().min(1).max(10000).optional(),
    requests_per_hour: z.number().min(1).max(100000).optional(),
    concurrent_requests: z.number().min(1).max(100).optional()
  }).optional(),
  health_check: z.object({
    last_check: z.string().datetime(),
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    response_time: z.number().min(0).optional(),
    error_message: z.string().optional()
  }),
  usage_statistics: z.object({
    total_requests: z.number().min(0),
    successful_requests: z.number().min(0),
    failed_requests: z.number().min(0),
    average_response_time: z.number().min(0),
    last_used: z.string().datetime()
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const MCPToolSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome da ferramenta é obrigatório').max(100),
  description: z.string().min(1, 'Descrição é obrigatória').max(1000),
  category: z.enum(['database', 'ui_component', 'testing', 'deployment', 'monitoring', 'automation', 'integration']),
  server_id: z.string().uuid(),
  enabled: z.boolean(),
  configuration: z.record(z.any()),
  input_schema: z.record(z.any()).optional(),
  output_schema: z.record(z.any()).optional(),
  usage_count: z.number().min(0),
  success_rate: z.number().min(0).max(1),
  average_execution_time: z.number().min(0),
  last_used: z.string().datetime().optional(),
  brazilian_educational_context: z.object({
    applicable_user_roles: z.array(z.string()),
    educational_workflows: z.array(z.string()),
    compliance_requirements: z.array(z.string()),
    school_data_access: z.boolean()
  }).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const MCPWorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome do workflow é obrigatório').max(100),
  description: z.string().min(1, 'Descrição é obrigatória').max(1000),
  trigger_type: z.enum(['manual', 'schedule', 'event', 'webhook', 'file_change']),
  trigger_config: z.record(z.any()),
  steps: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    tool_id: z.string().uuid(),
    configuration: z.record(z.any()),
    order: z.number().min(1),
    condition: z.string().optional(),
    timeout: z.number().min(1000).optional(),
    retry_config: z.object({
      max_attempts: z.number().min(1).max(10),
      delay: z.number().min(100),
      backoff_multiplier: z.number().min(1).max(10)
    }).optional()
  })),
  enabled: z.boolean(),
  execution_history: z.array(z.object({
    id: z.string().uuid(),
    started_at: z.string().datetime(),
    completed_at: z.string().datetime().optional(),
    status: z.enum(['running', 'completed', 'failed', 'cancelled']),
    trigger_data: z.record(z.any()).optional(),
    step_results: z.array(z.object({
      step_id: z.string().uuid(),
      status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
      started_at: z.string().datetime().optional(),
      completed_at: z.string().datetime().optional(),
      result: z.record(z.any()).optional(),
      error: z.string().optional()
    })),
    error_message: z.string().optional()
  })),
  schedule_config: z.object({
    cron_expression: z.string().optional(),
    timezone: z.string().optional(),
    next_run: z.string().datetime().optional()
  }).optional(),
  brazilian_educational_context: z.object({
    educational_purpose: z.string(),
    affected_user_roles: z.array(z.string()),
    data_privacy_level: z.enum(['public', 'internal', 'confidential', 'restricted']),
    compliance_validation: z.boolean(),
    school_isolation_required: z.boolean()
  }).optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const MCPConfigurationSchema = z.object({
  id: z.string().uuid(),
  project_name: z.string().min(1, 'Nome do projeto é obrigatório').max(100),
  environment: z.enum(['development', 'staging', 'production']),
  version: z.string().min(1, 'Versão é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória').max(1000),
  servers: z.array(MCPServerSchema),
  tools: z.array(MCPToolSchema),
  workflows: z.array(MCPWorkflowSchema),
  global_settings: z.object({
    default_timeout: z.number().min(1000).max(300000),
    max_concurrent_executions: z.number().min(1).max(50),
    enable_logging: z.boolean(),
    log_level: z.enum(['debug', 'info', 'warn', 'error']),
    enable_metrics: z.boolean(),
    enable_health_checks: z.boolean(),
    health_check_interval: z.number().min(30).max(3600),
    enable_rate_limiting: z.boolean(),
    enable_circuit_breaker: z.boolean()
  }),
  educational_settings: z.object({
    enable_school_isolation: z.boolean(),
    default_user_role: z.enum(['admin', 'diretor', 'secretario', 'professor', 'responsavel']),
    enable_audit_logging: z.boolean(),
    require_brazilian_compliance: z.boolean(),
    enable_lgpd_validation: z.boolean(),
    enable_lbi_accessibility: z.boolean(),
    attendance_workflow_validation: z.boolean()
  }),
  integration_status: z.object({
    supabase_connected: z.boolean(),
    shadcn_ui_available: z.boolean(),
    playwright_configured: z.boolean(),
    github_integration: z.boolean(),
    bright_data_active: z.boolean(),
    last_health_check: z.string().datetime(),
    overall_status: z.enum(['healthy', 'degraded', 'critical', 'offline'])
  }),
  usage_analytics: z.object({
    total_tool_executions: z.number().min(0),
    total_workflow_executions: z.number().min(0),
    average_execution_time: z.number().min(0),
    success_rate: z.number().min(0).max(1),
    most_used_tools: z.array(z.string()),
    most_used_workflows: z.array(z.string()),
    error_rate_by_tool: z.record(z.number()),
    last_analytics_update: z.string().datetime()
  }),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

/**
 * TypeScript types derived from Zod schemas
 */
export type MCPServer = z.infer<typeof MCPServerSchema>
export type MCPTool = z.infer<typeof MCPToolSchema>
export type MCPWorkflow = z.infer<typeof MCPWorkflowSchema>
export type MCPConfiguration = z.infer<typeof MCPConfigurationSchema>

/**
 * Input types for creating new items
 */
export type CreateMCPServerInput = z.input<typeof MCPServerSchema>
export type CreateMCPToolInput = z.input<typeof MCPToolSchema>
export type CreateMCPWorkflowInput = z.input<typeof MCPWorkflowSchema>
export type CreateMCPConfigurationInput = z.input<typeof MCPConfigurationSchema>

/**
 * MCPConfigurationModel class with enhanced validation and error handling
 */
export class MCPConfigurationModel {
  private configuration: MCPConfiguration

  constructor(configuration: MCPConfiguration) {
    // Validate the configuration on construction
    const validation = MCPConfigurationSchema.safeParse(configuration)
    if (!validation.success) {
      throw new Error(`Invalid MCP configuration: ${validation.error.message}`)
    }
    this.configuration = validation.data
  }

  /**
   * Add new MCP server with validation
   */
  addServer(server: Omit<MCPServer, 'id' | 'created_at' | 'updated_at'>): string {
    const now = new Date().toISOString()
    const newServer: MCPServer = {
      ...server,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    }

    // Validate the new server
    const validation = MCPServerSchema.safeParse(newServer)
    if (!validation.success) {
      throw new Error(`Invalid server configuration: ${validation.error.message}`)
    }

    this.configuration.servers.push(validation.data)
    this.updateTimestamp()
    return newServer.id
  }

  /**
   * Add new MCP tool with validation
   */
  addTool(tool: Omit<MCPTool, 'id' | 'created_at' | 'updated_at'>): string {
    const now = new Date().toISOString()
    const newTool: MCPTool = {
      ...tool,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    }

    // Validate the new tool
    const validation = MCPToolSchema.safeParse(newTool)
    if (!validation.success) {
      throw new Error(`Invalid tool configuration: ${validation.error.message}`)
    }

    // Verify server exists
    const serverExists = this.configuration.servers.some(s => s.id === tool.server_id)
    if (!serverExists) {
      throw new Error(`Server with ID ${tool.server_id} not found`)
    }

    this.configuration.tools.push(validation.data)
    this.updateTimestamp()
    return newTool.id
  }

  /**
   * Add new MCP workflow with validation
   */
  addWorkflow(workflow: Omit<MCPWorkflow, 'id' | 'created_at' | 'updated_at'>): string {
    const now = new Date().toISOString()
    const newWorkflow: MCPWorkflow = {
      ...workflow,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    }

    // Validate the new workflow
    const validation = MCPWorkflowSchema.safeParse(newWorkflow)
    if (!validation.success) {
      throw new Error(`Invalid workflow configuration: ${validation.error.message}`)
    }

    // Verify all tools in workflow steps exist
    const toolIds = new Set(this.configuration.tools.map(t => t.id))
    for (const step of workflow.steps) {
      if (!toolIds.has(step.tool_id)) {
        throw new Error(`Tool with ID ${step.tool_id} not found for workflow step ${step.name}`)
      }
    }

    this.configuration.workflows.push(validation.data)
    this.updateTimestamp()
    return newWorkflow.id
  }

  /**
   * Get servers by type
   */
  getServersByType(type: MCPServer['type']): MCPServer[] {
    return this.configuration.servers.filter(s => s.type === type)
  }

  /**
   * Get active servers
   */
  getActiveServers(): MCPServer[] {
    return this.configuration.servers.filter(s => s.status === 'active')
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: MCPTool['category']): MCPTool[] {
    return this.configuration.tools.filter(t => t.category === category)
  }

  /**
   * Get enabled tools
   */
  getEnabledTools(): MCPTool[] {
    return this.configuration.tools.filter(t => t.enabled)
  }

  /**
   * Get workflows by trigger type
   */
  getWorkflowsByTrigger(triggerType: MCPWorkflow['trigger_type']): MCPWorkflow[] {
    return this.configuration.workflows.filter(w => w.trigger_type === triggerType)
  }

  /**
   * Get enabled workflows
   */
  getEnabledWorkflows(): MCPWorkflow[] {
    return this.configuration.workflows.filter(w => w.enabled)
  }

  /**
   * Update server status with validation
   */
  updateServerStatus(serverId: string, status: MCPServer['status'], healthCheck?: Partial<MCPServer['health_check']>): boolean {
    const server = this.configuration.servers.find(s => s.id === serverId)
    if (!server) return false

    // Validate status
    const statusSchema = z.enum(['active', 'inactive', 'error', 'testing'])
    const validatedStatus = statusSchema.safeParse(status)
    if (!validatedStatus.success) {
      throw new Error('Invalid status value')
    }

    server.status = validatedStatus.data
    if (healthCheck) {
      server.health_check = {
        ...server.health_check,
        ...healthCheck,
        last_check: new Date().toISOString()
      }
    }
    server.updated_at = new Date().toISOString()
    this.updateTimestamp()
    return true
  }

  /**
   * Update tool usage statistics
   */
  updateToolUsage(toolId: string, success: boolean, executionTime: number): boolean {
    const tool = this.configuration.tools.find(t => t.id === toolId)
    if (!tool) return false

    tool.usage_count++
    if (success) {
      tool.success_rate = (tool.success_rate * (tool.usage_count - 1) + 1) / tool.usage_count
    } else {
      tool.success_rate = (tool.success_rate * (tool.usage_count - 1)) / tool.usage_count
    }
    tool.average_execution_time = (tool.average_execution_time * (tool.usage_count - 1) + executionTime) / tool.usage_count
    tool.last_used = new Date().toISOString()
    tool.updated_at = new Date().toISOString()
    this.updateTimestamp()
    return true
  }

  /**
   * Execute workflow step with validation
   */
  executeWorkflowStep(workflowId: string, stepId: string, inputData: Record<string, any>): {
    success: boolean
    result?: any
    error?: string
  } {
    const workflow = this.configuration.workflows.find(w => w.id === workflowId)
    if (!workflow) {
      return { success: false, error: 'Workflow not found' }
    }

    const step = workflow.steps.find(s => s.id === stepId)
    if (!step) {
      return { success: false, error: 'Workflow step not found' }
    }

    const tool = this.configuration.tools.find(t => t.id === step.tool_id)
    if (!tool) {
      return { success: false, error: 'Tool not found' }
    }

    if (!tool.enabled) {
      return { success: false, error: 'Tool is disabled' }
    }

    // Simulate tool execution
    try {
      // In a real implementation, this would execute the actual tool
      const result = {
        step_id: stepId,
        tool_name: tool.name,
        executed_at: new Date().toISOString(),
        input_data: inputData,
        output_data: { success: true, message: 'Simulated execution' }
      }

      // Update tool usage
      this.updateToolUsage(tool.id, true, Math.random() * 1000 + 100)

      return { success: true, result }
    } catch (error) {
      this.updateToolUsage(tool.id, false, 0)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Get Brazilian educational compliance status
   */
  getBrazilianComplianceStatus(): {
    overall_compliance: number
    lgpd_compliant_tools: number
    lbi_accessible_tools: number
    school_isolation_enabled: boolean
    audit_logging_enabled: boolean
    attendance_workflow_validated: boolean
    compliance_gaps: string[]
  } {
    const educationalTools = this.configuration.tools.filter(t =>
      t.brazilian_educational_context?.school_data_access
    )

    const lgpdCompliantTools = educationalTools.filter(t =>
      t.brazilian_educational_context?.compliance_requirements.includes('LGPD')
    ).length

    const lbiAccessibleTools = educationalTools.filter(t =>
      t.brazilian_educational_context?.compliance_requirements.includes('LBI_13146')
    ).length

    const complianceGaps: string[] = []

    if (!this.configuration.educational_settings.enable_school_isolation) {
      complianceGaps.push('Isolamento escolar não está habilitado')
    }

    if (!this.configuration.educational_settings.enable_audit_logging) {
      complianceGaps.push('Log de auditoria não está habilitado')
    }

    if (!this.configuration.educational_settings.require_brazilian_compliance) {
      complianceGaps.push('Conformidade brasileira não é obrigatória')
    }

    const totalRequirements = 6 // Total compliance requirements
    const metRequirements = totalRequirements - complianceGaps.length
    const overallCompliance = Math.round((metRequirements / totalRequirements) * 100)

    return {
      overall_compliance: overallCompliance,
      lgpd_compliant_tools: lgpdCompliantTools,
      lbi_accessible_tools: lbiAccessibleTools,
      school_isolation_enabled: this.configuration.educational_settings.enable_school_isolation,
      audit_logging_enabled: this.configuration.educational_settings.enable_audit_logging,
      attendance_workflow_validated: this.configuration.educational_settings.attendance_workflow_validation,
      compliance_gaps: complianceGaps
    }
  }

  /**
   * Generate system health report
   */
  getSystemHealthReport(): {
    overall_status: string
    active_servers: number
    total_servers: number
    enabled_tools: number
    total_tools: number
    enabled_workflows: number
    total_workflows: number
    average_success_rate: number
    server_health: { healthy: number; degraded: number; unhealthy: number }
    recent_errors: string[]
  } {
    const activeServers = this.getActiveServers().length
    const enabledTools = this.getEnabledTools().length
    const enabledWorkflows = this.getEnabledWorkflows().length

    const serverHealth = {
      healthy: this.configuration.servers.filter(s => s.health_check.status === 'healthy').length,
      degraded: this.configuration.servers.filter(s => s.health_check.status === 'degraded').length,
      unhealthy: this.configuration.servers.filter(s => s.health_check.status === 'unhealthy').length
    }

    const averageSuccessRate = this.configuration.tools.length > 0
      ? this.configuration.tools.reduce((sum, tool) => sum + tool.success_rate, 0) / this.configuration.tools.length
      : 0

    const recentErrors = this.configuration.servers
      .filter(s => s.health_check.error_message)
      .map(s => s.health_check.error_message!)

    let overallStatus = 'healthy'
    if (serverHealth.unhealthy > 0 || averageSuccessRate < 0.8) {
      overallStatus = 'critical'
    } else if (serverHealth.degraded > 0 || averageSuccessRate < 0.95) {
      overallStatus = 'degraded'
    }

    return {
      overall_status: overallStatus,
      active_servers: activeServers,
      total_servers: this.configuration.servers.length,
      enabled_tools: enabledTools,
      total_tools: this.configuration.tools.length,
      enabled_workflows: enabledWorkflows,
      total_workflows: this.configuration.workflows.length,
      average_success_rate: Math.round(averageSuccessRate * 100) / 100,
      server_health: serverHealth,
      recent_errors: recentErrors
    }
  }

  /**
   * Validate entire configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const validation = MCPConfigurationSchema.safeParse(this.configuration)
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
  toJSON(): MCPConfiguration {
    const validation = this.validate()
    if (!validation.valid) {
      throw new Error(`Cannot export invalid configuration: ${validation.errors.join(', ')}`)
    }
    return { ...this.configuration }
  }

  /**
   * Create from JSON with validation
   */
  static fromJSON(data: any): MCPConfigurationModel {
    const validation = MCPConfigurationSchema.safeParse(data)
    if (!validation.success) {
      throw new Error(`Invalid MCP configuration JSON: ${validation.error.message}`)
    }
    return new MCPConfigurationModel(validation.data)
  }

  private updateTimestamp(): void {
    this.configuration.updated_at = new Date().toISOString()
  }
}

/**
 * Create default MCP configuration for Brazilian educational system
 */
export const createDefaultMCPConfiguration = (
  projectName: string,
  createdBy: string,
  environment: 'development' | 'staging' | 'production' = 'development'
): MCPConfiguration => {
  // Validate inputs
  const projectNameSchema = z.string().min(1, 'Project name is required').max(100)
  const userIdSchema = z.string().uuid('Invalid user ID format')

  const validatedProjectName = projectNameSchema.parse(projectName)
  const validatedUserId = userIdSchema.parse(createdBy)

  const now = new Date().toISOString()

  const configuration: MCPConfiguration = {
    id: crypto.randomUUID(),
    project_name: validatedProjectName,
    environment,
    version: '1.0.0',
    description: 'Default MCP configuration for Brazilian educational management system',
    servers: [],
    tools: [],
    workflows: [],
    global_settings: {
      default_timeout: 30000,
      max_concurrent_executions: 5,
      enable_logging: true,
      log_level: environment === 'production' ? 'info' : 'debug',
      enable_metrics: true,
      enable_health_checks: true,
      health_check_interval: 300,
      enable_rate_limiting: environment === 'production',
      enable_circuit_breaker: environment === 'production'
    },
    educational_settings: {
      enable_school_isolation: true,
      default_user_role: 'professor',
      enable_audit_logging: true,
      require_brazilian_compliance: true,
      enable_lgpd_validation: true,
      enable_lbi_accessibility: true,
      attendance_workflow_validation: true
    },
    integration_status: {
      supabase_connected: false,
      shadcn_ui_available: false,
      playwright_configured: false,
      github_integration: false,
      bright_data_active: false,
      last_health_check: now,
      overall_status: 'offline'
    },
    usage_analytics: {
      total_tool_executions: 0,
      total_workflow_executions: 0,
      average_execution_time: 0,
      success_rate: 0,
      most_used_tools: [],
      most_used_workflows: [],
      error_rate_by_tool: {},
      last_analytics_update: now
    },
    created_by: validatedUserId,
    created_at: now,
    updated_at: now
  }

  // Validate the created configuration
  const validation = MCPConfigurationSchema.safeParse(configuration)
  if (!validation.success) {
    throw new Error(`Failed to create valid MCP configuration: ${validation.error.message}`)
  }

  return validation.data
}

/**
 * Utility functions for MCP configuration operations
 */
export const MCPConfigurationUtils = {
  /**
   * Validate MCP server
   */
  validateServer: (server: any) => MCPServerSchema.safeParse(server),

  /**
   * Validate MCP tool
   */
  validateTool: (tool: any) => MCPToolSchema.safeParse(tool),

  /**
   * Validate MCP workflow
   */
  validateWorkflow: (workflow: any) => MCPWorkflowSchema.safeParse(workflow),

  /**
   * Validate full configuration
   */
  validateConfiguration: (config: any) => MCPConfigurationSchema.safeParse(config),

  /**
   * Get Brazilian educational tool categories
   */
  getBrazilianEducationalToolCategories: () => [
    'student_management',
    'attendance_tracking',
    'grade_management',
    'report_generation',
    'user_administration',
    'compliance_monitoring'
  ] as const,

  /**
   * Create default Supabase server configuration
   */
  createSupabaseServerConfig: (): Omit<MCPServer, 'id' | 'created_at' | 'updated_at'> => {
    const now = new Date().toISOString()
    return {
      name: 'Supabase Production',
      description: 'Main Supabase database server for educational data',
      type: 'supabase',
      version: '1.0.0',
      status: 'inactive',
      connection_config: {
        protocol: 'https',
        auth_method: 'api_key',
        timeout: 30000,
        retry_attempts: 3
      },
      available_tools: [
        'database_query',
        'auth_management',
        'rls_validation',
        'data_migration',
        'backup_restore'
      ],
      enabled_tools: [
        'database_query',
        'auth_management',
        'rls_validation'
      ],
      rate_limits: {
        requests_per_minute: 1000,
        requests_per_hour: 50000,
        concurrent_requests: 10
      },
      health_check: {
        last_check: now,
        status: 'unhealthy'
      },
      usage_statistics: {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        average_response_time: 0,
        last_used: now
      }
    }
  },

  /**
   * Check if configuration is production ready
   */
  isProductionReady: (config: MCPConfiguration): {
    ready: boolean
    blockers: string[]
    warnings: string[]
  } => {
    const blockers: string[] = []
    const warnings: string[] = []

    if (config.environment !== 'production') {
      warnings.push('Environment is not set to production')
    }

    if (!config.educational_settings.enable_audit_logging) {
      blockers.push('Audit logging is required for production')
    }

    if (!config.educational_settings.require_brazilian_compliance) {
      blockers.push('Brazilian compliance is required for production')
    }

    const activeServers = config.servers.filter(s => s.status === 'active').length
    if (activeServers === 0) {
      blockers.push('No active servers configured')
    }

    const enabledTools = config.tools.filter(t => t.enabled).length
    if (enabledTools === 0) {
      warnings.push('No tools are enabled')
    }

    if (!config.global_settings.enable_rate_limiting) {
      warnings.push('Rate limiting should be enabled for production')
    }

    return {
      ready: blockers.length === 0,
      blockers,
      warnings
    }
  }
}