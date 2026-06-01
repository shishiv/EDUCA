# EDUCA — Open Source Prep

**Repo alvo:** `shishiv/EDUCA` (privado → público)
**Objetivo:** Tornar o EDUCA publicável como open source e submeter a candidatura ao programa Codex for Open Source da OpenAI.

---

## Contexto

O EDUCA é um sistema de gestão escolar municipal construído para Fronteira/MG (9 escolas municipais de ensino fundamental + 1 em construção, todas ainda gerenciadas em papel). O incentivo interno foi cortado antes do deploy. O código está maduro (Next.js 15, TypeScript, Playwright + Vitest, RLS multi-tenant) mas amarrado ao Supabase e com identidade hardcoded de Fronteira/MG.

O plano:

1. Limpar o histórico git de credenciais e artefatos
2. Genericizar tudo que está amarrado à cidade
3. Montar scaffolding OSS (README, CONTRIBUTING, Docker, docs)
4. Documentar o roadmap provider-agnostic (argumento central da candidatura Codex)
5. Finalizar e submeter a aplicação Codex for Open Source

---

## Success Criteria

- `shishiv/EDUCA` pode ser tornado público sem expor credenciais, PII ou dados específicos de Fronteira/MG
- Um desenvolvedor de outra prefeitura consegue fazer `git clone` + seguir o README + ter o sistema rodando localmente em < 30 minutos
- A candidatura ao Codex for Open Source está preenchida e pronta para submit
- O histórico git não contém `.env.production` nem `deploy.log` em nenhum commit

---

## Slices

### S01 — Purgar credenciais do histórico git

`risk:high` `depends:[]`

Remover do histórico completo do git (não só do HEAD):

- `gestao_fronteira/.env.production` — contém `SUPABASE_SERVICE_ROLE_KEY` real (bypassa RLS)
- `gestao_fronteira/deploy.log` — log de deploy com detalhes do ambiente

**Procedimento:**

```bash
cd <clone local do EDUCA>
pip install git-filter-repo
git filter-repo --path gestao_fronteira/.env.production --invert-paths --force
git filter-repo --path gestao_fronteira/deploy.log --invert-paths --force
git push origin main --force
```

Após push: verificar que nenhum commit no histórico contém as strings `SUPABASE_SERVICE_ROLE_KEY` ou `[SUPABASE-PROJECT-REF]`.

> After this: `git log --all -p | grep SERVICE_ROLE` retorna vazio. O repo pode ser tornado público sem risco de vazamento de credencial.

---

### S02 — Remover artefatos de build/teste e atualizar .gitignore

`risk:low` `depends:[S01]`

Deletar do HEAD e adicionar ao `.gitignore`:

- `gestao_fronteira/build_output.txt`
- `gestao_fronteira/test-results/` (pasta inteira)
- `gestao_fronteira/docs-inventory.json`

Adicionar ao `gestao_fronteira/.gitignore`:

```
build_output.txt
test-results/
docs-inventory.json
.env.production
.env.local
.env*.local
```

> After this: Nenhum artefato de build local ou resultado de teste no repositório.

---

### S03 — Genericizar identidade municipal (Fronteira → config-driven)

`risk:medium` `depends:[S02]`

**3a. Criar `gestao_fronteira/lib/config.ts`** com todas as variáveis municipais:

```typescript
export const municipalConfig = {
  nome: process.env.NEXT_PUBLIC_MUNICIPAL_NAME ?? 'Município',
  secretaria: process.env.NEXT_PUBLIC_SECRETARIA_NAME ?? 'Secretaria de Educação',
  estado: process.env.NEXT_PUBLIC_MUNICIPAL_STATE ?? 'MG',
  telefoneContato: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '',
  emailDPO: process.env.NEXT_PUBLIC_DPO_EMAIL ?? '',
  enderecoDPO: process.env.NEXT_PUBLIC_DPO_ADDRESS ?? '',
};
```

**3b. Atualizar `municipal-assets.tsx`**

- Substituir strings hardcoded (`'Prefeitura Municipal de Fronteira/MG'`, `'Prefeitura de Fronteira'`) por `municipalConfig.nome`
- Substituir classe CSS `text-fronteira-primary` → `text-municipal-primary`

**3c. Atualizar `tailwind.config.js`**

- Renomear todas as ocorrências de `fronteira` → `municipal` nos tokens de cor
- Preservar os valores HSL — só os nomes mudam

