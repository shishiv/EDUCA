# Contribuindo com o EDUCA

Obrigado pelo interesse! O EDUCA é um projeto open source voltado para gestão escolar municipal no Brasil.

---

## Como Abrir Issues

- **Bug:** Descreva o comportamento esperado vs. observado, passos para reproduzir, ambiente (OS, Node.js, browser)
- **Feature:** Explique o problema que resolve, não apenas a solução
- Use as labels: `bug`, `feature`, `compliance-br`, `accessibility`, `documentation`

---

## Como Fazer PRs

```bash
# 1. Fork + clone
git clone https://github.com/SEU_USER/EDUCA.git
cd EDUCA/gestao_fronteira

# 2. Branch a partir de main
git checkout -b feature/minha-feature

# 3. Desenvolva
pnpm dev

# 4. Testes
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # E2E tests (Playwright)
pnpm typecheck     # TypeScript strict
pnpm lint          # ESLint

# 5. Commit e PR
git push origin feature/minha-feature
```

PRs pequenos e focados têm mais chance de merge rápido. Evite PRs que misturem refactoring com features.

---

## Padrões de Código

| Área | Regra |
|---|---|
| TypeScript | `strict: true` — sem `any` implícito |
| Componentes | shadcn/ui como base, Tailwind para customização |
| Validação | Zod para schemas (server e client) |
| Formulários | react-hook-form + Zod |
| Estado global | Context API ou TanStack Query |
| Banco | Supabase SDK com RLS obrigatório por escola |
| Testes | Vitest para unit, Playwright para E2E |

---

## Conformidade Brasileira

Contribuições que tocam em dados de alunos **devem** preservar:
- Imutabilidade de frequência (sem edição retroativa)
- Campos INEP/Educacenso obrigatórios (CPF, NIS, raça, transporte)
- RLS por `escola_id` (isolamento multi-tenant)
- Alertas Bolsa Família para frequência < 80%

---

## Rodando os Testes

```bash
cd gestao_fronteira

# Unit tests
pnpm test

# Unit tests com coverage
pnpm test:coverage

# E2E (requer servidor rodando)
pnpm dev &
pnpm test:e2e

# Lint
pnpm lint
pnpm typecheck
```

---

## Roadmap de Contribuições Prioritárias

1. **Provider-agnostic layer** — adapter pattern para desacoplar do Supabase SDK (ver [`docs/PROVIDER-AGNOSTIC-ROADMAP.md`](docs/PROVIDER-AGNOSTIC-ROADMAP.md))
2. **Exportação INEP/Educacenso** — formato XML para envio ao MEC
3. **Módulo de Transporte Escolar** — rota + lista de embarque
4. **Calendário Escolar completo** — edição + eventos municipais

---

## Contato

Maintainer: Myke Matos ([@shishiv](https://github.com/shishiv))

Issues são o canal preferido. Para questões de segurança, use o campo de security advisories no GitHub.
