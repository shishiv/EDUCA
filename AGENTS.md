# AGENTS.md - EDUCA

## Layout
Product code lives in `app/`. Run package commands from `app/`.

## Commands (inside `app/`)
| Command | Use |
|---------|-----|
| `pnpm dev` | dev server |
| `pnpm build` | production build |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |

## Before push
`pnpm typecheck && pnpm test`

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/README.md](docs/README.md).
Database migrations and local type generation are documented in [supabase/migrations/README.md](supabase/migrations/README.md).

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
