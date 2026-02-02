# CLAUDE.md

Sistema de gestão educacional para o Município de Fronteira, MG.

## Referência Rápida

| O quê | Onde |
|-------|------|
| Projeto Principal | `gestao_fronteira/` (Next.js 15 + Supabase) |
| Package Manager | `pnpm` |
| Dev Server | `pnpm dev` → http://localhost:3000 |

---

## Skills Disponíveis

| Skill | Uso |
|-------|-----|
| `codebase-cleanup` | Limpeza sistemática em 4 fases |

Invocar com: `skill: "codebase-cleanup"`

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
├── app/
│   ├── (auth)/             # Rotas de auth
│   ├── (dashboard)/        # App principal
│   └── api/
│       ├── alunos/
│       ├── turmas/
│       ├── escolas/
│       ├── sessoes/aula/   # Sessões de aula
│       ├── frequencia/
│       ├── notas/
│       └── relatorios/
├── components/
│   ├── ui/                 # shadcn/ui
│   ├── attendance/         # Frequência
│   ├── diary/              # Diário de classe
│   ├── students/           # Alunos
│   ├── grades/             # Notas
│   └── reports/            # Relatórios
├── lib/
│   ├── supabase.ts         # Cliente DB
│   ├── validation/         # Validação brasileira (CPF, CNPJ, NIS, etc.)
│   └── api/                # API helpers
└── types/                  # TypeScript defs
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

**TODO trabalho DEVE ser logado** em `.apontamento/[mes-ano].md`

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
| `.claude/skills/` | Skills disponíveis |
| `CHANGELOG.md` | Histórico de versões |
| `.apontamento/*.md` | Time tracking (português) |


