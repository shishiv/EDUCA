# Requirements: EDUCA v2.0 Architecture & Launch Prep

**Defined:** 2026-01-18
**Core Value:** Auditar e padronizar codebase para suportar features futuras e preparar piloto em 1-2 escolas.

## v1 Requirements

Requirements for v2.0 release. Each maps to roadmap phases.

### Build & Quality

- [ ] **BLD-01**: TypeScript type checking habilitado no build (remover `ignoreBuildErrors: true`)
- [ ] **BLD-02**: ESLint habilitado no build (remover `ignoreDuringBuilds: true`)
- [ ] **BLD-03**: Zero erros de TypeScript no `pnpm typecheck`
- [ ] **BLD-04**: Zero erros de lint no `pnpm lint`

### Data Integrity

- [ ] **DAT-01**: Frequencia calculada de dados reais (nao hardcoded 85%)
- [ ] **DAT-02**: Dashboards usando dados reais (nao mock data)
- [ ] **DAT-03**: Diario Infantil Vivencias com API funcional (nao MOCK_VIVENCIAS)

### Code Standards

- [ ] **STD-01**: Padrao unico de data fetching documentado e aplicado (React Query + API layer)
- [ ] **STD-02**: Padrao unico de filtros (valor default: 'todos')
- [ ] **STD-03**: Queries Supabase centralizadas em lib/api/ (nao inline em pages)
- [ ] **STD-04**: Console.error substituido por lib/logger.ts estruturado

### Feature Flags

- [ ] **FLG-01**: Tabela `feature_flags` no Supabase com schema (escola_id, flag_name, enabled)
- [ ] **FLG-02**: Hook `useFeatureFlag(flagName)` para check no frontend
- [ ] **FLG-03**: UI admin para toggle de flags por escola em /admin/flags
- [ ] **FLG-04**: Flags criados para modulos futuros: nutricao, estoque_escolar

### Security & Compliance

- [ ] **SEC-01**: Supabase migrations versionadas em supabase/migrations/
- [ ] **SEC-02**: RLS policies documentadas em .planning/codebase/RLS-POLICIES.md
- [ ] **SEC-03**: Placeholder de telefone removido da politica de privacidade

### Testing

- [ ] **TST-01**: Framework de testes configurado (Vitest)
- [ ] **TST-02**: Testes unitarios para attendance workflow (lib/services/attendance-*.ts)
- [ ] **TST-03**: E2E basico com Playwright para fluxos criticos (login, chamada)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### LGPD Full Compliance

- **LGPD-01**: Termo de Consentimento com assinatura digital
- **LGPD-02**: Criptografia de CPF/NIS em repouso
- **LGPD-03**: Backup automatico com retencao 30 dias

### Auxiliary Modules

- **AUX-01**: Modulo Nutricao/Merenda completo
- **AUX-02**: Modulo Estoque Escolar completo
- **AUX-03**: Modulo Transporte Escolar
- **AUX-04**: Exportacao Educacenso UI

### UX Enhancements

- **UX-01**: Integracao WhatsApp (Evolution API)
- **UX-02**: Onboarding/Tour guiado funcional
- **UX-03**: Central de Ajuda com conteudo real

## Out of Scope

Explicitly excluded for v2.0. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Implementacao de modulos Nutricao/Estoque | Feature flags apenas; implementacao v3+ |
| Integracao WhatsApp | Complexidade alta; v3+ |
| Refatoracao completa de todos os componentes | Foco em padronizacao; refactor incremental |
| LGPD encryption completa | Requires infrastructure changes; v2.1 |
| Edicao retroativa de frequencia | Compliance brasileiro proibe |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BLD-01 | Phase 6 | Pending |
| BLD-02 | Phase 6 | Pending |
| BLD-03 | Phase 6 | Pending |
| BLD-04 | Phase 6 | Pending |
| DAT-01 | Phase 7 | Pending |
| DAT-02 | Phase 7 | Pending |
| DAT-03 | Phase 7 | Pending |
| STD-01 | Phase 8 | Pending |
| STD-02 | Phase 8 | Pending |
| STD-03 | Phase 8 | Pending |
| STD-04 | Phase 8 | Pending |
| FLG-01 | Phase 9 | Pending |
| FLG-02 | Phase 9 | Pending |
| FLG-03 | Phase 9 | Pending |
| FLG-04 | Phase 9 | Pending |
| SEC-01 | Phase 10 | Pending |
| SEC-02 | Phase 10 | Pending |
| SEC-03 | Phase 10 | Pending |
| TST-01 | Phase 11 | Pending |
| TST-02 | Phase 11 | Pending |
| TST-03 | Phase 11 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-01-18*
*Based on codebase audit: .planning/codebase/CONCERNS.md*
