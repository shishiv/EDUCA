/**
 * T012 [P] PermissionGroup entity model
 *
 * Logical grouping of related permissions for management and auditing
 * Based on data-model-security.md specification
 */

const { v4: uuidv4 } = require('uuid');
const { Permission, PermissionCategory, RiskLevel } = require('./Permission');

/**
 * Audit Status enumeration
 */
const AuditStatus = {
  COMPLIANT: 'compliant',
  NEEDS_ATTENTION: 'needs_attention',
  NON_COMPLIANT: 'non_compliant',
  PENDING_REVIEW: 'pending_review'
};

/**
 * Risk Assessment interface
 */
class RiskAssessment {
  constructor(data = {}) {
    this.overall_risk = data.overall_risk || RiskLevel.LOW;
    this.risk_factors = data.risk_factors || [];
    this.mitigation_strategies = data.mitigation_strategies || [];
    this.compliance_notes = data.compliance_notes || '';
  }

  /**
   * Calculate overall risk based on individual permission risks
   * @param {Array} permissions - Array of Permission objects
   * @returns {string} Overall risk level
   */
  calculateOverallRisk(permissions) {
    if (!permissions || permissions.length === 0) {
      return RiskLevel.LOW;
    }

    const riskCounts = {
      [RiskLevel.CRITICAL]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.LOW]: 0
    };

    permissions.forEach(permission => {
      riskCounts[permission.risk_level]++;
    });

    // Determine overall risk based on highest risk permissions
    if (riskCounts[RiskLevel.CRITICAL] > 0) {
      this.overall_risk = RiskLevel.CRITICAL;
      this.risk_factors.push(`${riskCounts[RiskLevel.CRITICAL]} critical risk permissions`);
    } else if (riskCounts[RiskLevel.HIGH] > 2) {
      this.overall_risk = RiskLevel.HIGH;
      this.risk_factors.push(`${riskCounts[RiskLevel.HIGH]} high risk permissions`);
    } else if (riskCounts[RiskLevel.HIGH] > 0 || riskCounts[RiskLevel.MEDIUM] > 5) {
      this.overall_risk = RiskLevel.MEDIUM;
      this.risk_factors.push('Multiple medium-high risk permissions');
    } else {
      this.overall_risk = RiskLevel.LOW;
    }

    return this.overall_risk;
  }

  /**
   * Generate mitigation strategies based on risk factors
   */
  generateMitigationStrategies() {
    this.mitigation_strategies = [];

    if (this.overall_risk === RiskLevel.CRITICAL) {
      this.mitigation_strategies.push('Implement additional authentication for critical operations');
      this.mitigation_strategies.push('Enable comprehensive audit logging');
      this.mitigation_strategies.push('Require approval workflow for critical permissions');
    }

    if (this.overall_risk === RiskLevel.HIGH || this.overall_risk === RiskLevel.CRITICAL) {
      this.mitigation_strategies.push('Regular security reviews and permission audits');
      this.mitigation_strategies.push('Implement principle of least privilege');
      this.mitigation_strategies.push('Monitor usage patterns for anomaly detection');
    }

    if (this.risk_factors.some(factor => factor.includes('educational'))) {
      this.mitigation_strategies.push('Ensure Brazilian educational compliance validation');
      this.mitigation_strategies.push('Implement multi-school data isolation checks');
    }
  }
}

/**
 * PermissionGroup Entity Class
 *
 * Manages logical groupings of permissions for security and compliance management
 */
class PermissionGroup {
  /**
   * Create a PermissionGroup instance
   * @param {Object} data - PermissionGroup data
   * @param {string} data.name - Group name
   * @param {string} data.description - Group description
   * @param {string} data.category - Permission category
   * @param {Array} data.permissions - Array of Permission objects
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name || '';
    this.description = data.description || '';
    this.category = data.category || PermissionCategory.READ_ONLY;
    this.permissions = data.permissions || [];
    this.total_count = 0;
    this.duplicate_count = 0;
    this.risk_assessment = new RiskAssessment(data.risk_assessment);
    this.last_audit_date = data.last_audit_date || null;
    this.audit_status = data.audit_status || AuditStatus.PENDING_REVIEW;
  }

  /**
   * Add permission to the group
   * @param {Permission} permission - Permission to add
   */
  addPermission(permission) {
    if (!(permission instanceof Permission)) {
      throw new Error('Only Permission instances can be added to PermissionGroup');
    }

    this.permissions.push(permission);
    this.updateCounts();
    this.updateRiskAssessment();
  }

