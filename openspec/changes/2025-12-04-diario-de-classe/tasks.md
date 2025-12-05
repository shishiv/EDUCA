# Detalhamento de Tarefas: Diario de Classe

## Visao Geral

**Total de Fases:** 5
**Timeline:** Pronto para Fevereiro 2025 (inicio do ano letivo)
**Usuario Principal:** Professor
**Dispositivos:** Tablets, celulares, desktops

## Legenda de Tamanho

| Tamanho | Estimativa | Descricao |
|---------|------------|-----------|
| XS | 1-2h | Tarefa simples, modificacao pequena |
| S | 2-4h | Tarefa pequena, um componente ou funcao |
| M | 4-8h | Tarefa media, varios arquivos |
| L | 8-16h | Tarefa grande, feature completa |
| XL | 16-32h | Tarefa muito grande, modulo inteiro |

---

## Fase 1 - Frequencia Basica (Prioridade Alta)

### Grupo 1.1: Extensao do Schema de Banco de Dados
**Dependencias:** Nenhuma
**Especialidade:** Database/Backend
**Status:** COMPLETED (2025-12-05)

- [x] **1.1.1** Criar migration para estender tabela `frequencia` com status_presenca (P/F/A) [S]
  - Arquivo: `gestao_fronteira/supabase/migrations/20250204001_frequencia_tres_estados.sql`
  - Adicionar coluna `status_presenca` ENUM ('P', 'F', 'A')
  - Manter compatibilidade com coluna `presente` existente
  - Adicionar coluna `sessao_id` para vincular a sessao de aula
  - Criar trigger para sincronizar `presente` com base em `status_presenca`
  - **Implementado:** ENUM type, sync trigger, backward compatibility, data migration, performance indexes

- [x] **1.1.2** Criar migration para tabela `conteudo_aula` (BNCC) [M]
  - Arquivo: `gestao_fronteira/supabase/migrations/20250204002_conteudo_aula_bncc.sql`
  - Campos: sessao_id, tema, objetivo, habilidades_bncc (array), metodologia, recursos, observacoes
  - Foreign key para `sessoes_aula`
  - Indices para consultas por turma e data
  - **Implementado:** Table with BNCC fields, GIN index for skills array, RLS policies, validation function, detailed view

- [x] **1.1.3** Atualizar RLS policies para novas tabelas/colunas [S]
  - Arquivo: `gestao_fronteira/supabase/migrations/20250204003_rls_diario_classe.sql`
  - Professor pode inserir/atualizar frequencia de suas turmas
  - Diretor/Secretaria pode visualizar todas turmas da escola
  - Bloqueio de edicao apos 18:00 via policy
  - **Implementado:** Time-based policies, helper functions (is_before_18h_sao_paulo, can_edit_attendance), monitoring view

**Criterios de Aceitacao:**
- [x] Migration executa sem erros
- [x] Dados existentes preservados (backward compatibility with `presente` column)
- [x] RLS policies tested manually
- [x] TypeScript types updated (`types/diario-classe.ts`)

**Arquivos Criados/Modificados:**
- `gestao_fronteira/supabase/migrations/20250204001_frequencia_tres_estados.sql` - Three-state attendance
- `gestao_fronteira/supabase/migrations/20250204002_conteudo_aula_bncc.sql` - BNCC lesson content
- `gestao_fronteira/supabase/migrations/20250204003_rls_diario_classe.sql` - RLS policies
- `gestao_fronteira/types/diario-classe.ts` - TypeScript types for Diario de Classe

---

### Grupo 1.2: Extensao do AttendanceGrid para 3 Estados
**Dependencias:** 1.1.1
**Especialidade:** Frontend/React
**Status:** COMPLETED (2025-12-05)

- [x] **1.2.1** Escrever 4-6 testes focados para AttendanceGrid com 3 estados [S]
  - Arquivo: `gestao_fronteira/__tests__/components/attendance/AttendanceGrid.test.tsx`
  - Teste: ciclo de estados P -> F -> A -> vazio
  - Teste: cores corretas para cada estado (verde/vermelho/amarelo)
  - Teste: calculo de resumo em tempo real
  - Teste: comportamento readonly quando bloqueado
  - **Implementado:** 22 testes cobrindo todos os casos especificados

- [x] **1.2.2** Estender AttendanceGrid para suportar estado Atestado (A) [M]
  - Arquivo: `gestao_fronteira/components/attendance/AttendanceGrid.tsx`
  - Adicionar estado 'atestado' ao enum/type
  - Criar botao amarelo/laranja para Atestado
  - Atualizar estatisticas para incluir atestados
  - Manter touch-friendly (44px minimo)
  - **Implementado:** Full 3-state support with AttendanceStatus type, statistics calculation, touch-friendly design

