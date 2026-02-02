# Phase 11: Testing - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Framework de testes MVP com cobertura mínima para validar fluxos críticos. Vitest para testes unitários, Playwright para smoke tests E2E. CI/CD para E2E é escopo de fase futura.

</domain>

<decisions>
## Implementation Decisions

### Escopo de Testes (MVP)
- E2E: Smoke test básico — páginas carregam sem erro 500, login funciona
- Unit: Foco em attendance-workflow.ts, attendance-locking.ts + validações críticas
- Testar fluxos de erro: Sim (CPF inválido, campos obrigatórios, etc.)
- E2E roda localmente nessa fase (não em CI)

### Estratégia de Mocking
- Unit tests: Tudo mockado, sem conexão real com Supabase
- E2E: Usa Supabase de desenvolvimento (mesmo banco de dev)
- Criar usuário de teste dedicado: teste@educa.com
- Testes unitários devem rodar em <5 segundos (tudo mockado, sem I/O)

### Abordagem E2E
- Screenshot em falha: Sim (salva para debug)
- Sem gravação de vídeo (MVP)

### Organização de Testes
- Descrições de teste (describe/it): Em português
- Exemplo: `describe('Fluxo de frequência', () => { ... })`

### Claude's Discretion
- Browser para E2E (recomendado: Chromium only para MVP)
- Servidor para E2E (dev server vs build)
- Execução paralela ou sequencial
- Estrutura de pastas (tests/ na raiz vs co-located)
- Convenção de nome (*.test.ts vs *.spec.ts)
- Organização de fixtures (inline vs arquivos separados)
- Cobertura mínima de unit tests (baseado em risco/impacto)

</decisions>

<specifics>
## Specific Ideas

- MVP = escopo mínimo para validar que funciona, não cobertura ampla
- Foco em estabilidade, não em cobertura percentual
- Smoke tests E2E validam que deploy não quebrou nada óbvio

</specifics>

<deferred>
## Deferred Ideas

- CI/CD para E2E — Fase futura (precisa de ambiente isolado, Supabase de teste)
- Cobertura de 70%+ do lib/ — Escopo reduzido para MVP
- E2E para todos os CRUDs — Reduzido para smoke test básico
- Testes de integração com Supabase real — Mock completo por enquanto

</deferred>

---

*Phase: 11-testing*
*Context gathered: 2026-01-19*
