# Plano de Orquestração - Diário de Classe Digital

## Resumo Executivo

Este documento descreve o plano de orquestração para a implementação do Diário de Classe Digital, distribuindo 18 grupos de tarefas entre 7 especialistas de subagentes, organizados em 6 fases com duração total estimada de **74-96 horas**.

---

## Estrutura de Subagentes

### 1. **backend-api** (5 task groups)
Responsável por API endpoints, migrations, RLS policies, e integrações backend.

**Task Groups:**
- 1.1 - Extensão do Schema de Banco de Dados (6-8h)
- 1.3 - Bloqueio Automático às 18:00 (4-6h)
- 2.1 - API e Types para Conteúdo da Aula (4-6h)
- 3.1 - Sistema de Notas Bimestrais (6-8h)
- 3.2 - Relatórios Descritivos Ed. Infantil (6-8h)
- 4.2 - Alerta Bolsa Família (4-6h)

**Total:** 30-42 horas

---

### 2. **frontend-components** (6 task groups)
Responsável por componentes React, formulários, e UI/UX interativa.

**Task Groups:**
- 1.2 - Extensão do AttendanceGrid para 3 Estados (6-8h)
- 1.4 - Interface de Frequência Diária (8-10h)
- 2.2 - Formulário de Conteúdo Estruturado BNCC (6-8h)
- 2.3 - Interface Card-Based para Histórico (8-10h)
- 3.3 - Boletim do Aluno (6-8h)
- 4.3 - Exportação PDF e Excel (6-8h)

**Total:** 40-52 horas

---

### 3. **backend-queries** (2 task groups)
Responsável por relatórios complexos, agregações, e consultas otimizadas.

**Task Groups:**
- 4.1 - Relatórios de Frequência (4-6h)
- 4.4 - Relatório de Conteúdo Ministrado (4-6h)

**Total:** 8-12 horas

---

### 4. **frontend-responsive** (1 task group)
Responsável por otimizações mobile, responsividade, e touch-friendly design.

**Task Groups:**
- 5.1 - Otimização Mobile (4-6h)

**Total:** 4-6 horas

---

### 5. **performance-optimizer** (1 task group)
Responsável por otimizações de performance, bundle size, e Core Web Vitals.

**Task Groups:**
- 5.2 - Melhorias de Performance (4-6h)

**Total:** 4-6 horas

---

### 6. **frontend-accessibility** (1 task group)
Responsável por conformidade WCAG, acessibilidade, e feedback visual.

**Task Groups:**
- 5.3 - Feedback Visual e Acessibilidade (4-6h)

**Total:** 4-6 horas

---

### 7. **implementation-verifier** (1 task group)
Responsável por validação E2E, testes, gap analysis, e qualidade.

**Task Groups:**
- 6.1 - Revisão de Testes e Gap Analysis (4-6h)

**Total:** 4-6 horas

---

## Cronograma de Fases

### Fase 1: Frequência Básica (ALTA PRIORIDADE)
**Duration:** 24-34 horas | **Agents:** backend-api, frontend-components

Cria a base para o sistema: modelo de dados, componentes de frequência, bloqueio automático.

1. **1.1** - backend-api: Schema extensão (6-8h) ← BLOQUEADOR
2. **1.2** - frontend-components: AttendanceGrid 3-estados (6-8h) ← Depende 1.1
3. **1.3** - backend-api: Auto-lock 18:00 (4-6h) ← Depende 1.1
4. **1.4** - frontend-components: UI Frequência (8-10h) ← Depende 1.2, 1.3

### Fase 2: Conteúdo Ministrado (ALTA PRIORIDADE)
**Duration:** 18-24 horas | **Agents:** backend-api, frontend-components

Implementa sistema de conteúdo estruturado segundo BNCC.

1. **2.1** - backend-api: API/Types (4-6h) ← Depende 1.1
2. **2.2** - frontend-components: Formulário BNCC (6-8h) ← Depende 2.1
3. **2.3** - frontend-components: Card-Based UI (8-10h) ← Depende 2.1, 2.2

### Fase 3: Sistema de Notas (MÉDIA PRIORIDADE)
**Duration:** 18-24 horas | **Agents:** backend-api, frontend-components

Implementa sistema de avaliação (notas para Fundamental I, relatórios para Infantil).

1. **3.1** - backend-api: Notas Fundamental I (6-8h) ← Depende 1.1
2. **3.2** - backend-api: Relatórios Infantil (6-8h) ← Depende 1.1
3. **3.3** - frontend-components: Boletim UI (6-8h) ← Depende 3.1, 3.2

### Fase 4: Relatórios e Exportação (MÉDIA PRIORIDADE)
**Duration:** 16-24 horas | **Agents:** backend-queries, backend-api, frontend-components

Implementa sistema de relatórios e exportação.

