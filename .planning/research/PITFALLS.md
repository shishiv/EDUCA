# Pesquisa de Pitfalls: Refatoracao de UI/UX EDUCA

**Data:** 2026-01-17
**Dominio:** Refatoracao UI Brownfield - Sistema Escolar Municipal
**Confianca Geral:** MEDIA (combinacao de fontes oficiais + pesquisa web)

---

## Resumo Executivo

Projetos de refatoracao de UI em sistemas brownfield enfrentam riscos unicos que diferem significativamente de projetos greenfield. O sistema EDUCA apresenta complexidade adicional por ser um sistema em producao com usuarios ativos, requisitos de compliance brasileiro (LGPD para dados de menores, imutabilidade de frequencia, auto-lock 18h), e uma base de codigo com debito tecnico significativo identificado na analise de concerns.

Os pitfalls mais criticos para este projeto se dividem em tres categorias: (1) **Regressoes funcionais** - quebrar funcionalidades existentes durante modernizacao visual; (2) **Compliance brasileiro** - violar LGPD ou perder funcionalidades de auditoria educacional; (3) **Experiencia do usuario** - alienar usuarios com baixa familiaridade tecnologica atraves de mudancas abruptas.

A estrategia de prevencao central deve ser **incremental e reversivel**: feature flags para rollout gradual, testes visuais automatizados, e manutencao de compatibilidade retroativa durante a transicao. O projeto deve priorizar a nao-regressao de funcionalidades de compliance acima de melhorias esteticas.

---

## Pitfalls Criticos

### 1. Refatorar UI Sem Testes de Regressao Visual

- **Descricao:** Modificar componentes visuais sem mecanismo automatizado para detectar mudancas inesperadas. Cada mudanca de CSS ou componente pode quebrar layouts em outras partes do sistema.
- **Sinais de Alerta:**
  - "Funciona no meu ambiente" mas quebra em producao
  - Usuarios reportam que "algo mudou" sem conseguir explicar o que
  - Bugs visuais descobertos semanas depois do deploy
  - Componentes compartilhados causam efeito cascata inesperado
- **Prevencao:**
  - Implementar Chromatic ou Percy antes de qualquer refatoracao
  - Criar baseline visual de TODAS as telas atuais antes de comecar
  - Configurar CI/CD para bloquear merge se houver mudancas visuais nao aprovadas
  - Usar Storybook para isolar e documentar componentes
- **Fase Relevante:** Fase 0 (Preparacao) - ANTES de qualquer mudanca de UI
- **Severidade:** Alta

### 2. Big Bang ao Inves de Migracao Incremental

- **Descricao:** Tentar refatorar todas as telas de uma vez, criando um longo periodo onde o sistema esta "em obras" e instavel. Fontes indicam que este e o erro mais comum em projetos de refatoracao.
- **Sinais de Alerta:**
  - Branch de feature com semanas de idade e centenas de arquivos modificados
  - "Vai ficar pronto quando todas as telas estiverem atualizadas"
  - Conflitos de merge constantes com main
  - Impossibilidade de fazer rollback parcial
- **Prevencao:**
  - Usar feature flags (LaunchDarkly, Unleash, ou flags simples) para cada tela
  - Migrar uma tela por vez, com deploy em producao apos cada uma
  - Manter ambas as versoes (antiga e nova) funcionando simultaneamente
  - Rollout gradual: 10% -> 25% -> 50% -> 100% dos usuarios
  - Definir criterio de sucesso para cada tela antes de avancar
- **Fase Relevante:** Todas as fases de implementacao
- **Severidade:** Alta

### 3. Modificar Componentes de Compliance Durante Refatoracao

- **Descricao:** Acidentalmente alterar comportamento de funcionalidades criticas de compliance enquanto melhora a UI. O sistema EDUCA tem: imutabilidade de frequencia, auto-lock 18h, tracking Bolsa Familia.
- **Sinais de Alerta:**
  - Formularios de frequencia que antes nao permitiam edicao agora permitem
  - Auto-lock nao funcionando apos mudanca de UI
  - Alertas de compliance (<80% frequencia) desaparecendo
  - Auditoria de dados parando de funcionar
