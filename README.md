<div align="center">

# EDUCA

**A planilha da secretaria de educação não aguenta mais. O EDUCA aguenta.**
**The spreadsheet your school district runs on doesn't scale. EDUCA does.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## O problema · The problem

**PT:** Cidade pequena não tem verba pra sistema de gestão escolar caro, e planilha não dá conta de matrícula, chamada e comunicação com responsáveis ao mesmo tempo. O resultado: dado espalhado, secretaria correndo atrás de informação, e ninguém sabe de fato quantos alunos estão matriculados, faltando ou sem professor atribuído.

**EN:** Small towns can't afford enterprise school-management software, and spreadsheets can't handle enrollment, attendance, and guardian communication at once. The result: scattered data, staff chasing information, and no one really knows how many students are enrolled, absent, or without an assigned teacher.

## O que o EDUCA faz · What EDUCA does

**PT:** Coloca escolas, alunos, responsáveis, turmas, matrículas e chamada num só lugar — com painéis que respondem a pergunta que a secretaria mais faz: *"como estão as escolas agora?"*. É **open source (MIT)**, então a prefeitura ou a escola não fica refém de contrato ou de fornecedor único.

**EN:** Puts schools, students, guardians, classes, enrollment, and attendance in one place — with dashboards that answer the question every district office asks: *"how are the schools doing right now?"*. It's **open source (MIT)**, so the district or school isn't locked into a contract or a single vendor.

## Por que existe · Why it exists

**PT:** O EDUCA nasceu dentro de uma secretaria municipal de educação real, não numa mesa de produto. Foi construído pra resolver o problema de gestão escolar de uma prefeitura pequena — o mesmo tipo de cidade que ele atende hoje.

**EN:** EDUCA started inside a real municipal education department, not on a product roadmap. It was built to solve one small city's school-management problem — the same kind of city it serves today.

## O que ele ainda não é · What it isn't (yet)

**PT:** Sendo direto: hoje o repositório sustenta uma **fundação de piloto municipal com dados sintéticos**. Ele não autoriza dados reais de alunos, implantação municipal, aprovação legal ou alegação de conformidade de produção. Se você precisa disso agora, ainda não é o momento — mas o caminho está sendo construído em público, aqui.

**EN:** To be direct: the repository currently supports a **synthetic-only municipal pilot foundation**. It does not authorize real student data, municipal deployment, legal approval, or a production-compliance claim. If you need that today, it's not ready yet — but it's being built in the open, right here.

## Dúvidas comuns · Common questions

**PT:**
- **"Minha prefeitura não tem equipe técnica."** - O self-host pede alguém que saiba rodar Docker e Node. Quando uma opção gerenciada existir, será anunciada aqui.
- **"E o WhatsApp, tem custo escondido?"** — Não. É BYO: vocês trazem a conta Meta/BSP e os templates. Sem credencial, o envio simplesmente fica desligado, não quebra o sistema.
- **"Meus dados de aluno ficam seguros?"** — Hoje o piloto roda só com dados sintéticos, de propósito, até essa parte estar madura o suficiente pra dado real. Veja [`SECURITY.md`](SECURITY.md).

**EN:**
- **"My district has no technical staff."** - Self-hosting requires someone comfortable with Docker and Node. When a managed option becomes available it will be announced here.
- **"Is WhatsApp a hidden cost?"** — No. It's BYO: you bring the Meta/BSP account and templates. Without credentials, sending just stays off — it doesn't break the system.
- **"Is student data safe?"** — The pilot runs on synthetic data only, on purpose, until that part is mature enough for real data. See [`SECURITY.md`](SECURITY.md).

## Disponibilidade · Availability

**PT:** O único modelo disponível hoje é **self-host**: código-fonte sob licença MIT neste repositório. Não existe serviço hospedado oferecido, gratuito ou pago.

**EN:** The only model available today is **self-host**: source code under the MIT License in this repository. There is no hosted service offered, free or paid.

## Comece agora · Get started

**PT:** Pré-requisitos: Node.js 20+, pnpm 9+, Docker e [portless](https://github.com/vercel-labs/portless).

**EN:** Prerequisites: Node.js 20+, pnpm 9+, Docker, and [portless](https://github.com/vercel-labs/portless).

```bash
git clone https://github.com/shishiv/EDUCA.git
cd EDUCA/app
pnpm install --frozen-lockfile
portless proxy start
pnpm dev:local
```

O comando cria um Supabase local descartável em portas isoladas, aplica as migrations e a contenção do piloto, carrega somente dados sintéticos e imprime a URL local. Entre como secretaria com `secretaria@synthetic.invalid` / `Synthetic-Only-2026!`, abra `/dashboard` e encerre por **Sair do Sistema** no menu do usuário. Pressione Ctrl-C no terminal para remover o app, os contêineres e os dados locais criados pela execução.

The command creates a disposable local Supabase stack on isolated ports, applies migrations and the pilot containment gate, loads only synthetic data, and prints the local URL. Sign in as the secretariat role with `secretaria@synthetic.invalid` / `Synthetic-Only-2026!`, open `/dashboard`, then choose **Sair do Sistema** from the user menu. Press Ctrl-C in the terminal to remove the app, containers, and local data created by the run.

Setup completo, comandos exatos e limites do piloto: [`CONTEXT.md`](CONTEXT.md).
Full setup, exact commands, and pilot boundaries: [`CONTEXT.md`](CONTEXT.md).

## Segurança · Security

Para reportar vulnerabilidades em privado, veja [`SECURITY.md`](SECURITY.md). · To report vulnerabilities privately, see [`SECURITY.md`](SECURITY.md).

## Licença · License

MIT · [`LICENSE`](LICENSE) · Copyright (c) 2025 Myke Matos

## Contexto do repositório · Repository context

Arquitetura, decisões e limites: [`CONTEXT.md`](CONTEXT.md). · Architecture, decisions, and boundaries: [`CONTEXT.md`](CONTEXT.md).
