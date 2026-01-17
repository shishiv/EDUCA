# Pesquisa de Projeto: EDUCA UI/UX Refactoring

**Sintetizado:** 2026-01-17
**Domínio:** Refatoração de UI/UX - Sistema de Gestão Escolar Municipal
**Confiança Geral:** MÉDIA-ALTA

---

## Resumo Executivo

A pesquisa de ecossistema para o projeto de refatoração UI/UX do EDUCA revelou um cenário favorável para modernização, com stack madura e padrões bem estabelecidos. O projeto pode aproveitar a evolução recente do Tailwind CSS v4 e shadcn/ui para criar um design system robusto, mas deve priorizar **estabilidade sobre inovação** dado que é um sistema em produção com compliance crítico.

### Descobertas Principais

1. **Stack pronta para modernização:** Tailwind v4 + shadcn/ui + CSS variables formam uma arquitetura CSS-first que simplifica tokens de design. A migração é viável mas deve ser feita em fase separada.

2. **Padrões BNCC bem definidos:** Os 5 Campos de Experiência têm representação visual estabelecida (cores específicas). A avaliação é descritiva, nunca classificatória.

3. **Arquitetura em camadas é o padrão:** Tokens > Primitivos > Padrões > Templates. Migração incremental (Strangler Fig) é mandatória para brownfield.

4. **Compliance é não-negociável:** LGPD para dados de menores, imutabilidade de frequência, auto-lock 18h NUNCA devem ser alterados durante refatoração visual.

5. **Usuários com baixa literacia digital:** ~50% da população brasileira tem alfabetização insuficiente para interfaces complexas. Design deve priorizar descobribilidade sobre minimalismo.

---

## Síntese por Dimensão

### Stack (Confiança: ALTA)

| Decisão | Recomendação | Rationale |
|---------|--------------|-----------|
| Tailwind | Migrar para v4.1.x | CSS-first, @theme simplifica tokens, 5x mais rápido |
| Tokens | CSS Variables + @theme | Fonte única de verdade, theming em runtime |
| Cores | OKLCH (não HSL) | Uniformidade perceptual, padrão v4 |
| Fontes | next/font | Auto-hospedagem, zero CLS |
| Animações | tw-animate-css | Substitui tailwindcss-animate deprecado |
| Componentes | CVA + shadcn/ui | Type-safe variants, zero runtime |

**Ação imediata:** Validar suporte de browsers nas escolas (Tailwind v4 requer Safari 16.4+, Chrome 111+).

### Features UX (Confiança: MÉDIA)

**Table Stakes (obrigatórias):**
- Login simples com "manter conectado"
- Chamada com salvamento automático
- Frequência imutável após período
- Alertas Bolsa Família < 80%
- Responsivo mobile/tablet
- Funcionamento offline

**Diferenciadoras:**
- Diário Infantil BNCC com cores dos Campos
- Gerador de Relatório Individual
- Integração WhatsApp
- Modo offline-first com sync inteligente

**Anti-features (NÃO construir):**
- Edição retroativa de frequência
- Notas numéricas para Ed. Infantil
- Gamificação para alunos
- Customização excessiva de interface

### Arquitetura (Confiança: ALTA)

**Estrutura de camadas:**
```
1. Tokens (CSS variables) → Fundação
2. Primitivos (shadcn/ui customizado) → Button, Input, Card
3. Padrões (composições EDUCA) → StatCard, DataTable, AlertItem
4. Templates (layouts de página) → DashboardLayout, FormLayout
```

**Ordem de build crítica:**
1. Tokens → 2. Button → 3. Input → 4. Card → 5. Badge → 6. Avatar
7. StatCard → 8. Sidebar → 9. Header → 10. DataTable

**Estratégia de migração:** Strangler Fig - novos componentes coexistem com antigos, substituição gradual.

### Pitfalls (Confiança: MÉDIA)

**Top 5 riscos críticos:**

| # | Pitfall | Severidade | Prevenção |
|---|---------|------------|-----------|
| 1 | Sem testes de regressão visual | Alta | Chromatic/Percy ANTES de começar |
| 2 | Big Bang migration | Alta | Feature flags, rollout gradual |
| 3 | Quebrar compliance (frequência/lock) | Crítica | Testes E2E, nunca refatorar junto |
| 4 | Vazamento RLS Supabase | Crítica | Nunca desabilitar RLS para testar |
| 5 | Ignorar baixa literacia digital | Alta | Ícones COM texto, feedback visual |

---

## Implicações para Roadmap

Baseado na pesquisa, a estrutura de fases sugerida:

### Fase 0: Preparação e Baseline
**Objetivo:** Criar infraestrutura de segurança antes de qualquer mudança visual.

- **Implementa:** Storybook + Chromatic para visual regression
- **Evita:** Pitfall #1 (sem testes visuais)
- **Entregável:** Baseline visual de todas as telas, CI configurado

### Fase 1: Design Tokens
**Objetivo:** Estabelecer fundação do design system sem impacto visual.

- **Implementa:** CSS variables em globals.css, atualizar tailwind.config
- **Usa:** Arquitetura de tokens (STACK.md)
- **Evita:** Pitfall #4 (Tailwind v4 sem auditoria)
- **Entregável:** Tokens funcionando, documentados

### Fase 2: Primitivos UI
**Objetivo:** Customizar componentes base shadcn/ui com tokens EDUCA.

