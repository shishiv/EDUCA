<div align="center">

# EDUCA

**Open-source school management for Brazilian municipalities.**

[![CI](https://github.com/shishiv/EDUCA/actions/workflows/ci.yml/badge.svg)](https://github.com/shishiv/EDUCA/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/shishiv/EDUCA/blob/main/CONTRIBUTING.md)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red.svg)](https://opensource.org/)

**Site:** [geteduca.vercel.app](https://geteduca.vercel.app) · **Code:** [github.com/shishiv/EDUCA](https://github.com/shishiv/EDUCA)

</div>

---

## Problem

Brazilian municipal school networks need modern tools for enrollment, daily attendance, grades, and compliance (INEP/Educacenso, Bolsa Família frequency rules, LGPD). A large share of that work still runs on fragile spreadsheets, paper, or expensive proprietary stacks that fit local rules poorly.

EDUCA exists to make **open, Brazil-native school management** available to municipalities that cannot (or should not) depend only on closed vendors.

## Today (MVP pilot)

| | |
|---|---|
| **Status** | MVP in pilot |
| **Scale** | **1 municipality · ~900 students** |
| **Maintainer** | Sole primary maintainer ([@shishiv](https://github.com/shishiv)) |
| **License** | MIT |
| **Site** | [geteduca.vercel.app](https://geteduca.vercel.app) |

We are validating core flows (enrollment, attendance with immutability, grades, social-program alerts, multi-tenant design) with real school operations—not claiming national production scale.

**Pilot student data is private (LGPD).** Any public sandbox uses synthetic seed data only (`supabase/seed-demo/`).

## Near-term focus

Multi-tenant security hardening, Educacenso export, tests/CI, and self-host docs—so this pilot can become a path other municipalities can adopt safely. Track work via [GitHub Issues](https://github.com/shishiv/EDUCA/issues).

---

## Português (resumo)

**EDUCA** é gestão escolar municipal **open source (MIT)**.

- **Problema:** redes municipais ainda dependem de processos frágeis para matrícula, frequência e compliance (INEP, Bolsa Família, LGPD).
- **Hoje:** piloto em **1 município com ~900 alunos** (MVP).
- **Site:** [geteduca.vercel.app](https://geteduca.vercel.app)
- **Issues:** [github.com/shishiv/EDUCA/issues](https://github.com/shishiv/EDUCA/issues)

Dados do piloto não vão para demo pública.

---

## Stack

| Tecnologia | Versão |
|---|---|
| Next.js | 16+ |
| React | 19 |
| TypeScript | strict |
| Supabase / PostgreSQL | RLS multi-tenant |
| shadcn/ui + Tailwind CSS | — |
| Playwright + Vitest | E2E + Unit tests |

---

## Estrutura do repositório

```
EDUCA/
├── app/        # Produto (gestão escolar)
├── supabase/   # Migrations + seed demo
└── docs/       # ADRs, compliance, roadmap
```

| Peça | Onde |
|------|------|
| Produto OSS | este repo (`app/`) |
| Site institucional | [geteduca.vercel.app](https://geteduca.vercel.app) |
| Fronteiras de repo | [docs/ADR-002-repo-boundaries.md](docs/ADR-002-repo-boundaries.md) |
| Design tokens | [docs/DESIGN-TOKENS.md](docs/DESIGN-TOKENS.md) |

---

## Quick Start

**Pré-requisitos:** Node.js 20+, pnpm, conta Supabase (free tier funciona)

```bash
git clone https://github.com/shishiv/EDUCA.git
cd EDUCA/app
cp .env.local.example .env.local
# Edite .env.local com Supabase + dados municipais
pnpm install
pnpm supabase db push   # ou importe supabase/migrations/
pnpm dev
```

App em `http://localhost:3000`. Tempo estimado: ~30 minutos até o login.

---

## Módulos

| Módulo | Status | Descrição |
|---|---|---|
| Gestão de Alunos | ✅ Completo | Cadastro, matrícula, histórico, perfil INEP |
| Chamada Digital | ✅ Completo | Frequência com imutabilidade, auto-lock 18h |
| Boletim Escolar | ✅ Completo | Notas por bimestre, médias, recuperação |
| Matrículas | ✅ Completo | Fluxo de matrícula com validação INEP |
| Relatórios Bolsa Família | ✅ Completo | Alertas de frequência &lt; 80% para alunos com NIS |
| Diário de Classe | ✅ Completo | Registro diário de atividades por turma |
| Calendário Escolar | 🟡 Parcial | Visualização implementada, edição em progresso |
| Relatórios INEP/Educacenso | 🟡 Parcial | Campos obrigatórios mapeados, **exportação pendente** |

---

## Conformidade Brasileira (desenho)

- **Imutabilidade de frequência** — sem edição retroativa (“não existe o esquecer”)
- **Auto-lock 18h** — chamada travada às 18h (America/Sao_Paulo)
- **Bolsa Família** — alerta quando frequência &lt; 80% para alunos com NIS
- **INEP/Educacenso** — campos obrigatórios mapeados; export em progresso
- **LGPD** — isolamento multi-tenant por escola (RLS), DPO via env
- **Papéis** — superadmin, secretaria, diretor, professor, responsável

Hardening contínuo: ver [issues](https://github.com/shishiv/EDUCA/issues) com label `security`.

---

## Configuração municipal

```bash
NEXT_PUBLIC_MUNICIPAL_NAME=Meu Município
NEXT_PUBLIC_SECRETARIA_NAME=Secretaria Municipal de Educação
NEXT_PUBLIC_MUNICIPAL_STATE=MG
NEXT_PUBLIC_DPO_EMAIL=dpo@municipio.gov.br
```

Lista completa em `app/.env.local.example`.

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

Prioridades atuais (piloto + compliance):

1. Security / RLS / auth multi-tenant  
2. Exportação INEP/Educacenso  
3. Testes (presença, CI)  
4. Docs de self-host  

Depois: demo sandbox sintético, multi-escola, i18n, provider-agnostic ([docs/PROVIDER-AGNOSTIC-ROADMAP.md](docs/PROVIDER-AGNOSTIC-ROADMAP.md)).

---

## Comunidade

- **Site** — [geteduca.vercel.app](https://geteduca.vercel.app)  
- **Telegram** — [t.me/educa_gestao_escolar](https://t.me/educa_gestao_escolar)  
- **GitHub Discussions** — [Discussions](https://github.com/shishiv/EDUCA/discussions)  
- **Demo sandbox** — seed sintético em `supabase/seed-demo/` (quando a instância pública estiver live)

---

## License

MIT — see [LICENSE](LICENSE)
