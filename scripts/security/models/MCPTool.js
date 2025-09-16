/**
 * T013 [P] MCPTool entity model
 *
 * Represents Model Context Protocol tools with security context
 * Based on data-model-security.md specification
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Data Access Level enumeration
 */
const DataAccessLevel = {
  READ_ONLY: 'read_only',
  LIMITED_WRITE: 'limited_write',
  FULL_ACCESS: 'full_access',
  ADMIN_LEVEL: 'admin_level'
};

/**
 * Compliance Status enumeration
 */
const ComplianceStatus = {
  COMPLIANT: 'compliant',
  PARTIAL: 'partial',
  NON_COMPLIANT: 'non_compliant',
  NOT_APPLICABLE: 'not_applicable'
};

/**
 * Documentation Status enumeration
 */
const DocumentationStatus = {
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  MISSING: 'missing',
  NEEDS_UPDATE: 'needs_update'
};

/**
 * Tool Capability class
 */
class ToolCapability {
  constructor(data = {}) {
    this.name = data.name || '';
    this.description = data.description || '';
    this.risk_level = data.risk_level || 'low';
    this.requires_validation = data.requires_validation || false;
    this.educational_use_cases = data.educational_use_cases || [];
  }
}

/**
 * Rate Limiting configuration
 */
class RateLimiting {
  constructor(data = {}) {
    this.enabled = data.enabled || false;
    this.requests_per_minute = data.requests_per_minute || 60;
    this.burst_limit = data.burst_limit || 10;
    this.educational_exemptions = data.educational_exemptions || [];
  }

  /**
   * Check if rate limiting allows the request
   * @param {string} context - Request context (e.g., 'educational', 'testing')
   * @returns {boolean} Whether request is allowed
   */
  checkRateLimit(context = '') {
    if (!this.enabled) return true;

    // Educational exemptions for critical operations
    if (this.educational_exemptions.includes(context)) {
      return true;
    }

    // Implementation would check actual rate limiting logic here
    return true; // Placeholder
  }
}

/**
 * Compliance Requirement class
 */
class ComplianceRequirement {
  constructor(data = {}) {
    this.regulation = data.regulation || '';
    this.requirement = data.requirement || '';
    this.implementation_status = data.implementation_status || ComplianceStatus.NOT_APPLICABLE;
    this.documentation_link = data.documentation_link || '';
    this.notes = data.notes || '';
  }

  /**
   * Validate compliance requirement
   * @returns {Object} Validation result
   */
  validate() {
    const issues = [];

    if (!this.regulation) {
      issues.push('Regulation name is required');
    }

    if (!this.requirement) {
      issues.push('Requirement description is required');
    }

    if (this.implementation_status === ComplianceStatus.NON_COMPLIANT) {
      issues.push('Non-compliant requirement needs immediate attention');
    }

    return {
      valid: issues.length === 0,
      issues: issues
    };
  }
}

/**
 * Security Context class
 */
class SecurityContext {
  constructor(data = {}) {
    this.data_access_level = data.data_access_level || DataAccessLevel.READ_ONLY;
    this.authentication_required = data.authentication_required || true;
    this.rate_limiting = new RateLimiting(data.rate_limiting);
    this.audit_logging = data.audit_logging || false;
    this.educational_compliance = (data.educational_compliance || []).map(
      req => new ComplianceRequirement(req)
    );
  }

  /**
   * Assess security risk level based on context
   * @returns {string} Risk level (low, medium, high, critical)
   */
  assessRiskLevel() {
    let riskScore = 0;

    // Data access level impact
    switch (this.data_access_level) {
      case DataAccessLevel.ADMIN_LEVEL:
        riskScore += 40;
        break;
      case DataAccessLevel.FULL_ACCESS:
        riskScore += 30;
        break;
      case DataAccessLevel.LIMITED_WRITE:
        riskScore += 15;
        break;
      case DataAccessLevel.READ_ONLY:
        riskScore += 5;
        break;
    }

    // Authentication impact
    if (!this.authentication_required) {
      riskScore += 20;
    }

    // Audit logging impact
    if (!this.audit_logging) {
      riskScore += 15;
    }

    // Rate limiting impact
    if (!this.rate_limiting.enabled) {
      riskScore += 10;
    }

    // Compliance issues impact
    const nonCompliantRequirements = this.educational_compliance.filter(
      req => req.implementation_status === ComplianceStatus.NON_COMPLIANT
    );
    riskScore += nonCompliantRequirements.length * 10;

    // Determine risk level
    if (riskScore >= 60) return 'critical';
    if (riskScore >= 40) return 'high';
    if (riskScore >= 20) return 'medium';
    return 'low';
  }
}