- **Implementa:** Button, Input, Card, Badge, Avatar, Label
- **Usa:** CVA patterns (STACK.md), ordem de build (ARCHITECTURE.md)
- **Evita:** Pitfall #8 (sobrescrever shadcn customizado)
- **Entregável:** 6 primitivos migrados, funcionando

### Fase 3: Layout Principal
**Objetivo:** Modernizar shell da aplicação (Sidebar + Header).

- **Implementa:** Sidebar fixa, Header com busca/notificações
- **Evita:** Pitfall #7 (ignorar baixa literacia - manter navegação previsível)
- **Entregável:** Layout novo em todas as páginas, responsivo

### Fase 4: Padrões Compostos
**Objetivo:** Criar componentes EDUCA-específicos reutilizáveis.

- **Implementa:** StatCard, PageHeader, DataTable, AlertItem
- **Usa:** Padrões de composição (ARCHITECTURE.md)
- **Entregável:** 4 padrões prontos para uso nas telas

### Fase 5: Telas Principais
**Objetivo:** Refatorar 5 telas existentes uma a uma.

- **Implementa:** Login → Dashboard → Turmas → Chamada → Aluno
- **Evita:** Pitfall #2 (big bang), #3 (quebrar compliance na Chamada)
- **Usa:** Feature flags por tela, rollout gradual
- **Entregável:** 5 telas modernizadas, compatíveis

### Fase 6: Diário Infantil BNCC
**Objetivo:** Implementar módulo novo seguindo design system.

- **Implementa:** Campos de Experiência (5 cores), Registro de Vivências, Relatórios
- **Usa:** Padrões BNCC (FEATURES.md), cores específicas
- **Entregável:** Módulo completo de Ed. Infantil

---

## Rationale de Ordenamento

1. **Fase 0 primeiro:** Pesquisa de Pitfalls identificou que 90% dos problemas vêm de falta de baseline visual. Sem isso, impossível detectar regressões.

2. **Tokens antes de componentes:** Arquitetura em camadas exige fundação sólida. Tokens são aditivos (não quebram nada).

3. **Primitivos antes de layout:** Sidebar e Header dependem de Button e Avatar. Ordem de build de ARCHITECTURE.md.

4. **Layout antes de telas:** Impacto visual imediato em todas as páginas, valida tokens em produção.

5. **Chamada por último nas telas:** PITFALLS.md identifica como mais arriscada (compliance). Deixar para quando equipe estiver experiente.

6. **Diário Infantil no final:** É módulo novo (greenfield dentro de brownfield). Pode usar 100% do novo design system.

---

## Research Flags para Fases

| Fase | Pesquisa Adicional Necessária? | Motivo |
|------|-------------------------------|--------|
| Fase 0 | Não | Padrões estabelecidos (Chromatic/Storybook) |
| Fase 1 | **Sim - browsers** | Validar suporte nas escolas antes de Tailwind v4 |
| Fase 2 | Não | shadcn/ui bem documentado |
| Fase 3 | Parcial | Testar sidebar em mobile com usuários reais |
| Fase 4 | Não | Composição de primitivos já pesquisados |
| Fase 5 | **Sim - Chamada** | Documentar fluxo de compliance antes de refatorar |
| Fase 6 | Parcial | Confirmar cores BNCC com materiais oficiais MEC |

---

## Questões em Aberto

### Alta Prioridade (resolver antes de começar)
1. **Browsers das escolas:** Tailwind v4 requer browsers modernos. Validar com TI municipal.
2. **Estratégia de feature flags:** Usar biblioteca externa (Unleash) ou implementação simples com Supabase?

### Média Prioridade (resolver durante execução)
3. **Formato Sistema Presença:** Manual técnico não encontrado para exportação Bolsa Família.
4. **Requisitos SEE-MG:** Minas Gerais pode ter requisitos estaduais adicionais.

### Baixa Prioridade (nice to have)
5. **Benchmark visual concorrentes:** Screenshots de Sponte, Lyceum para referência.
6. **Entrevistas com professores:** Validar prioridades de UX com usuários reais.

---

## Avaliação de Confiança

| Área | Confiança | Fontes |
|------|-----------|--------|
| Stack/Tailwind v4 | ALTA | Docs oficiais, release notes |
| shadcn/ui patterns | ALTA | Docs oficiais, npm registry |
| Padrões BNCC | ALTA | MEC oficial |
| Features UX mercado | MÉDIA | Pesquisa web, sem validação usuário |
| Pitfalls técnicos | ALTA | Docs oficiais + experiência documentada |
| Pitfalls compliance | MÉDIA | Guias MPCE/Serpro, não ANPD oficial |
| Arquitetura migração | ALTA | Padrões estabelecidos (Strangler Fig) |

---

## Arquivos de Pesquisa

| Arquivo | Conteúdo | Linhas |
|---------|----------|--------|
| [STACK.md](./STACK.md) | Recomendações de tecnologia, versões, rationale | ~450 |
| [FEATURES.md](./FEATURES.md) | Table stakes, diferenciadoras, padrões BNCC | ~315 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Estrutura de diretórios, camadas, ordem de build | ~610 |
| [PITFALLS.md](./PITFALLS.md) | 10 riscos críticos, prevenção, checklist | ~350 |

---

## Próximos Passos

1. **Validar browsers** com TI municipal de Fronteira
2. **Aprovar estrutura de fases** com stakeholders
3. Executar `/gsd:define-requirements` para criar critérios de aceite
4. Executar `/gsd:create-roadmap` para formalizar fases

---

*Pesquisa sintetizada: 2026-01-17*
*Válido até: 2026-02-17 (30 dias)*
