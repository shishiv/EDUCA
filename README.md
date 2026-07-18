<div align="center">

# EDUCA

**Gestão escolar open source para o interior do Brasil — sair da planilha, enxergar o dia, avisar a família.**

[![CI](https://github.com/shishiv/EDUCA/actions/workflows/ci.yml/badge.svg)](https://github.com/shishiv/EDUCA/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/shishiv/EDUCA/blob/main/CONTRIBUTING.md)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

**Site:** [geteduca.vercel.app](https://geteduca.vercel.app) · **Código:** [github.com/shishiv/EDUCA](https://github.com/shishiv/EDUCA)

</div>

---

## O problema

Na escola do interior (e em muita rede municipal pequena), o dia a dia ainda é:

- chamada em **caderno ou planilha**
- diretor **sem visibilidade** de quem faltou hoje
- família só fica sabendo se alguém **lembra de mandar no grupo**
- Bolsa Família / INEP viram **corrida no fim do prazo**

Sistemas fechados caros existem — e muitas vezes **ninguém usa**. Planilha “funciona” até não funcionar.

**EDUCA** é software de gestão escolar **100% open source (MIT)** pensado para redes brasileiras: matrícula, chamada com regras reais, boletim, sinais de frequência/Bolsa Família, multi-tenant e caminho de conformidade (INEP/Educacenso, LGPD).

---

## Modelo: tudo OSS · pago só se quiser hospedagem

**Nenhum módulo do produto é paywall.** Chamada, relatórios, WhatsApp no código, multi-escola no código — tudo no repositório MIT.

O que pode ser pago é **só** a operação na infra da equipe (hospedagem + suporte), se a escola ou a secretaria não quiser manter servidor.

| Como usa | Escolas | Alunos | WhatsApp | Custo de software |
|----------|---------|--------|----------|-------------------|
| **Self-host** | Ilimitado (você opera) | Ilimitado | **BYO** — você traz Meta/BSP, número e templates | **Grátis (MIT)** |
| **Cloud Free** | **1 escola** | **Sem limite** (fund. + médio) | **BYO** — mesma feature, credenciais suas | **Grátis** (na nuvem nossa, com limite de 1 escola) |
| **Cloud Pro** | **N escolas** (rede) | Sem limite | **BYO** + ajuda de setup se precisar | **Hosted + suporte** |

### WhatsApp = BYO (bring your own)

Notificações de presença (ex.: falta no mesmo dia) fazem parte do **produto open source**.

- A **escola ou prefeitura** traz conta Meta / BSP, número e templates aprovados.
- O EDUCA só usa as credenciais que o tenant configurar.
- Sem credencial: o sistema segue normal; envio fica desligado (noop) até conectar.
- **Custo das mensagens** fica na conta de WhatsApp de quem envia — não é licença de software.

Assim o código continua completo para quem self-hosta, e a trilha LGPD/TCE fica no CNPJ certo.

---

## Hoje (piloto)

| | |
|---|---|
| **Status** | MVP em piloto |
| **Escala real** | **1 município · ~900 alunos** |
| **Maintainer** | Principalmente sole maintainer ([@shishiv](https://github.com/shishiv)) |
| **Licença** | MIT |
| **Site** | [geteduca.vercel.app](https://geteduca.vercel.app) |

Validamos fluxos do dia a dia (matrícula, chamada com imutabilidade, notas, multi-tenant, campos de compliance) com operação real — **sem inventar escala nacional**.

**Dados do piloto são privados (LGPD).** Demo pública, quando houver, usa seed sintético (`supabase/seed-demo/`).

---

## Para quem é

- **Uma escola** no interior que quer largar a planilha (Cloud Free ou self-host)
- **Secretaria municipal** pequena/média que precisa da **rede** (várias escolas) — Cloud Pro ou self-host
- **TI / dev** que prefere software auditável e sem vendor lock

Papéis no produto (em evolução de UX):

| Papel | Foco |
|--------|------|
| **Professor** | Turmas de hoje → chamada (rápido) |
| **Diretor** | Visibilidade do dia + alertas de frequência / BF |
| **Secretaria** | CRUD, matrículas, relatórios |
| **Admin** | Operação do deploy + **mimic** de papéis (suporte / debug / demo) |

---

## Stack

| Tecnologia | Uso |
|---|---|
| Next.js 16+ | App |
| React 19 | UI |
| TypeScript strict | Tipagem |
| Supabase / PostgreSQL | Auth, dados, RLS multi-tenant |
| shadcn/ui + Tailwind | Interface |
| Playwright + Vitest | E2E + unit |

---

## Módulos

| Módulo | Status | Descrição |
|---|---|---|
| Gestão de alunos | ✅ | Cadastro, matrícula, histórico, perfil INEP |
| Chamada digital | ✅ | Frequência com imutabilidade, auto-lock 18h |
| Boletim | ✅ | Notas por bimestre, médias, recuperação |
| Matrículas | ✅ | Fluxo com validação de campos INEP |
| Bolsa Família | ✅ | Alertas de frequência &lt; 80% (NIS) |
| Diário de classe | ✅ | Registro diário por turma |
| Calendário escolar | 🟡 | Visualização ok; edição em progresso |
| INEP / Educacenso | 🟡 | Campos mapeados; exportação em progresso |
| WhatsApp (presença) | 🟡 | Desenho BYO; integração no produto em andamento |

---

## Conformidade brasileira (desenho)

- **Imutabilidade de frequência** — sem “esquecer” e reescrever o passado à vontade  
- **Auto-lock 18h** (America/Sao_Paulo)  
- **Bolsa Família** — alertas de frequência para alunos com NIS  
- **INEP / Educacenso** — campos obrigatórios; export em evolução  
- **LGPD** — isolamento por escola (RLS), DPO via configuração  
- **Papéis** — superadmin, secretaria, diretor, professor, responsável  

---

## Repositório

```
EDUCA/
├── app/        # Produto (gestão escolar)
├── supabase/   # Migrations + seed demo
└── docs/       # ADRs, deploy, tokens, adoção
```

| Peça | Onde |
|------|------|
| Produto OSS | este repo |
| Site | [geteduca.vercel.app](https://geteduca.vercel.app) |
| Docs públicos | [docs/README.md](docs/README.md) |
| Fronteiras de repo | [docs/ADR-002-repo-boundaries.md](docs/ADR-002-repo-boundaries.md) |

---

## Quick start (self-host)

**Pré-requisitos:** Node.js 20+, pnpm, projeto Supabase (free tier serve para começar)

```bash
git clone https://github.com/shishiv/EDUCA.git
cd EDUCA/app
cp .env.local.example .env.local
# Preencha Supabase + identidade municipal
pnpm install
pnpm supabase db push   # ou aplique supabase/migrations/
pnpm dev
```

App em `http://localhost:3000`. Guia municipal: [docs/MUNICIPALITIES.md](docs/MUNICIPALITIES.md). Deploy: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Identidade municipal (env)

```bash
NEXT_PUBLIC_MUNICIPAL_NAME=Meu Município
NEXT_PUBLIC_SECRETARIA_NAME=Secretaria Municipal de Educação
NEXT_PUBLIC_MUNICIPAL_STATE=MG
NEXT_PUBLIC_DPO_EMAIL=dpo@municipio.gov.br
```

Lista completa em `app/.env.local.example`.

---

## Cloud Free vs Cloud Pro (resumo)

| | **Cloud Free** | **Cloud Pro** |
|--|----------------|---------------|
| Escolas | **1** | **N** |
| Alunos | Sem limite de software | Sem limite |
| Features | Todas (incl. WhatsApp BYO) | Todas |
| Ideal para | Uma escola saindo da planilha | Rede / secretaria |
| Você paga | R$ 0 de software | Hospedagem + suporte |

Self-host = mesmo código, sem teto de escolas no software.

Interesse em cloud/suporte: site [geteduca.vercel.app](https://geteduca.vercel.app) ou canais abaixo.

---

## Contribuindo

Ver [CONTRIBUTING.md](CONTRIBUTING.md).

Prioridades atuais (produto + piloto):

1. Chamada confiável e UX do **professor** (mais fácil que planilha)  
2. Painel do **diretor** (visibilidade do dia)  
3. **WhatsApp BYO** (conectar credenciais do tenant)  
4. Hardening multi-tenant / auth  
5. Export Educacenso quando a secretaria precisar  

---

## Comunidade

- **Site** — [geteduca.vercel.app](https://geteduca.vercel.app)  
- **Telegram** — [t.me/educa_gestao_escolar](https://t.me/educa_gestao_escolar)  
- **Discussions** — [GitHub Discussions](https://github.com/shishiv/EDUCA/discussions)  
- **Issues** — [github.com/shishiv/EDUCA/issues](https://github.com/shishiv/EDUCA/issues)  

---

## Licença

[MIT](LICENSE) — use, estude, adapte, hospede. Se quiser que a gente hospede e suporte, fale com a gente; o código continua livre.

---

## English

**EDUCA** is **MIT-licensed** school management for Brazilian municipal / small-town networks — built to replace spreadsheets with real attendance rules, day-level visibility, and optional family alerts.

### What you pay for

| | Schools | Students | WhatsApp | Software price |
|--|---------|----------|----------|----------------|
| **Self-host** | Unlimited (you operate) | Unlimited | **BYO** Meta/BSP credentials | **Free (MIT)** |
| **Cloud Free** | **1 school** | **No software cap** (K–12 style) | **BYO** | **Free** (our cloud, 1-school limit) |
| **Cloud Pro** | **N schools** | Unlimited | **BYO** (+ setup help if needed) | **Hosting + support** |

No product modules are paywalled. Paid offering is **hosted infrastructure and support only**. Message costs stay on the customer’s WhatsApp account.

### Today

MVP pilot: **one municipality · ~900 students**. Honest about scale. Pilot student data is private (LGPD).

### Quick start

See commands above under **Quick start (self-host)**. Site: [geteduca.vercel.app](https://geteduca.vercel.app).
