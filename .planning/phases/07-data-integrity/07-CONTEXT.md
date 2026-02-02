# Phase 7: Data Integrity - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Substituir dados mock/hardcoded por dados reais do Supabase em todas as telas. Frequência deve refletir registros reais, dashboards devem mostrar estatísticas agregadas, e Diário Infantil Vivências deve ter API funcional.

</domain>

<decisions>
## Implementation Decisions

### Cálculo de Frequência
- Período: **Mês atual** (não ano letivo completo)
- Exibição: **Porcentagem + dias** (ex: "85% (17/20 dias)")
- Formato deve ser claro para professores e coordenação

### Dashboard Administrativo
- Métricas: **Visão completa** — frequência média + total alunos + turmas + escolas
- Filtros: **Dropdown de escola** — admin pode ver dados de escola específica ou agregado geral
- Dados devem refletir realidade do Supabase, não valores estáticos

### Modelo de Dados Vivências
- Mídia: **Esqueleto para fotos** preparado, mas funcionalidade behind feature flag (LGPD tratada posteriormente)
- Visibilidade: **Professores + Coordenação** podem ver vivências
- Edição: **Professor + auxiliares** da turma podem criar/editar
- Escopo: **Ambos** — vivências podem ser coletivas (turma) ou individuais (aluno)

### Estratégia de Transição
- Migração: **Tudo de uma vez** — todas as telas migram simultaneamente
- Empty states: **Mensagem amigável + ação** (ex: "Nenhuma frequência registrada. Fazer chamada?")
- Monitoramento: **Log warning** quando dados mock forem detectados em produção
- Ambiente dev: **Mesma instância Supabase** — sem necessidade de seed data separado

### Claude's Discretion
- Quais status de frequência contam como "presente" (baseado em regras Bolsa Família/MEC)
- Tratamento de alunos transferidos no meio do mês
- Estratégia de cache para dashboard (tempo real vs cached)
- Comparações com períodos anteriores no dashboard
- Loading states (skeleton vs spinner)
- Estratégia de erro e retry da API
- Validação de completude da migração
- Mecanismo de rollback (se necessário)

</decisions>

<specifics>
## Specific Ideas

- Frequência no formato "85% (17/20 dias)" — clareza para usuários não-técnicos
- Feature flag para fotos nas vivências permite rollout gradual após resolver LGPD
- Mesma instância Supabase para dev evita complexidade de sincronização

</specifics>

<deferred>
## Deferred Ideas

- LGPD compliance para fotos de crianças — tratar em fase específica de segurança
- Sistema completo de mídia/galeria — apenas esqueleto nesta fase

</deferred>

---

*Phase: 07-data-integrity*
*Context gathered: 2026-01-19*
