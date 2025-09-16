# Production Mockup Inventory - gestao_fronteira

**Date**: 2025-09-14
**Audit Status**: CRITICAL - Multiple production blockers identified
**Primary Project**: gestao_fronteira (80% MVP candidate)

## Executive Summary

The gestao_fronteira project has **CRITICAL production blockers** that must be resolved before deployment to SME Fronteira. The existing `PRODUCTION_CRITICAL_FIXES.md` documents significant progress, but **5 critical areas** still require immediate attention.

### Risk Assessment
- **🚨 CRITICAL**: 257-line mock-data.ts file must be completely removed
- **🚨 HIGH**: 5 pages still using mock APIs will fail in production
- **🟡 MEDIUM**: 100+ console.error statements need structured logging

## Detailed Mockup Inventory

### 1. CRITICAL: Mock Data Infrastructure

#### lib/mock-data.ts (257 lines)
- **Severity**: CRITICAL
- **Status**: Identified - needs complete removal
- **Description**: Comprehensive mock data file with fake users, reports, configurations
- **Replacement Plan**: Remove after fixing dependent pages
- **Estimated Effort**: 0.5 hours (deletion after dependencies resolved)
- **Blocker**: Yes - must not exist in production

**Mock Data Types Present**:
- MockUser[] with fake government emails
- MockReport[] with fake educational reports
- MockConfig[] with system configurations
- 30+ mock users across all 5 user roles
- Fake school data and administrative info

### 2. HIGH PRIORITY: Pages Using Mock APIs

#### a) User Management Pages
**Files**:
- `app/(dashboard)/dashboard/usuarios/page.tsx`
- `app/(dashboard)/dashboard/usuarios/novo/page.tsx`
- `app/(dashboard)/dashboard/usuarios/[id]/page.tsx`

- **Severity**: HIGH
- **Status**: Identified - needs API replacement
- **Description**: User CRUD operations using mockApi calls
- **Replacement Plan**: Connect to real usersApi with proper error handling
- **Estimated Effort**: 8 hours
- **Blocker**: Yes - will fail in production

#### b) Reports System
**File**: `app/(dashboard)/dashboard/relatorios/page.tsx`

- **Severity**: HIGH
- **Status**: Identified - needs real API or temporary disable
- **Description**: Educational reports using mock data generation
- **Replacement Plan**: Connect to real reports API or disable feature temporarily
- **Estimated Effort**: 6 hours
- **Blocker**: Yes - critical for educational compliance

#### c) Configuration Management
**File**: `app/(dashboard)/dashboard/configuracoes/page.tsx`

- **Severity**: HIGH
- **Status**: Identified - needs real configuration API
- **Description**: System settings using mock configuration data
- **Replacement Plan**: Implement proper settings management with real API
- **Estimated Effort**: 4 hours
- **Blocker**: Yes - system configuration required

### 3. RESOLVED: Previous Critical Issues ✅

The following critical issues have been successfully resolved:

#### ✅ Security: Development Test Accounts Removed
- **File**: `app/(auth)/login/page.tsx`
- **Issue**: Exposed admin credentials publicly
- **Status**: Fixed - credentials removed

#### ✅ Configuration: Production Settings Fixed
- **File**: `next.config.js`
- **Issue**: Hardcoded localhost in allowedOrigins
- **Status**: Fixed - production domains added

#### ✅ Error Handling: Mock Fallbacks Removed
- **File**: `components/attendance/attendance-marking-mobile.tsx`
- **Issue**: Showed fake students when API failed
- **Status**: Fixed - proper error messages implemented

#### ✅ Schools Integration: Real API Connected
- **File**: `app/(dashboard)/dashboard/escolas/page.tsx`
- **Issue**: Used complete mock data array
- **Status**: Fixed - real schoolsApi integration

### 4. MEDIUM PRIORITY: Development Artifacts

#### Debug Logging (100+ instances)
- **Severity**: MEDIUM
- **Status**: Identified - needs structured logging
- **Description**: Console.error statements throughout codebase
- **Replacement Plan**: Implement structured logging system
- **Estimated Effort**: 4 hours
- **Blocker**: No - but will clutter production logs

