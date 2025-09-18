/**
 * MockupInventory model for design system and UI component tracking
 * Manages mockups, wireframes, and UI components for Brazilian educational system
 * Updated with Zod validation schemas and enhanced TypeScript integration
 */

import { z } from 'zod'

/**
 * Zod validation schemas
 */
export const MockupFileSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1, 'Nome do arquivo é obrigatório').max(255),
  path: z.string().min(1, 'Caminho do arquivo é obrigatório'),
  type: z.enum(['wireframe', 'mockup', 'prototype', 'component', 'screenshot']),
  format: z.enum(['figma', 'sketch', 'png', 'jpg', 'svg', 'pdf', 'html', 'react']),
  size: z.number().min(0, 'Tamanho do arquivo deve ser positivo'),
  dimensions: z.object({
    width: z.number().min(1),
    height: z.number().min(1)
  }).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.object({
    design_version: z.string().optional(),
    figma_url: z.string().url().optional(),
    component_library: z.string().optional(),
    accessibility_notes: z.string().optional(),
    brazilian_standards: z.array(z.string()).optional()
  }).optional()
})

export const MockupComponentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome do componente é obrigatório').max(100),
  category: z.enum(['form', 'navigation', 'data-display', 'feedback', 'layout', 'input', 'educational']),
  description: z.string().min(1, 'Descrição é obrigatória').max(500),
  status: z.enum(['design', 'development', 'testing', 'complete', 'deprecated']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  educational_context: z.object({
    user_roles: z.array(z.string()).min(1, 'Pelo menos um papel de usuário é obrigatório'),
    workflows: z.array(z.string()).min(1, 'Pelo menos um workflow é obrigatório'),
    compliance_requirements: z.array(z.string())
  }),
  design_files: z.array(MockupFileSchema),
  implementation_files: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  usage_count: z.number().min(0).optional(),
  accessibility_level: z.enum(['none', 'basic', 'wcag_a', 'wcag_aa', 'wcag_aaa', 'lbi_compliant']),
  responsive_breakpoints: z.array(z.string()),
  created_by: z.string().uuid(),
  assigned_to: z.string().uuid().optional(),
  tags: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const MockupScreenSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome da tela é obrigatório').max(100),
  path: z.string().min(1, 'Caminho da rota é obrigatório'),
  type: z.enum(['page', 'modal', 'component', 'flow']),
  user_role: z.enum(['admin', 'diretor', 'secretario', 'professor', 'responsavel', 'public']),
  workflow: z.string().min(1, 'Workflow é obrigatório'),
  status: z.enum(['wireframe', 'design', 'prototype', 'development', 'testing', 'complete']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  components_used: z.array(z.string().uuid()),
  design_files: z.array(MockupFileSchema),
  implementation_status: z.object({
    frontend_complete: z.boolean(),
    backend_complete: z.boolean(),
    testing_complete: z.boolean(),
    accessibility_validated: z.boolean(),
    brazilian_compliance_validated: z.boolean()
  }),
  performance_requirements: z.object({
    max_load_time: z.number().min(100).max(10000),
    max_render_time: z.number().min(50).max(5000),
    mobile_optimized: z.boolean()
  }).optional(),
  brazilian_requirements: z.object({
    lgpd_compliant: z.boolean(),
    lbi_accessible: z.boolean(),
    educational_standards: z.array(z.string())
  }),
  notes: z.string().max(1000).optional(),
  created_by: z.string().uuid(),
  assigned_to: z.string().uuid().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const MockupInventorySchema = z.object({
  id: z.string().uuid(),
  project_name: z.string().min(1, 'Nome do projeto é obrigatório').max(100),
  version: z.string().min(1, 'Versão é obrigatória'),
  status: z.enum(['active', 'archived', 'draft']),
  description: z.string().min(1, 'Descrição é obrigatória').max(500),
  design_system_version: z.string().optional(),
  components: z.array(MockupComponentSchema),
  screens: z.array(MockupScreenSchema),
  design_files: z.array(MockupFileSchema),
  statistics: z.object({
    total_components: z.number().min(0),
    complete_components: z.number().min(0),
    total_screens: z.number().min(0),
    complete_screens: z.number().min(0),
    total_files: z.number().min(0),
    total_file_size: z.number().min(0)
  }),
  compliance_status: z.object({
    wcag_aa_coverage: z.number().min(0).max(100),
    lbi_compliance_coverage: z.number().min(0).max(100),
    lgpd_compliance_coverage: z.number().min(0).max(100),
    educational_standards_coverage: z.number().min(0).max(100)
  }),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

/**
 * TypeScript types derived from Zod schemas
 */
export type MockupFile = z.infer<typeof MockupFileSchema>
export type MockupComponent = z.infer<typeof MockupComponentSchema>
export type MockupScreen = z.infer<typeof MockupScreenSchema>
export type MockupInventory = z.infer<typeof MockupInventorySchema>

/**
 * Input types for creating new items
 */
export type CreateMockupFileInput = z.input<typeof MockupFileSchema>
export type CreateMockupComponentInput = z.input<typeof MockupComponentSchema>
export type CreateMockupScreenInput = z.input<typeof MockupScreenSchema>
export type CreateMockupInventoryInput = z.input<typeof MockupInventorySchema>

/**
 * MockupInventoryModel class with enhanced validation and error handling
 */
export class MockupInventoryModel {
  private inventory: MockupInventory

  constructor(inventory: MockupInventory) {
    // Validate the inventory on construction
    const validation = MockupInventorySchema.safeParse(inventory)
    if (!validation.success) {
      throw new Error(`Invalid inventory data: ${validation.error.message}`)
    }
    this.inventory = validation.data
  }

  /**
   * Add new mockup component with validation
   */
  addComponent(component: Omit<MockupComponent, 'id' | 'created_at' | 'updated_at'>): string {
    const now = new Date().toISOString()
    const newComponent: MockupComponent = {
      ...component,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    }

    // Validate the new component
    const validation = MockupComponentSchema.safeParse(newComponent)
    if (!validation.success) {
      throw new Error(`Invalid component data: ${validation.error.message}`)
    }

    this.inventory.components.push(validation.data)
    this.updateStatistics()
    this.updateTimestamp()
    return newComponent.id
  }

  /**
   * Add new mockup screen with validation
   */
  addScreen(screen: Omit<MockupScreen, 'id' | 'created_at' | 'updated_at'>): string {
    const now = new Date().toISOString()
    const newScreen: MockupScreen = {
      ...screen,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    }

    // Validate the new screen
    const validation = MockupScreenSchema.safeParse(newScreen)
    if (!validation.success) {
      throw new Error(`Invalid screen data: ${validation.error.message}`)
    }

    this.inventory.screens.push(validation.data)
    this.updateStatistics()
    this.updateTimestamp()
    return newScreen.id
  }

  /**
   * Add design file to component, screen, or general inventory
   */
  addDesignFile(
    file: Omit<MockupFile, 'id' | 'created_at' | 'updated_at'>,
    targetId: string,
    targetType: 'component' | 'screen' | 'general'
  ): string {
    const now = new Date().toISOString()
    const newFile: MockupFile = {
      ...file,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    }

    // Validate the new file
    const validation = MockupFileSchema.safeParse(newFile)
    if (!validation.success) {
      throw new Error(`Invalid file data: ${validation.error.message}`)
    }

    if (targetType === 'component') {
      const component = this.inventory.components.find(c => c.id === targetId)
      if (!component) {
        throw new Error('Component not found')
      }
      component.design_files.push(validation.data)
    } else if (targetType === 'screen') {
      const screen = this.inventory.screens.find(s => s.id === targetId)
      if (!screen) {
        throw new Error('Screen not found')
      }
      screen.design_files.push(validation.data)
    } else {
      this.inventory.design_files.push(validation.data)
    }

    this.updateStatistics()
    this.updateTimestamp()
    return newFile.id
  }

  /**
   * Get components by status
   */
  getComponentsByStatus(status: MockupComponent['status']): MockupComponent[] {
    return this.inventory.components.filter(c => c.status === status)
  }

  /**
   * Get screens by user role
   */
  getScreensByUserRole(role: MockupScreen['user_role']): MockupScreen[] {
    return this.inventory.screens.filter(s => s.user_role === role)
  }

  /**
   * Get screens by workflow
   */
  getScreensByWorkflow(workflow: string): MockupScreen[] {
    return this.inventory.screens.filter(s => s.workflow === workflow)
  }

  /**
   * Get components used in a specific screen
   */
  getComponentsForScreen(screenId: string): MockupComponent[] {
    const screen = this.inventory.screens.find(s => s.id === screenId)
    if (!screen) return []

    return this.inventory.components.filter(c =>
      screen.components_used.includes(c.id)
    )
  }

  /**
   * Get screens that use a specific component
   */
  getScreensUsingComponent(componentId: string): MockupScreen[] {
    return this.inventory.screens.filter(s =>
      s.components_used.includes(componentId)
    )
  }

  /**
   * Update component status with validation
   */
  updateComponentStatus(componentId: string, status: MockupComponent['status']): boolean {
    const component = this.inventory.components.find(c => c.id === componentId)
    if (!component) return false

    // Validate status
    const statusSchema = z.enum(['design', 'development', 'testing', 'complete', 'deprecated'])
    const validatedStatus = statusSchema.safeParse(status)
    if (!validatedStatus.success) {
      throw new Error('Invalid status value')
    }

    component.status = validatedStatus.data
    component.updated_at = new Date().toISOString()
    this.updateStatistics()
    this.updateTimestamp()
    return true
  }

  /**
   * Update screen implementation status with validation
   */
  updateScreenImplementation(
    screenId: string,
    implementation: Partial<MockupScreen['implementation_status']>
  ): boolean {
    const screen = this.inventory.screens.find(s => s.id === screenId)
    if (!screen) return false

    const updatedImplementation = {
      ...screen.implementation_status,
      ...implementation
    }

    // Validate implementation status
    const implementationSchema = z.object({
      frontend_complete: z.boolean(),
      backend_complete: z.boolean(),
      testing_complete: z.boolean(),
      accessibility_validated: z.boolean(),
      brazilian_compliance_validated: z.boolean()
    })

    const validation = implementationSchema.safeParse(updatedImplementation)
    if (!validation.success) {
      throw new Error(`Invalid implementation status: ${validation.error.message}`)
    }

    screen.implementation_status = validation.data
    screen.updated_at = new Date().toISOString()
    this.updateStatistics()
    this.updateTimestamp()
    return true
  }

  /**
   * Get implementation progress report
   */
  getImplementationProgress(): {
    components: {
      total: number
      by_status: Record<string, number>
      completion_percentage: number
    }
    screens: {
      total: number
      by_status: Record<string, number>
      completion_percentage: number
      implementation_breakdown: {
        frontend_complete: number
        backend_complete: number
        testing_complete: number
        accessibility_validated: number
        brazilian_compliance_validated: number
      }
    }
    critical_gaps: {
      missing_components: MockupComponent[]
      incomplete_screens: MockupScreen[]
      accessibility_gaps: (MockupComponent | MockupScreen)[]
    }
  } {
    // Component analysis
    const componentsByStatus: Record<string, number> = {}
    this.inventory.components.forEach(c => {
      componentsByStatus[c.status] = (componentsByStatus[c.status] || 0) + 1
    })

    const completeComponents = this.inventory.components.filter(c => c.status === 'complete').length
    const componentCompletion = this.inventory.components.length > 0
      ? Math.round((completeComponents / this.inventory.components.length) * 100)
      : 0

    // Screen analysis
    const screensByStatus: Record<string, number> = {}
    this.inventory.screens.forEach(s => {
      screensByStatus[s.status] = (screensByStatus[s.status] || 0) + 1
    })

    const completeScreens = this.inventory.screens.filter(s => s.status === 'complete').length
    const screenCompletion = this.inventory.screens.length > 0
      ? Math.round((completeScreens / this.inventory.screens.length) * 100)
      : 0

    // Implementation breakdown
    const implementationBreakdown = {
      frontend_complete: this.inventory.screens.filter(s => s.implementation_status.frontend_complete).length,
      backend_complete: this.inventory.screens.filter(s => s.implementation_status.backend_complete).length,
      testing_complete: this.inventory.screens.filter(s => s.implementation_status.testing_complete).length,
      accessibility_validated: this.inventory.screens.filter(s => s.implementation_status.accessibility_validated).length,
      brazilian_compliance_validated: this.inventory.screens.filter(s => s.implementation_status.brazilian_compliance_validated).length
    }

    // Critical gaps
    const missingComponents = this.inventory.components.filter(c =>
      c.priority === 'critical' && c.status !== 'complete'
    )

    const incompleteScreens = this.inventory.screens.filter(s =>
      s.priority === 'critical' && s.status !== 'complete'
    )

    const accessibilityGaps: (MockupComponent | MockupScreen)[] = [
      ...this.inventory.components.filter(c => c.accessibility_level === 'none' || c.accessibility_level === 'basic'),
      ...this.inventory.screens.filter(s => !s.implementation_status.accessibility_validated)
    ]

    return {
      components: {
        total: this.inventory.components.length,
        by_status: componentsByStatus,
        completion_percentage: componentCompletion
      },
      screens: {
        total: this.inventory.screens.length,
        by_status: screensByStatus,
        completion_percentage: screenCompletion,
        implementation_breakdown: implementationBreakdown
      },
      critical_gaps: {
        missing_components: missingComponents,
        incomplete_screens: incompleteScreens,
        accessibility_gaps: accessibilityGaps
      }
    }
  }

  /**
   * Generate Brazilian compliance report
   */
  getBrazilianComplianceReport(): {
    lgpd_status: {
      compliant_screens: number
      total_screens: number
      percentage: number
      gaps: MockupScreen[]
    }
    lbi_accessibility: {
      compliant_components: number
      total_components: number
      percentage: number
      gaps: MockupComponent[]
    }
    educational_standards: {
      coverage_by_role: Record<string, number>
      workflow_coverage: Record<string, number>
      missing_workflows: string[]
    }
  } {
    // LGPD Analysis
    const lgpdCompliantScreens = this.inventory.screens.filter(s => s.brazilian_requirements.lgpd_compliant)
    const lgpdGaps = this.inventory.screens.filter(s => !s.brazilian_requirements.lgpd_compliant)

    // LBI Accessibility Analysis
    const lbiCompliantComponents = this.inventory.components.filter(c =>
      c.accessibility_level === 'lbi_compliant' || c.accessibility_level === 'wcag_aaa'
    )
    const lbiGaps = this.inventory.components.filter(c =>
      c.accessibility_level === 'none' || c.accessibility_level === 'basic'
    )

    // Educational Standards Analysis
    const coverageByRole: Record<string, number> = {}
    const workflowCoverage: Record<string, number> = {}

    // Analyze role coverage
    const allRoles = ['admin', 'diretor', 'secretario', 'professor', 'responsavel']
    allRoles.forEach(role => {
      const roleScreens = this.inventory.screens.filter(s => s.user_role === role)
      coverageByRole[role] = roleScreens.length
    })

    // Analyze workflow coverage
    const allWorkflows = [...new Set(this.inventory.screens.map(s => s.workflow))]
    allWorkflows.forEach(workflow => {
      const workflowScreens = this.inventory.screens.filter(s => s.workflow === workflow)
      const completeWorkflowScreens = workflowScreens.filter(s => s.status === 'complete')
      workflowCoverage[workflow] = workflowScreens.length > 0
        ? Math.round((completeWorkflowScreens.length / workflowScreens.length) * 100)
        : 0
    })

    const criticalWorkflows = [
      'student_registration',
      'attendance_marking',
      'user_management',
      'report_generation',
      'authentication'
    ]
    const missingWorkflows = criticalWorkflows.filter(workflow =>
      !allWorkflows.includes(workflow) || workflowCoverage[workflow] < 100
    )

    return {
      lgpd_status: {
        compliant_screens: lgpdCompliantScreens.length,
        total_screens: this.inventory.screens.length,
        percentage: this.inventory.screens.length > 0
          ? Math.round((lgpdCompliantScreens.length / this.inventory.screens.length) * 100)
          : 0,
        gaps: lgpdGaps
      },
      lbi_accessibility: {
        compliant_components: lbiCompliantComponents.length,
        total_components: this.inventory.components.length,
        percentage: this.inventory.components.length > 0
          ? Math.round((lbiCompliantComponents.length / this.inventory.components.length) * 100)
          : 0,
        gaps: lbiGaps
      },
      educational_standards: {
        coverage_by_role: coverageByRole,
        workflow_coverage: workflowCoverage,
        missing_workflows: missingWorkflows
      }
    }
  }

  /**
   * Validate entire inventory
   */
  validate(): { valid: boolean; errors: string[] } {
    const validation = MockupInventorySchema.safeParse(this.inventory)
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
  toJSON(): MockupInventory {
    const validation = this.validate()
    if (!validation.valid) {
      throw new Error(`Cannot export invalid inventory: ${validation.errors.join(', ')}`)
    }
    return { ...this.inventory }
  }

  /**
   * Create from JSON with validation
   */
  static fromJSON(data: any): MockupInventoryModel {
    const validation = MockupInventorySchema.safeParse(data)
    if (!validation.success) {
      throw new Error(`Invalid inventory JSON: ${validation.error.message}`)
    }
    return new MockupInventoryModel(validation.data)
  }

  private updateStatistics(): void {
    this.inventory.statistics = {
      total_components: this.inventory.components.length,
      complete_components: this.inventory.components.filter(c => c.status === 'complete').length,
      total_screens: this.inventory.screens.length,
      complete_screens: this.inventory.screens.filter(s => s.status === 'complete').length,
      total_files: this.getAllFiles().length,
      total_file_size: this.getAllFiles().reduce((sum, file) => sum + file.size, 0)
    }

    // Update compliance status
    const screens = this.inventory.screens.length
    const components = this.inventory.components.length

    this.inventory.compliance_status = {
      wcag_aa_coverage: screens > 0
        ? Math.round((this.inventory.screens.filter(s => s.implementation_status.accessibility_validated).length / screens) * 100)
        : 0,
      lbi_compliance_coverage: components > 0
        ? Math.round((this.inventory.components.filter(c => c.accessibility_level === 'lbi_compliant').length / components) * 100)
        : 0,
      lgpd_compliance_coverage: screens > 0
        ? Math.round((this.inventory.screens.filter(s => s.brazilian_requirements.lgpd_compliant).length / screens) * 100)
        : 0,
      educational_standards_coverage: screens > 0
        ? Math.round((this.inventory.screens.filter(s => s.brazilian_requirements.educational_standards.length > 0).length / screens) * 100)
        : 0
    }
  }

  private updateTimestamp(): void {
    this.inventory.updated_at = new Date().toISOString()
  }

  private getAllFiles(): MockupFile[] {
    const files: MockupFile[] = [...this.inventory.design_files]

    this.inventory.components.forEach(component => {
      files.push(...component.design_files)
    })

    this.inventory.screens.forEach(screen => {
      files.push(...screen.design_files)
    })

    return files
  }
}

/**
 * Create default mockup inventory for Brazilian educational system
 */
export const createDefaultMockupInventory = (
  projectName: string,
  createdBy: string
): MockupInventory => {
  // Validate inputs
  const projectNameSchema = z.string().min(1, 'Project name is required').max(100)
  const userIdSchema = z.string().uuid('Invalid user ID format')

  const validatedProjectName = projectNameSchema.parse(projectName)
  const validatedUserId = userIdSchema.parse(createdBy)

  const now = new Date().toISOString()

  const inventory: MockupInventory = {
    id: crypto.randomUUID(),
    project_name: validatedProjectName,
    version: '1.0.0',
    status: 'active',
    description: 'Design system and UI component inventory for Brazilian educational management system',
    design_system_version: 'shadcn/ui v0.8.0',
    components: [],
    screens: [],
    design_files: [],
    statistics: {
      total_components: 0,
      complete_components: 0,
      total_screens: 0,
      complete_screens: 0,
      total_files: 0,
      total_file_size: 0
    },
    compliance_status: {
      wcag_aa_coverage: 0,
      lbi_compliance_coverage: 0,
      lgpd_compliance_coverage: 0,
      educational_standards_coverage: 0
    },
    created_by: validatedUserId,
    created_at: now,
    updated_at: now
  }

  // Validate the created inventory
  const validation = MockupInventorySchema.safeParse(inventory)
  if (!validation.success) {
    throw new Error(`Failed to create valid inventory: ${validation.error.message}`)
  }

  return validation.data
}

/**
 * Utility functions for mockup inventory operations
 */
export const MockupInventoryUtils = {
  /**
   * Validate mockup file
   */
  validateFile: (file: any) => MockupFileSchema.safeParse(file),

  /**
   * Validate mockup component
   */
  validateComponent: (component: any) => MockupComponentSchema.safeParse(component),

  /**
   * Validate mockup screen
   */
  validateScreen: (screen: any) => MockupScreenSchema.safeParse(screen),

  /**
   * Validate full inventory
   */
  validateInventory: (inventory: any) => MockupInventorySchema.safeParse(inventory),

  /**
   * Create minimal valid component
   */
  createMinimalComponent: (name: string, createdBy: string): MockupComponent => {
    const now = new Date().toISOString()
    return {
      id: crypto.randomUUID(),
      name,
      category: 'layout',
      description: 'Basic component',
      status: 'design',
      priority: 'medium',
      educational_context: {
        user_roles: ['professor'],
        workflows: ['basic'],
        compliance_requirements: []
      },
      design_files: [],
      accessibility_level: 'basic',
      responsive_breakpoints: ['desktop'],
      created_by: createdBy,
      tags: [],
      created_at: now,
      updated_at: now
    }
  },

  /**
   * Get Brazilian educational user roles
   */
  getBrazilianEducationalRoles: () => [
    'admin',
    'diretor',
    'secretario',
    'professor',
    'responsavel'
  ] as const,

  /**
   * Get common educational workflows
   */
  getEducationalWorkflows: () => [
    'student_registration',
    'attendance_marking',
    'grade_entry',
    'report_generation',
    'user_management',
    'school_administration'
  ] as const,

  /**
   * Calculate design system coverage
   */
  calculateDesignCoverage: (inventory: MockupInventory): {
    component_coverage: number
    screen_coverage: number
    accessibility_coverage: number
    brazilian_compliance: number
  } => {
    const totalComponents = inventory.components.length
    const totalScreens = inventory.screens.length

    return {
      component_coverage: totalComponents > 0
        ? Math.round((inventory.components.filter(c => c.status === 'complete').length / totalComponents) * 100)
        : 0,
      screen_coverage: totalScreens > 0
        ? Math.round((inventory.screens.filter(s => s.status === 'complete').length / totalScreens) * 100)
        : 0,
      accessibility_coverage: inventory.compliance_status.wcag_aa_coverage,
      brazilian_compliance: Math.round((
        inventory.compliance_status.lgpd_compliance_coverage +
        inventory.compliance_status.lbi_compliance_coverage +
        inventory.compliance_status.educational_standards_coverage
      ) / 3)
    }
  }
}

// Export aliases for API compatibility
export const mockupInventorySchema = MockupInventorySchema