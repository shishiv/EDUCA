# EDUCA

**Sistema aberto de gestão escolar para municípios brasileiros.**

EDUCA é uma plataforma de gestão escolar municipal construída para os 5.570 municípios brasileiros — a maioria ainda gerencia suas redes de ensino em papel. O sistema cobre desde matrículas até relatórios de Bolsa Família, com conformidade completa com INEP/Educacenso e LGPD.

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

## Quick Start

**Pré-requisitos:** Node.js 20+, pnpm, conta Supabase (gratuita funciona)

```bash
# 1. Clone o repositório
git clone https://github.com/shishiv/EDUCA.git
cd EDUCA/gestao_fronteira

# 2. Configure as variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com suas credenciais Supabase e dados municipais

# 3. Instale dependências
pnpm install

# 4. Aplique o schema do banco
pnpm supabase db push   # ou importe supabase/migrations/ manualmente

# 5. Inicie o servidor de desenvolvimento
pnpm dev
```

O sistema estará disponível em `http://localhost:3000`.

> **Tempo estimado:** ~30 minutos do clone até o login funcionando.

---

## Módulos

| Módulo | Status | Descrição |
|---|---|---|
| Gestão de Alunos | ✅ Completo | Cadastro, matrícula, histórico, perfil INEP |
| Chamada Digital | ✅ Completo | Frequência com imutabilidade, auto-lock 18h |
| Boletim Escolar | ✅ Completo | Notas por bimestre, médias, recuperação |
| Matrículas | ✅ Completo | Fluxo de matrícula com validação INEP |
| Relatórios Bolsa Família | ✅ Completo | Alertas de frequência < 80% para alunos com NIS |
| Diário de Classe | ✅ Completo | Registro diário de atividades por turma |
| Calendário Escolar | 🟡 Parcial | Visualização implementada, edição em progresso |
| Relatórios INEP/Educacenso | 🟡 Parcial | Campos obrigatórios mapeados, exportação pendente |

---

## Conformidade Brasileira

- **Imutabilidade de frequência** — Registros não podem ser editados retroativamente ("não existe o esquecer")
- **Auto-lock 18h** — Chamada travada automaticamente às 18h horário de São Paulo
- **Bolsa Família** — Alerta automático quando frequência < 80% para alunos com NIS
- **INEP/Educacenso** — Campos obrigatórios: CPF, NIS, raça, modalidade de transporte
- **LGPD** — RLS por escola, política de privacidade, registro de DPO
- **5 tipos de usuário** — superadmin, secretaria, diretor, professor, responsável

---

## Configuração Municipal

Cada prefeitura configura sua identidade via variáveis de ambiente:

```bash
NEXT_PUBLIC_MUNICIPAL_NAME=Meu Município
NEXT_PUBLIC_SECRETARIA_NAME=Secretaria Municipal de Educação
NEXT_PUBLIC_MUNICIPAL_STATE=MG
NEXT_PUBLIC_DPO_EMAIL=dpo@municipio.gov.br
```

Ver `.env.local.example` para a lista completa.

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o guia completo.

Áreas prioritárias para contribuição:
- **Provider-agnostic layer** — desacoplar do Supabase SDK (ver [docs/PROVIDER-AGNOSTIC-ROADMAP.md](docs/PROVIDER-AGNOSTIC-ROADMAP.md))
- Exportação INEP/Educacenso
- Internacionalização (i18n) para outros países da América Latina

---

## Licença

MIT — ver [LICENSE](LICENSE)