  /**
   * Remove permission from the group
   * @param {string} permissionId - ID of permission to remove
   * @returns {boolean} True if permission was removed
   */
  removePermission(permissionId) {
    const initialLength = this.permissions.length;
    this.permissions = this.permissions.filter(p => p.id !== permissionId);

    if (this.permissions.length < initialLength) {
      this.updateCounts();
      this.updateRiskAssessment();
      return true;
    }
    return false;
  }

  /**
   * Update permission counts and duplicate detection
   */
  updateCounts() {
    this.total_count = this.permissions.length;
    this.duplicate_count = this.findDuplicates().length;
  }

  /**
   * Find duplicate permissions within the group
   * @returns {Array} Array of duplicate permission resources
   */
  findDuplicates() {
    const resourceCounts = {};
    const duplicates = [];

    this.permissions.forEach(permission => {
      const key = `${permission.type}:${permission.resource}`;
      if (resourceCounts[key]) {
        resourceCounts[key]++;
        if (resourceCounts[key] === 2) {
          duplicates.push(permission.resource);
        }
      } else {
        resourceCounts[key] = 1;
      }
    });

    return duplicates;
  }

  /**
   * Update risk assessment based on current permissions
   */
  updateRiskAssessment() {
    this.risk_assessment.calculateOverallRisk(this.permissions);
    this.risk_assessment.generateMitigationStrategies();

    // Add educational compliance notes
    const educationalPermissions = this.permissions.filter(p =>
      p.resource.includes('gestao_fronteira') ||
      p.resource.includes('alunos') ||
      p.resource.includes('frequencia')
    );

    if (educationalPermissions.length > 0) {
      this.risk_assessment.compliance_notes += 'Brazilian educational data protection compliance required. ';
    }

    // Add database access notes
    const databasePermissions = this.permissions.filter(p =>
      p.category === PermissionCategory.DATABASE
    );

    if (databasePermissions.length > 0) {
      this.risk_assessment.compliance_notes += 'Database operations require LGPD compliance validation. ';
    }
  }

  /**
   * Perform security audit of the permission group
   * @returns {Object} Audit results
   */
  performSecurityAudit() {
    const auditResults = {
      group_id: this.id,
      group_name: this.name,
      audit_date: new Date(),
      permissions_audited: this.total_count,
      issues_found: [],
      compliance_status: {},
      recommendations: [],
      overall_score: 0
    };

    // Validate each permission
    this.permissions.forEach(permission => {
      const validation = permission.validate();
      if (!validation.valid) {
        auditResults.issues_found.push({
          permission_id: permission.id,
          resource: permission.resource,
          issues: validation.issues
        });
      }
    });

    // Check for duplicates
    const duplicates = this.findDuplicates();
    if (duplicates.length > 0) {
      auditResults.issues_found.push({
        type: 'duplicates',
        count: duplicates.length,
        resources: duplicates
      });
    }

    // Educational compliance audit
    auditResults.compliance_status = this.auditEducationalCompliance();

    // Generate recommendations
    auditResults.recommendations = this.generateSecurityRecommendations();

    // Calculate overall score
    auditResults.overall_score = this.calculateGroupSecurityScore();

    // Update audit status
    this.last_audit_date = auditResults.audit_date;
    this.audit_status = this.determineAuditStatus(auditResults);

    return auditResults;
  }

  /**
   * Audit educational compliance for the permission group
   * @returns {Object} Educational compliance status
   */
  auditEducationalCompliance() {
    const compliance = {
      lgpd_compliant: true,
      lbi_compliant: true,
      ministry_standards: true,
      municipal_policies: true,
      multi_school_isolation: true,
      attendance_security: true,
      issues: []
    };

    this.permissions.forEach(permission => {
      const educationalIssues = permission.validateEducationalCompliance();

      if (educationalIssues.length > 0) {
        compliance.issues.push({
          permission_id: permission.id,
          resource: permission.resource,
          educational_issues: educationalIssues
        });

        // Mark specific compliance areas as non-compliant
        if (educationalIssues.some(issue => issue.includes('LGPD'))) {
          compliance.lgpd_compliant = false;
        }
        if (educationalIssues.some(issue => issue.includes('isolation'))) {
          compliance.multi_school_isolation = false;
        }
        if (educationalIssues.some(issue => issue.includes('frequencia'))) {
          compliance.attendance_security = false;
        }
      }
    });

    return compliance;
  }

