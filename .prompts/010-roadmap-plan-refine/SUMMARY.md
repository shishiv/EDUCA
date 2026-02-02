# Roadmap v2 Summary

**One-liner:** Roadmap updated to reflect 70% Phase 1 completion (Dec 2024); Grade Curricular identified as P0 blocker for Feb 2026 MVP.

---

## Version

**v2** (refine of 004-roadmap-plan)

**Updated:** 2024-12-14
**Baseline:** Stakeholder 6-phase roadmap + current state analysis

---

## Key Changes from v1 (004)

### Structure
- ✅ Aligned with 6-phase stakeholder roadmap structure (HTML reference)
- ✅ Added completion percentages per phase
- ✅ Split features into Completed/In Progress/Missing
- ✅ Added effort estimates for all remaining work

### Status Updates (Dec 2024)
- ✅ **Marked as Complete:**
  - Calendário Escolar (100% - added Dec 14, 2024)
  - LGPD Privacy Policy (100% - added Dec 14, 2024)
  - LGPD Consent Checkbox (100% - added Dec 14, 2024)
  - Bolsa Família Reports (100% - completed Nov 2024)
  - API fixes (Dashboard and Diário - Dec 13-14, 2024)
  - Accessibility improvements (21 fields - Dec 13, 2024)
  - Database cleanup (24 orphaned files removed - Dec 13, 2024)

- ⚠️ **Updated Partial Status:**
  - Phase 1 Core Academic: 70% complete (was unknown)
  - Phase 2 LGPD/Security: 50% complete (was 0%)
  - Diário Ed. Infantil: 40% complete (schema done, UI missing)
  - Mobile Responsive: 80% complete (MobileNav added)

- ❌ **Identified Critical Blockers:**
  - **Grade Curricular: 0%** - BLOCKS lesson planning workflow
  - Backup Automático: 0% - LGPD compliance requirement

### Prioritization
- ✅ Applied P0/P1/P2/P3 priority system
- ✅ Identified critical path: Grade Curricular → Diário Infantil → Backup → MVP
- ✅ Deferred Phases 4-5 to post-MVP (Mar+ 2026)

### Documentation
- ✅ Added Beads issue commands for all remaining tasks
- ✅ Added risk assessment with mitigation strategies
- ✅ Added detailed task breakdowns with effort estimates
- ✅ Added Mermaid dependency graph

---

## Current State (Dec 2024)

### What's Working ✅
- **Foundation (95%):** Auth, RBAC, RLS, Audit Trail, Import
- **Student Management (100%):** Registration, guardians, multiple responsáveis
- **School Management (100%):** 9 schools configured, director assignment
- **Class Management (100%):** Turmas with teacher assignment
- **Attendance (90%):** Digital recording, immutability, auto-lock 18:00
- **School Calendar (100%):** Events, holidays, attendance integration
- **Diary Fundamental (85%):** Content, BNCC skills, reports
- **Bolsa Família (100%):** Alerts, reports, PDF/Excel export
- **LGPD Compliance (100%):** Privacy policy, consent checkbox
- **Mobile (80%):** Responsive layouts, bottom navigation

### What's Missing ❌
- **Grade Curricular (0%):** Subject distribution, timetable, workload tracking
- **Diário Infantil UI (60%):** Schema exists, BNCC Campos de Experiência UI missing
- **Backup (0%):** Automated daily backups, restore procedure
- **Educacenso Export (50%):** File generation incomplete
- **WhatsApp (0%):** Notification integration
- **Dashboards (65%):** Role-specific views incomplete

---

## Critical Path to MVP (Feb 2026)

### Phase 1: December 2024 (8-11 days)
1. **Grade Curricular** (5-7 days) - P0 BLOCKER
   - Tables: `grade_curricular`, `horarios_aula`, `disciplinas_turma`
   - API endpoints for CRUD
   - UI: Subject distribution form, timetable grid
   - Integration with `sessoes_aula`

2. **Diário Ed. Infantil UI** (3-4 days) - P0 for Infantil schools
   - Components: Campos de Experiência, Direitos de Aprendizagem
   - Page: `/dashboard/diario/infantil`
   - BNCC seed data

### Phase 2: January 2026 (5-8 days)
1. ~~**Backup Automático**~~ ✅ REMOVIDO - Supabase Cloud inclui backup automático

2. **Educacenso Export** (2-3 days) - P2
   - Research 2026 format
   - Export generation logic
   - Validation with MEC tools

3. **Integration Testing** (3-5 days)
   - End-to-end teacher workflow
   - Multi-school scenarios
   - Deploy para Vercel + Supabase Cloud

### Phase 3: February 2026 (Launch)
1. **Week 1-2:** Pilot (1-2 schools)
2. **Week 2-3:** Feedback iteration
3. **Week 3:** Teacher training (all 9 schools)
4. **Week 4:** Full production launch

### Phase 4: March+ 2026 (Post-MVP)
- WhatsApp integration (4-5 days)
- Onboarding tour (2-3 days)
- Enhanced dashboards (12-18 days)
- Transport & Nutrition modules (10-15 days)

**Total MVP Effort:** 13-18 dias de desenvolvimento focado
*(Reduzido de 15-21 dias após decisão Vercel + Supabase Cloud)*

