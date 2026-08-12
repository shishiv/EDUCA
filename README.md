<div align="center">

# EDUCA

**Gestão escolar open source para redes municipais brasileiras · Open-source school management for Brazilian municipal school networks**

[![CI](https://github.com/shishiv/EDUCA/actions/workflows/ci.yml/badge.svg)](https://github.com/shishiv/EDUCA/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## O que é · What it is

**PT:** O EDUCA é um software de gestão escolar **open source (MIT)** para redes municipais e cidades pequenas do Brasil: escolas, usuários, alunos, responsáveis, turmas, matrículas, atribuições de professores, chamada, painéis e relatórios.

**EN:** EDUCA is an **open-source (MIT)** school-management application for Brazilian municipal and small-town school networks: schools, users, students, guardians, classes, enrolments, teacher assignments, attendance, dashboards, and reporting.

## Modelo · Model

**PT:** Este repositório disponibiliza o software de gestão escolar sob a licença MIT e uma configuração de demonstração pública com dados sintéticos. O caminho atualmente disponível é o self-host a partir deste repositório. **Cloud Free** e **Cloud Pro** são modelos futuros, não disponíveis no momento. Registre seu interesse nesses modelos.

| Modelo | Situação |
| --- | --- |
| **Self-host** | Código disponível neste repositório sob a licença MIT. |
| **Cloud Free** | Modelo futuro, não disponível no momento. |
| **Cloud Pro** | Modelo futuro, não disponível no momento. |

**EN:** This repository provides the school-management software under the MIT License and a public-demo configuration with synthetic data. The currently available path is self-hosting from this repository. **Cloud Free** and **Cloud Pro** are future models, not currently available. Register your interest in these models.

| Model | Status |
| --- | --- |
| **Self-host** | Code available in this repository under the MIT License. |
| **Cloud Free** | Future model, not currently available. |
| **Cloud Pro** | Future model, not currently available. |

WhatsApp é **BYO (bring your own)**: a escola ou prefeitura traz conta Meta/BSP, número e templates; sem credencial, o envio fica desligado. · WhatsApp is **BYO**: the school or municipality brings the Meta/BSP account, number, and templates; without credentials, sending stays off.

## Status atual · Current status

**PT:** O repositório sustenta hoje uma **fundação de piloto municipal sintética**. Ele não autoriza dados reais de alunos, implantação municipal, aprovação legal ou alegação de conformidade de produção.

**EN:** The repository currently supports a **synthetic-only municipal pilot foundation**. It does not authorize real student data, municipal deployment, legal approval, or a production-compliance claim.

## Começando · Getting started

**PT:** Pré-requisitos: Node.js 20+, pnpm 9+ e Docker (para Supabase local). Comandos executados a partir de `app/`.

**EN:** Prerequisites: Node.js 20+, pnpm 9+, and Docker (for local Supabase). Commands run from `app/`.

```bash
git clone https://github.com/shishiv/EDUCA.git
cd EDUCA/app
cp .env.local.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Setup completo, comandos exatos e limites do piloto: [`CONTEXT.md`](CONTEXT.md). · Full setup, exact commands, and pilot boundaries: [`CONTEXT.md`](CONTEXT.md).

## Segurança · Security

**PT:** Para reportar vulnerabilidades em privado, veja [`SECURITY.md`](SECURITY.md).

**EN:** To report vulnerabilities privately, see [`SECURITY.md`](SECURITY.md).

## Licença · License

MIT · [`LICENSE`](LICENSE) · Copyright (c) 2025 Myke Matos

## Contexto do repositório · Repository context

Arquitetura, decisões e limites: [`CONTEXT.md`](CONTEXT.md). · Architecture, decisions, and boundaries: [`CONTEXT.md`](CONTEXT.md).
