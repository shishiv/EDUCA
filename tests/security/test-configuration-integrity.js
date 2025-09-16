/**
 * T010 [P] Configuration integrity test
 *
 * This test MUST FAIL initially to follow TDD principles.
 * Tests integrity and validation of Claude Code configuration files.
 */

const fs = require('fs');
const path = require('path');

describe('Configuration Integrity Security Tests', () => {
  const configPath = path.join(__dirname, '../../.claude/settings.local.json');
  const claudeMdPath = path.join(__dirname, '../../CLAUDE.md');

  test('should validate configuration file structure and schema', () => {
    // This test MUST FAIL initially - no integrity validator exists yet
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const structureValidation = validator.validateStructure();

    expect(structureValidation.validJSON).toBe(true);
    expect(structureValidation.requiredSections.allow).toBe(true);
    expect(structureValidation.requiredSections.deny).toBe(true);
    expect(structureValidation.requiredSections.ask).toBe(true);
    expect(structureValidation.requiredSections.enabledMcpjsonServers).toBe(true);
  });

  test('should validate configuration integrity against known good state', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const integrityCheck = validator.validateIntegrity();

    expect(integrityCheck.configurationUnmodified).toBe(true);
    expect(integrityCheck.checksumMatches).toBe(true);
    expect(integrityCheck.noUnauthorizedChanges).toBe(true);
    expect(integrityCheck.backupIntegrityMaintained).toBe(true);
  });

  test('should detect configuration tampering or corruption', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const tamperDetection = validator.detectTampering();

    expect(tamperDetection.fileIntegrityMaintained).toBe(true);
    expect(tamperDetection.unexpectedModifications).toHaveLength(0);
    expect(tamperDetection.maliciousChanges).toHaveLength(0);
    expect(tamperDetection.signatureValid).toBe(true);
  });

  test('should validate MCP server configuration integrity', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const mcpIntegrity = validator.validateMCPServerIntegrity();

    expect(mcpIntegrity.enabledServersValid).toBe(true);
    expect(mcpIntegrity.serverConfigurationsSecure).toBe(true);
    expect(mcpIntegrity.noUnauthorizedServers).toBe(true);
    expect(mcpIntegrity.educationallyApprovedServers).toBe(true);
  });

  test('should validate permission configuration consistency', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const permissionConsistency = validator.validatePermissionConsistency();

    expect(permissionConsistency.noDuplicatePermissions).toBe(true);
    expect(permissionConsistency.validPermissionFormats).toBe(true);
    expect(permissionConsistency.noConflictingPermissions).toBe(true);
    expect(permissionConsistency.educationalPermissionsPresent).toBe(true);
  });

  test('should validate configuration backup and recovery integrity', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const backupIntegrity = validator.validateBackupIntegrity();

    expect(backupIntegrity.backupExists).toBe(true);
    expect(backupIntegrity.backupReadable).toBe(true);
    expect(backupIntegrity.backupComplete).toBe(true);
    expect(backupIntegrity.recoveryTested).toBe(true);
  });
});

/**
 * Documentation Integrity Tests
 */
describe('Documentation Integrity Validation', () => {
  test('should validate CLAUDE.md file integrity and completeness', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(claudeMdPath);
    const docIntegrity = validator.validateDocumentationIntegrity();

    expect(docIntegrity.fileExists).toBe(true);
    expect(docIntegrity.fileReadable).toBe(true);
    expect(docIntegrity.markdownValid).toBe(true);
    expect(docIntegrity.sectionsComplete).toBe(true);
    expect(docIntegrity.linksValid).toBe(true);
  });

  test('should validate cross-reference integrity between configuration and documentation', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator();
    const crossRefIntegrity = validator.validateCrossReferenceIntegrity(configPath, claudeMdPath);

    expect(crossRefIntegrity.mcpServersDocumented).toBe(true);
    expect(crossRefIntegrity.permissionsExplained).toBe(true);
    expect(crossRefIntegrity.securityContextProvided).toBe(true);
    expect(crossRefIntegrity.noOrphanedReferences).toBe(true);
  });

  test('should validate specification integrity with implementation', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const specPath = path.join(__dirname, '../../specs/003-ui-ux-improvement/');
    const validator = new ConfigurationIntegrityValidator();
    const specIntegrity = validator.validateSpecificationIntegrity(specPath);

    expect(specIntegrity.allRequiredFilesPresent).toBe(true);
    expect(specIntegrity.specificationConsistent).toBe(true);
    expect(specIntegrity.implementationAligned).toBe(true);
    expect(specIntegrity.educationalRequirementsMet).toBe(true);
  });
});

/**
 * Security Configuration Integrity Tests
 */
