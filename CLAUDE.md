<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

Educational management system for Municipality of Fronteira, Brazil.

## Quick Reference

| What | Where |
|------|-------|
| Primary Project | `gestao_fronteira/` (Next.js 15 + Supabase) |
| Package Manager | `pnpm` |
| Dev Server | `pnpm dev` → http://localhost:3000 |
| Database | **Supabase MCP** |
| UI Testing | **Chrome DevTools MCP** |
| Components | **shadcn-ui MCP** |
| Library Docs | **Context7 MCP** or **Ref MCP** |
| Problem Solving | **Sequential Thinking MCP** |
| Task Tracking | **Beads** (`bd` CLI) |

---

## MCP Servers (6 Active)

All database, UI testing, component creation, and documentation tasks **MUST** use the configured MCP servers.

---

### 1. Supabase MCP `mcp__supabase__*`

**Purpose:** All database operations (migrations, queries, schema)

**CRITICAL:** Never use Supabase CLI (`supabase start`, `supabase db push`). Always use MCP.

| Tool | Use For |
|------|---------|
| `mcp__supabase__list_tables` | View database schema |
| `mcp__supabase__execute_sql` | Run SQL queries |
| `mcp__supabase__apply_migration` | Apply schema changes |
| `mcp__supabase__list_migrations` | View migration history |
| `mcp__supabase__generate_typescript_types` | Generate types from schema |
| `mcp__supabase__get_logs` | Debug database issues |
| `mcp__supabase__get_advisors` | Security/performance checks |
| `mcp__supabase__search_docs` | Search Supabase docs (GraphQL) |

**Example - Create Migration:**
```
mcp__supabase__apply_migration(
  name: "add_status_to_frequencia",
  query: "ALTER TABLE frequencia ADD COLUMN status_presenca VARCHAR(1);"
)
```

---

### 2. Chrome DevTools MCP `mcp__chrome-devtools__*`

**Purpose:** UI/UX testing, screenshots, performance profiling, browser automation

**When to Use:**
- After any frontend change
- Before committing UI code
- Performance optimization
- Visual regression testing

#### Navigation
| Tool | Use For |
|------|---------|
| `mcp__chrome-devtools__navigate_page` | Go to URL |
| `mcp__chrome-devtools__list_pages` | List open tabs |
| `mcp__chrome-devtools__new_page` | Open new tab |
| `mcp__chrome-devtools__select_page` | Switch tabs |
| `mcp__chrome-devtools__wait_for` | Wait for text/element |

#### Interactions
| Tool | Use For |
|------|---------|
| `mcp__chrome-devtools__click` | Click element |
| `mcp__chrome-devtools__fill` | Fill input field |
| `mcp__chrome-devtools__fill_form` | Fill multiple fields |
| `mcp__chrome-devtools__hover` | Hover over element |
| `mcp__chrome-devtools__press_key` | Keyboard input |
| `mcp__chrome-devtools__handle_dialog` | Accept/dismiss dialogs |

#### Visual Testing
| Tool | Use For |
|------|---------|
| `mcp__chrome-devtools__take_screenshot` | Capture page/element |
| `mcp__chrome-devtools__take_snapshot` | Accessibility tree (a11y) |
| `mcp__chrome-devtools__resize_page` | Test responsiveness |

#### Debugging
| Tool | Use For |
|------|---------|
| `mcp__chrome-devtools__list_console_messages` | JS errors/warnings |
| `mcp__chrome-devtools__list_network_requests` | API calls |
| `mcp__chrome-devtools__get_network_request` | Request details |
| `mcp__chrome-devtools__evaluate_script` | Run JS in page |

#### Performance
| Tool | Use For |
|------|---------|
| `mcp__chrome-devtools__performance_start_trace` | Start profiling |
| `mcp__chrome-devtools__performance_stop_trace` | Stop profiling |
| `mcp__chrome-devtools__performance_analyze_insight` | LCP, latency analysis |
| `mcp__chrome-devtools__emulate` | Slow network/CPU |

**Example - UI Validation Workflow:**
```
1. mcp__chrome-devtools__navigate_page(url: "http://localhost:3000/dashboard")
2. mcp__chrome-devtools__take_screenshot()           # Desktop
3. mcp__chrome-devtools__resize_page(width: 375, height: 667)
4. mcp__chrome-devtools__take_screenshot()           # Mobile
5. mcp__chrome-devtools__list_console_messages()     # Check errors
6. mcp__chrome-devtools__list_network_requests()     # Check API calls
```

