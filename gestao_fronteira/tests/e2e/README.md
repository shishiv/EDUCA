# EDUCA E2E Tests

Testes End-to-End para o sistema EDUCA usando Playwright.

## Quick Start

```bash
# 1. Instalar dependências
pnpm install

# 2. Instalar browsers do Playwright
npx playwright install

# 3. Seed database com dados de teste
pnpm seed:dev
pnpm seed:superadmin

# 4. Rodar testes
npx playwright test

# 5. Ver relatório
npx playwright show-report
```

## Estrutura

```
tests/e2e/
├── auth/
│   └── login.spec.ts             # Login e autenticação
├── forms/
│   ├── escola.spec.ts            # CRUD Escolas
│   ├── turma.spec.ts             # CRUD Turmas
│   ├── aluno.spec.ts             # CRUD Alunos (com CPF, Bolsa Família)
│   ├── matricula.spec.ts         # Matrículas
│   ├── usuario.spec.ts           # Gestão de Usuários
│   └── responsavel.spec.ts       # Responsáveis/Tutores
├── flows/
│   ├── chamada.spec.ts           # Fluxo completo de frequência
│   ├── dashboard-metrics.spec.ts # Dashboard, estatísticas e alertas
│   ├── relatorios.spec.ts        # Geração e download de relatórios
│   ├── permissions.spec.ts       # RBAC e controle de acesso
│   └── notas-boletim.spec.ts     # Sistema de notas e boletins
├── utils/
│   └── test-helpers.ts           # Utilitários de teste
├── auth.setup.ts                 # Setup de autenticação
└── README.md                     # Este arquivo
```

## Cobertura de Testes

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
- [x] Bolsa Família + NIS
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
- [x] Regras de lock (18h)
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
- [x] Listagem de relatórios disponíveis
- [x] Tipos de relatórios (frequência, matrículas, desempenho, Bolsa Família, resumo por escola)
- [x] Geração de relatórios com filtros (tipo, data, escola, turma)
- [x] Status de geração (processando, completo, erro)
- [x] Download em PDF
- [x] Download em Excel/CSV
- [x] Visualização prévia de relatórios
- [x] Exclusão de relatórios antigos
- [x] Agendamento de relatórios recorrentes
- [x] Tratamento de erros

### Permissões & RBAC
- [x] **Admin**: Acesso completo a todas as seções
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
- [x] **Professor**: Bloqueio de criação de alunos
- [x] **Professor**: Bloqueio de gestão de matrículas
- [x] **Professor**: Respeito ao lock de 18h para frequência
- [x] **Secretario**: Gestão de alunos
- [x] **Secretario**: Gestão de matrículas
- [x] **Secretario**: Visualização de relatórios
- [x] **Secretario**: Sem edição de frequência
- [x] **Responsavel**: Visualização apenas dos filhos
- [x] **Responsavel**: Acesso ao boletim do filho
- [x] **Responsavel**: Acesso à frequência do filho
- [x] **Responsavel**: Sem acesso a outros alunos
- [x] Proteção de rotas não autenticadas
- [x] Redirecionamento pós-login
- [x] Isolamento de dados por escola/turma/aluno
- [x] Botões de ação apropriados por role

### Notas & Boletim
- [x] Acesso à página de notas
- [x] Filtros por turma e período/bimestre
- [x] Listagem de alunos da turma
- [x] Colunas por disciplina
- [x] Entrada de notas numéricas
- [x] Validação de intervalo de notas (0-10)
- [x] Suporte a notas decimais
- [x] Salvamento de notas
- [x] Cálculo de média por aluno
- [x] Destaque para alunos em reprovação
- [x] Cálculo de média da turma
- [x] Acesso ao boletim individual do aluno
- [x] Exibição de identificação do aluno
- [x] Notas por disciplina e período
- [x] Percentual de frequência no boletim
- [x] Média final
- [x] Status de aprovação (aprovado/reprovado/recuperação)
- [x] Exportação do boletim em PDF
- [x] Branding da escola no PDF
- [x] Tratamento de notas faltantes
- [x] Bloqueio de edição de períodos encerrados
- [x] Alertas para alunos em risco de reprovação
- [x] Validação de caracteres especiais

## Comandos Úteis

```bash
# Rodar testes específicos
npx playwright test tests/e2e/forms/aluno.spec.ts

# Rodar com UI interativo
npx playwright test --ui

# Rodar em modo headed (ver browser)
npx playwright test --headed

# Rodar apenas login tests
npx playwright test -g "Login"

# Debug mode
npx playwright test --debug

# Gerar trace para debug
npx playwright test --trace on
```

## Credenciais de Teste

Após rodar `pnpm seed:dev`:

| Usuário | Email | Senha |
|---------|-------|-------|
| Admin | admin@test.com | test123456 |
| Diretor | diretor@test.com | test123456 |
| Professor | professor@test.com | test123456 |

## Brazilian Compliance

Testes incluem validações brasileiras:
- CPF com algoritmo de verificação
- Formato de telefone brasileiro
- NIS para Bolsa Família (11 dígitos)
- Regra de lock de frequência às 18h (fuso São Paulo)
- Alerta de frequência < 80%

## Troubleshooting

### Playwright não instalado
```bash
npx playwright install
```

### Erro de autenticação
```bash
# Limpar e re-seedar
pnpm seed:clear
pnpm seed:dev
pnpm seed:superadmin
```

### Testes flaky
```bash
# Rodar com retries
npx playwright test --retries=3
```

### Debug visual
```bash
npx playwright test --headed --slowmo=1000
```

---

## Resumo de Cobertura

**Total de arquivos de teste**: 12
- 1 teste de autenticação (login)
- 7 testes de formulários CRUD
- 4 testes de fluxos completos

**Total de casos de teste**: 150+
- Autenticação: 7 casos
- Formulários: 60+ casos
- Fluxos: 80+ casos (chamada, dashboard, relatórios, permissões, notas)

*Última atualização: 2026-02-02*
*Novos testes adicionados: dashboard-metrics, relatorios, permissions, notas-boletim*
