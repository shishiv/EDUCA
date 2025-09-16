/**
 * T014 [P] SecurityValidation entity model
 *
 * Tracks validation results and security compliance for all entity types
 * Based on data-model-security.md specification
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Entity Type enumeration
 */
const EntityType = {
  PERMISSION: 'permission',
  PERMISSION_GROUP: 'permission_group',
  MCP_TOOL: 'mcp_tool',
  DOCUMENTATION: 'documentation'
};

/**
 * Validation Status enumeration
 */
const ValidationStatus = {
  VALID: 'valid',
  NEEDS_ATTENTION: 'needs_attention',
  NON_COMPLIANT: 'non_compliant'
};

/**
 * Severity enumeration
 */
const Severity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Priority enumeration
 */
const Priority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Action Status enumeration
 */
const ActionStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DEFERRED: 'deferred'
};

/**
 * Validation Result class
 */
class ValidationResult {
  constructor(data = {}) {
    this.rule = data.rule || '';
    this.status = data.status || ValidationStatus.NEEDS_ATTENTION;
    this.severity = data.severity || Severity.WARNING;
    this.message = data.message || '';
    this.recommendation = data.recommendation || '';
  }

  /**
   * Check if this validation result is blocking
   * @returns {boolean} True if result blocks deployment
   */
  isBlocking() {
    return this.severity === Severity.CRITICAL ||
           (this.severity === Severity.ERROR && this.status === ValidationStatus.NON_COMPLIANT);
  }

  /**
   * Get severity score for prioritization
   * @returns {number} Numeric severity score
   */
  getSeverityScore() {
    switch (this.severity) {
      case Severity.CRITICAL: return 4;
      case Severity.ERROR: return 3;
      case Severity.WARNING: return 2;
      case Severity.INFO: return 1;
      default: return 0;
    }
  }
}

/**
 * Action Item class
 */
class ActionItem {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.description = data.description || '';
    this.priority = data.priority || Priority.MEDIUM;
    this.assigned_to = data.assigned_to || '';
    this.due_date = data.due_date || null;
    this.status = data.status || ActionStatus.OPEN;
    this.created_date = data.created_date || new Date();
    this.completed_date = data.completed_date || null;
  }

  /**
   * Mark action item as completed
   */
  markCompleted() {
    this.status = ActionStatus.COMPLETED;
    this.completed_date = new Date();
  }

  /**
   * Check if action item is overdue
   * @returns {boolean} True if past due date
   */
  isOverdue() {
    return this.due_date && new Date() > this.due_date && this.status !== ActionStatus.COMPLETED;
  }

  /**
   * Get priority score for sorting
   * @returns {number} Numeric priority score
   */
  getPriorityScore() {
    switch (this.priority) {
      case Priority.CRITICAL: return 4;
      case Priority.HIGH: return 3;
      case Priority.MEDIUM: return 2;
      case Priority.LOW: return 1;
      default: return 0;
    }
  }
}

/**
 * Educational Impact assessment
 */
class EducationalImpact {
  constructor(data = {}) {
    this.affects_student_data = data.affects_student_data || false;
    this.affects_attendance = data.affects_attendance || false;
    this.affects_compliance = data.affects_compliance || false;
    this.impact_description = data.impact_description || '';
  }

  /**
   * Calculate overall educational impact score
   * @returns {number} Impact score (0-10)
   */
  calculateImpactScore() {
    let score = 0;

    if (this.affects_student_data) score += 3;
    if (this.affects_attendance) score += 4; // Attendance is critical legal document
    if (this.affects_compliance) score += 3;

    return Math.min(score, 10);
  }

  /**
   * Check if impact requires immediate attention
   * @returns {boolean} True if immediate attention needed
   */
  requiresImmediateAttention() {
    return this.affects_attendance || (this.affects_student_data && this.affects_compliance);
  }
}

/**
 * SecurityValidation Entity Class
 *
 * Manages security validation results and compliance tracking
 */
class SecurityValidation {
  /**
   * Create a SecurityValidation instance
   * @param {Object} data - SecurityValidation data
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.entity_type = data.entity_type || EntityType.PERMISSION;
    this.entity_id = data.entity_id || '';
    this.validation_date = data.validation_date || new Date();
    this.validator = data.validator || 'system';
    this.validation_results = (data.validation_results || []).map(result => new ValidationResult(result));
    this.overall_status = data.overall_status || ValidationStatus.NEEDS_ATTENTION;
    this.action_items = (data.action_items || []).map(item => new ActionItem(item));
    this.educational_impact = new EducationalImpact(data.educational_impact);
  }

  /**
   * Add validation result
   * @param {ValidationResult} result - Validation result to add
   */
  addValidationResult(result) {
    if (!(result instanceof ValidationResult)) {
      result = new ValidationResult(result);
    }
    this.validation_results.push(result);
    this.updateOverallStatus();
  }