/**
 * Error Handling configuration
 */
class ErrorHandling {
  constructor(data = {}) {
    this.structured_errors = data.structured_errors || false;
    this.fallback_strategies = data.fallback_strategies || [];
    this.security_context_preserved = data.security_context_preserved || false;
    this.educational_continuity = data.educational_continuity || false;
  }
}

/**
 * Usage Pattern class
 */
class UsagePattern {
  constructor(data = {}) {
    this.pattern_name = data.pattern_name || '';
    this.description = data.description || '';
    this.security_level = data.security_level || 'medium';
    this.educational_context = data.educational_context || '';
    this.example_code = data.example_code || '';
    this.warnings = data.warnings || [];
  }
}

/**
 * MCPTool Entity Class
 *
 * Represents MCP tools with comprehensive security context for educational use
 */
class MCPTool {
  /**
   * Create an MCPTool instance
   * @param {Object} data - MCPTool data
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name || '';
    this.server = data.server || '';
    this.description = data.description || '';
    this.capabilities = (data.capabilities || []).map(cap => new ToolCapability(cap));
    this.security_context = new SecurityContext(data.security_context);
    this.usage_patterns = (data.usage_patterns || []).map(pattern => new UsagePattern(pattern));
    this.error_handling = new ErrorHandling(data.error_handling);
    this.documentation_status = data.documentation_status || DocumentationStatus.MISSING;
  }

  /**
   * Validate MCP tool configuration and security
   * @returns {Object} Validation results
   */
  validate() {
    const issues = [];
    const warnings = [];

    // Required fields validation
    if (!this.name) issues.push('Tool name is required');
    if (!this.server) issues.push('Server name is required');
    if (!this.description) issues.push('Tool description is required');

    // Security validation
    const riskLevel = this.security_context.assessRiskLevel();
    if (riskLevel === 'critical' || riskLevel === 'high') {
      if (this.documentation_status === DocumentationStatus.MISSING) {
        issues.push('High-risk tools require comprehensive security documentation');
      }
      if (!this.security_context.audit_logging) {
        issues.push('High-risk tools require audit logging');
      }
    }

    // Educational compliance validation
    if (this.isEducationalTool()) {
      const complianceIssues = this.validateEducationalCompliance();
      issues.push(...complianceIssues);
    }

    // Capability validation
    this.capabilities.forEach((capability, index) => {
      if (!capability.name) {
        issues.push(`Capability ${index + 1} missing name`);
      }
      if (capability.risk_level === 'critical' && !capability.requires_validation) {
        warnings.push(`Critical capability "${capability.name}" should require validation`);
      }
    });

    // Usage pattern validation
    if (this.usage_patterns.length === 0 && riskLevel !== 'low') {
      warnings.push('Non-low risk tools should have documented usage patterns');
    }

    return {
      valid: issues.length === 0,
      issues: issues,
      warnings: warnings,
      risk_level: riskLevel
    };
  }

  /**
   * Check if this tool is used for educational purposes
   * @returns {boolean} True if educational tool
   */
  isEducationalTool() {
    const educationalKeywords = [
      'gestao_fronteira', 'alunos', 'frequencia', 'notas',
      'educational', 'escolar', 'municipal', 'brazilian'
    ];

    const toolText = `${this.name} ${this.description} ${this.capabilities.map(c => c.description).join(' ')}`.toLowerCase();

    return educationalKeywords.some(keyword => toolText.includes(keyword));
  }