describe('Security Configuration Integrity Validation', () => {
  test('should validate security policy enforcement in configuration', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const securityIntegrity = validator.validateSecurityPolicyIntegrity();

    expect(securityIntegrity.leastPrivilegeEnforced).toBe(true);
    expect(securityIntegrity.defensiveSecurityMeasures).toBe(true);
    expect(securityIntegrity.educationalDataProtection).toBe(true);
    expect(securityIntegrity.auditabilityMaintained).toBe(true);
  });

  test('should validate configuration versioning and change control', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const versioningIntegrity = validator.validateVersioningIntegrity();

    expect(versioningIntegrity.versionTrackingEnabled).toBe(true);
    expect(versioningIntegrity.changeLogMaintained).toBe(true);
    expect(versioningIntegrity.approvalProcessFollowed).toBe(true);
    expect(versioningIntegrity.rollbackCapability).toBe(true);
  });

  test('should validate configuration compliance with educational standards', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const complianceIntegrity = validator.validateEducationalCompliance();

    expect(complianceIntegrity.lgpdCompliant).toBe(true);
    expect(complianceIntegrity.lbiCompliant).toBe(true);
    expect(complianceIntegrity.ministryStandardsMet).toBe(true);
    expect(complianceIntegrity.municipalPoliciesFollowed).toBe(true);
  });
});

/**
 * System Integration Integrity Tests
 */
describe('System Integration Integrity Validation', () => {
  test('should validate integration integrity with gestao_fronteira project', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator();
    const gestaoIntegrity = validator.validateGestaoFronteiraIntegration();

    expect(gestaoIntegrity.permissionsAligned).toBe(true);
    expect(gestaoIntegrity.databaseAccessSecure).toBe(true);
    expect(gestaoIntegrity.educationalWorkflowSupported).toBe(true);
    expect(gestaoIntegrity.performanceRequirementsMet).toBe(true);
  });

  test('should validate integrity of MCP tool integrations with educational system', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator();
    const mcpEducationalIntegrity = validator.validateMCPEducationalIntegration();

    expect(mcpEducationalIntegrity.supabaseEducationalSchemaSupport).toBe(true);
    expect(mcpEducationalIntegrity.playwrightEducationalTesting).toBe(true);
    expect(mcpEducationalIntegrity.shadcnEducationalComponents).toBe(true);
    expect(mcpEducationalIntegrity.dataFlowIntegrity).toBe(true);
  });

  test('should validate multi-project configuration integrity', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator();
    const multiProjectIntegrity = validator.validateMultiProjectIntegrity();

    expect(multiProjectIntegrity.broProjectSupported).toBe(true);
    expect(multiProjectIntegrity.fronteiraEducaGestSupported).toBe(true);
    expect(multiProjectIntegrity.nextEduSupported).toBe(true);
    expect(multiProjectIntegrity.crossProjectSecurityMaintained).toBe(true);
  });
});

/**
 * Performance and Reliability Integrity Tests
 */
describe('Performance and Reliability Integrity Validation', () => {
  test('should validate configuration performance integrity', async () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const startTime = Date.now();
    const validator = new ConfigurationIntegrityValidator(configPath);
    await validator.performFullIntegrityCheck();
    const endTime = Date.now();

    const checkTime = endTime - startTime;
    expect(checkTime).toBeLessThan(5000); // < 5 seconds as per performance target

    const performanceIntegrity = validator.getPerformanceMetrics();
    expect(performanceIntegrity.configurationLoadTime).toBeLessThan(1000);
    expect(performanceIntegrity.validationTime).toBeLessThan(3000);
  });

  test('should validate configuration reliability and error recovery', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const reliabilityIntegrity = validator.validateReliabilityIntegrity();

    expect(reliabilityIntegrity.errorRecoveryCapable).toBe(true);
    expect(reliabilityIntegrity.gracefulDegradation).toBe(true);
    expect(reliabilityIntegrity.failsafeConfiguration).toBe(true);
    expect(reliabilityIntegrity.educationalContinuityMaintained).toBe(true);
  });

  test('should validate configuration integrity monitoring and alerting', () => {
    const ConfigurationIntegrityValidator = require('../../scripts/security/services/ConfigurationIntegrityValidator.js');

    const validator = new ConfigurationIntegrityValidator(configPath);
    const monitoringIntegrity = validator.validateMonitoringIntegrity();

    expect(monitoringIntegrity.integrityMonitoringEnabled).toBe(true);
    expect(monitoringIntegrity.alertingConfigured).toBe(true);
    expect(monitoringIntegrity.anomalyDetectionActive).toBe(true);
    expect(monitoringIntegrity.educationalImpactAssessment).toBe(true);
  });
});