  /**
   * Add action item
   * @param {ActionItem} actionItem - Action item to add
   */
  addActionItem(actionItem) {
    if (!(actionItem instanceof ActionItem)) {
      actionItem = new ActionItem(actionItem);
    }
    this.action_items.push(actionItem);
  }

  /**
   * Update overall validation status based on results
   */
  updateOverallStatus() {
    if (this.validation_results.length === 0) {
      this.overall_status = ValidationStatus.NEEDS_ATTENTION;
      return;
    }

    const criticalIssues = this.validation_results.filter(r => r.severity === Severity.CRITICAL);
    const errorIssues = this.validation_results.filter(r => r.severity === Severity.ERROR);
    const nonCompliantIssues = this.validation_results.filter(r => r.status === ValidationStatus.NON_COMPLIANT);

    if (criticalIssues.length > 0 || nonCompliantIssues.length > 0) {
      this.overall_status = ValidationStatus.NON_COMPLIANT;
    } else if (errorIssues.length > 0) {
      this.overall_status = ValidationStatus.NEEDS_ATTENTION;
    } else {
      this.overall_status = ValidationStatus.VALID;
    }
  }

  /**
   * Get blocking validation results
   * @returns {Array} Array of blocking validation results
   */
  getBlockingResults() {
    return this.validation_results.filter(result => result.isBlocking());
  }

  /**
   * Get high priority action items
   * @returns {Array} Array of high priority action items
   */
  getHighPriorityActions() {
    return this.action_items.filter(item =>
      item.priority === Priority.CRITICAL || item.priority === Priority.HIGH
    );
  }

  /**
   * Get overdue action items
   * @returns {Array} Array of overdue action items
   */
  getOverdueActions() {
    return this.action_items.filter(item => item.isOverdue());
  }

  /**
   * Perform comprehensive security validation for permissions
   * @param {Object} entity - Entity to validate (Permission, PermissionGroup, MCPTool, etc.)
   * @returns {SecurityValidation} New SecurityValidation instance
   */
  static validatePermission(entity) {
    const validation = new SecurityValidation({
      entity_type: EntityType.PERMISSION,
      entity_id: entity.id,
      validator: 'permission_validator'
    });

    // Validate permission structure
    if (!entity.type) {
      validation.addValidationResult(new ValidationResult({
        rule: 'required_fields',
        status: ValidationStatus.NON_COMPLIANT,
        severity: Severity.ERROR,
        message: 'Permission type is required',
        recommendation: 'Set permission type (Read, Bash, mcp__*)'
      }));
    }

    // Validate security rationale
    if (!entity.rationale || entity.rationale.length < 10) {
      validation.addValidationResult(new ValidationResult({
        rule: 'security_rationale',
        status: ValidationStatus.NEEDS_ATTENTION,
        severity: Severity.WARNING,
        message: 'Insufficient security rationale',
        recommendation: 'Provide detailed business justification for permission'
      }));
    }

    // Validate educational compliance
    const educationalIssues = validation.validateEducationalCompliance(entity);
    educationalIssues.forEach(issue => validation.addValidationResult(issue));

    // Validate overly broad permissions
    const broadnessIssues = validation.validatePermissionScope(entity);
    broadnessIssues.forEach(issue => validation.addValidationResult(issue));

    // Generate action items based on validation results
    validation.generateActionItems();

    return validation;
  }