1. **4.1** - backend-queries: Relatórios Frequência (4-6h) ← Depende 1.1
2. **4.2** - backend-api: Bolsa Família Alerts (4-6h) ← Depende 1.1, 4.1
3. **4.3** - frontend-components: Export PDF/Excel (6-8h) ← Depende 4.1, 4.2
4. **4.4** - backend-queries: Content Reports (4-6h) ← Depende 2.1

### Fase 5: Polimento UX (BAIXA PRIORIDADE)
**Duration:** 12-18 horas | **Agents:** frontend-responsive, performance-optimizer, frontend-accessibility

Otimizações finais: mobile, performance, acessibilidade.

1. **5.1** - frontend-responsive: Mobile Optimization (4-6h)
2. **5.2** - performance-optimizer: Performance (4-6h)
3. **5.3** - frontend-accessibility: Accessibility (4-6h)

### Fase 6: Revisão e Validação (CRÍTICA)
**Duration:** 4-6 horas | **Agents:** implementation-verifier

Validação final, E2E tests, gap analysis.

1. **6.1** - implementation-verifier: Tests & Validation (4-6h)

---

## Paralelização Potencial

### Pode rodar em paralelo em Fase 1:
- **1.1 & 1.3** (ambas backend-api, ambas dependem 1.1, então 1.3 pode começar após 1.1)

### Pode rodar em paralelo em Fase 2:
- **2.2 & 2.3** podem começar assim que 2.1 terminar

### Pode rodar em paralelo em Fase 3:
- **3.1 & 3.2** (ambas backend-api, independentes entre si, ambas dependem 1.1)
- **3.3** espera 3.1 e 3.2

### Pode rodar em paralelo em Fase 4:
- **4.1** & **4.4** (ambas backend-queries, 4.4 depende 2.1 já completo)
- **4.2** espera 4.1 + 1.1
- **4.3** espera 4.1 + 4.2

### Pode rodar em paralelo em Fase 5:
- **5.1 & 5.2 & 5.3** podem rodar completamente em paralelo (todas têm mesmo nível de dependência)

---

## Resumo de Distribuição por Agente

| Agente | Task Groups | Horas | % do Total |
|--------|------------|-------|-----------|
| backend-api | 1.1, 1.3, 2.1, 3.1, 3.2, 4.2 | 30-42 | 31-44% |
| frontend-components | 1.2, 1.4, 2.2, 2.3, 3.3, 4.3 | 40-52 | 42-54% |
| backend-queries | 4.1, 4.4 | 8-12 | 8-12% |
| frontend-responsive | 5.1 | 4-6 | 4-6% |
| performance-optimizer | 5.2 | 4-6 | 4-6% |
| frontend-accessibility | 5.3 | 4-6 | 4-6% |
| implementation-verifier | 6.1 | 4-6 | 4-6% |

---

## Dependências Críticas (Bloqueadores)

1. **1.1** é bloqueador para: 1.2, 1.3, 2.1, 3.1, 3.2, 4.1, 4.2
2. **1.2** é bloqueador para: 1.4
3. **1.3** é bloqueador para: 1.4
4. **2.1** é bloqueador para: 2.2, 2.3, 4.4
5. **4.1** é bloqueador para: 4.2, 4.3
6. **3.1 + 3.2** são bloqueadores para: 3.3
7. **Fase 5** não pode começar até Fase 1-4 estarem completas

---

## Próximos Passos

1. ✅ **Orchestration.yml atualizado** com subagent assignments
2. ⏳ **Aguardando respostas do questionário** sobre 4 itens de confirmação (Bolsa Família, BNCC skills, templates, unlock permissions)
3. 🚀 **Pronto para iniciar Fase 1** com:
   - `backend-api` subagent: Task Group 1.1 (Database Schema)
   - `frontend-components` subagent: Task Group 1.2 (AttendanceGrid - em paralelo)

---

## Observações Importantes

- **Dependências respeitadas:** Nenhum task group iniciará antes de seus bloqueadores estarem completos
- **Parallelização:** Múltiplos subagents podem trabalhar em paralelo em diferentes task groups (ex: backend-api em 1.1 enquanto frontend-components prepara 1.2)
- **Flexibilidade:** Se respostas do questionário mudarem requisitos, este plano pode ser ajustado rapidamente
- **Validação contínua:** Cada task group tem critérios de aceitação explícitos em tasks.md
- **Feedback loop:** Implementation-verifier (6.1) identifica gaps e permite ajustes finais

---

## Métricas de Sucesso

- ✅ Todas as 18 task groups implementadas
- ✅ 28-36 testes E2E passando
- ✅ 100% das dependências respeitadas
- ✅ Requisitos de compliance BNCC atendidos
- ✅ Interface funcional em tablets, celulares, desktops
- ✅ Bloqueio automático 18:00 funcionando
- ✅ Relatórios exportáveis (PDF/Excel)
- ✅ Pronto para deploy Fevereiro 2025