  /**
   * Validate educational compliance requirements
   * @returns {Array} Array of compliance issues
   */
  validateEducationalCompliance() {
    const issues = [];

    // LGPD compliance for data processing tools
    if (this.security_context.data_access_level !== DataAccessLevel.READ_ONLY) {
      const lgpdCompliance = this.security_context.educational_compliance.find(
        req => req.regulation === 'LGPD'
      );

      if (!lgpdCompliance) {
        issues.push('Data processing tools require LGPD compliance documentation');
      } else if (lgpdCompliance.implementation_status !== ComplianceStatus.COMPLIANT) {
        issues.push('LGPD compliance must be fully implemented for educational data tools');
      }
    }

    // LBI compliance for accessibility tools
    if (this.name.includes('ui') || this.name.includes('accessibility')) {
      const lbiCompliance = this.security_context.educational_compliance.find(
        req => req.regulation === 'LBI'
      );

      if (!lbiCompliance) {
        issues.push('UI/accessibility tools require LBI compliance documentation');
      }
    }

    // Ministry standards for educational data tools
    if (this.isEducationalTool()) {
      const ministryCompliance = this.security_context.educational_compliance.find(
        req => req.regulation === 'educational_ministry'
      );

      if (!ministryCompliance) {
        issues.push('Educational tools require Ministry of Education standards compliance');
      }
    }

    return issues;
  }

  /**
   * Generate security documentation for the tool
   * @returns {Object} Security documentation content
   */
  generateSecurityDocumentation() {
    const riskLevel = this.security_context.assessRiskLevel();

    return {
      tool_name: this.name,
      server: this.server,
      risk_level: riskLevel,
      security_warnings: this.generateSecurityWarnings(),
      safe_usage_patterns: this.generateSafeUsagePatterns(),
      error_handling_guidance: this.generateErrorHandlingGuidance(),
      educational_context: this.generateEducationalContext(),
      compliance_notes: this.generateComplianceNotes()
    };
  }

  /**
   * Generate security warnings based on tool capabilities
   * @returns {Array} Array of security warnings
   */
  generateSecurityWarnings() {
    const warnings = [];
    const riskLevel = this.security_context.assessRiskLevel();

    if (riskLevel === 'critical' || riskLevel === 'high') {
      warnings.push(`⚠️ HIGH RISK: This tool has ${riskLevel} risk level and requires careful usage`);
    }

    if (this.security_context.data_access_level === DataAccessLevel.FULL_ACCESS) {
      warnings.push('🔑 FULL ACCESS: This tool can modify data - ensure proper authorization');
    }

    if (this.security_context.data_access_level === DataAccessLevel.ADMIN_LEVEL) {
      warnings.push('👑 ADMIN ACCESS: This tool has administrative privileges - use with extreme caution');
    }

    if (!this.security_context.audit_logging) {
      warnings.push('📝 NO AUDIT: Operations are not logged - consider enabling audit trail');
    }

    // Educational specific warnings
    if (this.isEducationalTool()) {
      warnings.push('🎓 EDUCATIONAL DATA: Ensure compliance with Brazilian educational data protection laws');

      if (this.name.includes('supabase') && this.name.includes('execute_sql')) {
        warnings.push('🚨 SQL EXECUTION: Direct database access - verify RLS policies before use');
      }

      if (this.name.includes('attendance') || this.name.includes('frequencia')) {
        warnings.push('📊 ATTENDANCE: Critical legal document - changes must be non-retroactive');
      }
    }

    return warnings;
  }

  /**
   * Generate safe usage patterns documentation
   * @returns {Array} Array of safe usage patterns
   */
  generateSafeUsagePatterns() {
    const patterns = [];

    // Database tools
    if (this.server === 'supabase') {
      patterns.push({
        pattern: 'Read-Only Operations',
        description: 'Use list_tables and read operations for data exploration',
        example: 'mcp__supabase__list_tables - Safe database schema inspection',
        safety_level: 'safe'
      });

      if (this.name.includes('execute_sql')) {
        patterns.push({
          pattern: 'Validated SQL Execution',
          description: 'Always validate SQL queries before execution, especially with educational data',
          example: 'Verify RLS policies are active before running SELECT queries',
          safety_level: 'requires_validation'
        });
      }
    }

    // Browser automation tools
    if (this.server === 'playwright') {
      patterns.push({
        pattern: 'Sandboxed Testing',
        description: 'Use browser automation in isolated testing environments',
        example: 'Run UI tests against local development instances, not production',
        safety_level: 'safe'
      });

      patterns.push({
        pattern: 'Educational UI Testing',
        description: 'Test educational workflows with anonymized data',
        example: 'Test attendance marking with test student data only',
        safety_level: 'educational_safe'
      });
    }

    // UI component tools
    if (this.server === 'shadcn-ui') {
      patterns.push({
        pattern: 'Component Documentation',
        description: 'Use for component discovery and documentation only',
        example: 'Retrieve component examples for educational UI development',
        safety_level: 'safe'
      });
    }

    return patterns;
  }