---

### 3. shadcn-ui MCP `mcp__shadcn-ui__*`

**Purpose:** Component source code, demos, and patterns

| Tool | Use For |
|------|---------|
| `mcp__shadcn-ui__list_components` | All available components |
| `mcp__shadcn-ui__get_component` | Component source code |
| `mcp__shadcn-ui__get_component_demo` | Usage examples |
| `mcp__shadcn-ui__get_component_metadata` | Props, dependencies |
| `mcp__shadcn-ui__list_blocks` | Pre-built UI blocks |
| `mcp__shadcn-ui__get_block` | Block source code |

**Example - Get Button Component:**
```
mcp__shadcn-ui__get_component(componentName: "button")
mcp__shadcn-ui__get_component_demo(componentName: "button")
```

---

### 4. Context7 MCP `mcp__context7__*`

**Purpose:** Up-to-date library documentation lookup (public docs)

| Tool | Use For |
|------|---------|
| `mcp__context7__resolve-library-id` | Find library ID |
| `mcp__context7__get-library-docs` | Get documentation |

**Example - Get Next.js Docs:**
```
1. mcp__context7__resolve-library-id(libraryName: "next.js")
   → Returns: /vercel/next.js

2. mcp__context7__get-library-docs(
     context7CompatibleLibraryID: "/vercel/next.js",
     topic: "app router",
     mode: "code"
   )
```

**Modes:**
- `code` - API references, code examples (default)
- `info` - Conceptual guides, architecture

---

### 5. Ref MCP `mcp__Ref__*`

**Purpose:** Documentation search (public + private resources)

| Tool | Use For |
|------|---------|
| `mcp__Ref__ref_search_documentation` | Search docs (web, GitHub, PDFs) |
| `mcp__Ref__ref_read_url` | Read URL content as markdown |

**When to Use:**
- When working with libraries/APIs
- After encountering lint errors
- For private documentation search (add `ref_src=private`)

**Example - Search Supabase Docs:**
```
mcp__Ref__ref_search_documentation(query: "supabase rls policies nextjs")
mcp__Ref__ref_read_url(url: "https://supabase.com/docs/guides/auth/row-level-security")
```

**Ref vs Context7:**
- **Context7**: Structured library docs with code snippets
- **Ref**: Web search + private docs + URL reading

---

### 6. Sequential Thinking MCP `mcp__sequential-thinking__*`

**Purpose:** Complex problem solving, multi-step analysis

| Tool | Use For |
|------|---------|
| `mcp__sequential-thinking__sequentialthinking` | Step-by-step reasoning |

**When to Use:**
- Breaking down complex problems
- Multi-step implementation planning
- Debugging with multiple hypotheses
- Architectural decisions

**Example - Problem Analysis:**
```
mcp__sequential-thinking__sequentialthinking(
  thought: "Analyzing the attendance locking mechanism...",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
)
```

---

## Beads - Issue & Task Tracking

**Purpose:** Track ALL work in beads (replaces TodoWrite for long-term tracking)

### Core Commands

```bash
# Finding Work
bd ready                          # Issues ready to work (no blockers)
bd list --status=open             # All open issues
bd list --status=in_progress      # Active work
bd show <id>                      # Issue details with dependencies

# Creating & Updating
bd create --title="..." --type=task|bug|feature
bd update <id> --status=in_progress
bd close <id>                     # Mark complete
bd close <id1> <id2> ...          # Close multiple at once

# Dependencies
bd dep add <issue> <depends-on>   # Add dependency
bd blocked                        # Show blocked issues

# Sync
bd sync                           # Push to git remote
bd stats                          # Project statistics
bd doctor                         # Check for issues
```

### Session Close Protocol

**CRITICAL**: Before saying "done", run this checklist:

```bash
[ ] git status              # Check changes
[ ] git add <files>         # Stage code
[ ] bd sync                 # Commit beads
[ ] git commit -m "..."     # Commit code
[ ] bd sync                 # Commit new beads
[ ] git push                # Push to remote
```

---

## MCP Usage Priority

| Task | Primary MCP | Alternative |
|------|-------------|-------------|
| Database operations | Supabase | None (mandatory) |
| UI changes | Chrome DevTools | None (mandatory) |
| New components | shadcn-ui | Read source files |
| Library docs | Context7 | Ref |
| Private docs | Ref | - |
| Complex problems | Sequential Thinking | Manual analysis |
| Task tracking | Beads (`bd`) | - |