**3d. Atualizar `app/politica-privacidade/page.tsx`**

- Substituir endereço, telefone, e-mail do DPO por `municipalConfig.emailDPO`, `municipalConfig.enderecoDPO`
- Substituir nome do responsável LGPD por `municipalConfig.nome`

**3e. Atualizar `lib/seed-data.ts`**

- Substituir `@fronteira.mg.gov.br` por `@municipio.edu.br` (placeholder genérico)
- Substituir endereços `Fronteira/MG` por `Cidade/UF`
- Substituir nomes de escolas por genéricos (`CEMEI Escola A`, `EMEF Escola B`)
- Adicionar comentário no topo: `// Seed data de desenvolvimento — substitua com dados reais da sua prefeitura`

**3f. Renomear pasta principal**

- `gestao_fronteira/` → `app/`
- Atualizar todas as referências relativas que apontam para a pasta (imports, scripts, docker-compose, README)

**3g. Renomear doc de arquitetura**

- `docs/gestao-fronteira-architecture.md` → `docs/architecture.md`
- Remover menções específicas a Fronteira/MG do conteúdo

**3h. Atualizar `.env.local.example`**

- Título de `"EDUCA - Sistema de Gestão Escolar Fronteira/MG"` → `"EDUCA - Sistema de Gestão Escolar Municipal"`
- Adicionar as novas variáveis de config municipal:

```
NEXT_PUBLIC_MUNICIPAL_NAME=Nome do Município
NEXT_PUBLIC_SECRETARIA_NAME=Secretaria Municipal de Educação
NEXT_PUBLIC_MUNICIPAL_STATE=UF
NEXT_PUBLIC_CONTACT_PHONE=
NEXT_PUBLIC_DPO_EMAIL=
NEXT_PUBLIC_DPO_ADDRESS=
```

> After this: Nenhuma string "Fronteira" ou "fronteira" aparece no código-fonte. O sistema exibe o nome da prefeitura que configurar as env vars.

---

### S04 — Scaffolding OSS

`risk:low` `depends:[S03]`

**4a. Reescrever `README.md`** na raiz do repo com:

- O que é o EDUCA (1 parágrafo)
- Por que existe (contexto: municípios brasileiros sem SIS)
- Stack (Next.js 15, TypeScript, Supabase/PostgreSQL, shadcn/ui, Playwright)
- Quick Start (pré-requisitos, clone, configurar env, `pnpm install`, `pnpm dev`)
- Módulos implementados (tabela: Gestão de alunos, Chamada digital, Boletim, Matrículas, Relatórios Bolsa Família, Diário de classe, Calendário)
- Status dos módulos (✅ completo / 🟡 parcial)
- Como contribuir (link para CONTRIBUTING.md)
- Licença

**4b. Criar `CONTRIBUTING.md`**

- Como abrir issues
- Como fazer PRs
- Padrões de código (TypeScript strict, componentes shadcn, Zod para validação)
- Como rodar testes (`pnpm test`, `pnpm test:e2e`)
- Roadmap de contribuições prioritárias (provider-agnostic layer)

**4c. Verificar/criar `LICENSE`**

- MIT License com nome do maintainer (Myke Matos)

**4d. Criar `docker-compose.yml`** na raiz do repo (ou em `app/`) para dev local:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: educa_dev
      POSTGRES_USER: educa
      POSTGRES_PASSWORD: educa_dev
    ports: ['5432:5432']
    volumes: ['postgres_data:/var/lib/postgresql/data']

  supabase: # ou remover se provider-agnostic for o foco
    # instrução para usar supabase CLI local