  /**
   * Generate error handling guidance
   * @returns {Object} Error handling documentation
   */
  generateErrorHandlingGuidance() {
    return {
      common_errors: this.getCommonErrors(),
      fallback_strategies: this.error_handling.fallback_strategies,
      recovery_procedures: this.getRecoveryProcedures(),
      educational_continuity: this.getEducationalContinuityPlan()
    };
  }

  /**
   * Get common errors for this tool type
   * @returns {Array} Array of common error scenarios
   */
  getCommonErrors() {
    const errors = [];

    if (this.server === 'supabase') {
      errors.push({
        error: 'Connection timeout',
        cause: 'Network issues or server overload',
        solution: 'Implement retry logic with exponential backoff'
      });

      errors.push({
        error: 'RLS policy violation',
        cause: 'Attempting to access data outside school scope',
        solution: 'Verify user school context and RLS policy configuration'
      });
    }

    if (this.server === 'playwright') {
      errors.push({
        error: 'Page load timeout',
        cause: 'Slow network or page performance issues',
        solution: 'Increase timeout values for educational network conditions'
      });
    }

    return errors;
  }

  /**
   * Get recovery procedures for tool failures
   * @returns {Array} Array of recovery procedures
   */
  getRecoveryProcedures() {
    const procedures = [];

    if (this.isEducationalTool()) {
      procedures.push({
        scenario: 'Database connection failure during attendance marking',
        procedure: 'Switch to offline mode, cache entries locally, sync when connection restored',
        priority: 'critical'
      });

      procedures.push({
        scenario: 'UI component loading failure',
        procedure: 'Fall back to basic HTML forms, maintain functionality',
        priority: 'medium'
      });
    }

    return procedures;
  }

  /**
   * Get educational continuity plan
   * @returns {Object} Educational continuity planning
   */
  getEducationalContinuityPlan() {
    if (!this.isEducationalTool()) {
      return null;
    }

    return {
      attendance_backup: 'Paper-based backup for critical attendance periods',
      data_sync: 'Automatic synchronization when systems recover',
      notification: 'Alert administrators of system degradation',
      manual_override: 'Manual data entry capabilities for critical operations'
    };
  }

  /**
   * Generate educational context documentation
   * @returns {Object} Educational context information
   */
  generateEducationalContext() {
    if (!this.isEducationalTool()) {
      return null;
    }

    return {
      brazilian_compliance: this.getBrazilianComplianceNotes(),
      municipal_integration: this.getMunicipalIntegrationNotes(),
      user_roles: this.getSupportedUserRoles(),
      workflow_integration: this.getWorkflowIntegration()
    };
  }

  /**
   * Get Brazilian compliance notes
   * @returns {Object} Compliance information
   */
  getBrazilianComplianceNotes() {
    return {
      lgpd: 'Brazilian Data Protection Law compliance required for student data',
      lbi: 'Brazilian Inclusion Law compliance for accessibility features',
      ministry: 'Ministry of Education standards for educational data management',
      municipal: 'Municipal education policies for Fronteira'
    };
  }

  /**
   * Get supported user roles for educational context
   * @returns {Array} Array of supported educational roles
   */
  getSupportedUserRoles() {
    return [
      { role: 'admin', access_level: 'full', restrictions: 'multi-school oversight' },
      { role: 'diretor', access_level: 'school', restrictions: 'single school only' },
      { role: 'secretario', access_level: 'administrative', restrictions: 'student records only' },
      { role: 'professor', access_level: 'class', restrictions: 'assigned classes only' },
      { role: 'responsavel', access_level: 'child', restrictions: 'own children only' }
    ];
  }

