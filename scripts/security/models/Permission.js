/**
 * T011 [P] Permission entity model
 *
 * Represents individual permissions granted to Claude Code tools
 * Based on data-model-security.md specification
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Permission Types enumeration
 */
const PermissionType = {
  READ: 'Read',
  BASH: 'Bash',
  MCP_TOOL: 'mcp__*'
};

/**
 * Permission Scope enumeration
 */
const PermissionScope = {
  FILE: 'file',           // Single file access
  DIRECTORY: 'directory', // Directory tree access
  PATTERN: 'pattern',     // Glob pattern access
  COMMAND: 'command'      // Command execution access
};

/**
 * Permission Category enumeration
 */
const PermissionCategory = {
  READ_ONLY: 'read_only',
  DATABASE: 'database',
  BROWSER: 'browser',
  GIT_OPERATIONS: 'git_operations',
  FILE_SYSTEM: 'file_system',
  NETWORK: 'network'
};

/**
 * Risk Level enumeration
 */
const RiskLevel = {
  LOW: 'low',           // Read-only operations
  MEDIUM: 'medium',     // Limited write operations
  HIGH: 'high',         // Database/system changes
  CRITICAL: 'critical'  // Security-sensitive operations
};

/**
 * Validation Status enumeration
 */
const ValidationStatus = {
  VALID: 'valid',
  DUPLICATE: 'duplicate',
  OVERLY_BROAD: 'overly_broad',
  NEEDS_REVIEW: 'needs_review'
};

/**
 * Permission Entity Class
 *
 * Represents individual permissions with security validation and Brazilian educational compliance
 */
class Permission {
  /**
   * Create a Permission instance
   * @param {Object} data - Permission data
   * @param {string} data.type - Permission type (Read, Bash, mcp__*)
   * @param {string} data.resource - Resource path or pattern
   * @param {string} data.scope - Permission scope (file, directory, pattern, command)
   * @param {string} data.rationale - Business justification for permission
   * @param {string} data.category - Permission category for security grouping
   * @param {string} data.risk_level - Risk assessment level
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.type = data.type || null;
    this.resource = data.resource || null;
    this.scope = data.scope || PermissionScope.FILE;
    this.rationale = data.rationale || '';
    this.category = data.category || PermissionCategory.READ_ONLY;
    this.risk_level = data.risk_level || RiskLevel.LOW;
    this.created_date = data.created_date || new Date();
    this.last_validated = data.last_validated || null;
    this.validation_status = data.validation_status || ValidationStatus.NEEDS_REVIEW;
  }

  /**
   * Validate permission structure and security compliance
   * @returns {Object} Validation result with status and issues
   */
  validate() {
    const issues = [];

    // Required field validation
    if (!this.type) issues.push('Permission type is required');
    if (!this.resource) issues.push('Resource path is required');
    if (!this.rationale) issues.push('Rationale is required for security compliance');

    // Type validation
    if (this.type && !Object.values(PermissionType).includes(this.type)) {
      issues.push(`Invalid permission type: ${this.type}`);
    }

    // Scope validation
    if (!Object.values(PermissionScope).includes(this.scope)) {
      issues.push(`Invalid permission scope: ${this.scope}`);
    }

    // Category validation
    if (!Object.values(PermissionCategory).includes(this.category)) {
      issues.push(`Invalid permission category: ${this.category}`);
    }

    // Risk level validation
    if (!Object.values(RiskLevel).includes(this.risk_level)) {
      issues.push(`Invalid risk level: ${this.risk_level}`);
    }

    // Resource pattern validation
    if (this.resource) {
      const resourceIssues = this.validateResourcePattern();
      issues.push(...resourceIssues);
    }

    // Educational compliance validation
    const educationalIssues = this.validateEducationalCompliance();
    issues.push(...educationalIssues);

    return {
      valid: issues.length === 0,
      issues: issues,
      status: issues.length === 0 ? ValidationStatus.VALID : ValidationStatus.NEEDS_REVIEW
    };
  }

