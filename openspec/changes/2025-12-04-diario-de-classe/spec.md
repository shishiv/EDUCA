# Specification: Diario de Classe (Class Diary)

## Goal

Sistema de diario de classe digital para professores da rede municipal de Fronteira/MG, permitindo registro de frequencia, conteudo ministrado e avaliacoes de forma estruturada, em conformidade com a BNCC e legislacao educacional brasileira.

## User Stories

- Como Professor, quero registrar a frequencia diaria dos meus alunos de forma rapida no tablet, para que eu possa focar no ensino e nao na burocracia
- Como Diretor, quero visualizar relatorios de frequencia e conteudo ministrado por turma, para acompanhar o cumprimento do curriculo e identificar alunos em risco de evasao
- Como Secretaria, quero exportar dados de frequencia para o Bolsa Familia e relatorios INEP, para cumprir as obrigacoes legais do municipio

## Specific Requirements

**Sistema de Frequencia com Tres Estados**
- Implementar estados P (Presente/verde), F (Falta/vermelho), A (Atestado/amarelo-laranja)
- Grid touch-friendly com celulas de no minimo 44px para facilitar uso em tablets
- Exibir resumo em tempo real (total presentes, ausentes, taxa de frequencia)
- Salvar automaticamente cada marcacao (optimistic update com sync indicator)

**Bloqueio Automatico as 18:00**
- Frequencia do dia bloqueia automaticamente as 18:00 horario de Sao Paulo
- Implementar via trigger no banco de dados (ja existe em migrations)
- Exibir icone de cadeado e desabilitar edicao apos bloqueio
- Funcao de desbloqueio restrita a perfis autorizados (A CONFIRMAR: quem pode desbloquear)

**Conteudo da Aula Estruturado (BNCC)**
- Campos: Tema/Conteudo, Objetivo, Habilidades BNCC, Metodologia, Recursos, Observacoes
- Ed. Infantil: usar Campos de Experiencia ao inves de disciplinas tradicionais
- Fundamental I: usar disciplinas tradicionais (Portugues, Matematica, etc.)
- Campo de selecao de habilidades BNCC com autocomplete (A CONFIRMAR: lista completa ou texto livre)

**Sistema de Notas - Fundamental I**
- Notas bimestrais de 0 a 10 (4 bimestres por ano)
- Professor leciona UMA disciplina por turma
- Estrutura existente na tabela `notas` pode ser reutilizada
- Calcular media automatica por bimestre e anual

**Sistema de Avaliacao - Ed. Infantil**
- Relatorio descritivo por Campo de Experiencia da BNCC
- Cinco campos: O eu/outro/nos, Corpo/gestos/movimentos, Tracos/sons/cores/formas, Escuta/fala/pensamento/imaginacao, Espacos/tempos/quantidades
- Periodicidade semestral ou conforme definido pela escola
- A CONFIRMAR: modelo/template especifico da rede municipal

**Alertas de Bolsa Familia**
- Destacar alunos com NIS que estao abaixo de 80% de frequencia
- Exibir badge/indicador visual na lista de alunos
- Relatorio especifico filtrando apenas alunos em risco
- A CONFIRMAR: como Atestado (A) conta no calculo de 80%

**Relatorios e Exportacao**
- Frequencia por aluno (individual) e por turma (agregado)
- Bolsa Familia: lista de alunos com NIS abaixo do limite
- Conteudo ministrado por periodo com habilidades BNCC trabalhadas
- Boletim individual do aluno (notas ou relatorio descritivo)
- Exportacao em PDF e Excel (usar jspdf e xlsx ja instalados)

**Interface Card-Based Responsiva**
- Design baseado no mockup `diario.html` - lista de cards clicaveis
- Cada aula e um card com: data, disciplina/tema, resumo, taxa de frequencia
- Painel lateral para detalhes da aula selecionada
- Modal para nova aula e edicao
- Responsivo: desktop (sidebar fixa), tablet (sidebar colapsavel), mobile (bottom nav)

## Visual Design

