# AGENTS.md — EDUCA

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