#### Placeholder Content
- **Severity**: LOW
- **Status**: Identified - acceptable for production
- **Description**: CPF placeholders like "000.000.000-00"
- **Files**:
  - `components/students/student-registration-form.tsx`
  - `app/(dashboard)/dashboard/alunos/novo/page.tsx`
- **Action**: Keep - these are proper UI placeholders

## Audit Logging Compliance Issues

### Missing Audit Trail Implementation
**Risk Level**: HIGH - Brazilian educational compliance requirement

**Files with TODO comments**:
- `lib/api/students.ts:321` - Student data changes must be logged
- `lib/api/schools.ts:295` - School modifications need audit trail
- `lib/api/classes.ts:271` - Class management requires logging

**Replacement Plan**: Implement server-side audit tables for compliance
**Estimated Effort**: 8 hours
**Legal Requirement**: Yes - mandatory for Brazilian educational systems

## Database Schema Validation

### Current Supabase Schema Status
**Connected Instance**: Basic RBAC schema (School, User, Role tables)
**Required Schema**: gestao_fronteira comprehensive educational schema

**Migration Status**:
- ✅ Complete schema exists in `supabase/migrations/20250628095207_wild_block.sql`
- ❌ Not applied to connected Supabase instance
- **Action Required**: Apply educational migration to production database

### Schema Components Ready
- ✅ 5 user roles: admin, diretor, secretario, professor, responsavel
- ✅ Complete educational tables: escolas, alunos, responsaveis, turmas, matriculas, frequencia, notas
- ✅ RLS policies configured for multi-school isolation
- ✅ Brazilian compliance features (CPF validation, attendance immutability)

## Action Plan Priority Matrix

### IMMEDIATE (0-2 days) - Production Blockers
1. **Replace mock APIs in user management pages** (8 hours)
2. **Connect or disable reports system** (6 hours)
3. **Implement real configuration management** (4 hours)
4. **Apply gestao_fronteira migration to Supabase** (2 hours)

### HIGH PRIORITY (2-4 days) - Compliance & Quality
5. **Remove lib/mock-data.ts completely** (0.5 hours - after dependencies)
6. **Implement audit logging for compliance** (8 hours)
7. **Test all critical user workflows** (4 hours)

### MEDIUM PRIORITY (4-6 days) - Production Hardening
8. **Implement structured logging** (4 hours)
9. **Final end-to-end testing** (8 hours)
10. **Performance validation** (4 hours)

## Success Criteria

### Must Have (Production Blockers)
- [ ] Zero references to mock-data.ts in any component
- [ ] All 5 critical pages load real data from APIs
- [ ] Educational migration applied to production database
- [ ] Basic audit logging for student/school data changes

### Should Have (Compliance & Quality)
- [ ] Comprehensive audit trail for all data modifications
- [ ] Structured logging system replacing console statements
- [ ] Error handling tested with real failure scenarios
- [ ] Performance testing with realistic data loads

### Could Have (Future Improvements)
- [ ] Advanced monitoring and alerting
- [ ] Automated testing coverage >80%
- [ ] Advanced error recovery mechanisms

## Estimated Timeline

**Total Effort**: ~48 hours (6 working days)
**Critical Path**: 20 hours (2.5 working days for production blockers)
**Target Production Ready Date**: 2025-09-21 (1 week from audit date)

## Risk Mitigation

### High Risks
1. **Data Loss Risk**: Comprehensive backups before database migration
2. **Authentication Failures**: Thorough testing of user management changes
3. **Compliance Violations**: Priority implementation of audit logging

### Contingency Plans
1. **API Failures**: Implement graceful degradation instead of mock fallbacks
2. **Database Issues**: Rollback plan for migration if problems occur
3. **Timeline Delays**: Temporary feature disabling for non-critical functions

This inventory provides a complete roadmap for production readiness, with clear priorities and realistic timelines for SME Fronteira deployment.