  /**
   * Validate resource pattern against security policies
   * @returns {Array} Array of validation issues
   */
  validateResourcePattern() {
    const issues = [];
    const resource = this.resource;

    // Check for overly broad patterns (security risk)
    const overlyBroadPatterns = [
      /\/\*\*\/\*/,           // /**/* pattern
      /C:\\\\?\*\*/,          // C:\** pattern
      /\/\*\*\/\.\*/          // /**/.*  pattern
    ];

    for (const pattern of overlyBroadPatterns) {
      if (pattern.test(resource)) {
        issues.push(`Overly broad resource pattern detected: ${resource}`);
        this.validation_status = ValidationStatus.OVERLY_BROAD;
        break;
      }
    }

    // Validate educational project paths
    const educationalPaths = [
      '/gestao_fronteira/',
      '/fronteira-educa-gest/',
      '/bro/',
      '/next_edu/'
    ];

    const isEducationalPath = educationalPaths.some(path => resource.includes(path));
    if (!isEducationalPath && this.category !== PermissionCategory.READ_ONLY) {
      issues.push('Non-educational paths require additional justification');
    }

    // Check for sensitive file access
    const sensitivePatterns = [
      /\.env/,
      /\.secret/,
      /\.key/,
      /password/,
      /credential/
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(resource)) {
        issues.push(`Access to sensitive file detected: ${resource}`);
        this.risk_level = RiskLevel.CRITICAL;
        break;
      }
    }