- **Prevencao:**
  - **NUNCA refatorar** `attendance-locking.ts` ou componentes de frequencia junto com UI
  - Criar testes E2E especificos para fluxos de compliance ANTES da refatoracao
  - Documentar comportamento esperado de cada regra de compliance
  - Review obrigatorio por pessoa que conhece regras de negocio
  - Manter logs de auditoria funcionando durante toda transicao
- **Fase Relevante:** Fase de refatoracao de Chamada/Frequencia
- **Severidade:** Critica (risco legal)

### 4. Migrar para Tailwind v4 Sem Auditoria de Compatibilidade

- **Descricao:** O projeto usa Tailwind 3.3.3 e tailwindcss-animate 1.0.7. A migracao para Tailwind v4 envolve mudancas significativas: CSS-first config, mudanca de nomes de variaveis, border-color default alterado.
- **Sinais de Alerta:**
  - Classes Tailwind que param de funcionar sem erro obvio
  - Cores aplicadas incorretamente apos upgrade
  - Animacoes parando de funcionar (tailwindcss-animate foi deprecado)
  - Color picker do VS Code / DevTools nao funcionando com variaveis HSL
- **Prevencao:**
  - Manter Tailwind 3.x durante refatoracao inicial
  - Se migrar para v4: usar codemod `@tailwindcss/upgrade@next`
  - Substituir `tailwindcss-animate` por `tw-animate-css`
  - Testar em navegadores antes de upgrade (v4 usa features bleeding-edge)
  - Fazer upgrade de Tailwind em fase separada da refatoracao de componentes
- **Fase Relevante:** Fase de design system / tokens
- **Severidade:** Media

### 5. Quebrar Service Worker / PWA Offline

- **Descricao:** O EDUCA e PWA com suporte offline. Mudancas em rotas, nomes de arquivos, ou estrutura de cache podem quebrar funcionamento offline silenciosamente.
- **Sinais de Alerta:**
  - App funciona online mas mostra erro offline
  - Usuarios rurais (com internet instavel) nao conseguem usar
  - Cache desatualizado servindo versao antiga indefinidamente
  - Console mostra erros de service worker
- **Prevencao:**
  - Testar offline apos CADA deploy (DevTools > Application > Offline)
  - Manter estrategia de cache consistente (cache-first para assets estaticos)
  - Versionar assets corretamente para invalidar cache
  - Implementar mecanismo de atualizacao forcada de service worker
  - Usar Workbox para gerenciar cache de forma segura
- **Fase Relevante:** Toda fase que altere estrutura de arquivos ou rotas
- **Severidade:** Alta (usuarios rurais dependem de offline)

### 6. Perder Isolamento RLS Durante Refatoracao

- **Descricao:** Row Level Security do Supabase garante que cada escola ve apenas seus dados. Mudancas em queries ou estrutura de dados podem acidentalmente expor dados entre escolas.
- **Sinais de Alerta:**
  - Usuario ve dados de outra escola
  - Erro de permissao apos refatoracao de componente
  - Tabela retornando dados vazios apos habilitar RLS
  - Policies de UPDATE falhando (requerem USING e WITH CHECK)
- **Prevencao:**
  - NUNCA desabilitar RLS para "testar"
  - Testar com usuarios de diferentes escolas apos cada mudanca de query
  - Manter policies RLS em migrations versionadas
  - Usar service_role APENAS em server-side, nunca no client
  - Revisar mudancas em hooks/lib/api que acessam Supabase
- **Fase Relevante:** Qualquer fase que modifique data fetching
- **Severidade:** Critica (vazamento de dados de menores)

### 7. Ignorar Usuarios com Baixa Familiaridade Tecnologica

