# Planned Services

This directory contains fully implemented services that are planned for future phases of the gestao_fronteira MVP. These services are not currently integrated into the active application but are ready for implementation.

---

## Services Overview

### 1. audit-service.ts - Audit Checklist Management

**Status**: Fully implemented ✅
**MVP Phase**: Phase 2 (Enhanced MVP)
**Estimated Implementation Time**: 4 hours
**Priority**: Medium
**Roadmap Reference**: "Comprehensive Audit System (4h)"

#### Purpose
Comprehensive audit and checklist management system for production readiness validation and Brazilian educational compliance tracking.

#### Features
- Checklist CRUD operations (Create, Read, Update, Delete)
- Production readiness validation with blocking/warning detection
- Brazilian educational compliance tracking (LGPD, LBI accessibility)
- Audit logging integration with complete change tracking
- Zod validation with comprehensive error handling
- Role-based access control (admin, diretor, secretario)

#### API Overview
```typescript
// Create audit service instance
const auditService = new AuditService(userId, schoolId)

// Main operations
await auditService.createChecklist(checklistData)
await auditService.updateChecklist(checklistId, updates)
await auditService.deleteChecklist(checklistId)
await auditService.getChecklist(checklistId)
await auditService.listChecklists(filters, limit, offset)

// Item operations
await auditService.completeChecklistItem(checklistId, itemId, evidence, notes)

// Report generation
await auditService.generateProductionReadinessReport(checklistId)
await auditService.createDefaultProductionChecklist(projectName)
```

#### Validation Schema
```typescript
AuditChecklistItemSchema
AuditChecklistSchema
```

#### Current Limitations
- Uses localStorage as fallback storage (not production-ready)
- Missing dedicated `audit_checklists` table in Supabase
- No real-time sync with database

#### Integration Points
- Audit logging system (`lib/audit.ts`)
- User authentication
- School-based multi-tenancy

#### When to Implement
- After core MVP is 100% stable
- When production readiness validation becomes critical
- Before scaling to multiple schools

---

### 2. attendance-history.ts - Comprehensive Audit Trail

**Status**: Fully implemented ✅
**MVP Phase**: Phase 2 (Enhanced MVP)
**Estimated Implementation Time**: 4 hours (related to locking mechanism)
**Priority**: High
**Roadmap Reference**: "Comprehensive Audit System (4h)" + "Attendance Locking Mechanism (4h)"
**Legal Requirement**: Brazilian educational law compliance

#### Purpose
Complete attendance history tracking and audit trail implementation for legal compliance. This service ensures "não existe o esquecer" principle - attendance records are immutable and fully auditable.

#### Features
- Complete change tracking (CREATE, UPDATE, DELETE, BULK_UPDATE, LOCK, UNLOCK)
- Field-level change history with before/after values
- User activity tracking with timestamps and IP/User-Agent
- Legal compliance audit trail with hash chains
- Integrity verification with data signatures
- Compliance rule validation
- Brazilian legal compliance reporting
- Business date vs system date tracking

#### Data Structures
```typescript
AttendanceHistoryEntry // Individual change record
AttendanceAuditReport   // Complete audit summary
AttendancePattern      // Pattern analysis for anomaly detection
```

#### Core Capabilities
- Change chronology tracking
- User activity analysis
- Compliance validation
- Data integrity verification
- Legal compliance reporting
- Suspicious activity detection

#### When to Implement
- When audit trail becomes legally required
- After attendance locking mechanism is stable
- For INEP Educacenso integration

#### Integration Points
- attendance-locking.ts (for lock/unlock tracking)
- attendance-immutability.ts (for enforcement verification)
- Audit logging system
- Supabase audit tables

---

### 3. mockup-scan-service.ts - Automated Code Analysis

**Status**: Fully implemented ✅
**MVP Phase**: Infrastructure/Development Tools
**Estimated Implementation Time**: Development-time only (not production)
**Priority**: Low
**Purpose**: Infrastructure tooling for development