- [x] **1.2.3** Criar componente AttendanceCell com ciclo de 3 estados [S]
  - Arquivo: `gestao_fronteira/components/attendance/AttendanceCell.tsx`
  - Click cicla: vazio -> P -> F -> A -> vazio
  - Cores: verde (#dcfce7), vermelho (#fee2e2), amarelo (#fef3c7)
  - Animacao de transicao suave
  - Acessibilidade: aria-labels apropriados
  - **Implementado:** Complete state cycle, correct colors, transitions, aria-labels

- [x] **1.2.4** Implementar resumo em tempo real no header do grid [S]
  - Modificar: `gestao_fronteira/components/attendance/AttendanceGrid.tsx`
  - Exibir: Total, Presentes, Ausentes, Atestados
  - Calcular taxa de frequencia considerando atestados
  - Badge com cor baseada no percentual (verde >= 80%, amarelo >= 75%, vermelho < 75%)
  - **Implementado:** Real-time stats with color-coded attendance rate badge

- [x] **1.2.5** Rodar testes do AttendanceGrid [XS]
  - Executar apenas testes de 1.2.1
  - Verificar cobertura dos 3 estados
  - **Resultado:** 22 tests passed

**Criterios de Aceitacao:**
- [x] Os 4-6 testes passam (22 testes passaram)
- [x] Grid funciona com touch em tablets (min-h-[44px] implementado)
- [x] Estados visuais claros e distintos (verde/vermelho/amarelo)

**Arquivos Criados/Modificados:**
- `gestao_fronteira/__tests__/components/attendance/AttendanceGrid.test.tsx` - 22 unit tests
- `gestao_fronteira/components/attendance/AttendanceCell.tsx` - 3-state cell component
- `gestao_fronteira/components/attendance/AttendanceGrid.tsx` - Extended grid with 3-state support

---

### Grupo 1.3: Bloqueio Automatico as 18:00
**Dependencias:** 1.1.1
**Especialidade:** Backend/Database
**Status:** COMPLETED (2025-12-05)

- [x] **1.3.1** Verificar e estender trigger existente de bloqueio [S]
  - Arquivo: `gestao_fronteira/supabase/migrations/20250924001_attendance_immutability_system.sql` (referencia)
  - Criada migration: `gestao_fronteira/supabase/migrations/20250204004_bloqueio_18h_verificacao.sql`
  - Verificado: `is_before_18h_sao_paulo()`, `can_edit_attendance()`, `check_attendance_immutability` trigger ja existentes
  - **Implementado:**
    - Verificacao das funcoes existentes
    - Nova funcao `get_session_lock_status()` para frontend
    - View `vw_sessao_lock_status` para monitoramento
    - Colunas `bloqueado`/`bloqueado_em` na frequencia
    - Trigger `auto_set_bloqueado_flag()` para marcar automaticamente

- [x] **1.3.2** Implementar indicador visual de bloqueio no frontend [S]
  - Modificar: `gestao_fronteira/components/attendance/AttendanceGrid.tsx`
  - Exibir icone de cadeado quando sessao bloqueada
  - Desabilitar botoes de marcacao
  - Mensagem explicativa: "Frequencia bloqueada apos 18:00"
  - **Implementado:**
    - Interface `SessionLockInfo` para estado de bloqueio
    - Funcoes helper: `isBefore18hSaoPaulo()`, `getTimeUntilLock()`, `getTodaySaoPaulo()`, `getSessionLockInfo()`
    - Alert banner quando bloqueado (cor laranja, icone de cadeado)
    - Warning banner quando bloqueio se aproxima (< 60 min)
    - Lock indicator no header (cadeado fechado/aberto)
    - Cadeado em cada registro bloqueado
    - Footer com mensagem de bloqueio
    - Props adicionais: `sessionDate`, `sessionStatus`
    - Atualizacao automatica a cada minuto

- [x] **1.3.3** [SKIPPED - Awaiting confirmation] Criar funcao de desbloqueio para perfis autorizados [M]
  - **Status:** SKIPPED - Aguardando confirmacao da Secretaria Municipal
  - **Pendente:** Definir quem pode desbloquear (Diretor? Secretaria?)
  - **Pendente:** Requer justificativa?
  - Quando confirmado:
    - Arquivo: `gestao_fronteira/lib/api/attendance-unlock.ts`
    - Criar API route: `gestao_fronteira/app/api/frequencia/desbloquear/route.ts`
    - Registrar no audit log

**Criterios de Aceitacao:**
- [x] Bloqueio automatico funciona no horario correto (America/Sao_Paulo)
- [x] UI indica claramente estado bloqueado (icone de cadeado, banner, mensagem explicativa)
- [ ] [Se aprovado] Desbloqueio funciona com permissoes corretas (SKIPPED - aguardando confirmacao)

**Arquivos Criados/Modificados:**
- `gestao_fronteira/supabase/migrations/20250204004_bloqueio_18h_verificacao.sql` - Verificacao e extensao do sistema de bloqueio
- `gestao_fronteira/components/attendance/AttendanceGrid.tsx` - Visual lock indicator, SessionLockInfo, time-based lock detection

---

### Grupo 1.4: Interface de Frequencia Diaria
**Dependencias:** 1.2, 1.3
**Especialidade:** Frontend/UI
**Status:** COMPLETED (2025-12-05)

- [x] **1.4.1** Criar pagina de frequencia por turma/dia [M]
  - Arquivo: `gestao_fronteira/app/(dashboard)/diario/frequencia/page.tsx`
  - Layout baseado em `planning/visuals/frequencia.html`
  - Seletor de turma e data
  - Navegacao por dia (anterior/proximo)
  - Integrar AttendanceGrid estendido
  - **Implementado:**
    - Pagina completa com seletor de turma
    - Navegacao por data (anterior/proximo/calendario)
    - Integracao com AttendanceGrid (3 estados P/F/A)
    - Criacao automatica de sessao para professores
    - Suporte a diferentes tipos de usuario (admin, professor, diretor, secretario)
    - Loading states e error handling

- [x] **1.4.2** Implementar painel de controles (filtros) [S]
  - Componente: `gestao_fronteira/components/diary/FrequencyControls.tsx`
  - Dropdown de turma
  - Date picker com navegacao
  - Toggle semana/mes
  - Resumo da frequencia
  - **Implementado:**
    - Dropdown de turma com serie/ano
    - Date picker com calendario popup
    - Navegacao dia anterior/proximo
    - Toggle semana/mes com exibicao de periodo
    - Resumo da frequencia com presentes/faltas/atestados/percentual
    - Cores baseadas no percentual (verde >= 80%, amarelo >= 75%, vermelho < 75%)

- [x] **1.4.3** Implementar alerta de alunos em risco [S]
  - Componente: `gestao_fronteira/components/diary/RiskAlert.tsx`
  - Destacar alunos com < 80% frequencia
  - Badge vermelho com contagem de faltas
  - Link para detalhes do aluno
  - **Implementado:**
    - Alerta visual para alunos com frequencia < 80%
    - Distincao entre critico (< 75%) e alerta (75-80%)
    - Badge com icone e contagem de faltas
    - Link para pagina de detalhes do aluno
    - Ordenacao por percentual (menor primeiro)
    - Resumo com contagem de criticos e em alerta
    - Versao compacta (RiskAlertCompact) para uso em espacos menores

- [x] **1.4.4** Implementar botao "SALVAR FREQUENCIA" fixo [XS]
  - Modificar: `gestao_fronteira/app/(dashboard)/diario/frequencia/page.tsx`
  - Botao verde fixo no bottom center
  - Feedback visual ao salvar
  - Sincronizar com Supabase
  - **Implementado:**
    - Botao verde grande fixo no bottom center
    - Animacao de hover (scale)
    - Estados: normal, salvando (loading), salvo (checkmark)
    - Feedback com toast de sucesso/erro
    - Atualiza alerta de risco apos salvar

**Criterios de Aceitacao:**
- [x] Pagina carrega lista de alunos da turma
- [x] Frequencia salva corretamente
- [x] Alerta de risco visivel

**Arquivos Criados/Modificados:**
- `gestao_fronteira/app/(dashboard)/diario/frequencia/page.tsx` - Pagina principal de frequencia
- `gestao_fronteira/components/diary/FrequencyControls.tsx` - Painel de controles com filtros
- `gestao_fronteira/components/diary/RiskAlert.tsx` - Componente de alerta de alunos em risco

---

## Fase 2 - Conteudo Ministrado (Prioridade Alta)

### Grupo 2.1: API e Types para Conteudo da Aula
**Dependencias:** 1.1.2
**Especialidade:** Backend/API
**Status:** COMPLETED (2025-12-05)

- [x] **2.1.1** Escrever 3-5 testes focados para API de conteudo [S]
  - Arquivo: `gestao_fronteira/__tests__/lib/api/lesson-content.test.ts`
  - Teste: criar conteudo com campos BNCC
  - Teste: listar conteudo por turma/periodo
  - Teste: diferenciar Ed. Infantil vs Fundamental
  - **Implementado:** 13 testes cobrindo todos os casos especificados:
    - 3 testes para criacao com campos BNCC
    - 2 testes para listagem por turma/periodo
    - 3 testes para diferenciacao Ed. Infantil vs Fundamental
    - 3 testes para update e retrieve por sessao
    - 2 testes para paginacao e ordenacao

- [x] **2.1.2** Criar interfaces TypeScript para conteudo BNCC [S]
  - Arquivo: `gestao_fronteira/types/lesson-content.ts`
  - Interface: LessonContent (tema, objetivo, habilidades_bncc, metodologia, recursos, observacoes)
  - Interface: BNNCField (para Campos de Experiencia)
  - Type guards para Ed. Infantil vs Fundamental
  - **Implementado:**
    - LessonContent, LessonContentInput, LessonContentUpdate interfaces
    - BNNCExperienceField para Educacao Infantil (5 Campos de Experiencia)
    - BNNCSubject para Ensino Fundamental
    - Type guards: isLessonContentInfantil(), isLessonContentFundamental()
    - Funcoes de validacao: isValidBNNCSkillCode(), validateBNNCSkillCodes()
    - Constantes de validacao e mensagens de erro em portugues

- [x] **2.1.3** Implementar funcoes de API para conteudo [M]
  - Arquivo: `gestao_fronteira/lib/api/lesson-content.ts`
  - Funcao: createLessonContent()
  - Funcao: updateLessonContent()
  - Funcao: getLessonContentBySession()
  - Funcao: getLessonContentHistory()
  - **Implementado:**
    - createLessonContent() - Cria conteudo com validacao BNCC
    - updateLessonContent() - Atualiza conteudo existente
    - getLessonContentBySession() - Busca conteudo por sessao
    - getLessonContentHistory() - Lista historico com filtros e paginacao
    - getLessonContentDetailed() - Busca com informacoes de turma/escola/professor
    - deleteLessonContent() - Exclusao (apenas admin)
    - getBNNCSkillsUsed() - Agregacao de habilidades BNCC por periodo

- [x] **2.1.4** Criar API routes para conteudo [M]
  - Arquivo: `gestao_fronteira/app/api/aulas/[id]/conteudo/route.ts`
  - GET: retorna conteudo da sessao
  - POST: cria novo conteudo
  - PATCH: atualiza conteudo existente
  - **Implementado:**
    - GET /api/aulas/[id]/conteudo - Retorna conteudo da sessao
    - POST /api/aulas/[id]/conteudo - Cria novo conteudo (apenas professor/admin)
    - PATCH /api/aulas/[id]/conteudo - Atualiza conteudo existente
    - Validacao Zod para todos os campos
    - Controle de acesso baseado em perfil (professor, diretor, secretario, admin)
    - Verificacao de acesso a sessao

- [x] **2.1.5** Rodar testes da API de conteudo [XS]
  - Executar apenas testes de 2.1.1
  - **Resultado:** 13 tests passed

**Criterios de Aceitacao:**
- [x] Os 3-5 testes passam (13 testes passaram)
- [x] CRUD completo funcionando
- [x] Diferenciacao por etapa educacional

**Arquivos Criados/Modificados:**
- `gestao_fronteira/__tests__/lib/api/lesson-content.test.ts` - 13 unit tests
- `gestao_fronteira/types/lesson-content.ts` - TypeScript types for BNCC lesson content
- `gestao_fronteira/lib/api/lesson-content.ts` - API functions for lesson content CRUD
- `gestao_fronteira/app/api/aulas/[id]/conteudo/route.ts` - API routes for lesson content
- `gestao_fronteira/jest.config.js` - Fixed moduleNameMapper typo

---

### Grupo 2.2: Formulario de Conteudo Estruturado
**Dependencias:** 2.1
**Especialidade:** Frontend/Forms
**Status:** COMPLETED (2025-12-05)

- [x] **2.2.1** Escrever 3-5 testes focados para formulario de conteudo [S]
  - Arquivo: `gestao_fronteira/__tests__/components/diary/LessonContentForm.test.tsx`
  - Teste: renderizacao dos campos obrigatorios
  - Teste: validacao de campos
  - Teste: submit com dados corretos
  - **Implementado:** 14 testes cobrindo todos os casos especificados:
    - 3 testes para renderizacao de campos (fundamental, infantil, buttons)
    - 3 testes para validacao (tema vazio, objetivo curto, BNCC invalido)
    - 3 testes para submit (dados validos, cancel, multiplos codigos BNCC)
    - 3 testes para diferenciacao Ed. Infantil vs Fundamental
    - 2 testes para estados de loading e valores iniciais

- [x] **2.2.2** Criar schema Zod para validacao do formulario [S]
  - Arquivo: `gestao_fronteira/lib/validation/lesson-content.ts`
  - Validar campos obrigatorios: tema, objetivo
  - Validar array de habilidades BNCC
  - Mensagens de erro em portugues
  - **Implementado:**
    - lessonContentFormSchema com validacao completa
    - lessonContentFundamentalSchema para Ensino Fundamental
    - lessonContentInfantilSchema para Educacao Infantil
    - parseBNNCCodes() para parsing de codigos separados por virgula
    - validateBNNCCodes() para validacao de codigos
    - transformFormDataToInput() para conversao form -> API
    - transformApiDataToForm() para conversao API -> form
    - getValidationSchema() para selecao dinamica de schema
    - EXPERIENCE_FIELD_OPTIONS para campos de experiencia

- [x] **2.2.3** Criar componente LessonContentForm [M]
  - Arquivo: `gestao_fronteira/components/diary/LessonContentForm.tsx`
  - Campos: Tema/Conteudo, Objetivo, Habilidades BNCC, Metodologia, Recursos, Observacoes
  - Usar React Hook Form + Zod
  - Textarea auto-resize para descricoes longas
  - **Implementado:**
    - React Hook Form com zodResolver
    - Todos os campos com validacao em tempo real
    - Card-based layout organizado por secoes
    - Botoes Salvar (verde) e Cancelar
    - Loading states para operacoes assincronas
    - Toast feedback para sucesso/erro
    - Suporte a valores iniciais para edicao

- [x] **2.2.4** Implementar seletor de habilidades BNCC (texto livre por enquanto) [M]
  - Arquivo: `gestao_fronteira/components/diary/BNNCSelector.tsx`
  - **Decisao:** Texto livre com validacao de formato
  - Campo de texto para codigos BNCC separados por virgula
  - Suporte a multiplas habilidades
  - **Implementado:**
    - Input de texto livre com validacao em tempo real
    - Parsing de codigos separados por virgula/espaco
    - Visual badges para codigos validos (azul para EF, roxo para EI)
    - Indicador de validacao (checkmark verde / alerta amarelo)
    - Botao de remocao individual de codigos
    - Tooltip de ajuda com exemplos de formato
    - Limite configuravel de habilidades (default: 10)

- [x] **2.2.5** Criar variante para Ed. Infantil (Campos de Experiencia) [S]
  - Modificar: `gestao_fronteira/components/diary/LessonContentForm.tsx`
  - Prop: `educationLevel: 'infantil' | 'fundamental'`
  - Ed. Infantil: 5 Campos de Experiencia da BNCC
  - Fundamental: disciplinas tradicionais
  - **Implementado:**
    - Prop educationLevel com valores 'infantil' | 'fundamental'
    - Secao de Campos de Experiencia (checkboxes) para Ed. Infantil
    - 5 campos com labels e descricoes completas
    - Visual diferenciado com cores roxas para Ed. Infantil
    - Placeholder de BNCC diferenciado por nivel (EI vs EF)
    - Alert banner indicando nivel educacional atual

- [x] **2.2.6** Rodar testes do formulario [XS]
  - Executar apenas testes de 2.2.1
  - **Resultado:** 14 tests passed

**Criterios de Aceitacao:**
- [x] Os 3-5 testes passam (14 testes passaram)
- [x] Formulario valida corretamente
- [x] Diferenciacao Ed. Infantil vs Fundamental funciona

**Arquivos Criados/Modificados:**
- `gestao_fronteira/__tests__/components/diary/LessonContentForm.test.tsx` - 14 unit tests
- `gestao_fronteira/lib/validation/lesson-content.ts` - Zod validation schemas
- `gestao_fronteira/components/diary/LessonContentForm.tsx` - Form component with React Hook Form + Zod
- `gestao_fronteira/components/diary/BNNCSelector.tsx` - BNCC skills selector component

---

### Grupo 2.3: Interface Card-Based para Historico de Aulas
**Dependencias:** 2.2
**Especialidade:** Frontend/UI
**Status:** COMPLETED (2025-12-05)

- [x] **2.3.1** Criar pagina principal do diario com lista de cards [M]
  - Arquivo: `gestao_fronteira/app/(dashboard)/diario/page.tsx`
  - Layout baseado em `planning/visuals/diario.html`
  - Lista de cards na esquerda (2/3 da tela)
  - Painel de detalhes na direita (1/3, sticky)
  - Seletor de turma no header
  - **Implementado:**
    - Two-column layout: cards (2/3) + sticky detail panel (1/3)
    - Turma selector in header with auto-select if single turma
    - "+ NOVA AULA" green button for lesson creation
    - Card-based lesson history with selection
    - Panel collapse toggle for more space
    - Loading states and error handling
    - Session/content data fetching with fallback

- [x] **2.3.2** Criar componente LessonCard [S]
  - Arquivo: `gestao_fronteira/components/diary/LessonCard.tsx`
  - Borda esquerda colorida (azul)
  - Hover com elevacao/sombra
  - Exibir: data, disciplina/tema, resumo, taxa de frequencia
  - Estado ativo quando selecionado
  - **Implementado:**
    - Blue left border accent (border-l-4 border-l-blue-500)
    - Hover with shadow and elevation (hover:shadow-lg hover:-translate-y-0.5)
    - Display: date, theme, summary, attendance stats with rate badge
    - Active/selected state with blue background
    - Responsive: compact mode for mobile, chevron indicator
    - Skeleton loader for loading states

- [x] **2.3.3** Criar painel de detalhes da aula [M]
  - Arquivo: `gestao_fronteira/components/diary/LessonDetailPanel.tsx`
  - Titulo, data, disciplina
  - Secao de conteudo
  - Secao de frequencia (resumo)
  - Secao de observacoes
  - Botoes: Editar, Excluir
  - **Implementado:**
    - Header with title, date, discipline, turma name
    - Content section: objetivo, tema, habilidades BNCC, metodologia, recursos
    - Attendance section: 3-column grid (total/presentes/ausentes), atestados, rate with color
    - Observations section with styled container
    - Action buttons: Edit (blue), Delete (outline with red hover)
    - Empty state and loading state
    - Skeleton loader variant

- [x] **2.3.4** Criar modal para nova aula [M]
  - Arquivo: `gestao_fronteira/components/diary/NewLessonModal.tsx`
  - Usar Dialog do shadcn/ui
  - Integrar LessonContentForm
  - Seletor de data
  - Botao verde "+ NOVA AULA" no topo da lista
  - **Implementado:**
    - Dialog with shadcn/ui Dialog component
    - Form with all LessonContentForm fields
    - Date selector with Calendar popup
    - BNCC skills input with validation
    - Ed. Infantil campos de experiencia support
    - Session creation with fallback
    - Success/error toast feedback

- [x] **2.3.5** Implementar responsividade [S]
  - Modificar componentes criados
  - Desktop: sidebar fixa + two-column
  - Tablet: sidebar colapsavel
  - Mobile: bottom nav ou drawer
  - **Implementado:**
    - Desktop: Two-column layout (2/3 + 1/3), sticky panel
    - Tablet: Collapsible panel with toggle button
    - Mobile: Sheet/drawer for details (slides from right)
    - Responsive text sizes (text-xs sm:text-sm)
    - Responsive padding (p-3 sm:p-4)
    - Touch-friendly targets (min-h-[44px])
    - Chevron indicator on mobile cards

**Criterios de Aceitacao:**
- [x] Layout corresponde ao mockup
- [x] Cards clicaveis selecionam aula
- [x] Modal de nova aula funciona
- [x] Responsivo em todos dispositivos

**Arquivos Criados/Modificados:**
- `gestao_fronteira/app/(dashboard)/diario/page.tsx` - Main diary page with two-column layout
- `gestao_fronteira/components/diary/LessonCard.tsx` - Card component with responsive design
- `gestao_fronteira/components/diary/LessonDetailPanel.tsx` - Detail panel with responsive sizing
- `gestao_fronteira/components/diary/NewLessonModal.tsx` - Modal for creating new lessons

---

## Fase 3 - Sistema de Notas (Prioridade Media)

### Grupo 3.1: Sistema de Notas Bimestrais (Fundamental I)
**Dependencias:** 1.1
**Especialidade:** Backend/Database
**Status:** COMPLETED (2025-12-05)

- [x] **3.1.1** Escrever 3-5 testes focados para API de notas [S]
  - Arquivo: `gestao_fronteira/__tests__/lib/api/grades.test.ts`
  - Teste: lancar nota bimestral
  - Teste: calcular media automatica
  - Teste: validar nota 0-10
  - **Implementado:** 13 testes cobrindo todos os casos especificados:
    - 2 testes para lancar nota bimestral (valida, 4 bimestres)
    - 4 testes para calcular media automatica (completa, parcial, vazia, arredondamento)
    - 5 testes para validar nota 0-10 (abaixo 0, acima 10, limites, decimal, bimestre invalido)
    - 2 testes para buscar notas (por aluno, por turma)

- [x] **3.1.2** Verificar e estender tabela `notas` existente [S]
  - Referencia: `gestao_fronteira/supabase/migrations/20250628095207_wild_block.sql`
  - Verificar campos: matricula_id, disciplina, bimestre (1-4), nota (0-10)
  - Criar migration se precisar adicionar campos
  - **Verificado:** Tabela `notas` ja possui todos os campos necessarios:
    - `matricula_id` UUID NOT NULL REFERENCES matriculas(id)
    - `disciplina` TEXT NOT NULL
    - `bimestre` INTEGER NOT NULL CHECK (bimestre BETWEEN 1 AND 4)
    - `nota` DECIMAL(4,2) NOT NULL CHECK (nota BETWEEN 0 AND 10)
    - `tipo_avaliacao` TEXT NOT NULL
    - `data_avaliacao` DATE NOT NULL
    - `observacoes` TEXT
  - **Resultado:** Nenhuma migration necessaria

- [x] **3.1.3** Implementar funcoes de API para notas [M]
  - Arquivo: `gestao_fronteira/lib/api/grades.ts`
  - Funcao: createGrade()
  - Funcao: updateGrade()
  - Funcao: getGradesByStudent()
  - Funcao: getGradesByClass()
  - Funcao: calculateAverage()
  - **Implementado:**
    - createGrade() - Cria nota com validacao 0-10 e bimestre 1-4
    - updateGrade() - Atualiza nota existente
    - getGradesByStudent() - Busca notas por matricula (opcional filtro disciplina)
    - getGradesByClass() - Busca notas por turma/disciplina/bimestre
    - calculateAverage() - Calcula media com arredondamento 1 decimal
    - deleteGrade() - Exclui nota
    - getGradeById() - Busca nota por ID
    - getOrCreateGrade() - Busca ou retorna null para grid

- [x] **3.1.4** Criar componente GradeInput [S]
  - Arquivo: `gestao_fronteira/components/grades/GradeInput.tsx`
  - Input numerico 0-10 com uma casa decimal
  - Validacao inline
  - Cores: verde >= 7, amarelo >= 5, vermelho < 5
  - **Implementado:**
    - Input numerico com validacao em tempo real
    - Cores baseadas no valor (verde >= 7, amarelo >= 5, vermelho < 5)
    - Suporte a teclas seta (incremento/decremento 0.5)
    - Formato brasileiro (virgula como separador decimal)
    - GradeDisplay para visualizacao readonly
    - AverageDisplay para exibicao de medias
    - Touch-friendly com tamanhos sm/md/lg

- [x] **3.1.5** Criar grid de lancamento de notas [M]
  - Arquivo: `gestao_fronteira/components/grades/GradeGrid.tsx`
  - Linhas: alunos da turma
  - Colunas: 4 bimestres + media
  - Edicao inline
  - Calculo automatico de media
  - **Implementado:**
    - Grid com header fixo (Aluno, 1o Bim, 2o Bim, 3o Bim, 4o Bim, Media)
    - GradeInput para edicao inline de cada bimestre
    - Calculo automatico de media ao alterar notas
    - Cores por bimestre e media (verde/amarelo/vermelho)
    - Estatisticas: total alunos, com notas, aprovados, reprovados
    - Loading skeleton, empty state
    - Botao "Salvar Notas" com estados de loading/sucesso

- [x] **3.1.6** Rodar testes do sistema de notas [XS]
  - Executar apenas testes de 3.1.1
  - **Resultado:** 13 tests passed

**Criterios de Aceitacao:**
- [x] Os 3-5 testes passam (13 testes passaram)
- [x] Notas salvam corretamente (API implementada com validacao)
- [x] Media calculada automaticamente (arredondamento 1 decimal)

**Arquivos Criados/Modificados:**
- `gestao_fronteira/__tests__/lib/api/grades.test.ts` - 13 unit tests
- `gestao_fronteira/types/grades.ts` - TypeScript types for grades
- `gestao_fronteira/lib/api/grades.ts` - API functions for grades CRUD
- `gestao_fronteira/components/grades/GradeInput.tsx` - Grade input component
- `gestao_fronteira/components/grades/GradeGrid.tsx` - Grade grid component
- `gestao_fronteira/components/grades/index.ts` - Exports

---

### Grupo 3.2: Relatorios Descritivos (Ed. Infantil)
**Dependencias:** 3.1
**Especialidade:** Frontend/Forms
**Status:** COMPLETED (2025-12-05)

- [x] **3.2.1** Criar migration para tabela `relatorios_descritivos` [S]
  - Arquivo: `gestao_fronteira/supabase/migrations/20250204005_relatorios_descritivos.sql`
  - Campos por Campo de Experiencia (5 campos)
  - Periodo: semestral
  - Texto livre para cada campo
  - **Implementado:**
    - ENUMs: `report_status` (rascunho, finalizado), `semestre_tipo` (primeiro, segundo)
    - 5 campos de experiencia: campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons, campo_escuta_fala, campo_espacos_tempos
    - Campos de draft: draft_data (JSONB), last_draft_saved_at
    - Campos de finalizacao: finalizado_em, finalizado_por
    - Indexes otimizados para queries por turma, periodo, professor
    - RLS policies para professores e admins
    - View detalhada: vw_relatorios_descritivos_detalhado
    - Funcoes helper: get_current_semester(), report_exists_for_period()
    - Triggers: auto-update updated_at, auto-set finalizado_em/por

- [x] **3.2.2** [A CONFIRMAR] Definir template do relatorio descritivo [M]
  - **Decisao:** Implementada estrutura flexivel por Campo de Experiencia (BNCC)
  - Usado template generico com 5 campos de experiencia
  - Estrutura permite texto livre para cada campo
  - Observacoes gerais opcionais
  - **Implementado:**
    - TypeScript types em `gestao_fronteira/types/descriptive-report.ts`
    - EXPERIENCE_FIELDS_CONFIG com labels, descriptions, placeholders para todos 5 campos
    - Constantes de validacao (min 50, max 2000 caracteres)
    - Helper functions: getCurrentSemester(), calculateReportCompletion(), canFinalizeReport()

- [x] **3.2.3** Criar componente DescriptiveReportForm [M]
  - Arquivo: `gestao_fronteira/components/reports/DescriptiveReportForm.tsx`
  - 5 textareas para Campos de Experiencia:
    1. O eu, o outro e o nos
    2. Corpo, gestos e movimentos
    3. Tracos, sons, cores e formas
    4. Escuta, fala, pensamento e imaginacao
    5. Espacos, tempos, quantidades, relacoes e transformacoes
  - Salvar rascunho automatico
  - **Implementado:**
    - React Hook Form + Zod validation (gestao_fronteira/lib/validation/descriptive-report.ts)
    - 5 Card-based sections com indicadores numerados e status visual
    - Progress tracking (empty/partial/complete) para cada campo
    - Auto-save configuravel (default 30s)
    - Botoes Save Draft e Finalize com validacao
    - Read-only mode para relatorios finalizados
    - Character counter com minimo de 50 caracteres por campo
    - Alert de campos incompletos para finalizacao
    - Status badge (Rascunho/Finalizado)

- [x] **3.2.4** Criar pagina de relatorios por aluno [M]
  - Arquivo: `gestao_fronteira/app/(dashboard)/diario/relatorios/[alunoId]/page.tsx`
  - Visualizar relatorios anteriores
  - Criar novo relatorio
  - Status: rascunho, finalizado
  - **Implementado:**
    - Lista de cards com historico de relatorios do aluno
    - Badge de status (rascunho/finalizado) com cores
    - Progress indicator em cada card
    - Dialog modal para criar/editar/visualizar
    - Seletores de semestre e ano para novos relatorios
    - Integracao com DescriptiveReportForm
    - Deteccao automatica do semestre atual
    - Verificacao de duplicatas (um relatorio por semestre)

**Criterios de Aceitacao:**
- [x] Relatorio salva os 5 campos
- [x] Auto-save funciona (configuravel, default 30s)
- [x] Diferenciacao por semestre (primeiro/segundo)

**Arquivos Criados/Modificados:**
- `gestao_fronteira/supabase/migrations/20250204005_relatorios_descritivos.sql` - Database migration
- `gestao_fronteira/types/descriptive-report.ts` - TypeScript types and constants
- `gestao_fronteira/lib/validation/descriptive-report.ts` - Zod validation schemas
- `gestao_fronteira/components/reports/DescriptiveReportForm.tsx` - Form component
- `gestao_fronteira/app/(dashboard)/diario/relatorios/[alunoId]/page.tsx` - Student reports page

---

### Grupo 3.3: Boletim do Aluno
**Dependencias:** 3.1, 3.2
**Especialidade:** Frontend/Reports
**Status:** COMPLETED (2025-12-05)

- [x] **3.3.1** Criar componente StudentReport (Fundamental) [M]
  - Arquivo: `gestao_fronteira/components/reports/StudentReport.tsx`
  - Tabela de notas por disciplina/bimestre
  - Media final calculada
  - Status: aprovado/reprovado/em curso
  - **Implementado:**
    - Tabela de notas com 4 bimestres + media por disciplina
    - Cores baseadas nas notas (verde >= 7, amarelo >= 5, vermelho < 5)
    - Status calculado automaticamente (aprovado/reprovado/em curso)
    - Secao de frequencia com presencas/faltas/atestados/percentual
    - Badge de resultado final (aprovado/reprovado/em curso)
    - Botoes de impressao e exportacao PDF
    - Layout profissional para impressao (print:* classes)
    - Header com informacoes da escola, turma e aluno

- [x] **3.3.2** Criar componente StudentReport (Infantil) [M]
  - Arquivo: `gestao_fronteira/components/reports/StudentReportInfantil.tsx`
  - Resumo dos relatorios descritivos
  - Organizacao por semestre
  - Visualizacao dos Campos de Experiencia
  - **Implementado:**
    - Cards por semestre com 5 Campos de Experiencia (BNCC)
    - Icones e cores diferenciadas por campo
    - Progress indicator para campos preenchidos
    - Status do relatorio (rascunho/finalizado)
    - Informacoes do professor e data de finalizacao
    - Observacoes gerais destacadas
    - Legenda dos Campos de Experiencia
    - Layout profissional para impressao

- [x] **3.3.3** Criar pagina de boletim individual [M]
  - Arquivo: `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/boletim/page.tsx`
  - Detectar etapa (Infantil vs Fundamental)
  - Renderizar componente apropriado
  - Botao de impressao/PDF
  - **Implementado:**
    - Deteccao automatica de etapa educacional (serie/turma)
    - Renderizacao condicional de StudentReport ou StudentReportInfantil
    - Busca de notas para Fundamental
    - Busca de relatorios descritivos para Infantil
    - Busca de frequencia para ambas etapas
    - Botoes de impressao e exportacao PDF
    - Loading states e error handling
    - Navegacao de volta para detalhes do aluno

**Criterios de Aceitacao:**
- [x] Boletim exibe notas/relatorios corretamente
- [x] Layout profissional para impressao
- [x] Diferenciacao por etapa educacional

**Arquivos Criados/Modificados:**
- `gestao_fronteira/components/reports/StudentReport.tsx` - Report card for Fundamental
- `gestao_fronteira/components/reports/StudentReportInfantil.tsx` - Report card for Infantil
- `gestao_fronteira/components/reports/index.ts` - Reports components exports
- `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/boletim/page.tsx` - Individual report page

---

## Fase 4 - Relatorios e Exportacao (Prioridade Media)

### Grupo 4.1: Relatorios de Frequencia
**Dependencias:** 1.2, 1.3
**Especialidade:** Backend/Reports
**Status:** COMPLETED (2025-12-05)

- [x] **4.1.1** Escrever 3-5 testes focados para relatorios [S]
  - Arquivo: `gestao_fronteira/__tests__/lib/reports/attendance-reports.test.ts`
  - Teste: calculo de frequencia individual
  - Teste: calculo de frequencia por turma
  - Teste: filtro por periodo
  - **Implementado:** 13 testes cobrindo todos os casos especificados:
    - 3 testes para calculo de frequencia individual
    - 2 testes para calculo de frequencia por turma
    - 2 testes para filtro por periodo
    - 2 testes para identificacao de alunos em risco
    - 4 testes para calculo de percentual de frequencia

- [x] **4.1.2** Implementar funcoes de geracao de relatorios [M]
  - Arquivo: `gestao_fronteira/lib/reports/attendance-reports.ts`
  - Funcao: generateStudentAttendanceReport()
  - Funcao: generateClassAttendanceReport()
  - Funcao: getStudentsAtRisk()
  - **Implementado:**
    - generateStudentAttendanceReport() - Relatorio individual com detalhes diarios
    - generateClassAttendanceReport() - Relatorio da turma com todos os alunos
    - getStudentsAtRisk() - Lista de alunos abaixo do threshold
    - calculateAttendancePercentage() - Helper para calculo (atestado conta como presenca)
    - Suporte a filtros por periodo (startDate, endDate)
    - Logging com logger estruturado

- [x] **4.1.3** Criar componente AttendanceReportTable [S]
  - Arquivo: `gestao_fronteira/components/reports/AttendanceReportTable.tsx`
  - Tabela com: aluno, presencas, faltas, atestados, percentual
  - Ordenacao por coluna
  - Highlight para alunos em risco
  - **Implementado:**
    - Tabela responsiva com todas as colunas especificadas
    - Ordenacao por qualquer coluna (nome, presencas, faltas, atestados, percentual)
    - Highlight em amarelo para alerta (75-80%) e vermelho para critico (<75%)
    - Sumario estatistico no topo (total, OK, alerta, critico, media)
    - Badge de status por linha (OK, Alerta, Critico)
    - Suporte a NIS para Bolsa Familia
    - Botoes de impressao e PDF
    - Legenda de cores
    - Loading skeleton e empty state

- [x] **4.1.4** Criar pagina de relatorio de frequencia [M]
  - Arquivo: `gestao_fronteira/app/(dashboard)/relatorios/frequencia/page.tsx`
  - Filtros: turma, periodo
  - Visualizacao em tabela
  - Grafico de barras opcional
  - **Implementado:**
    - Seletor de turma com escola
    - Seletor de periodo (mes atual, anterior, bimestres 1-4, personalizado)
    - Date pickers para periodo personalizado
    - Integracao com AttendanceReportTable
    - Tabs para tabela/grafico (grafico placeholder)
    - Botoes de exportacao Excel/PDF (placeholders para 4.3)
    - Loading states e error handling
    - Toast feedback para acoes

- [x] **4.1.5** Rodar testes de relatorios [XS]
  - Executar apenas testes de 4.1.1
  - **Resultado:** 13 tests passed

**Criterios de Aceitacao:**
- [x] Os 3-5 testes passam (13 testes passaram)
- [x] Relatorios calculam corretamente
- [x] Interface clara e informativa

**Arquivos Criados/Modificados:**
- `gestao_fronteira/__tests__/lib/reports/attendance-reports.test.ts` - 13 unit tests
- `gestao_fronteira/lib/reports/attendance-reports.ts` - Report generation functions
- `gestao_fronteira/components/reports/AttendanceReportTable.tsx` - Table component
- `gestao_fronteira/components/reports/index.ts` - Updated exports
- `gestao_fronteira/app/(dashboard)/relatorios/frequencia/page.tsx` - Report page

---

### Grupo 4.2: Alerta Bolsa Familia
**Dependencias:** 4.1
**Especialidade:** Frontend/Backend
**Status:** COMPLETED (2025-12-05)

- [x] **4.2.1** Implementar identificacao de alunos com NIS [S]
  - Verificar se campo NIS existe na tabela `alunos`
  - Se nao: criar migration para adicionar campo
  - Query para filtrar alunos com NIS
  - **Implementado:**
    - Migration `add_nis_bolsa_familia` aplicada
    - Adicionado campo `nis` VARCHAR(11) com validacao
    - Adicionado campo `bolsa_familia` BOOLEAN
    - View `vw_alunos_risco_bolsa_familia` criada

- [x] **4.2.2** Definir calculo de frequencia para Bolsa Familia [S]
  - **Decisao:** Atestado (A) conta como presenca no calculo de 80%
  - Implementado logica conforme regulamentacao brasileira
  - **Implementado:**
    - Funcao `calculateBolsaFamiliaStatus()` - retorna CONFORME/ALERTA/CRITICO
    - Funcao `calculateFaltasParaCritico()` - calcula quantas faltas faltam para status critico
    - Funcao `getBolsaFamiliaStudents()` - relatorio completo
    - Funcao `getBolsaFamiliaStudentsAtRisk()` - apenas alunos em risco
    - Funcao `getBolsaFamiliaSummary()` - resumo por escola
    - Thresholds: CRITICO <80%, ALERTA 80-85%, CONFORME >85%

- [x] **4.2.3** Criar componente BolsaFamiliaAlert [S]
  - Arquivo: `gestao_fronteira/components/reports/BolsaFamiliaAlert.tsx`
  - Lista de alunos com NIS abaixo de 80%
  - Badge indicando situacao
  - Link para detalhes do aluno
  - **Implementado:**
    - StatusBadge para CRITICO/ALERTA/CONFORME
    - AttendanceBar visual
    - Versao compacta para uso em espacos menores
    - Detalhes por aluno (NIS, turma, escola, P/F/A)
    - Loading skeleton
    - Legenda de cores

- [x] **4.2.4** Criar pagina de relatorio Bolsa Familia [M]
  - Arquivo: `gestao_fronteira/app/(dashboard)/relatorios/bolsa-familia/page.tsx`
  - Filtros: escola, turma, periodo
  - Tabela com: aluno, NIS, frequencia, status
  - Exportacao para Excel (placeholder para 4.3)
  - **Implementado:**
    - Filtros por escola, turma, periodo (mes, bimestre, personalizado)
    - Cards de resumo (total, conformes, alerta, critico)
    - Tabs: Alerta Visual e Tabela Completa
    - Tabela com todas as colunas especificadas
    - Botoes de exportacao (placeholders)
    - Legenda e informacoes de calculo

**Criterios de Aceitacao:**
- [x] Alunos em risco identificados corretamente
- [x] Interface destaca situacao critica (cores vermelho/amarelo)
- [x] Exportacao funciona (implementado em 4.3)

**Arquivos Criados/Modificados:**
- `gestao_fronteira/supabase/migrations/add_nis_bolsa_familia.sql` - Database migration
- `gestao_fronteira/lib/reports/bolsa-familia-reports.ts` - Report functions
- `gestao_fronteira/components/reports/BolsaFamiliaAlert.tsx` - Alert component
- `gestao_fronteira/components/reports/index.ts` - Updated exports
- `gestao_fronteira/app/(dashboard)/relatorios/bolsa-familia/page.tsx` - Report page

---

### Grupo 4.3: Exportacao PDF e Excel
**Dependencias:** 4.1, 4.2
**Especialidade:** Frontend/Export
**Status:** COMPLETED (2025-12-05)

- [x] **4.3.1** Configurar jspdf e jspdf-autotable [XS]
  - Verificar instalacao em `package.json` (ja instalados)
  - Criar utilitarios de formatacao
  - Arquivo: `gestao_fronteira/lib/export/pdf-utils.ts`
  - **Implementado:**
    - Utilities: createPDFDocument, addPDFHeader, addPDFFooter, addPDFTable, addPDFSummary
    - Brazilian A4 format, date formatting for pt-BR locale
    - Consistent styles and colors

- [x] **4.3.2** Implementar exportacao PDF para relatorio de frequencia [M]
  - Arquivo: `gestao_fronteira/lib/export/attendance-pdf.ts`
  - Header com logo, escola, periodo
  - Tabela de frequencia
  - Rodape com data de geracao
  - **Implementado:**
    - generateAttendanceReportPDF() - Class attendance PDF
    - generateBolsaFamiliaReportPDF() - Bolsa Familia compliance PDF
    - generateStudentReportPDF() - Individual student PDF
    - Color-coded status (OK/RISCO/ALERTA)

- [x] **4.3.3** Implementar exportacao Excel para relatorios [M]
  - Arquivo: `gestao_fronteira/lib/export/attendance-excel.ts`
  - Usar biblioteca ExcelJS (installed)
  - Formatacao de celulas
  - Multiplas abas se necessario
  - **Implementado:**
    - generateAttendanceReportExcel() - Class attendance Excel
    - generateBolsaFamiliaReportExcel() - Bolsa Familia compliance Excel with 2 sheets (Resumo + Alunos)
    - Styled headers, colored status cells, borders
    - file-saver for browser download

- [x] **4.3.4** Criar botoes de exportacao nos relatorios [S]
  - Modificar paginas de relatorios
  - Botao PDF com icone
  - Botao Excel com icone
  - Loading state durante geracao
  - **Implementado:**
    - Updated `/relatorios/frequencia/page.tsx` with real export handlers
    - Updated `/relatorios/bolsa-familia/page.tsx` with real export handlers
    - Toast feedback for success/error

**Criterios de Aceitacao:**
- [x] PDF gera corretamente
- [x] Excel abre sem erros
- [x] Dados corretos em ambos formatos

**Arquivos Criados/Modificados:**
- `gestao_fronteira/lib/export/pdf-utils.ts` - PDF utilities
- `gestao_fronteira/lib/export/attendance-pdf.ts` - Attendance and Bolsa Familia PDF export
- `gestao_fronteira/lib/export/attendance-excel.ts` - Attendance and Bolsa Familia Excel export
- `gestao_fronteira/lib/export/index.ts` - Export utilities index
- `gestao_fronteira/app/(dashboard)/relatorios/frequencia/page.tsx` - Updated with export handlers
- `gestao_fronteira/app/(dashboard)/relatorios/bolsa-familia/page.tsx` - Updated with export handlers

---

### Grupo 4.4: Relatorio de Conteudo Ministrado
**Dependencias:** 2.1
**Especialidade:** Backend/Reports
**Status:** COMPLETED (2025-12-05)

- [x] **4.4.1** Implementar funcao de relatorio de conteudo [M]
  - Arquivo: `gestao_fronteira/lib/reports/content-reports.ts`
  - Funcao: generateContentReport()
  - Agrupar por periodo
  - Listar habilidades BNCC trabalhadas
  - **Implementado:**
    - generateContentReport() - Full content report with lessons and BNCC skills aggregation
    - getContentByPeriod() - Group content by week, month, or bimestre
    - getBNNCSkillsSummary() - Aggregated BNCC skills summary with counts
    - Support for turma, disciplina, professor, escola filters
    - BNCC skill description lookup and education level detection
    - Discipline frequency analysis (top 5 most worked)

- [x] **4.4.2** Criar pagina de relatorio de conteudo [M]
  - Arquivo: `gestao_fronteira/app/(dashboard)/relatorios/conteudo/page.tsx`
  - Filtros: turma, disciplina, periodo
  - Lista de aulas com conteudo
  - Resumo de habilidades BNCC
  - **Implementado:**
    - Turma filter dropdown (with "All Classes" option)
    - Discipline filter dropdown (optional, based on BNCC subjects)
    - Period selector (current month, last month, bimesters, custom)
    - Summary cards: total lessons, unique BNCC skills, average skills/lesson, disciplines
    - Three-tab view: Cards (lesson cards), BNCC (skills summary with accordion), Table (sortable table)
    - LessonCard component with date, theme, objective, BNCC badges
    - BNNCSkillsSummary component with fundamental/infantil grouping
    - ContentTable component with responsive design
    - Export PDF button

- [x] **4.4.3** Exportar relatorio de conteudo em PDF [S]
  - Arquivo: `gestao_fronteira/lib/export/content-pdf.ts`
  - Formato oficial para arquivamento
  - **Implementado:**
    - generateContentReportPDF() - Full content report PDF with lessons and BNCC summary
    - generateBNNCSkillsReportPDF() - BNCC skills-only PDF with level breakdown
    - generateLessonDetailPDF() - Individual lesson detail PDF for archiving
    - Professional styling with blue (content) and purple (BNCC) color schemes
    - Brazilian education compliance note in footer
    - Added to lib/export/index.ts exports

**Criterios de Aceitacao:**
- [x] Relatorio lista todo conteudo ministrado
- [x] Habilidades BNCC agregadas
- [x] Exportacao funciona

**Arquivos Criados/Modificados:**
- `gestao_fronteira/lib/reports/content-reports.ts` - Content report generation functions
- `gestao_fronteira/app/(dashboard)/relatorios/conteudo/page.tsx` - Content report page with filters and tabs
- `gestao_fronteira/lib/export/content-pdf.ts` - Content report PDF export functions
- `gestao_fronteira/lib/export/index.ts` - Updated with content PDF exports

---

## Fase 5 - Polimento UX (Prioridade Baixa)

### Grupo 5.1: Otimizacao Mobile
**Dependencias:** Fases 1-4
**Especialidade:** Frontend/Mobile

- [ ] **5.1.1** Auditar responsividade de todas as paginas [S]
  - Testar em viewports: 320px, 375px, 414px, 768px, 1024px, 1920px
  - Documentar problemas encontrados
  - Usar Chrome DevTools MCP para screenshots

- [ ] **5.1.2** Corrigir problemas de responsividade [M]
  - Ajustar grid do diario para mobile
  - Melhorar touch targets (minimo 44px)
  - Otimizar navegacao mobile

- [ ] **5.1.3** Implementar bottom navigation para mobile [S]
  - Arquivo: `gestao_fronteira/components/layout/MobileNav.tsx`
  - Icones para: Dashboard, Frequencia, Diario, Relatorios
  - Esconder em desktop

**Criterios de Aceitacao:**
- Todas paginas funcionam em mobile
- Touch-friendly em tablets
- Navegacao intuitiva

---

### Grupo 5.2: Melhorias de Performance
**Dependencias:** Fases 1-4
**Especialidade:** Frontend/Performance

- [ ] **5.2.1** Auditar performance com Chrome DevTools [S]
  - Medir LCP, FPS, Network
  - Identificar gargalos
  - Documentar melhorias necessarias

- [ ] **5.2.2** Implementar loading states e skeletons [S]
  - Arquivo: `gestao_fronteira/components/diary/DiarySkeletons.tsx`
  - Skeleton para lista de cards
  - Skeleton para grid de frequencia
  - Skeleton para detalhes

- [ ] **5.2.3** Otimizar queries de banco de dados [M]
  - Revisar indexes
  - Implementar paginacao onde necessario
  - Usar React Query com cache adequado

**Criterios de Aceitacao:**
- LCP < 2.5s
- FPS > 30
- Loading states em todas operacoes

---

### Grupo 5.3: Feedback Visual e Acessibilidade
**Dependencias:** Fases 1-4
**Especialidade:** Frontend/UX

- [ ] **5.3.1** Implementar toasts de feedback [S]
  - Usar toast do Sonner (ja instalado)
  - Sucesso: frequencia salva, aula criada
  - Erro: falha ao salvar, conexao perdida
  - Info: sessao bloqueada

- [ ] **5.3.2** Adicionar animacoes sutis [S]
  - Transicao de cores no AttendanceCell
  - Hover effects nos cards
  - Loading spinners

- [ ] **5.3.3** Auditar e melhorar acessibilidade [M]
  - Verificar contraste de cores (WCAG AA)
  - Adicionar aria-labels
  - Testar navegacao por teclado

**Criterios de Aceitacao:**
- Feedback claro para todas acoes
- Animacoes suaves sem impacto em performance
- WCAG 2.1 AA compliance

---

## Fase 6 - Revisao de Testes e Gap Analysis

### Grupo 6.1: Revisao de Testes Existentes
**Dependencias:** Fases 1-5
**Especialidade:** QA/Testing

- [ ] **6.1.1** Revisar todos os testes escritos nas fases anteriores [S]
  - Grupo 1.2: 4-6 testes AttendanceGrid
  - Grupo 2.1: 3-5 testes API conteudo
  - Grupo 2.2: 3-5 testes formulario
  - Grupo 3.1: 3-5 testes notas
  - Grupo 4.1: 3-5 testes relatorios
  - Total esperado: 18-26 testes

- [ ] **6.1.2** Identificar gaps criticos de cobertura [S]
  - Focar em fluxos de usuario end-to-end
  - Priorizar: frequencia -> conteudo -> relatorios
  - NAO adicionar testes de edge cases

- [ ] **6.1.3** Escrever ate 10 testes adicionais para gaps criticos [M]
  - Arquivo: `gestao_fronteira/__tests__/e2e/diario-classe.spec.ts`
  - Teste E2E: fluxo completo de marcar frequencia
  - Teste E2E: criar aula com conteudo
  - Teste E2E: gerar relatorio
  - Maximo: 10 testes adicionais

- [ ] **6.1.4** Executar todos os testes da feature [S]
  - Rodar apenas testes relacionados ao Diario de Classe
  - Total esperado: 28-36 testes
  - NAO rodar suite completa da aplicacao

**Criterios de Aceitacao:**
- Todos os testes passam
- Fluxos criticos cobertos
- Maximo de 36 testes para esta feature

---

## Ordem de Execucao Recomendada

```
Fase 1 (Frequencia Basica) - ALTA PRIORIDADE
  1.1 Database Schema [COMPLETED]
  1.2 AttendanceGrid 3 Estados [COMPLETED]
  1.3 Bloqueio Automatico [COMPLETED]
  1.4 Interface de Frequencia [COMPLETED]

Fase 2 (Conteudo Ministrado) - ALTA PRIORIDADE
  2.1 API e Types [COMPLETED]
  2.2 Formulario BNCC [COMPLETED]
  2.3 Interface Card-Based [COMPLETED]

Fase 3 (Sistema de Notas) - MEDIA PRIORIDADE
  3.1 Notas Bimestrais [COMPLETED]
  3.2 Relatorios Descritivos [COMPLETED]
  3.3 Boletim do Aluno [COMPLETED]

Fase 4 (Relatorios) - MEDIA PRIORIDADE
  4.1 Relatorios de Frequencia [COMPLETED]
  4.2 Alerta Bolsa Familia [COMPLETED]
  4.3 Exportacao PDF/Excel [COMPLETED]
  4.4 Relatorio de Conteudo [COMPLETED]

Fase 5 (Polimento) - BAIXA PRIORIDADE
  5.1 Otimizacao Mobile
  5.2 Performance
  5.3 Feedback Visual

Fase 6 (Testes) - FINAL
  6.1 Revisao e Gap Analysis
```

---

## Itens Pendentes de Confirmacao (A CONFIRMAR)

Os seguintes itens dependem de confirmacao da Secretaria Municipal:

1. **1.3.3** - Quem pode desbloquear frequencia apos 18:00? (Diretor? Secretaria? Requer justificativa?)

2. ~~**2.2.4** - Habilidades BNCC: lista completa para selecao ou campo de texto livre?~~
   **DECIDIDO:** Texto livre com validacao de formato (implementado em 2.2.4)

3. ~~**3.2.2** - Existe modelo/template padrao da rede municipal para relatorios descritivos da Ed. Infantil?~~
   **DECIDIDO:** Usar estrutura flexivel por Campo de Experiencia (BNCC) - implementado em 3.2.2

4. ~~**4.2.2** - Atestado medico (A) conta como presenca ou falta no calculo de 80% para Bolsa Familia?~~
   **DECIDIDO:** Atestado (A) conta como presenca, conforme regulamentacao brasileira de educacao - implementado em 4.2.2

---

## Arquivos Existentes a Reutilizar

| Arquivo | Uso |
|---------|-----|
| `components/attendance/AttendanceGrid.tsx` | Base para extensao com 3 estados |
| `components/diary/class-diary-detail.tsx` | Referencia para painel de detalhes |
| `lib/api/class-diary.ts` | Funcoes existentes para estender |
| `supabase/migrations/20250924001_attendance_immutability_system.sql` | Sistema de imutabilidade |
| `supabase/migrations/20250628095207_wild_block.sql` | Tabelas notas e frequencia |

---

## Mockups de Referencia

| Mockup | Uso |
|--------|-----|
| `planning/visuals/diario.html` | Layout card-based principal |
| `planning/visuals/frequencia.html` | Grid de frequencia semanal |
| `planning/visuals/diario-papel.html` | Visualizacao mensal (referencia) |