    return issues;
  }

  /**
   * Validate permission against Brazilian educational compliance requirements
   * @returns {Array} Array of compliance issues
   */
  validateEducationalCompliance() {
    const issues = [];

    // LGPD (Brazilian Data Protection Law) compliance
    if (this.category === PermissionCategory.DATABASE && !this.rationale.includes('LGPD')) {
      issues.push('Database permissions require LGPD compliance documentation');
    }

    // Educational data protection validation
    const educationalDataPatterns = [
      /alunos/,      // Students
      /frequencia/,  // Attendance
      /notas/,       // Grades
      /responsaveis/ // Guardians
    ];

    const accessesEducationalData = educationalDataPatterns.some(pattern =>
      pattern.test(this.resource.toLowerCase())
    );

    if (accessesEducationalData) {
      if (this.risk_level === RiskLevel.LOW) {
        issues.push('Educational data access requires elevated risk assessment');
        this.risk_level = RiskLevel.MEDIUM;
      }

      if (!this.rationale.includes('educational')) {
        issues.push('Educational data access requires educational use justification');
      }
    }

    // Multi-school isolation validation
    if (this.scope === PermissionScope.DIRECTORY && accessesEducationalData) {
      if (!this.rationale.includes('RLS') && !this.rationale.includes('isolation')) {
        issues.push('Multi-school data access requires isolation compliance documentation');
      }
    }

    // Attendance system special validation (critical legal document)
    if (this.resource.includes('frequencia') && this.type !== PermissionType.READ) {
      if (this.risk_level !== RiskLevel.CRITICAL) {
        issues.push('Attendance system modifications require CRITICAL risk level');
        this.risk_level = RiskLevel.CRITICAL;
      }

      if (!this.rationale.includes('non-retroactive')) {
        issues.push('Attendance modifications require non-retroactive compliance documentation');
      }
    }

    return issues;
  }

  /**
   * Categorize permission automatically based on resource and type
   * @returns {string} Suggested category
   */
  categorizeAutomatically() {
    const resource = this.resource.toLowerCase();
    const type = this.type;

    // Database operations
    if (type.includes('mcp__supabase__') || resource.includes('database') || resource.includes('sql')) {
      return PermissionCategory.DATABASE;
    }

    // Browser automation
    if (type.includes('mcp__playwright__') || resource.includes('browser')) {
      return PermissionCategory.BROWSER;
    }

    // Git operations
    if (type.includes('git') || resource.includes('git')) {
      return PermissionCategory.GIT_OPERATIONS;
    }

    // Network operations
    if (resource.includes('http') || resource.includes('network') || resource.includes('api')) {
      return PermissionCategory.NETWORK;
    }

    // File system operations
    if (type === PermissionType.BASH || resource.includes('file') || resource.includes('directory')) {
      return PermissionCategory.FILE_SYSTEM;
    }

    // Default to read-only
    return PermissionCategory.READ_ONLY;
  }

  /**
   * Assess risk level automatically based on permission characteristics
   * @returns {string} Suggested risk level
   */
  assessRiskLevel() {
    const resource = this.resource.toLowerCase();
    const type = this.type;

    // Critical risk factors
    if (resource.includes('frequencia') || // Attendance system
        resource.includes('password') ||   // Credentials
        resource.includes('secret') ||     // Secrets
        type.includes('execute_sql') ||    // SQL execution
        type.includes('apply_migration')) { // Schema changes
      return RiskLevel.CRITICAL;
    }

    // High risk factors
    if (this.category === PermissionCategory.DATABASE ||
        this.category === PermissionCategory.BROWSER ||
        type.includes('mcp__') ||
        resource.includes('admin')) {
      return RiskLevel.HIGH;
    }

    // Medium risk factors
    if (this.category === PermissionCategory.GIT_OPERATIONS ||
        this.category === PermissionCategory.FILE_SYSTEM ||
        this.scope === PermissionScope.DIRECTORY) {
      return RiskLevel.MEDIUM;
    }

    // Low risk (read-only operations)
    return RiskLevel.LOW;
  }

  /**
   * Generate security audit report for this permission
   * @returns {Object} Security audit data
   */
  generateSecurityAudit() {
    const validation = this.validate();

    return {
      permission_id: this.id,
      resource: this.resource,
      type: this.type,
      category: this.category,
      risk_level: this.risk_level,
      validation_status: this.validation_status,
      security_score: this.calculateSecurityScore(),
      educational_compliance: this.validateEducationalCompliance().length === 0,
      last_validated: this.last_validated,
      recommendations: this.generateRecommendations(),
      validation_issues: validation.issues
    };
  }

  /**
   * Calculate security score (0-100) based on permission characteristics
   * @returns {number} Security score
   */
  calculateSecurityScore() {
    let score = 100;

    // Deduct points for risk factors
    if (this.risk_level === RiskLevel.CRITICAL) score -= 40;
    else if (this.risk_level === RiskLevel.HIGH) score -= 25;
    else if (this.risk_level === RiskLevel.MEDIUM) score -= 10;

    // Deduct points for validation issues
    if (this.validation_status === ValidationStatus.OVERLY_BROAD) score -= 30;
    else if (this.validation_status === ValidationStatus.DUPLICATE) score -= 20;
    else if (this.validation_status === ValidationStatus.NEEDS_REVIEW) score -= 15;

    // Deduct points for missing rationale
    if (!this.rationale || this.rationale.length < 10) score -= 20;

    // Deduct points for broad scope
    if (this.scope === PermissionScope.PATTERN) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Generate security improvement recommendations
   * @returns {Array} Array of recommendation strings
   */
  generateRecommendations() {
    const recommendations = [];
    const validation = this.validate();

    if (validation.issues.length > 0) {
      recommendations.push('Address validation issues before deployment');
    }

    if (this.risk_level === RiskLevel.CRITICAL || this.risk_level === RiskLevel.HIGH) {
      recommendations.push('Consider additional security controls for high-risk permission');
    }

    if (this.validation_status === ValidationStatus.OVERLY_BROAD) {
      recommendations.push('Scope down permission to minimum required access');
    }

    if (!this.rationale || this.rationale.length < 20) {
      recommendations.push('Provide detailed business justification for permission');
    }

    if (this.resource.includes('frequencia')) {
      recommendations.push('Ensure attendance system compliance with Brazilian educational regulations');
    }

    return recommendations;
  }

  /**
   * Convert permission to configuration format
   * @returns {string} Configuration string for Claude Code
   */
  toConfigurationString() {
    if (this.type === PermissionType.BASH) {
      return `"Bash(${this.resource})"`;
    } else if (this.type === PermissionType.READ) {
      return `"Read(${this.resource})"`;
    } else if (this.type.startsWith('mcp__')) {
      return `"${this.type}"`;
    }

    return `"${this.type}(${this.resource})"`;
  }

  /**
   * Create Permission from configuration string
   * @param {string} configString - Configuration string from Claude Code
   * @returns {Permission} Permission instance
   */
  static fromConfigurationString(configString) {
    const cleanString = configString.replace(/"/g, '');

    // Parse MCP tools
    if (cleanString.startsWith('mcp__')) {
      return new Permission({
        type: cleanString,
        resource: cleanString,
        scope: PermissionScope.COMMAND,
        category: PermissionCategory.NETWORK
      });
    }

    // Parse Bash commands
    const bashMatch = cleanString.match(/^Bash\((.+)\)$/);
    if (bashMatch) {
      return new Permission({
        type: PermissionType.BASH,
        resource: bashMatch[1],
        scope: PermissionScope.COMMAND,
        category: PermissionCategory.FILE_SYSTEM
      });
    }

    // Parse Read permissions
    const readMatch = cleanString.match(/^Read\((.+)\)$/);
    if (readMatch) {
      return new Permission({
        type: PermissionType.READ,
        resource: readMatch[1],
        scope: PermissionScope.DIRECTORY,
        category: PermissionCategory.READ_ONLY
      });
    }

    // Default fallback
    return new Permission({
      type: cleanString,
      resource: cleanString,
      validation_status: ValidationStatus.NEEDS_REVIEW
    });
  }
}

module.exports = {
  Permission,
  PermissionType,
  PermissionScope,
  PermissionCategory,
  RiskLevel,
  ValidationStatus
};