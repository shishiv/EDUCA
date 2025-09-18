/**
 * Models index - Central export for all data models
 * Brazilian Educational Management System models with validation
 */

// Audit system models
export * from './audit-checklist'
export type {
  AuditChecklist,
  AuditChecklistItem,
  CreateAuditChecklistInput,
  CreateAuditChecklistItemInput
} from './audit-checklist'

// Mockup and design system models
export * from './mockup-inventory'
export type {
  MockupInventory,
  MockupComponent,
  MockupScreen,
  MockupFile,
  CreateMockupInventoryInput,
  CreateMockupComponentInput,
  CreateMockupScreenInput,
  CreateMockupFileInput
} from './mockup-inventory'

// MCP integration models
export * from './mcp-configuration'
export type {
  MCPConfiguration,
  MCPServer,
  MCPTool,
  MCPWorkflow,
  CreateMCPConfigurationInput,
  CreateMCPServerInput,
  CreateMCPToolInput,
  CreateMCPWorkflowInput
} from './mcp-configuration'

/**
 * Validation utilities for all models
 */
export const ModelValidation = {
  // Audit checklist validation
  auditChecklist: (data: any) => {
    const { AuditChecklistUtils } = require('./audit-checklist')
    return AuditChecklistUtils.validateChecklist(data)
  },

  auditChecklistItem: (data: any) => {
    const { AuditChecklistUtils } = require('./audit-checklist')
    return AuditChecklistUtils.validateItem(data)
  },

  // Mockup inventory validation
  mockupInventory: (data: any) => {
    const { MockupInventoryUtils } = require('./mockup-inventory')
    return MockupInventoryUtils.validateInventory(data)
  },

  mockupComponent: (data: any) => {
    const { MockupInventoryUtils } = require('./mockup-inventory')
    return MockupInventoryUtils.validateComponent(data)
  },

  mockupScreen: (data: any) => {
    const { MockupInventoryUtils } = require('./mockup-inventory')
    return MockupInventoryUtils.validateScreen(data)
  },

  mockupFile: (data: any) => {
    const { MockupInventoryUtils } = require('./mockup-inventory')
    return MockupInventoryUtils.validateFile(data)
  },

  // MCP configuration validation
  mcpConfiguration: (data: any) => {
    const { MCPConfigurationUtils } = require('./mcp-configuration')
    return MCPConfigurationUtils.validateConfiguration(data)
  },

  mcpServer: (data: any) => {
    const { MCPConfigurationUtils } = require('./mcp-configuration')
    return MCPConfigurationUtils.validateServer(data)
  },

  mcpTool: (data: any) => {
    const { MCPConfigurationUtils } = require('./mcp-configuration')
    return MCPConfigurationUtils.validateTool(data)
  },

  mcpWorkflow: (data: any) => {
    const { MCPConfigurationUtils } = require('./mcp-configuration')
    return MCPConfigurationUtils.validateWorkflow(data)
  }
}

/**
 * Model factory functions for creating default instances
 */
export const ModelFactory = {
  // Create default audit checklist
  createAuditChecklist: (projectName: string, createdBy: string) => {
    const { createDefaultProductionReadinessChecklist } = require('./audit-checklist')
    return createDefaultProductionReadinessChecklist(projectName, createdBy)
  },

  // Create default mockup inventory
  createMockupInventory: (projectName: string, createdBy: string) => {
    const { createDefaultMockupInventory } = require('./mockup-inventory')
    return createDefaultMockupInventory(projectName, createdBy)
  },

  // Create default MCP configuration
  createMCPConfiguration: (
    projectName: string,
    createdBy: string,
    environment: 'development' | 'staging' | 'production' = 'development'
  ) => {
    const { createDefaultMCPConfiguration } = require('./mcp-configuration')
    return createDefaultMCPConfiguration(projectName, createdBy, environment)
  }
}

/**
 * Brazilian Educational System constants
 */
export const BrazilianEducationalConstants = {
  userRoles: ['admin', 'diretor', 'secretario', 'professor', 'responsavel'] as const,
  schoolTypes: ['municipal', 'estadual', 'federal', 'particular'] as const,
  complianceRequirements: ['LGPD', 'LBI_13146', 'Educational_Standards', 'Attendance_Tracking'] as const,
  workflows: [
    'student_registration',
    'attendance_marking',
    'grade_entry',
    'report_generation',
    'user_management',
    'school_administration'
  ] as const,
  accessibilityLevels: ['none', 'basic', 'wcag_a', 'wcag_aa', 'wcag_aaa', 'lbi_compliant'] as const
}