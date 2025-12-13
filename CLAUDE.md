# CLAUDE.md

Sistema de gestão educacional para o Município de Fronteira, MG.

## Referência Rápida

| O quê | Onde |
|-------|------|
| Projeto Principal | `gestao_fronteira/` (Next.js 15 + Supabase) |
| Package Manager | `pnpm` |
| Dev Server | `pnpm dev` → http://localhost:3000 |
| Database | **Supabase MCP** |
| UI Testing | **Chrome DevTools MCP** |
| Components | **shadcn-ui MCP** |
| Library Docs | **Context7 MCP** ou **Ref MCP** |
| Task Tracking | **Beads** (`bd` CLI) + **GitHub Issues** |

---

## Tracking de Trabalho

**Sistema único:** Beads (`bd` CLI) + GitHub Issues

### Comandos Beads

```bash
# Encontrar trabalho
bd ready                          # Issues prontas (sem blockers)
bd list --status=open             # Todas issues abertas
bd list --status=in_progress      # Trabalho ativo

# Criar e atualizar
bd create --title="..." --type=task|bug|feature
bd update <id> --status=in_progress
bd close <id>                     # Marcar como concluído

# Sincronizar
bd sync                           # Push para git
bd stats                          # Estatísticas
```

### Protocolo de Fechamento de Sessão

**CRÍTICO**: Antes de dizer "pronto", execute:

```bash
[ ] git status              # Verificar mudanças
[ ] git add <files>         # Stage código
[ ] bd sync                 # Commit beads
[ ] git commit -m "..."     # Commit código
[ ] git push                # Push para remote
```

### Apontamento (Time Tracking)

Separado em `apontamento/[mes-ano].md`

---

## MCP Servers (6 Ativos)

### 1. Supabase MCP `mcp__supabase__*`

**CRÍTICO:** Nunca use Supabase CLI. Sempre use MCP.

| Tool | Uso |
|------|-----|
| `mcp__supabase__list_tables` | Ver schema |
| `mcp__supabase__execute_sql` | Rodar queries |
| `mcp__supabase__apply_migration` | Aplicar migrations |
| `mcp__supabase__generate_typescript_types` | Gerar types |

### 2. Chrome DevTools MCP `mcp__chrome-devtools__*`

| Tool | Uso |
|------|-----|
| `mcp__chrome-devtools__navigate_page` | Navegar |
| `mcp__chrome-devtools__take_screenshot` | Capturar tela |
| `mcp__chrome-devtools__list_console_messages` | Ver erros JS |
| `mcp__chrome-devtools__resize_page` | Testar responsivo |

### 3. shadcn-ui MCP `mcp__shadcn-ui__*`

| Tool | Uso |
|------|-----|
| `mcp__shadcn-ui__get_component` | Código do componente |
| `mcp__shadcn-ui__get_component_demo` | Exemplos de uso |

### 4. Context7 MCP `mcp__context7__*`

| Tool | Uso |
|------|-----|
| `mcp__context7__resolve-library-id` | Encontrar biblioteca |
| `mcp__context7__get-library-docs` | Buscar docs |

### 5. Ref MCP `mcp__Ref__*`

| Tool | Uso |
|------|-----|
| `mcp__Ref__ref_search_documentation` | Buscar docs (web, GitHub) |
| `mcp__Ref__ref_read_url` | Ler URL como markdown |

### 6. Sequential Thinking MCP

Para problemas complexos e análise multi-step.

---

## Comandos de Desenvolvimento

```bash
cd gestao_fronteira/

pnpm dev          # Dev server
pnpm build        # Build produção
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm test         # Unit tests
```

---

## Estrutura do Projeto

```
gestao_fronteira/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rotas de auth
│   ├── (dashboard)/       # App principal
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui
│   ├── attendance/        # Frequência
│   └── diary/             # Diário de classe
├── lib/
│   ├── supabase.ts        # Cliente DB
│   └── validators/        # Validação brasileira
└── types/                 # TypeScript defs
```

---

## Regras de Compliance Brasileiro

1. **Imutabilidade de Frequência**: "não existe o esquecer" - sem edições retroativas
2. **Auto-Lock 18:00**: Frequência travada após 18h (horário São Paulo)
3. **Bolsa Família**: Alerta quando frequência < 80% para alunos com NIS
4. **INEP/Educacenso**: Campos obrigatórios (CPF, NIS, raça, transporte)
5. **RLS**: Isolamento de dados por escola

---

## Git Workflow

```bash
# Nomenclatura de branches
feature/[nome]    # Novas funcionalidades
fix/[nome]        # Correções

# Nunca push direto para main
# Sempre usar feature branches + PR

# Formato de commit
feat(scope): descrição
fix(scope): descrição
```

---

## REGRA 1: CHANGELOG.md

**ANTES de commitar, SEMPRE atualize `/CHANGELOG.md`**

Seções:
- **Added**: Novas funcionalidades
- **Changed**: Modificações
- **Fixed**: Correções
- **Removed**: Funcionalidades removidas

---

## REGRA 2: Apontamento

**TODO trabalho DEVE ser logado** em `apontamento/[mes-ano].md`

Formato:
```markdown
Data: DD/MM/YYYY
Horas: X.Xh
Descrição: [Descrição simples e não-técnica em português]
```

---

## Estilo de Comunicação

- Seja direto e conciso
- Use emojis para condensar (✅ ❌ ⚠️)
- Português para user-facing, inglês para código

---

## Arquivos de Referência

| Arquivo | Propósito |
|---------|-----------|
| `.beads/` | Issue tracking |
| `CHANGELOG.md` | Histórico de versões |
| `apontamento/*.md` | Time tracking (português) |
| `docs/bncc.md` | Referência BNCC |
| `docs/questionario-*.md` | Respostas validação |
