# AGENTS.md — EDUCA

## Estrutura
Código em `app/` — rodar comandos dentro de `app/`.

## Comandos (dentro de `app/`)
| Comando | Uso |
|---------|-----|
| `pnpm dev` | dev server (turbo) |
| `pnpm build` | build de produção |
| `pnpm typecheck` | type check |
| `pnpm lint` | eslint |
| `pnpm test` | vitest |

## ai-memory
Ao trabalhar neste repo, passar `project="EDUCA"` em todas as chamadas ai-memory:
- `memory_query("...", project="EDUCA")`
- `memory_write_page(..., project="EDUCA")`
- `memory_handoff_begin(..., project="EDUCA")`

## Antes de push
`pnpm typecheck && pnpm test`
