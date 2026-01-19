# Requirements: EDUCA v2.0 Architecture & Launch Prep

**Defined:** 2026-01-18
**Core Value:** Auditar e padronizar codebase para suportar features futuras e preparar piloto em 1-2 escolas.

## v1 Requirements

Requirements for v2.0 release. Each maps to roadmap phases.

### Build & Quality

- [x] **BLD-01**: TypeScript type checking habilitado no build (remover `ignoreBuildErrors: true`)
- [x] **BLD-02**: ESLint habilitado no build (remover `ignoreDuringBuilds: true`)
- [x] **BLD-03**: Zero erros de TypeScript no `pnpm typecheck`
- [x] **BLD-04**: Zero erros de lint no `pnpm lint`

### Data Integrity

- [x] **DAT-01**: Frequencia calculada de dados reais (nao hardcoded 85%)
- [x] **DAT-02**: Dashboards usando dados reais (nao mock data)
- [x] **DAT-03**: Diario Infantil Vivencias com API funcional (nao MOCK_VIVENCIAS)

### Admin School Selector (INSERTED)

- [x] **ADM-01**: Seletor de escola no header/sidebar para perfis admin
- [x] **ADM-02**: Seleção persistente em sessionStorage/context global
- [x] **ADM-03**: Páginas escola-scoped usam selectedEscolaId quando disponível

### Code Standards

- [x] **STD-01**: Padrao unico de data fetching documentado e aplicado (React Query + API layer)
- [x] **STD-02**: Padrao unico de filtros (valor default: 'todos')
- [x] **STD-03**: Queries Supabase centralizadas em lib/api/ (nao inline em pages)
- [x] **STD-04**: Console.error substituido por lib/logger.ts estruturado

### Feature Flags

- [x] **FLG-01**: Tabela `feature_flags` no Supabase com schema (escola_id, flag_name, enabled)
- [x] **FLG-02**: Hook `useFeatureFlag(flagName)` para check no frontend
- [x] **FLG-03**: UI admin para toggle de flags por escola em /admin/flags
- [x] **FLG-04**: Flags criados para modulos futuros: nutricao, estoque_escolar

### Security & Compliance

- [x] **SEC-01**: Supabase migrations versionadas em supabase/migrations/
- [x] **SEC-02**: RLS policies documentadas em .planning/codebase/RLS-POLICIES.md
- [x] **SEC-03**: Placeholder de telefone removido da politica de privacidade

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
| BLD-01 | Phase 6 | Complete |
| BLD-02 | Phase 6 | Complete |
| BLD-03 | Phase 6 | Complete |
| BLD-04 | Phase 6 | Complete |
| DAT-01 | Phase 7 | Complete |
| DAT-02 | Phase 7 | Complete |
| DAT-03 | Phase 7 | Complete |
| ADM-01 | Phase 7.1 | Complete |
| ADM-02 | Phase 7.1 | Complete |
| ADM-03 | Phase 7.1 | Complete |
| STD-01 | Phase 8 | Complete |
| STD-02 | Phase 8 | Complete |
| STD-03 | Phase 8 | Complete |
| STD-04 | Phase 8 | Complete |
| FLG-01 | Phase 9 | Complete |
| FLG-02 | Phase 9 | Complete |
| FLG-03 | Phase 9 | Complete |
| FLG-04 | Phase 9 | Complete |
| SEC-01 | Phase 10 | Complete |
| SEC-02 | Phase 10 | Complete |
| SEC-03 | Phase 10 | Complete |
| TST-01 | Phase 11 | Pending |
| TST-02 | Phase 11 | Pending |
| TST-03 | Phase 11 | Pending |

**Coverage:** 24 requirements (21 original + 3 ADM inserted), all mapped to phases.

---
*Requirements defined: 2026-01-18*
*Based on codebase audit: .planning/codebase/CONCERNS.md*