---

## Decisions Needed

### Critical (Block MVP)
1. **Backup Solution Approach** ✅ DECIDIDO
   - **Decisão:** Usar Supabase Cloud (free tier) - backup automático incluso
   - **Arquitetura:** Vercel (Next.js) + Supabase Cloud (PostgreSQL)
   - **Custo:** R$ 0/mês
   - **DevOps:** Zero - deploy via `git push`
   - **Impacto:** Remove ~3 dias de trabalho de infra

### Important (Impact Timeline)
2. **Training Approach**
   - In-person sessions vs video tutorials vs hybrid?
   - **Recommendation:** Hybrid (videos + in-person for complex features)
   - **Impact:** 2-3 days prep time

3. **Pilot School Selection** ✅ DECIDIDO
   - **Escola:** Maisa Ferreira
   - **Critérios aplicados:** Tech-savvy teachers, representative size, director buy-in

### Post-MVP
4. **WhatsApp API Provider**
   - Evolution API already mentioned in notes
   - Need confirmation this is configured/accessible

---

## Risks & Mitigation

### High Risk
- **Grade Curricular delays MVP**
  - **Mitigation:** Start immediately, daily progress tracking
  - **Fallback:** Launch without timetable (manual scheduling)

- **Feb 2026 timeline too tight**
  - **Mitigation:** Focus only P0/P1 items, defer enhancements
  - **Fallback:** Soft launch Feb, full rollout Mar

### Medium Risk
- **Backup solution unclear**
  - **Mitigation:** Research this week, decide by Dec 20
  - **Fallback:** Use Supabase automatic backups temporarily

- **Teacher training insufficient**
  - **Mitigation:** 2-week training period, video library
  - **Fallback:** Support hotline + in-person assistance first month

### Low Risk
- **Educacenso format changes for 2026**
  - **Mitigation:** Check MEC docs in January 2025
  - **Fallback:** Use 2025 format as baseline

---

## Blockers

**None (as of Dec 14, 2024)**

All identified gaps are **work to be done**, not external blockers.

- Grade Curricular: Implementation work, not blocked
- Backup: Decision needed, but not blocked (can start research)
- Diário Infantil: Implementation work, not blocked

---

## Success Metrics

### MVP Launch (Feb 2026)
- [ ] Grade Curricular: Teachers can create weekly timetables
- [ ] Diário Infantil: BNCC Campos de Experiência tracking works
- [ ] Backup: Daily automated backups running + restore tested
- [ ] Educacenso: Valid export file generated
- [ ] Training: 90%+ teachers completed onboarding
- [ ] Uptime: 99%+ availability during Feb-Mar
- [ ] Support: <24h response time for critical issues

### Post-MVP (Mar-Jun 2026)
- [ ] WhatsApp: 80%+ guardians opt-in to notifications
- [ ] Dashboards: All 5 role-specific views complete
- [ ] Transport: 100% students with route assigned (if applicable)
- [ ] Nutrition: Menus tracked for all schools
- [ ] Satisfaction: >80% teacher satisfaction score

---

## Next Steps

### Immediate (This Week)
1. ✅ **Review roadmap-v2.md** (this document)
2. ✅ **Approve SUMMARY.md**
3. **Create prompt `011-grade-curricular-do`** for implementation
4. **Begin Grade Curricular development** (P0 blocker)

### This Month (December 2024)
1. Complete Grade Curricular (5-7 days)
2. Complete Diário Ed. Infantil UI (3-4 days)
3. Test end-to-end teacher workflow
4. Research backup solutions (Supabase PITR vs pg_dump)

### Next Month (January 2026)
1. Implement Backup Automático (2-3 days)
2. Complete Educacenso export (2-3 days)
3. Integration testing (3-5 days)
4. Prepare training materials (videos + docs)

### Launch Month (February 2026)
1. Pilot rollout (2 schools, 2 weeks)
2. Collect feedback and iterate (1 week)
3. Teacher training (all 9 schools, 1 week)
4. Full production launch (end of Feb)

---

## Files Updated

- ✅ `.prompts/010-roadmap-plan-refine/roadmap-v2.md` (full roadmap)
- ✅ `.prompts/010-roadmap-plan-refine/SUMMARY.md` (this file)
- **Next:** `.prompts/011-grade-curricular-do/` (implementation prompt)

---

## References

- **Stakeholder Roadmap:** `/home/shiv/repos/EDUCA/educa-roadmap(1).html`
- **Original Roadmap:** `.prompts/004-roadmap-plan/roadmap.md`
- **Database Schema:** Supabase MCP (17 tables analyzed)
- **Recent Changes:** `CHANGELOG.md` + git log (20 commits, 2 weeks)
- **Dashboard Pages:** 14 pages via Glob search

---

<metadata>
<version>v2</version>
<created>2024-12-14</created>
<author>Claude Code</author>
<confidence>high</confidence>
<next_action>Create prompt 011-grade-curricular-do</next_action>
<estimated_mvp_date>2026-02-28</estimated_mvp_date>
<estimated_mvp_effort>15-21 days</estimated_mvp_effort>
<critical_blocker>Grade Curricular (Phase 1)</critical_blocker>
</metadata>
