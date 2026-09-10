# EDUCA E2E Tests

Testes End-to-End para o sistema EDUCA usando Playwright.

## Estado de execução em 2026-09-08

Este documento mantém o catálogo de casos. Marcas `[x]` abaixo significam que o
caso está representado no inventário ou em uma spec; não significam `PASS` de uma
execução recente.

| Escopo | Estado | Recibo e limite |
|---|---|---|
| Suíte geral | **RED diagnóstica; não aceita** | General9 selecionou 239 casos: 234 passaram, 3 falharam e 2 casos seriais dependentes não foram executados. O cleanup passou. |
| Piloto agregado atual | **PASS no snapshot de Aggregate9: 36/36** | Legacy 26, capacity 3, descriptive 4 e security 3 passaram; cleanup aprovado. Extração posterior do helper de manifesto aguarda validação após o bloqueio de pressão do test-safe. |
| R1 canônico | **PASS delimitado** | Duas provas browser canônicas e cleanup aprovados no recibo preservado; não representa a suíte geral. |
| SQL | **PASS delimitado** | Cadeia completa e contratos passaram, incluindo finalização C04 e as duas ordens concorrentes dos vínculos de Vivências. |
| Hub de relatórios | **PASS delimitado** | A prova do hub verifica somente os três cartões e sua navegação para destinos canônicos. |
| Público/service worker | **PASS delimitado: 20/20** | `public-sw-lifecycle-final-20260908` passou 20 casos. Uma memoização posterior do hook tem apenas verificação focal; este recibo não prova snapshot de fonte idêntico ao atual. |
| Unitários | **PASS: 124 arquivos / 1.316 testes** | A seleção unitária comum passou. Vinte testes live permanecem em contrato opt-in separado e não entram nessa contagem. |
| Censo de código | **PASS: 623 arquivos, 16 regras, 0 diagnósticos** | Inclui a regra customizada do plugin e seus testes executáveis. Somente 22 arquivos idênticos ao vendor ficam excluídos; uma thread. |

General9 permanece evidência diagnóstica. Duas falhas são dos contratos de entrada
de notas e boletim para a nota sintética `8.4`; a leitura autenticada aguarda a
decisão de governança sobre as políticas canônicas de `notas`. Os dois casos
seriais dependentes não foram executados. A terceira falha foi uma ambiguidade de
locator entre o placeholder de série e um toast com o mesmo texto. O teste foi
corrigido após o snapshot congelado de General9, mas ainda não recebeu nova
execução em navegador. Nenhuma dessas condições aprova a suíte geral.

Pausa de validação atual: o test-safe retornou PRESSURE_PERSISTENT antes de iniciar static10. O helper compartilhado de manifesto extraído depois do snapshot e a correção do toast de turma ainda aguardam validação. R1 run3 parou antes do proxy/banco por Portless ausente no PATH; o runtime existente foi localizado e a repetição está pendente.

## Execução local

Use somente os comandos locais e o contrato de ambiente documentados em
[`../../../CONTEXT.md`](../../../CONTEXT.md). Não aponte estes testes para um
Supabase externo nem carregue dados reais.

```bash
cd app
pnpm test:e2e
pnpm test:e2e:pilot
pnpm test:e2e:pilot:canonical
```

Os runners provisionam somente dados sintéticos e recursos locais descartáveis.
Consulte `CONTEXT.md` antes de executar um filho isolado ou abrir um relatório
Playwright preservado.

## Estrutura

```
tests/e2e/
├── auth/, alunos/, schools/, turmas/, matriculas/, responsaveis/, users/
├── assignments/, attendance/, diary/, grades/, reports/, config/, profile/
├── flows/                        # Jornadas transversais e contratos de navegação
├── public-demo/                  # Visitante público e ciclo do service worker
├── pilot/                        # Piloto legacy, R1, capacity e security
├── pilot-descriptive/            # Emissão descritiva isolada
├── support/, utils/              # Diagnósticos, autenticação e helpers
└── auth.setup.ts                 # Setup sintético por papel
```

## Catálogo de casos

### Autenticação
- [x] Login form display
- [x] Validação de campos vazios
- [x] Validação de email inválido
- [x] Erro de credenciais inválidas
- [x] Redirect após login
- [x] Proteção de rotas
- [x] Persistência de sessão

### Escolas
- [x] Listagem
- [x] Campos obrigatórios
- [x] Validação de email
- [x] Validação de telefone
- [x] Criação com sucesso
- [x] Edição

### Turmas
- [x] Listagem
- [x] Filtros (série, turno)
- [x] Campos obrigatórios
- [x] Seleção de escola
- [x] Criação com sucesso
- [x] Atribuição de professor

### Alunos
- [x] Listagem com busca
- [x] Campos obrigatórios
- [x] Validação de CPF (formato e checksum)
- [x] Sexo/gênero select
- [x] Necessidades especiais
- [x] Criação com sucesso
- [x] Acesso ao boletim

### Matrículas
- [x] Listagem com filtros
- [x] Seleção de aluno/turma
- [x] Criação de matrícula
- [x] Transferência
- [x] Cancelamento

### Frequência (Chamada)
- [x] Acesso ao diário
- [x] Seleção de turma/data
- [x] Marcar presença
- [x] Marcar falta
- [x] Salvar frequência
- [x] Prazo de edição capturado por sessão a partir da configuração da escola
- [x] Destaque Bolsa Família
- [x] Alerta frequência baixa

### Usuários
- [x] Listagem com filtros
- [x] Campos obrigatórios
- [x] Tipos de usuário (roles)
- [x] Escola obrigatória por role
- [x] Criação com sucesso