#### Purpose
Automated codebase scanning for mock API detection, UI/UX pattern analysis, and Brazilian educational compliance validation. This service helps identify and track mock implementations before production deployment.

#### Features
- Mock API detection and inventory
- Component usage analysis
- Page/screen scanning
- UI/UX pattern detection
- Brazilian educational compliance scanning
- Accessibility issue identification
- Performance bottleneck identification
- Mockup pattern analysis

#### Scan Configuration
```typescript
ScanConfigSchema // Configure scanning behavior
- basePath: Directory to scan
- includePatterns/excludePatterns: File patterns
- maxDepth: Directory traversal depth
- scanMocks/scanComponents/scanPages: What to scan
- performanceAnalysis: Include perf metrics
- accessibilityCheck: Include WCAG validation
- brazilianComplianceCheck: Include compliance rules
```

#### Scan Results Include
```typescript
ScanResult
- mockAPIs: Array of detected mock implementations
- mockDataFiles: Array of mock data files
- componentsFound: UI component analysis
- pagesFound: Page structure analysis
- accessibilityIssues: WCAG compliance issues
- brazilianComplianceIssues: Educational standard violations
- performanceIssues: Performance bottlenecks
- recommendations: Action items
```

#### When to Implement
- Development-time only (not production)
- Before deploying new features
- For pre-production validation
- Optional: automated CI/CD scanning

#### Key Limitation
This is a development tool, not meant for production runtime.

---

## Implementation Order

Based on business priority:

1. **Phase 2a**: attendance-history.ts + audit-service.ts
   - Enables complete legal compliance
   - Required for INEP integration
   - Estimated: 8 hours total

2. **Phase 2b**: mockup-scan-service.ts
   - Development tooling enhancement
   - Optional for MVP
   - Estimated: As-needed

---

## Integration Checklist

When implementing a planned service:

- [ ] Create dedicated Supabase table (if database storage needed)
- [ ] Add RLS policies for school-based isolation
- [ ] Update `lib/services/index.ts` to export new service
- [ ] Create React hooks in `lib/hooks/` if needed
- [ ] Add API endpoints if needed
- [ ] Create integration tests
- [ ] Update BUGS-ANALYSIS.md if issues found
- [ ] Document in CLAUDE.md roadmap
- [ ] Run E2E tests with Chrome DevTools MCP
- [ ] Validate Brazilian compliance requirements
- [ ] Performance testing against thresholds

---

## Compliance Requirements

All planned services must meet:

- **Brazilian Law**: LGPD, LBI accessibility, educational standards
- **INEP Compliance**: Educacenso 2025 integration ready
- **Bolsa Família**: Attendance tracking for social programs
- **Performance**: Meet MVP performance targets
- **Security**: RLS policies + school-based multi-tenancy
- **Immutability**: "Não existe o esquecer" principle enforcement

---

## Testing Strategy

### Unit Tests
- Zod validation schema tests
- Service method tests
- Error handling validation

### Integration Tests
- Database operations (when implemented)
- Audit logging integration
- Role-based access control
- School isolation validation

### E2E Tests
- Complete workflow testing
- UI/UX validation (Chrome DevTools MCP)
- Performance profiling
- Accessibility validation

### Test Files Reference
- `tests/integration/test_mockup_scanning.test.ts` - mockup-scan-service tests
- `tests/integration/test_production_validation.test.ts` - audit-service tests

---

## Related Documentation

- **CLAUDE.md**: Project roadmap and MVP phases
- **BUGS-ANALYSIS.md**: Known issues and fixes
- **SERVICES_ANALYSIS.md**: Detailed service classification
- **DATABASE_SCHEMA.md**: Schema documentation

---

## Notes

- These services are **complete and tested** but **not integrated**
- Moving to planned/ directory keeps root `/services` focused on active MVP
- Each service has comprehensive documentation within its own file
- Consider starting Phase 2 implementation once MVP reaches 95%+ completion