```

**4e. Criar `docs/MUNICIPALITIES.md`**

- Guia para outra prefeitura adotar o EDUCA
- Requisitos de infraestrutura (mínimos e recomendados)
- Checklist de configuração (variáveis de ambiente, banco, primeiro admin)
- Casos de uso: Fronteira/MG (9 escolas, ensino fundamental, chamada + Bolsa Família)

**4f. Arquivar ou atualizar `SETUP-STAGING.md`**

- Renomear para `docs/DEPLOYMENT.md`
- Remover referências ao ambiente específico de Fronteira
- Tornar genérico para qualquer deploy (Vercel, VPS, Railway)

> After this: `README.md` explica o projeto, setup, e módulos. Qualquer desenvolvedor consegue contribuir sem pedir contexto adicional.

---

### S05 — Documentar roadmap provider-agnostic

`risk:low` `depends:[S04]`

Criar `docs/PROVIDER-AGNOSTIC-ROADMAP.md` documentando a arquitetura planejada para desacoplar o sistema do Supabase.

Conteúdo:

- **Problema atual:** auth, RLS, realtime e storage acoplados ao Supabase SDK
- **Objetivo:** adapter pattern com providers plugáveis (Supabase, PostgreSQL local + Auth.js, SQLite para dev)
- **Interface proposta** do `DatabaseAdapter` e `AuthAdapter`
- **Fases de migração** (quais módulos mudam primeiro)
- **Status:** Planejado — financiado pelos créditos do Codex for Open Source

Este documento é o argumento técnico central da candidatura ao programa.

> After this: O repo comunica claramente que a provider-agnostic layer é o próximo passo e que os créditos do Codex financiam exatamente esse trabalho.

---

### S06 — Preparar e finalizar candidatura Codex for Open Source

`risk:low` `depends:[S05]`

Montar o texto final dos 3 campos do formulário com os dados reais do projeto após os slices anteriores:

**Campo: Why does this repository qualify?** (max 500 chars)

```
EDUCA is an open-source school management system built for Brazilian municipalities. Fronteira/MG has 9 municipal schools + 1 under construction, all still managed on paper — a gap that exists in thousands of Brazil's 5,570 cities. The system covers INEP/Educacenso compliance, Bolsa Família attendance alerts (<80%), multi-tenant RLS, digital attendance with immutability, and 5 role types. No equivalent open-source solution exists for this market.
```

**Campo: How will you use API credits?** (max 500 chars)

```
EDUCA is currently coupled to Supabase (auth, RLS, realtime). The primary use: Codex-assisted refactor to a provider-agnostic adapter layer — enabling municipalities to deploy with Supabase, local PostgreSQL, or SQLite depending on their infrastructure. Secondary: Codex Security audit on student data handling (CPF, NIS, special needs — minors under LGPD) and automated PR review for the OSS contribution workflow as other cities adopt and contribute back.
```

**Campo: Anything else we should know?** (max 500 chars)

```
The project stalled not because of technical debt but because municipal budget was cut before launch. The code is production-quality: Next.js 15, TypeScript, full Playwright + Vitest test suite, accessibility-compliant UI. I also maintain bibliokopke (C# library management, live at FAJK) and inclusao-digital-uemg (digital literacy for 150+ elderly at UEMG Frutal) — consistent track record of building real tools for underserved Brazilian communities.
```

**Checklist pré-submit:**

- [ ] `shishiv/EDUCA` está público
- [ ] Nenhum commit no histórico contém `SUPABASE_SERVICE_ROLE_KEY`
- [ ] README explica o projeto com clareza
- [ ] OpenAI Organization ID coletado em platform.openai.com/settings/organization/general
- [ ] Formulário em https://openai.com/form/codex-for-oss preenchido e submetido

> After this: Candidatura submetida. Repo público com narrativa OSS completa.

---

## Boundary Map

| Slice | Repo alvo         | Tipo de trabalho                        |
| ----- | ----------------- | --------------------------------------- |
| S01   | `shishiv/EDUCA`   | Git history rewrite — `git filter-repo` |
| S02   | `shishiv/EDUCA`   | File deletion + .gitignore              |
| S03   | `shishiv/EDUCA`   | Code edits — config extraction + rename |
| S04   | `shishiv/EDUCA`   | Docs + new files                        |
| S05   | `shishiv/EDUCA`   | Docs — arquitetura planejada            |
| S06   | Formulário OpenAI | Texto + checklist                       |

## Dependências externas

- `git-filter-repo` instalado (`pip install git-filter-repo`)
- `gh` CLI autenticado como `shishiv`
- Clone local do `shishiv/EDUCA` com push access

## Out of Scope

- Implementar o provider-agnostic layer (isso é o trabalho pós-aprovação do Codex, não pré)
- Migrar o banco de dados de Supabase para outro provider
- Criar CI/CD para o repo EDUCA
- Deploy em produção para Fronteira/MG

## Open Questions

- Supabase project `[SUPABASE-PROJECT-REF]` ainda está ativo? Se sim, rotacionar a service role key após S01.
- Há outros arquivos com dados reais de alunos ou professores além do seed-data.ts?
- O `public/logo_pref.png` é o brasão real da prefeitura? Se sim, substituir por logo genérico EDUCA.