### Responsáveis
- [x] Listagem
- [x] Validação CPF
- [x] Validação telefone
- [x] Parentesco
- [x] Vínculo com aluno

### Dashboard & Métricas
- [x] Exibição de métricas principais (alunos, escolas, turmas, matrículas)
- [x] Cards de estatísticas com ícones
- [x] Alertas de baixa frequência
- [x] Alertas de documentos pendentes
- [x] Alertas Bolsa Família
- [x] Atividades recentes
- [x] Ações rápidas (registro de frequência, novo aluno, nova matrícula)
- [x] Dashboard específico para professor (turmas atribuídas)
- [x] Atualização de dados
- [x] Estados vazios

### Relatórios
- [x] Acesso à página de relatórios
- [x] Hub com três destinos canônicos: frequência, conteúdo e Bolsa Família
- [x] Navegação do hub para cada destino
- [x] Filtros e tabelas nas páginas canônicas de relatório
- [x] Exportação PDF/Excel nas páginas de destino que implementam esses artefatos
- [x] Tratamento de erros

O hub não gera, agenda, mantém histórico, mostra progresso nem simula downloads.
Esses comportamentos não fazem parte do contrato de `flows/relatorios.spec.ts`.

### Permissões & RBAC
- [x] **Admin**: Acesso às superfícies ativas de cadastro, acadêmico, relatórios e configurações
- [x] **Admin**: Criação de escolas
- [x] **Admin**: Gestão de usuários
- [x] **Admin**: Configurações do sistema
- [x] **Diretor**: Acesso ao dashboard da escola
- [x] **Diretor**: Visualização de alunos da escola
- [x] **Diretor**: Gestão de matrículas
- [x] **Diretor**: Aprovação de desbloqueio de frequência
- [x] **Diretor**: Sem acesso a configurações globais
- [x] **Professor**: Acesso a turmas atribuídas
- [x] **Professor**: Registro de frequência
- [x] **Professor**: Visualização de alunos das turmas
- [x] **Professor**: Acesso a sessões
- [x] **Professor**: Bloqueio de criação de alunos
- [x] **Professor**: Bloqueio de gestão de matrículas
- [x] **Professor**: Respeito ao prazo capturado da sessão e à janela de correção
- [x] **Secretario**: Gestão de alunos
- [x] **Secretario**: Gestão de matrículas
- [x] **Secretario**: Visualização de relatórios
- [x] **Secretario**: Acesso a configurações e sessões
- [x] **Secretario**: Sem edição de frequência
- [x] **Responsavel**: Autenticação reconhecida, seguida de negação do dashboard em `/unauthorized`
- [x] **Responsavel**: Sem portal, rota de filhos ou mapeamento de posse implementados
- [x] **Todos os papéis autenticados**: calendário e flags permanecem bloqueados
- [x] Proteção de rotas não autenticadas
- [x] Redirecionamento pós-login
- [x] Isolamento de dados por escola/turma/aluno
- [x] Botões de ação apropriados por role

### Notas & Boletim
- [x] Acesso à página de notas
- [x] Projeção autorizada da turma e filtro exato do primeiro bimestre
- [x] Nota inválida rejeitada sem escrita
- [x] Nota persistida, recarregada e restaurada
- [x] Boletim individual e artefato PDF para o aluno sintético

## Comandos locais úteis

```bash
# Rodar um arquivo específico no ambiente local já preparado
pnpm exec playwright test tests/e2e/users/crud.spec.ts

# Rodar com UI interativo
pnpm exec playwright test --ui

# Rodar em modo headed (ver browser)
pnpm exec playwright test --headed

# Rodar apenas login tests
pnpm exec playwright test -g "Login"

# Debug mode
pnpm exec playwright test --debug

# Gerar trace para debug
pnpm exec playwright test --trace on
```

## Identidades de teste

`auth.setup.ts` e os runners isolados usam apenas identidades sintéticas locais.
As credenciais pertencem aos seeds de teste e não devem ser reutilizadas em um
ambiente externo.

## Brazilian Compliance

Testes incluem validações brasileiras:
- CPF com algoritmo de verificação
- Formato de telefone brasileiro
- Prazo de frequência governado no banco: default semeado `18:00` em São Paulo,
  com override por escola e valor capturado na sessão
- Alerta de frequência < 80%

## Troubleshooting

### Ambiente incompleto

Use o workspace provisionado e os pré-requisitos de `CONTEXT.md`; não instale
dependências ad hoc durante uma rodada de evidência.

### Erro de autenticação
```bash
# Reaplicar fixtures determinísticas locais
pnpm seed:e2e
```

Se o Realtime responder 403, confirme que `NEXT_PUBLIC_SUPABASE_ANON_KEY`
usa a chave `sb_publishable_...`, não a chave JWT legada `ANON_KEY`.

### Testes flaky
```bash
# Rodar com retries
pnpm exec playwright test --retries=3
```

### Debug visual
```bash
pnpm exec playwright test --headed --slowmo=1000
```

---

## Resumo de Cobertura

A matriz autoritativa de catálogo, incluindo rota, papel, viewport, interação e
spec, está em [`COVERAGE_MATRIX.md`](COVERAGE_MATRIX.md). Contagem de catálogo e
resultado de execução são campos separados. General6 permanece uma evidência RED
diagnóstica; uma futura rodada só deve ser registrada como `PASS` quando houver um
recibo geral completo e aceito.

*Última atualização: 2026-09-08*
