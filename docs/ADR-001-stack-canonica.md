# ADR-001 — Stack canônica do EDUCA

**Status:** Accepted  
**Data:** 2026-07-09  
**Contexto:** wayfinder T03 + CodebaseScout

## Decisão

O monorepo `shishiv/EDUCA` **já é** a stack do SaaS — não greenfield:

| Camada | Escolha |
|--------|---------|
| App | Next.js 16+ (App Router), React 19, TypeScript strict |
| DB/Auth | Supabase (Postgres + SSR + RLS multi-tenant) |
| UI | shadcn/ui + Tailwind |
| Deploy app | Vercel (rootDirectory `app`) |
| Site marketing | Repo **separado** (`educa-site`) — ver **ADR-002**; URL ref. `https://educa-gamma.vercel.app` |

## Não usar (por agora)

- Cloudflare Workers/D1 como runtime principal do app
- Domínio custom obrigatório para MVP (adiado; host = educa.vercel.app)

## Consequências

- T04/T07/T08 implementam em cima de `app/` + Supabase
- WhatsApp (T07) encaixa em `responsaveis.telefone` + Edge Functions
- Custos multi-secretaria ainda a estimar (open item do T03)
- Marketing **não** vive neste monorepo (ADR-002)

## Fontes

- `docs/codebase-discovery-2026-07-09.md`
- wayfinder `map/tickets/T03-stack-saas.md`