  /**
   * Validate educational compliance for entity
   * @param {Object} entity - Entity to validate
   * @returns {Array} Array of ValidationResult objects
   */
  validateEducationalCompliance(entity) {
    const results = [];

    // Check for educational data access without proper justification
    if (entity.resource && entity.resource.includes('alunos')) {
      this.educational_impact.affects_student_data = true;

      if (!entity.rationale.includes('educational') && !entity.rationale.includes('LGPD')) {
        results.push(new ValidationResult({
          rule: 'educational_data_protection',
          status: ValidationStatus.NON_COMPLIANT,
          severity: Severity.CRITICAL,
          message: 'Student data access requires LGPD compliance documentation',
          recommendation: 'Add LGPD compliance rationale and educational use justification'
        }));
      }
    }

    // Check attendance system access
    if (entity.resource && entity.resource.includes('frequencia')) {
      this.educational_impact.affects_attendance = true;

      if (entity.type !== 'Read' && !entity.rationale.includes('non-retroactive')) {
        results.push(new ValidationResult({
          rule: 'attendance_immutability',
          status: ValidationStatus.NON_COMPLIANT,
          severity: Severity.CRITICAL,
          message: 'Attendance modifications require non-retroactive compliance',
          recommendation: 'Document non-retroactive compliance and legal requirements'
        }));
      }
    }

    // Check multi-school isolation compliance
    if (entity.scope === 'directory' && this.educational_impact.affects_student_data) {
      if (!entity.rationale.includes('RLS') && !entity.rationale.includes('isolation')) {
        results.push(new ValidationResult({
          rule: 'multi_school_isolation',
          status: ValidationStatus.NEEDS_ATTENTION,
          severity: Severity.WARNING,
          message: 'Multi-school data access requires isolation compliance',
          recommendation: 'Document Row Level Security (RLS) compliance'
        }));
      }
    }

    return results;
  }

  /**
   * Validate permission scope for security
   * @param {Object} entity - Entity to validate
   * @returns {Array} Array of ValidationResult objects
   */
  validatePermissionScope(entity) {
    const results = [];

    if (!entity.resource) return results;

    // Check for overly broad patterns
    const overlyBroadPatterns = [
      { pattern: /\/\*\*\/\*/, message: 'Pattern /**/* grants excessive access' },
      { pattern: /C:\\\\?\*\*/, message: 'Pattern C:\\** grants root access' },
      { pattern: /\/\*\*\/\.\*/, message: 'Pattern /**/.*  accesses hidden files' }
    ];

    for (const check of overlyBroadPatterns) {
      if (check.pattern.test(entity.resource)) {
        results.push(new ValidationResult({
          rule: 'overly_broad_permissions',
          status: ValidationStatus.NON_COMPLIANT,
          severity: Severity.HIGH,
          message: check.message,
          recommendation: 'Scope down permission to minimum required access'
        }));
        break;
      }
    }

    // Check for sensitive file access
    const sensitivePatterns = [
      { pattern: /\.env/, message: 'Access to environment files detected' },
      { pattern: /\.secret/, message: 'Access to secret files detected' },
      { pattern: /password/, message: 'Access to password files detected' }
    ];

    for (const check of sensitivePatterns) {
      if (check.pattern.test(entity.resource)) {
        results.push(new ValidationResult({
          rule: 'sensitive_file_access',
          status: ValidationStatus.NON_COMPLIANT,
          severity: Severity.CRITICAL,
          message: check.message,
          recommendation: 'Remove access to sensitive files or provide strong justification'
        }));
      }
    }

    return results;
  }

  /**
   * Generate action items based on validation results
   */
  generateActionItems() {
    const criticalResults = this.validation_results.filter(r => r.severity === Severity.CRITICAL);
    const errorResults = this.validation_results.filter(r => r.severity === Severity.ERROR);

    // Critical issues get immediate action items
    criticalResults.forEach(result => {
      this.addActionItem(new ActionItem({
        description: `CRITICAL: ${result.message} - ${result.recommendation}`,
        priority: Priority.CRITICAL,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }));
    });

    // Error issues get high priority action items
    errorResults.forEach(result => {
      this.addActionItem(new ActionItem({
        description: `ERROR: ${result.message} - ${result.recommendation}`,
        priority: Priority.HIGH,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }));
    });

    // Educational impact generates specific action items
    if (this.educational_impact.requiresImmediateAttention()) {
      this.addActionItem(new ActionItem({
        description: 'Educational compliance review required for student data access',
        priority: Priority.CRITICAL,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }));
    }
  }