  /**
   * Generate security recommendations for the group
   * @returns {Array} Array of security recommendations
   */
  generateSecurityRecommendations() {
    const recommendations = [];

    // Duplicate recommendations
    if (this.duplicate_count > 0) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        description: `Remove ${this.duplicate_count} duplicate permissions to reduce attack surface`,
        action: 'deduplicate_permissions'
      });
    }

    // Risk level recommendations
    if (this.risk_assessment.overall_risk === RiskLevel.CRITICAL) {
      recommendations.push({
        priority: 'critical',
        category: 'security',
        description: 'Critical risk permissions require immediate review and additional controls',
        action: 'implement_additional_controls'
      });
    }

    // Educational compliance recommendations
    const educationalPermissions = this.permissions.filter(p =>
      p.resource.includes('alunos') || p.resource.includes('frequencia')
    );

    if (educationalPermissions.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'compliance',
        description: 'Educational data access requires Brazilian compliance validation',
        action: 'validate_educational_compliance'
      });
    }

    // Overly broad permissions
    const broadPermissions = this.permissions.filter(p =>
      p.validation_status === 'overly_broad'
    );

    if (broadPermissions.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'security',
        description: `Scope down ${broadPermissions.length} overly broad permissions`,
        action: 'scope_reduction'
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall security score for the group (0-100)
   * @returns {number} Security score
   */
  calculateGroupSecurityScore() {
    if (this.permissions.length === 0) {
      return 100;
    }

    let totalScore = 0;
    this.permissions.forEach(permission => {
      totalScore += permission.calculateSecurityScore();
    });

    let groupScore = totalScore / this.permissions.length;

    // Deduct points for group-level issues
    if (this.duplicate_count > 0) {
      groupScore -= (this.duplicate_count / this.total_count) * 20;
    }

    if (this.risk_assessment.overall_risk === RiskLevel.CRITICAL) {
      groupScore -= 20;
    } else if (this.risk_assessment.overall_risk === RiskLevel.HIGH) {
      groupScore -= 10;
    }

    return Math.max(0, Math.round(groupScore));
  }

  /**
   * Determine audit status based on audit results
   * @param {Object} auditResults - Results from security audit
   * @returns {string} Audit status
   */
  determineAuditStatus(auditResults) {
    const criticalIssues = auditResults.issues_found.filter(issue =>
      issue.issues && issue.issues.some(i => i.includes('CRITICAL'))
    );

    if (criticalIssues.length > 0 || auditResults.overall_score < 60) {
      return AuditStatus.NON_COMPLIANT;
    }

    if (auditResults.issues_found.length > 0 || auditResults.overall_score < 80) {
      return AuditStatus.NEEDS_ATTENTION;
    }

    return AuditStatus.COMPLIANT;
  }

  /**
   * Export group data for backup or migration
   * @returns {Object} Serializable group data
   */
  export() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      permissions: this.permissions.map(p => ({
        id: p.id,
        type: p.type,
        resource: p.resource,
        scope: p.scope,
        rationale: p.rationale,
        category: p.category,
        risk_level: p.risk_level,
        created_date: p.created_date,
        last_validated: p.last_validated,
        validation_status: p.validation_status
      })),
      total_count: this.total_count,
      duplicate_count: this.duplicate_count,
      risk_assessment: {
        overall_risk: this.risk_assessment.overall_risk,
        risk_factors: this.risk_assessment.risk_factors,
        mitigation_strategies: this.risk_assessment.mitigation_strategies,
        compliance_notes: this.risk_assessment.compliance_notes
      },
      last_audit_date: this.last_audit_date,
      audit_status: this.audit_status
    };
  }

  /**
   * Import group data from backup or migration
   * @param {Object} data - Serialized group data
   * @returns {PermissionGroup} New PermissionGroup instance
   */
  static import(data) {
    const group = new PermissionGroup(data);

    // Recreate Permission objects
    group.permissions = data.permissions.map(permData => new Permission(permData));

    group.updateCounts();
    group.updateRiskAssessment();

    return group;
  }

  /**
   * Create predefined permission groups for educational system
   * @returns {Object} Object with predefined groups
   */
  static createEducationalGroups() {
    return {
      readOnly: new PermissionGroup({
        name: 'Read-Only Permissions',
        description: 'Safe read-only file and directory access permissions',
        category: PermissionCategory.READ_ONLY
      }),

      database: new PermissionGroup({
        name: 'Database Operations',
        description: 'Supabase database access and modification permissions',
        category: PermissionCategory.DATABASE
      }),

      browser: new PermissionGroup({
        name: 'Browser Automation',
        description: 'Playwright browser automation and testing permissions',
        category: PermissionCategory.BROWSER
      }),

      gitOperations: new PermissionGroup({
        name: 'Git Operations',
        description: 'Git version control and repository management permissions',
        category: PermissionCategory.GIT_OPERATIONS
      }),

      educational: new PermissionGroup({
        name: 'Educational System Access',
        description: 'Permissions specific to Brazilian educational system operations',
        category: PermissionCategory.READ_ONLY
      })
    };
  }
}

module.exports = {
  PermissionGroup,
  RiskAssessment,
  AuditStatus
};