- **Descricao:** Professores e funcionarios municipais podem ter baixa alfabetizacao digital. UI moderna pode ser confusa se nao for intuitiva. Pesquisas indicam que ~50% da populacao brasileira tem alfabetizacao insuficiente para uso autonomo de interfaces complexas.
- **Sinais de Alerta:**
  - Aumento de chamadas de suporte apos mudanca de UI
  - Usuarios reclamando que "nao acham mais" funcionalidades
  - Abandono do sistema por usuarios mais velhos
  - Tarefas simples levando mais tempo que antes
- **Prevencao:**
  - Manter navegacao em locais previsiveis (sidebar, header)
  - Usar icones COM texto, nao apenas icones
  - Feedback visual claro para acoes (loading, sucesso, erro)
  - Testar com usuarios reais (professores) antes de deploy amplo
  - Priorizar descobribilidade sobre estetica minimalista
  - Manter atalhos e fluxos antigos funcionando durante transicao
- **Fase Relevante:** Toda fase de implementacao
- **Severidade:** Alta

### 8. Sobrescrever Componentes shadcn/ui Customizados

- **Descricao:** O CLI do shadcn/ui sobrescreve componentes existentes. Customizacoes especificas do EDUCA podem ser perdidas.
- **Sinais de Alerta:**
  - Comportamento de componente muda apos `npx shadcn-ui add`
  - Cores ou estilos voltam ao padrao
  - Logica customizada desaparece
  - Git diff mostra delecao de codigo customizado
- **Prevencao:**
  - Commitar TODAS as mudancas antes de rodar CLI do shadcn
  - Revisar diff apos qualquer comando do CLI
  - Documentar customizacoes em comentarios nos componentes
  - Considerar wrapper components para customizacoes pesadas
  - Manter lista de componentes customizados em documentacao
- **Fase Relevante:** Fase de design system
- **Severidade:** Media

### 9. Criar "Flag Debt" com Feature Flags Abandonadas

- **Descricao:** Feature flags facilitam rollout gradual, mas se nao forem removidas apos migracao completa, criam complexidade permanente no codigo.
- **Sinais de Alerta:**
  - Condicoes `if (newUI)` espalhadas por dezenas de arquivos
  - Ninguem sabe quais flags estao ativas
  - Codigo duplicado (versao antiga e nova coexistindo)
  - Performance degradada por avaliacoes de flag constantes
- **Prevencao:**
  - Definir data de expiracao para cada flag
  - Criar task de cleanup para remover flag apos rollout 100%
  - Preferir flags no nivel de rota/pagina, nao componente
  - Documentar todas as flags ativas em um lugar central
  - Revisar flags mensalmente
- **Fase Relevante:** Apos cada fase de implementacao
- **Severidade:** Media

### 10. Nao Testar Mudancas em Diferentes Perfis de Usuario

- **Descricao:** O EDUCA tem multiplos perfis (admin, diretor, professor, secretaria) com diferentes permissoes e dashboards. Refatoracao pode funcionar para um perfil mas quebrar outro.
- **Sinais de Alerta:**
  - "Funciona para admin mas professor nao ve nada"
  - Elementos de UI aparecendo/sumindo incorretamente por perfil
  - Rotas protegidas ficando acessiveis ou inacessiveis
  - Dados filtrados incorretamente por escola/turma
- **Prevencao:**
  - Criar usuarios de teste para CADA perfil
  - Checklist de QA manual incluindo todos os perfis
  - Testes E2E com diferentes roles
  - Revisar middleware de auth apos mudancas de rotas
- **Fase Relevante:** Todas as fases
- **Severidade:** Alta

---

## Pitfalls Especificos do Contexto Brasileiro

### LGPD

**1. Expor Dados de Menores na UI Refatorada**
- **Risco:** CPF, NIS, endereco de criancas visivel em telas que nao deveriam mostrar
- **Prevencao:** Revisar TODAS as telas que mostram dados pessoais; aplicar mascara em dados sensiveis por padrao
- **Fase:** Refatoracao de Perfil do Aluno, Matriculas

**2. Perder Consentimento Durante Migracao de Dados**
- **Risco:** LGPD exige consentimento especifico dos pais para dados de menores
- **Prevencao:** Nao modificar estrutura de dados de consentimento; manter audit trail
- **Fase:** Qualquer fase que altere schema do banco

