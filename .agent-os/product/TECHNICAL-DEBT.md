# Technical Debt & Cleanup Items

**Last Updated:** 2025-09-29
**Priority Context:** MVP Launch in 2 weeks (deadline: 2025-10-13)

## 🚨 Critical: Mock Implementations to Remove

### Files to Delete (Not Production-Ready)

1. **`lib/models/mockup-inventory.ts`**
   - Status: Mock implementation
   - Action: DELETE before production
   - Impact: Not used in real workflows

2. **`lib/services/mockup-scan-service.ts`**
   - Status: Mock service
   - Action: DELETE before production
   - Impact: Test-only code in production directory

3. **`tests/integration/test_mockup_scanning.test.ts`**
   - Status: Test for mock features
   - Action: KEEP (it's a test file)
   - Note: Contains placeholder TODO but acceptable in tests

### Event References to Clean

- **`lib/services/index.ts:207`**: `MOCK_ANALYSIS_COMPLETED` event
  - Remove this event type from production enum
  - Verify no production code depends on it

## 📝 TODOs to Address (Priority Order)

### High Priority (Before MVP Launch)

1. **Audit Logging for Status Changes** (3 locations)
   - `lib/api/students.ts:321` - Student status changes
   - `lib/api/schools.ts:295` - School status changes
   - `lib/api/classes.ts:271` - Class status changes
   - **Action Required:** Implement audit trail before MVP
   - **Why:** Legal compliance for educational data changes
   - **Estimated Time:** 2-4 hours total

2. **Monitoring Service Integration**
   - `lib/logger.ts:197` - Monitoring service placeholder
   - **Action Required:** Integrate Sentry or similar
   - **Why:** Production error tracking essential
   - **Estimated Time:** 3-4 hours
   - **Options:** Sentry (recommended), LogRocket, Datadog

### Medium Priority (Post-MVP)

3. **Code Documentation Improvements**
   - Various format validation comments (XXX.XXX.XXX-XX patterns)
   - **Action:** Already well-documented, no urgent action
   - **Note:** These are descriptive comments, not problems

## 🔍 Code Quality Observations

### ✅ Good Practices Found

- **Brazilian validation patterns** properly documented
- **LGPD compliance** considerations in field help text
- **Phone format validation** (mobile vs landline) properly handled
- **CPF masking** correctly implemented

### ⚠️ Areas for Post-MVP Improvement

1. **Consistent audit logging** across all entities
2. **Centralized monitoring** integration
3. **Error tracking** service configuration
4. **Performance monitoring** for 30-40 concurrent users

## 📊 MVP Readiness Score

| Category | Status | Notes |
|----------|--------|-------|
| **Mock Code** | ⚠️ 2 files | Must delete before production |
| **Audit Logging** | ⚠️ 3 TODOs | Implement this week |
| **Monitoring** | ⚠️ 1 TODO | Configure before launch |
| **Data Validation** | ✅ Complete | Brazilian standards implemented |
| **LGPD Compliance** | ✅ Complete | Privacy considerations in place |

## 🎯 Action Plan for Next 2 Weeks

### Week 1 (Days 1-7)
- [ ] Delete mock files (30 min)
- [ ] Implement audit logging for status changes (4 hours)
- [ ] Configure Sentry/monitoring integration (4 hours)
- [ ] Test with 5 concurrent users

### Week 2 (Days 8-14)
- [ ] Load test with 40 concurrent users
- [ ] Verify audit trail completeness
- [ ] Final cleanup verification
- [ ] Production deployment prep

## 🔒 Zero-Tolerance Items

**These must be 100% real before MVP launch:**

1. ✅ **Database operations** - No mocks detected
2. ✅ **Authentication** - Real Supabase auth
3. ✅ **Brazilian validation** - Production-ready
4. ⚠️ **Audit trails** - Needs completion (3 locations)
5. ⚠️ **Error monitoring** - Needs integration

---

**Next Review:** After mock file deletion and audit logging implementation