---

## Development Commands

```bash
cd gestao_fronteira/

# Development
pnpm dev                 # Dev server → localhost:3000
pnpm build               # Production build
pnpm typecheck           # TypeScript check
pnpm lint                # ESLint

# Testing
pnpm test                # Unit tests (Jest)
pnpm test:e2e            # E2E tests (Playwright)
pnpm test:coverage       # Coverage report

# Database (USE MCP, NOT THESE)
# pnpm supabase:*        # ❌ DON'T USE CLI
# Use mcp__supabase__*   # ✅ USE MCP
```

---

## Project Structure

```
gestao_fronteira/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes
│   ├── (dashboard)/       # Main app
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui
│   ├── attendance/        # Frequency marking
│   ├── diary/             # Class diary
│   └── ...
├── lib/
│   ├── supabase.ts        # DB client
│   └── validation/        # Brazilian validation
├── types/                 # TypeScript defs
└── supabase/
    └── migrations/        # DB migrations
```

---

## Brazilian Compliance Rules

1. **Attendance Immutability**: "não existe o esquecer" - no retroactive edits
2. **18:00 Auto-Lock**: Frequency locked after 6 PM São Paulo time
3. **Bolsa Família**: Alert at <80% attendance for NIS students
4. **INEP/Educacenso**: Required fields (CPF, NIS, race, transport)
5. **RLS**: School-based data isolation

---

## Git Workflow

```bash
# Branch naming
feature/[name]    # New features
fix/[name]        # Bug fixes

# Never push directly to main
# Always use feature branches + PR

# Commit format
feat(scope): description
fix(scope): description
```

---

## Quality Checklist

Before committing frontend changes:

- [ ] `mcp__chrome-devtools__take_screenshot` (desktop)
- [ ] `mcp__chrome-devtools__resize_page` + screenshot (mobile)
- [ ] `mcp__chrome-devtools__list_console_messages` (no errors)
- [ ] `mcp__chrome-devtools__list_network_requests` (all 2xx)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `bd sync` to track work

---

## Communication Style

- Be direct and concise
- Use abbreviations to save tokens
- Use emojis to condense (✅ ❌ ⚠️)
- Portuguese for user-facing, English for code

---

## RULE 1: CHANGELOG.md - Document ALL Changes

**BEFORE committing code, ALWAYS update `/CHANGELOG.md`**

Format: [Keep a Changelog](https://keepachangelog.com/)

Add entry under `## [Unreleased]` in appropriate section:
- **Added**: New features, new files, new systems
- **Changed**: Modifications to existing functionality
- **Fixed**: Bug fixes
- **Removed**: Deleted features, deprecated code
- **Security**: Security-related changes

---

## RULE 2: Time Tracking (Apontamento)

**ALL work MUST be logged** in `apontamento/[mes-ano].md`

See: [apontamento/README.md](apontamento/README.md) for full details.

**When to log:**
- After significant commits
- At end of work session
- Before push/merge

**Format (non-technical Portuguese):**
```markdown
Data: DD/MM/YYYY
Horas: X.Xh
Descrição: [Descrição simples e não-técnica]
```

**Time estimates by commit type:**
| Type | Hours | Example |
|------|-------|---------|
| Simple bug fix | 1-2h | Form validation fix |
| Complex bug fix | 2-4h | RLS policy correction |
| Small feature | 2-4h | New form field |
| Medium feature | 4-6h | New page |
| Large feature | 6-8h | Complete workflow |
| Refactoring | 3-4h | Component reorganization |
| Documentation | 2-3h | Technical analysis |
| Tests | 2-3h | E2E test suite |
| Cleanup | 2-4h | Remove obsolete code |

**Translation (Technical → Non-technical):**
| Technical | Non-technical (PT) |
|-----------|-------------------|
| RLS policies | Configuração de segurança |
| Refactoring | Reorganização do código |
| E2E tests | Testes do sistema |
| Bug fix | Correção de erros |
| Feature | Funcionalidade nova |
| Migration | Atualização do banco |
| Performance | Melhoria de velocidade |
| Deployment | Colocação em produção |

---

## Files Reference

| File | Purpose |
|------|---------|
| `.beads/` | Issue tracking (Beads) |
| `BUGS-ANALYSIS.md` | Bug tracking, project status |
| `CHANGELOG.md` | Version history |
| `TASKS.md` | Sprint/task tracking |
| `apontamento/*.md` | Time tracking (Portuguese) |