**3. Logging Excessivo com Dados Pessoais**
- **Risco:** Logs de debug expondo dados de alunos em ferramentas de monitoramento
- **Prevencao:** Sanitizar logs; nunca logar CPF, NIS, nome completo; usar IDs opacos
- **Fase:** Toda fase (especialmente durante debug de refatoracao)

**4. Comunicar Incidente de Seguranca**
- **Risco:** LGPD Art. 48 exige comunicacao a ANPD em caso de vazamento
- **Prevencao:** Ter plano de resposta a incidentes documentado ANTES de refatorar
- **Fase:** Fase 0 (Preparacao)

### Acessibilidade

**1. Perder Conformidade WCAG Durante Redesign**
- **Risco:** Design moderno pode reduzir contraste, remover labels, quebrar navegacao por teclado
- **Prevencao:** Lighthouse score >= 90 como gate; testar com leitor de tela; validar contraste
- **Fase:** Toda fase de implementacao

**2. Ignorar eMAG (Modelo de Acessibilidade em Governo Eletronico)**
- **Risco:** Por ser sistema de orgao publico municipal, deve seguir eMAG alem de WCAG
- **Prevencao:** Consultar checklist eMAG; validar com ferramenta ASES
- **Fase:** Fase de design system

**3. Animacoes Causando Problemas para Usuarios Sensiveis**
- **Risco:** Animacoes podem causar nausea/desconforto em pessoas com vestibular disorders
- **Prevencao:** Respeitar `prefers-reduced-motion`; animacoes opcionais
- **Fase:** Fase de design system

**4. Formularios Complexos Sem Assistencia**
- **Risco:** Formularios de matricula sao extensos; usuarios podem abandonar
- **Prevencao:** Validacao inline; salvamento automatico de rascunho; progress indicator
- **Fase:** Refatoracao de Matriculas, Cadastro de Aluno

### Usuarios com Baixa Familiaridade Tecnologica

**1. Mudancas de Layout Desorientam Usuarios Habituados**
- **Risco:** Professor que memorizou "terceiro botao da esquerda" nao acha mais funcao
- **Prevencao:** Transicao gradual com periodo de coexistencia; tutorial de mudancas
- **Fase:** Toda fase de implementacao

**2. Termos Tecnicos na Interface**
- **Risco:** Usar jargao (dashboard, toggle, dropdown) confunde usuarios
- **Prevencao:** Usar termos em portugues simples; "Painel Principal", "Ativar/Desativar"
- **Fase:** Fase de design system (definir vocabulario UI)

**3. Esconder Funcoes em Menus Profundos**
- **Risco:** Funcoes frequentes escondidas em menus de tres niveis
- **Prevencao:** Atalhos na sidebar; acoes primarias sempre visiveis; busca global
- **Fase:** Fase de layout (Sidebar + Header)

**4. Feedback Insuficiente para Acoes**
- **Risco:** Usuario clica e nada acontece visivelmente; clica de novo; duplica acao
- **Prevencao:** Loading states claros; toasts de confirmacao; desabilitar botao apos clique
- **Fase:** Toda fase de componentes

---

## Checklist de Prevencao

### Antes de Iniciar Qualquer Fase

- [ ] Baseline visual criado (screenshots de todas as telas atuais)
- [ ] Ferramenta de visual regression configurada (Chromatic/Percy)
- [ ] Feature flag preparada para a fase
- [ ] Criterio de sucesso definido (o que significa "pronto"?)
- [ ] Usuarios de teste de todos os perfis disponiveis

### Antes de Cada Pull Request

- [ ] Testes visuais passando (sem regressoes ou regressoes aprovadas)
- [ ] Testado em todos os perfis de usuario relevantes
- [ ] Testado offline (PWA continua funcionando)
- [ ] Contraste verificado (Lighthouse accessibility >= 90)
- [ ] Funcionalidades de compliance intactas (frequencia, auto-lock)
- [ ] Nenhum dado pessoal exposto em logs de debug

