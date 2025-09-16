# Tasks: Production Readiness Audit

**Input**: Design documents from `/specs/002-production-readiness-audit/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript, Next.js, Supabase, shadcn/ui
   → Structure: Multi-project web application (gestao_fronteira primary)
2. Load design documents ✅:
   → data-model.md: AuditChecklist, MockupInventory, MCPConfiguration entities
   → contracts/: audit-api.yaml with 6 endpoints
   → research.md: Mockup scanning approach, MCP integrations, compliance
3. Generate tasks by category:
   → Setup: Database migration, MCP integration setup
   → Tests: Contract tests for audit API endpoints
   → Core: Mockup elimination, API replacement, audit logging
   → Integration: Production database, real API connections
   → Polish: Performance validation, compliance verification
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Mock API replacements = sequential (shared dependencies)
   → Tests before implementation (TDD)
5. Tasks numbered T001-T036
6. Dependencies documented
7. Parallel execution examples provided
8. Validation: All critical production blockers addressed
9. SUCCESS: Tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **🚨**: Critical production blocker
- File paths relative to `/c/repos/SRE/`

## Path Conventions
- **Primary project**: `gestao_fronteira/` (80% MVP ready)
- **Audit specs**: `specs/002-production-readiness-audit/`
- **Tests**: `gestao_fronteira/tests/` (to be created)

---

## Phase 3.1: Setup & Environment

- [ ] T001 🚨 Apply gestao_fronteira migration to production Supabase instance
- [ ] T002 [P] 🚨 Validate educational schema tables in gestao_fronteira/supabase/migrations/20250628095207_wild_block.sql
- [ ] T003 [P] Configure MCP integrations for Supabase, shadcn/ui, and Playwright
- [ ] T004 🚨 Generate TypeScript types from production schema using mcp__supabase__generate_typescript_types

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T005 [P] Contract test GET /audit/checklist in gestao_fronteira/tests/contract/test_audit_checklist_get.test.ts
- [ ] T006 [P] Contract test POST /audit/checklist in gestao_fronteira/tests/contract/test_audit_checklist_post.test.ts
- [ ] T007 [P] Contract test GET /audit/mockups in gestao_fronteira/tests/contract/test_audit_mockups_get.test.ts
- [ ] T008 [P] Contract test POST /audit/mockups in gestao_fronteira/tests/contract/test_audit_mockups_post.test.ts
- [ ] T009 [P] Contract test GET /audit/mcp in gestao_fronteira/tests/contract/test_audit_mcp_get.test.ts
- [ ] T010 [P] Contract test POST /audit/validation in gestao_fronteira/tests/contract/test_audit_validation_post.test.ts
- [ ] T011 [P] Integration test mockup scanning workflow in gestao_fronteira/tests/integration/test_mockup_scanning.test.ts
- [ ] T012 [P] Integration test production readiness validation in gestao_fronteira/tests/integration/test_production_validation.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Critical Mock API Replacement 🚨
- [ ] T013 🚨 Replace mockApi calls in gestao_fronteira/app/(dashboard)/dashboard/usuarios/page.tsx
- [ ] T014 🚨 Replace mockApi calls in gestao_fronteira/app/(dashboard)/dashboard/usuarios/novo/page.tsx
- [ ] T015 🚨 Replace mockApi calls in gestao_fronteira/app/(dashboard)/dashboard/usuarios/[id]/page.tsx
- [ ] T016 🚨 Replace mockApi calls in gestao_fronteira/app/(dashboard)/dashboard/relatorios/page.tsx
- [ ] T017 🚨 Replace mockApi calls in gestao_fronteira/app/(dashboard)/dashboard/configuracoes/page.tsx

### Data Models & Services
- [ ] T018 [P] AuditChecklist model in gestao_fronteira/lib/models/audit-checklist.ts
- [ ] T019 [P] MockupInventory model in gestao_fronteira/lib/models/mockup-inventory.ts
- [ ] T020 [P] MCPConfiguration model in gestao_fronteira/lib/models/mcp-configuration.ts
- [ ] T021 [P] AuditService for checklist operations in gestao_fronteira/lib/services/audit-service.ts
- [ ] T022 [P] MockupScanService for codebase scanning in gestao_fronteira/lib/services/mockup-scan-service.ts

### API Endpoints
- [ ] T023 GET /api/audit/checklist endpoint in gestao_fronteira/app/api/audit/checklist/route.ts
- [ ] T024 POST /api/audit/checklist endpoint in gestao_fronteira/app/api/audit/checklist/route.ts
- [ ] T025 GET /api/audit/mockups endpoint in gestao_fronteira/app/api/audit/mockups/route.ts
- [ ] T026 POST /api/audit/mockups endpoint in gestao_fronteira/app/api/audit/mockups/route.ts

## Phase 3.4: Integration & Compliance

### Mock Data Elimination 🚨
- [ ] T027 🚨 Verify zero references to gestao_fronteira/lib/mock-data.ts
- [ ] T028 🚨 Remove gestao_fronteira/lib/mock-data.ts file (257 lines)
- [ ] T029 🚨 Update import statements removing mock-data references

### Audit Logging Implementation 🚨
- [ ] T030 🚨 Create audit_log table in Supabase schema
- [ ] T031 🚨 Implement audit logging in gestao_fronteira/lib/api/students.ts:321
- [ ] T032 🚨 Implement audit logging in gestao_fronteira/lib/api/schools.ts:295

### Production Validation
- [ ] T033 Connect AuditService to production Supabase database
- [ ] T034 Implement structured logging in gestao_fronteira/lib/logger.ts
- [ ] T035 Configure error handling and monitoring

## Phase 3.5: Polish & Validation

- [ ] T036 [P] Unit tests for AuditChecklist validation in gestao_fronteira/tests/unit/test_audit_validation.test.ts
- [ ] T037 [P] Performance tests (page load < 3s, attendance < 1s) in gestao_fronteira/tests/performance/
- [ ] T038 [P] Brazilian compliance validation tests in gestao_fronteira/tests/compliance/
- [ ] T039 [P] MCP integration validation using mcp__supabase__get_advisors
- [ ] T040 Final production readiness verification using quickstart.md workflow
- [ ] T041 Update documentation with production deployment procedures

---

## Dependencies

### Critical Path (Production Blockers)
```
T001 → T002 → T004 (Database setup sequence)
T001 → T013-T017 (Mock API replacement depends on DB)
T005-T012 → T013-T017 (Tests before implementation)
T013-T017 → T027-T029 (API replacement before mock removal)
T030 → T031-T032 (Audit table before logging implementation)
```

### Parallel Dependencies
```
Tests Phase: T005-T012 (all parallel - different files)
Models Phase: T018-T020 (all parallel - different entities)
Services Phase: T021-T022 (parallel - different services)
API Phase: T023-T026 (sequential - shared route patterns)
```

### Integration Dependencies
```
T018-T020 → T021-T022 (Models before services)
T021-T022 → T023-T026 (Services before endpoints)
T023-T026 → T033 (Endpoints before database connection)
```

## Parallel Execution Examples

### Phase 3.2: All Contract Tests Together
```bash
# Launch T005-T012 in parallel (different test files):
Task: "Contract test GET /audit/checklist in gestao_fronteira/tests/contract/test_audit_checklist_get.test.ts"
Task: "Contract test POST /audit/checklist in gestao_fronteira/tests/contract/test_audit_checklist_post.test.ts"
Task: "Contract test GET /audit/mockups in gestao_fronteira/tests/contract/test_audit_mockups_get.test.ts"
Task: "Contract test POST /audit/mockups in gestao_fronteira/tests/contract/test_audit_mockups_post.test.ts"
Task: "Contract test GET /audit/mcp in gestao_fronteira/tests/contract/test_audit_mcp_get.test.ts"
Task: "Contract test POST /audit/validation in gestao_fronteira/tests/contract/test_audit_validation_post.test.ts"
Task: "Integration test mockup scanning workflow in gestao_fronteira/tests/integration/test_mockup_scanning.test.ts"
Task: "Integration test production readiness validation in gestao_fronteira/tests/integration/test_production_validation.test.ts"
```

### Phase 3.3: Model Creation Together
```bash
# Launch T018-T020 in parallel (different model files):
Task: "AuditChecklist model in gestao_fronteira/lib/models/audit-checklist.ts"
Task: "MockupInventory model in gestao_fronteira/lib/models/mockup-inventory.ts"
Task: "MCPConfiguration model in gestao_fronteira/lib/models/mcp-configuration.ts"
```

### Phase 3.5: Final Validation Together
```bash
# Launch T036-T039 in parallel (different test categories):
Task: "Unit tests for AuditChecklist validation in gestao_fronteira/tests/unit/test_audit_validation.test.ts"
Task: "Performance tests (page load < 3s) in gestao_fronteira/tests/performance/"
Task: "Brazilian compliance validation tests in gestao_fronteira/tests/compliance/"
Task: "MCP integration validation using mcp__supabase__get_advisors"
```

## Notes

### TDD Requirements
- [P] tasks = different files, no dependencies
- Verify all tests T005-T012 fail before implementing T013-T041
- Commit after each task completion
- Mock API replacement (T013-T017) is critical path blocker

### Production Readiness Gates
- T001-T004: Database and environment ready
- T013-T017: All mock APIs replaced (CRITICAL)
- T027-T029: All mock data eliminated (CRITICAL)
- T030-T032: Audit logging for compliance (CRITICAL)
- T040-T041: Final validation and documentation

### MCP Integration Validation
- Use mcp__supabase__list_tables to verify schema
- Use mcp__supabase__get_advisors for security audit
- Use mcp__shadcn-ui__list_components for UI validation
- Use mcp__playwright__browser_navigate for E2E testing

## Task Generation Rules Applied

1. **From Contracts**: audit-api.yaml → 6 contract test tasks (T005-T010)
2. **From Data Model**: 3 entities → 3 model tasks (T018-T020) + 2 services (T021-T022)
3. **From Research**: Mockup elimination → replacement tasks (T013-T017, T027-T029)
4. **From Quickstart**: Validation scenarios → testing tasks (T036-T040)

## Validation Checklist
*GATE: Checked before marking tasks complete*

- ✅ All 6 contract endpoints have corresponding tests (T005-T010)
- ✅ All 3 entities have model creation tasks (T018-T020)
- ✅ All tests come before implementation (T005-T012 → T013+)
- ✅ Parallel tasks truly independent (different files marked [P])
- ✅ Each task specifies exact file path in gestao_fronteira/
- ✅ Critical production blockers identified with 🚨
- ✅ No task modifies same file as another [P] task

**Total Tasks**: 41 tasks across 5 phases
**Estimated Effort**: 32 hours (4 working days)
**Critical Path**: T001 → T005-T012 → T013-T017 → T027-T029 → T030-T032 → T040