  /**
   * Get workflow integration information
   * @returns {Object} Workflow integration details
   */
  getWorkflowIntegration() {
    return {
      attendance_workflow: 'Integration with "Abrir aula" attendance marking process',
      grading_workflow: 'Integration with quarterly grading system',
      reporting_workflow: 'Integration with municipal reporting requirements',
      communication_workflow: 'Integration with parent communication systems'
    };
  }

  /**
   * Generate compliance notes
   * @returns {Array} Array of compliance notes
   */
  generateComplianceNotes() {
    const notes = [];

    this.security_context.educational_compliance.forEach(requirement => {
      notes.push({
        regulation: requirement.regulation,
        status: requirement.implementation_status,
        requirement: requirement.requirement,
        notes: requirement.notes
      });
    });

    return notes;
  }

  /**
   * Create predefined MCP tools for educational system
   * @returns {Object} Object with predefined MCP tools
   */
  static createEducationalMCPTools() {
    return {
      supabaseListTables: new MCPTool({
        name: 'mcp__supabase__list_tables',
        server: 'supabase',
        description: 'List all tables in database schemas for educational data exploration',
        capabilities: [
          new ToolCapability({
            name: 'schema_inspection',
            description: 'Inspect database schema structure',
            risk_level: 'low',
            educational_use_cases: ['Database exploration', 'Schema documentation']
          })
        ],
        security_context: new SecurityContext({
          data_access_level: DataAccessLevel.READ_ONLY,
          authentication_required: true,
          audit_logging: true,
          educational_compliance: [
            new ComplianceRequirement({
              regulation: 'LGPD',
              requirement: 'Data minimization for schema inspection',
              implementation_status: ComplianceStatus.COMPLIANT
            })
          ]
        }),
        documentation_status: DocumentationStatus.COMPLETE
      }),

      supabaseExecuteSQL: new MCPTool({
        name: 'mcp__supabase__execute_sql',
        server: 'supabase',
        description: 'Execute SQL queries against educational database',
        capabilities: [
          new ToolCapability({
            name: 'sql_execution',
            description: 'Execute arbitrary SQL queries',
            risk_level: 'critical',
            requires_validation: true,
            educational_use_cases: ['Data analysis', 'Report generation', 'Database maintenance']
          })
        ],
        security_context: new SecurityContext({
          data_access_level: DataAccessLevel.FULL_ACCESS,
          authentication_required: true,
          audit_logging: true,
          rate_limiting: new RateLimiting({
            enabled: true,
            requests_per_minute: 30,
            burst_limit: 5
          }),
          educational_compliance: [
            new ComplianceRequirement({
              regulation: 'LGPD',
              requirement: 'Ensure RLS policies prevent unauthorized data access',
              implementation_status: ComplianceStatus.COMPLIANT
            }),
            new ComplianceRequirement({
              regulation: 'educational_ministry',
              requirement: 'Maintain attendance record immutability',
              implementation_status: ComplianceStatus.COMPLIANT
            })
          ]
        }),
        documentation_status: DocumentationStatus.NEEDS_UPDATE
      }),

      playwrightBrowserClick: new MCPTool({
        name: 'mcp__playwright__browser_click',
        server: 'playwright',
        description: 'Perform click actions in browser automation for educational UI testing',
        capabilities: [
          new ToolCapability({
            name: 'ui_interaction',
            description: 'Simulate user clicks on UI elements',
            risk_level: 'medium',
            educational_use_cases: ['Attendance UI testing', 'Form submission testing']
          })
        ],
        security_context: new SecurityContext({
          data_access_level: DataAccessLevel.LIMITED_WRITE,
          authentication_required: true,
          audit_logging: true,
          educational_compliance: [
            new ComplianceRequirement({
              regulation: 'LBI',
              requirement: 'Test accessibility compliance',
              implementation_status: ComplianceStatus.PARTIAL
            })
          ]
        }),
        documentation_status: DocumentationStatus.PARTIAL
      })
    };
  }
}

module.exports = {
  MCPTool,
  ToolCapability,
  SecurityContext,
  RateLimiting,
  ComplianceRequirement,
  ErrorHandling,
  UsagePattern,
  DataAccessLevel,
  ComplianceStatus,
  DocumentationStatus
};