**`planning/visuals/diario.html`**
- Layout duas colunas: lista de cards (esquerda), detalhes (direita/painel sticky)
- Cards com borda esquerda colorida (azul), hover com sombra e elevacao
- Header azul escuro (#1e40af) com logo EDUCA
- Sidebar fixa 240px com navegacao por icones
- Botao "+ NOVA AULA" verde destacado no topo da lista
- Modal para criacao de nova aula com campos: data, disciplina, conteudo, descricao

**`planning/visuals/frequencia.html`**
- Grid de frequencia estilo planilha com colunas por dia da semana
- Coluna fixa com nome do aluno (sticky left)
- Celulas clicaveis que alternam entre estados (vazio -> P -> F -> A)
- Cores: verde (#dcfce7) para presente, vermelho (#fee2e2) para falta, amarelo (#fef3c7) para atestado
- Alerta vermelho destacando alunos em risco (< 80% frequencia)
- Botao "SALVAR FREQUENCIA" fixo no bottom center

**`planning/visuals/diario-papel.html`**
- Visualizacao mensal completa estilo diario de papel tradicional
- Tabela com todos os dias do mes como colunas
- Coluna de total de faltas por aluno
- Secao de conteudo ministrado por dia (grid de inputs)
- Painel lateral deslizante com ficha do aluno (dados, notas, observacoes)
- Seletor de mes com navegacao anterior/proximo

## Existing Code to Leverage

**`gestao_fronteira/components/attendance/AttendanceGrid.tsx`**
- Grid touch-optimized com celulas de 44px minimo
- Suporte a operacoes em lote (marcar todos presentes/ausentes)
- Real-time sync com indicador de status (online/offline/syncing)
- Busca por nome do aluno
- Ja implementa estados presente/ausente - estender para incluir Atestado

**`gestao_fronteira/components/diary/class-diary-detail.tsx`**
- Modal de detalhes da sessao com estatisticas de frequencia
- Barra de progresso visual para porcentagem de frequencia
- Lista de alunos com indicador colorido (presente/ausente)
- Exibicao de hash de integridade legal - reutilizar para compliance

**`gestao_fronteira/lib/api/class-diary.ts`**
- Funcoes getClassDiary, getAttendanceHistory, getClassDetail ja implementadas
- Interfaces TypeScript: ClassDiaryEntry, AttendanceHistoryRecord, DetailedSession
- Filtros por turma, professor, data, status
- Estender para incluir campos BNCC e novo sistema de avaliacao

**`gestao_fronteira/supabase/migrations/20250924001_attendance_immutability_system.sql`**
- Sistema de imutabilidade ja implementado
- Trigger check_attendance_immutability previne alteracoes apos fechamento
- Funcao auto_close_expired_sessions fecha sessoes as 18:00
- Audit trail completo para compliance legal

**`gestao_fronteira/supabase/migrations/20250628095207_wild_block.sql`**
- Tabela `notas` ja existe com: matricula_id, disciplina, bimestre (1-4), nota (0-10)
- Tabela `frequencia` ja existe com: matricula_id, data_aula, presente, justificativa
- Estender frequencia para incluir status_presenca (P/F/A) e sessao_id

## Out of Scope

- Professor substituto com login proprio (adiado para versao futura)
- Modo offline completo com sincronizacao (bom ter, nao bloqueante para MVP)
- App mobile nativo (usar PWA responsivo)
- Importacao de dados de sistemas legados
- Gerenciamento de calendario escolar (assumir calendario fixo)
- Comunicacao direta com responsaveis (notificacoes, mensagens)
- Integracao automatica com sistema do Bolsa Familia (exportacao manual)
- Planejamento de aulas futuras (foco em registro do que foi ministrado)
- Controle de materiais e recursos da escola
- Sistema de recuperacao paralela ou reforco escolar

---

## Itens Pendentes de Confirmacao

1. **Atestado no Bolsa Familia:** Verificar com a Secretaria se atestado medico (A) conta como presenca ou falta no calculo de 80% para condicionalidade educacional

2. **Formato do Relatorio Descritivo:** Existe modelo/template padrao que a rede municipal usa atualmente para os relatorios de desenvolvimento da Ed. Infantil?

3. **Habilidades BNCC:** Precisamos de lista completa das habilidades para selecao no sistema, ou professor digita texto livre?

4. **Desbloqueio de Frequencia:** Quem pode desbloquear frequencia apos 18:00? Apenas Diretor? Secretaria tambem? Requer justificativa?

---

## Fases de Implementacao

**Fase 1 - Frequencia Basica (Prioridade Alta)**
- Grid de frequencia com 3 estados (P/F/A)
- Bloqueio automatico as 18:00
- Visualizacao por turma e dia
- Integracao com AttendanceGrid existente

**Fase 2 - Conteudo Ministrado (Prioridade Alta)**
- Formulario estruturado BNCC
- Diferenciacao Ed. Infantil vs Fundamental I
- Historico de aulas por turma

**Fase 3 - Sistema de Notas (Prioridade Media)**
- Lancamento de notas bimestrais (Fundamental I)
- Relatorios descritivos (Ed. Infantil)
- Boletim do aluno

**Fase 4 - Relatorios e Exportacao (Prioridade Media)**
- Relatorio de frequencia individual e por turma
- Alerta Bolsa Familia
- Exportacao PDF/Excel

**Fase 5 - Polimento UX (Prioridade Baixa)**
- Otimizacao mobile
- Melhorias de performance
- Feedback visual aprimorado