### Antes de Deploy para Producao

- [ ] Rollout gradual configurado (comecar com 10%)
- [ ] Metricas de monitoramento em alerta (erros, abandono)
- [ ] Rollback plan documentado
- [ ] Comunicacao para usuarios sobre mudancas (se significativas)

### Apos Rollout 100%

- [ ] Feature flag removida do codigo
- [ ] Versao antiga do componente deletada
- [ ] Documentacao atualizada
- [ ] Feedback de usuarios coletado e triado

---

## Fontes Consultadas

### Fontes Primarias (ALTA confianca)

- Documentacao oficial shadcn/ui Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4
- Supabase RLS Docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- WCAG 2.2 em Portugues: https://www.w3c.br/traducoes/wcag/wcag22-pt-BR/
- eMAG Governo Eletronico: https://emag.governoeletronico.gov.br/

### Fontes Secundarias (MEDIA confianca)

- VFunction - 7 Pitfalls to Avoid in Refactoring: https://vfunction.com/blog/7-pitfalls-to-avoid-in-application-refactoring-projects/
- Percy vs Chromatic Comparison: https://medium.com/@crissyjoshua/percy-vs-chromatic-which-visual-regression-testing-tool-to-use-6cdce77238dc
- Chromatic Visual Testing: https://www.chromatic.com/blog/how-to-run-visual-regression-tests-in-2023/
- Supabase RLS Issues: https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/
- Feature Flags Best Practices: https://codepushgo.com/blog/feature-flags-best-practices/
- Scalable Strategy for Migrating Legacy Front-Ends: https://medium.com/@sir.raminyavari/a-scalable-strategy-for-migrating-legacy-front-ends-to-next-js-d87b27830aca

### Fontes de Compliance Brasileiro (MEDIA confianca)

- LGPD nas Escolas - OAB Campinas: https://oabcampinas.org.br/lgpd-nas-escolas-os-impactos-nos-procedimentos-e-cotidiano/
- LGPD aplicada a Educacao - Serpro: https://www.serpro.gov.br/lgpd/noticias/2020/educacao-lgpd/
- Guia Tratamento Dados Criancas - MPCE: https://www.mpce.mp.br/wp-content/uploads/2023/10/Guia-orientativo-de-tratamento-de-dados-pessoais-de-criancas-e-adolescentes.pdf
- Usabilidade para Analfabetos e Idosos: https://www.researchgate.net/publication/220737364_Usabilidade_acessibilidade_e_inteligibilidade_aplicadas_em_interfaces_para_analfabetos_idosos_e_pessoas_com_deficiencia

### Analise Interna do Projeto (ALTA confianca)

- `.planning/codebase/CONCERNS.md` - Identificacao de debito tecnico existente
- `.planning/codebase/STACK.md` - Stack tecnologico atual
- `.planning/PROJECT.md` - Escopo e metas do projeto

---

## Mapeamento Pitfall-Fase

| Pitfall | Fase 0 (Prep) | Fase 1 (Tokens) | Fase 2 (Layout) | Fase 3 (Telas) | Fase 4 (Infantil) |
|---------|---------------|-----------------|-----------------|----------------|-------------------|
| Testes visuais ausentes | **CRITICO** | - | - | - | - |
| Big bang | - | Medio | Alto | Alto | Medio |
| Compliance quebrado | - | - | - | **CRITICO** | Medio |
| Tailwind v4 | - | **ALTO** | Medio | - | - |
| PWA offline | - | - | Alto | Alto | Medio |
| RLS vazamento | - | - | - | Alto | Alto |
| Baixa familiaridade | - | Baixo | Alto | Alto | Alto |
| shadcn overwrite | - | Alto | Medio | Baixo | Baixo |
| Flag debt | - | - | Medio | Alto | Medio |
| Perfis nao testados | - | - | Medio | Alto | Alto |

---

*Pesquisa: 2026-01-17*
*Validade estimada: 60 dias (exceto compliance LGPD - verificar atualizacoes da ANPD)*