  /**
   * Generate security validation report
   * @returns {Object} Comprehensive validation report
   */
  generateReport() {
    const report = {
      validation_id: this.id,
      entity_type: this.entity_type,
      entity_id: this.entity_id,
      validation_date: this.validation_date,
      validator: this.validator,
      overall_status: this.overall_status,

      summary: {
        total_results: this.validation_results.length,
        critical_issues: this.validation_results.filter(r => r.severity === Severity.CRITICAL).length,
        error_issues: this.validation_results.filter(r => r.severity === Severity.ERROR).length,
        warning_issues: this.validation_results.filter(r => r.severity === Severity.WARNING).length,
        blocking_issues: this.getBlockingResults().length
      },

      educational_impact: {
        impact_score: this.educational_impact.calculateImpactScore(),
        affects_student_data: this.educational_impact.affects_student_data,
        affects_attendance: this.educational_impact.affects_attendance,
        affects_compliance: this.educational_impact.affects_compliance,
        requires_immediate_attention: this.educational_impact.requiresImmediateAttention()
      },

      action_items: {
        total_actions: this.action_items.length,
        high_priority: this.getHighPriorityActions().length,
        overdue: this.getOverdueActions().length,
        completed: this.action_items.filter(a => a.status === ActionStatus.COMPLETED).length
      },

      detailed_results: this.validation_results.map(result => ({
        rule: result.rule,
        status: result.status,
        severity: result.severity,
        message: result.message,
        recommendation: result.recommendation,
        blocking: result.isBlocking()
      })),

      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate recommendations based on validation results
   * @returns {Array} Array of prioritized recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Critical issues
    const criticalResults = this.validation_results.filter(r => r.severity === Severity.CRITICAL);
    if (criticalResults.length > 0) {
      recommendations.push({
        priority: Priority.CRITICAL,
        category: 'security',
        description: `Address ${criticalResults.length} critical security issues immediately`,
        actions: criticalResults.map(r => r.recommendation)
      });
    }

    // Educational compliance
    if (this.educational_impact.requiresImmediateAttention()) {
      recommendations.push({
        priority: Priority.CRITICAL,
        category: 'compliance',
        description: 'Educational compliance issues require immediate attention',
        actions: ['Review Brazilian educational regulations', 'Implement required safeguards']
      });
    }

    // Permission scope issues
    const scopeIssues = this.validation_results.filter(r => r.rule === 'overly_broad_permissions');
    if (scopeIssues.length > 0) {
      recommendations.push({
        priority: Priority.HIGH,
        category: 'security',
        description: 'Reduce permission scope to follow principle of least privilege',
        actions: ['Scope down overly broad permissions', 'Document specific access needs']
      });
    }

    return recommendations;
  }

  /**
   * Check if validation blocks deployment
   * @returns {boolean} True if deployment should be blocked
   */
  blocksDeployment() {
    return this.overall_status === ValidationStatus.NON_COMPLIANT ||
           this.getBlockingResults().length > 0;
  }

  /**
   * Calculate overall security score (0-100)
   * @returns {number} Security score
   */
  calculateSecurityScore() {
    if (this.validation_results.length === 0) {
      return 50; // Neutral score for unvalidated items
    }

    let score = 100;

    // Deduct points based on severity
    this.validation_results.forEach(result => {
      switch (result.severity) {
        case Severity.CRITICAL:
          score -= 25;
          break;
        case Severity.ERROR:
          score -= 15;
          break;
        case Severity.WARNING:
          score -= 5;
          break;
        case Severity.INFO:
          score -= 1;
          break;
      }
    });

    // Additional deduction for educational impact
    if (this.educational_impact.requiresImmediateAttention()) {
      score -= 20;
    }

    // Additional deduction for overdue actions
    const overdueActions = this.getOverdueActions().length;
    score -= overdueActions * 5;

    return Math.max(0, score);
  }

  /**
   * Export validation data for reporting
   * @returns {Object} Serializable validation data
   */
  export() {
    return {
      id: this.id,
      entity_type: this.entity_type,
      entity_id: this.entity_id,
      validation_date: this.validation_date,
      validator: this.validator,
      overall_status: this.overall_status,
      validation_results: this.validation_results,
      action_items: this.action_items.map(item => ({
        id: item.id,
        description: item.description,
        priority: item.priority,
        assigned_to: item.assigned_to,
        due_date: item.due_date,
        status: item.status,
        created_date: item.created_date,
        completed_date: item.completed_date
      })),
      educational_impact: {
        affects_student_data: this.educational_impact.affects_student_data,
        affects_attendance: this.educational_impact.affects_attendance,
        affects_compliance: this.educational_impact.affects_compliance,
        impact_description: this.educational_impact.impact_description
      }
    };
  }
}

module.exports = {
  SecurityValidation,
  ValidationResult,
  ActionItem,
  EducationalImpact,
  EntityType,
  ValidationStatus,
  Severity,
  Priority,
  ActionStatus
};