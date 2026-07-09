# ADR-002 — Fronteiras de repositório (produto vs marketing vs demo)

**Status:** Accepted  
**Data:** 2026-07-09  
**Contexto:** wayfinder + handoff identidade; confusão monorepo `app` + `site` + futuro `demo`

## Contexto

O monorepo público `shishiv/EDUCA` misturava:

- **produto OSS** (gestão escolar: app Next + Supabase)
- **marketing** (`site/` landing, waitlist, blog)
- **demo** (planejado como pasta/projeto paralelo)

Isso confunde contributors, mistura ciclos de release e polui CI do produto com mudanças de copy/SEO.

## Decisão

| Superfície | Onde vive | Notas |
|------------|-----------|--------|
| **Produto OSS** | Repo público **`shishiv/EDUCA`** | `app/` + `supabase/` + `docs/` técnicos |
| **Marketing / site** | Repo **separado** (`educa-site` local; remoto a criar) | Landing, waitlist, blog, GTM — **não** no tree OSS |
| **Demo público** | **Deploy do mesmo `app/`** + seed | Não é um 3º codebase. Sandbox = env + `supabase/seed-demo` + projeto Vercel irmão ou subdomain |
| **Identidade visual (SSOT)** | **`app/`** (tokens, logo, login branded) | Site **herda** (copy ou package); não inventa brand paralelo |

### Estrutura canônica do repo público

```
EDUCA/
├── app/          # produto (Next + Supabase client)
├── supabase/     # migrations + seed-demo (scripts e dados de exemplo)
├── docs/         # técnico, ADRs, compliance
├── docker-compose.yml
└── README.md     # links para site live e demo live (URLs), sem pastas obrigatórias
```

### O que o README público deve linkar (não embutir)

- Site institucional: URL Vercel/domínio (ex. `educa-gamma.vercel.app`)
- Demo online: URL do **app** em modo sandbox (quando T08 estiver live)
- Como rodar seed demo **local** a partir deste repo

## Não fazer

- Pasta `site/` ou `demo/` no monorepo OSS como apps irmãos permanentes
- Tratar deploy marketing como SSOT de design tokens
- Seed demo *só* em repo privado — o script de seed fica no público (valor OSS)

## Consequências

- **T05 (waitlist/landing)** executa no repo de marketing, não em `EDUCA`
- **T12 (identidade)** = portar tokens de `EDUCA/app` → repo site
- **T04/T08** = seed + deploy do `app`; CTA no site aponta para URL do sandbox
- **CI do `EDUCA`** só typecheck/lint/test do produto (`app/`)
- Vercel: projeto marketing aponta para repo `educa-site`; projeto app/demo aponta para `EDUCA` rootDirectory `app`
- Rename `web/` → `app/` permanece (clareza do produto)

## Migração (esta sessão)

1. Extrair conteúdo de `site/` para `~/workspace/repos/educa-site` (repo local)
2. Remover `site/` do tree de `EDUCA`
3. Documentar links e ADRs; push/remoto do site e Root Directory Vercel = passo humano/follow-up

## Fontes

- Discussão owner 2026-07-09 (desacoplar site/demo do monorepo público)
- ADR-001 (stack canônica)
- wayfinder `map/MAP.md`, T05, T08, T12
