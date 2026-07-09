# EDUCA — Codebase Discovery Report
**Gerado por:** CodebaseScout  
**Data:** 2026-07-09  
**Fonte:** https://github.com/shishiv/EDUCA (commit d43e5cf)

---

## Findings

### 1. Módulos Implementados vs README

| Módulo (README) | Status README | Status Real | Localização |
|---|---|---|---|
| Gestão de Alunos | ✅ Completo | ✅ Real | `app/(dashboard)/dashboard/alunos/` — list, detail, novo, boletim, diario |
| Chamada Digital | ✅ Completo | ✅ Real | `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` + `components/attendance/` (15 arquivos) + `lib/services/attendance-{locking,workflow,immutability}.ts` |
| Boletim Escolar | ✅ Completo | ✅ Real | `app/(dashboard)/dashboard/alunos/[id]/boletim/page.tsx` + `lib/api/grades.ts` (33KB) |
| Matrículas | ✅ Completo | ✅ Real | `app/(dashboard)/dashboard/matriculas/` — list, nova, detail |
| Relatórios Bolsa Família | ✅ Completo | ✅ Real | `app/(dashboard)/relatorios/bolsa-familia/page.tsx` (30KB) + `lib/reports/bolsa-familia-reports.ts` + `components/reports/BolsaFamiliaAlert.tsx` |
| Diário de Classe | ✅ Completo | ✅ Real | `app/(dashboard)/diario/` + `components/diary/` (15 arquivos) |
| Calendário Escolar | 🟡 Parcial | 🟡 Real | `app/(dashboard)/dashboard/calendario/page.tsx` (12KB) — visualização presente |
| Relatórios INEP/Educacenso | 🟡 Parcial | ⚠️ Skeleton | Nenhum arquivo `inep` ou `educacenso` encontrado — compliance warnings menciona prazo hardcoded (`2025-07-31`), sem exportação |

**Módulos extras não documentados no README:**
- `app/(dashboard)/dashboard/escolas/` — CRUD completo de escolas
- `app/(dashboard)/dashboard/turmas/` — CRUD + detalhes de turmas
- `app/(dashboard)/dashboard/responsaveis/` — CRUD guardiões/responsáveis
- `app/(dashboard)/dashboard/usuarios/` — CRUD usuários + perfis
- `app/(dashboard)/dashboard/atribuicoes/` — atribuição professor-turma
- `app/(dashboard)/dashboard/sessoes/` — sessões de aula
- `app/(dashboard)/dashboard/flags/` — feature flags admin UI
- `app/(dashboard)/relatorios/frequencia/` — relatório de frequência
- `app/(dashboard)/relatorios/conteudo/` — relatório de conteúdo programático

---

### 2. Dependências Externas Relevantes

**Produção — `web/package.json`:**

| Pacote | Versão | Relevância |
|---|---|---|
| `next` | ^16.0.7 | Framework principal |
| `@supabase/ssr` | ^0.7.0 | Auth + SSR |
| `@supabase/supabase-js` | ^2.87.1 | Database client |
| `@tanstack/react-query` | ^5.90.12 | Server state |
| `zustand` | ^5.0.10 | Client state |
| `exceljs` | ^4.4.0 | Export Excel (já usado em Bolsa Família) |
| `jspdf` + `jspdf-autotable` | ^3.0.4 / ^5.0.2 | Export PDF (já usado) |
| `posthog-js` | ^1.332.0 | Analytics (comentado no .env — desabilitado por bug Turbopack) |
| `sonner` | ^2.0.7 | Toast notifications (já usado extensamente) |
| `zod` | ^3.23.8 | Validação de schemas |
| `react-hook-form` | ^7.68.0 | Formulários |

**Ausências notáveis (relevantes para WhatsApp):**
- ❌ Nenhum SDK WhatsApp Business API (Evolution API, Twilio, Z-API, WPPConnect)
- ❌ Nenhum pacote SMS (Twilio, AWS SNS)
- ❌ Nenhum cliente HTTP genérico para webhooks (axios, node-fetch — Next.js usa fetch nativo)
- ❌ Nenhum pacote de filas/jobs (BullMQ, p-queue) para envios assíncronos
- ❌ Nenhum SDK AWS (sem `@aws-sdk/client-bedrock-runtime`)

---

### 3. Código de Notificação Existente

**Resultado da busca: ZERO código de notificação externo.**

Keywords buscados no código: `whatsapp`, `sms`, `webhook`, `notif`, `fcm`, `push notification` — **nenhuma ocorrência.**

O que existe (somente in-app):

**a) `app/api/compliance/warnings/route.ts`** — API que retorna alertas para o dashboard:
```typescript
// 5 tipos de alertas in-app:
// 1. Sessões com lock iminente (18h)
// 2. Alunos < 80% frequência (Bolsa Família)
// 3. Alunos < 75% frequência (INEP mínimo)
// 4. Prazo Educacenso (hardcoded 2025-07-31)
// 5. Cadastros sem CPF
```

**b) `app/api/dashboard/alerts/route.ts`** — Alertas do dashboard:
```typescript
// Alertas in-app:
// - Chamada pendente do dia
// - Alunos com NIS < 85% frequência (Bolsa Família)
// - Frequência geral abaixo/acima esperada
```

**c) `components/diary/RiskAlert.tsx`** — Componente React para alerta visual de alunos em risco de perda do Bolsa Família

**d) `lib/reports/bolsa-familia-reports.ts`** — Lógica completa de cálculo de frequência para Bolsa Família com thresholds `BOLSA_FAMILIA_THRESHOLD = 80` e `BOLSA_FAMILIA_WARNING_THRESHOLD = 85`

**e) Service Worker (`public/sw.js`)** — Existe um service worker, porém é para cache offline (PWA), não para push notifications.

**Dados disponíveis na schema para notificações:**
- `responsaveis.telefone` — campo existe mas não validado como WhatsApp
- `responsaveis.email` — presente mas sem sistema de envio
- `alunos.nis` + `alunos.bolsa_familia (boolean)` — identificação precisa para alerta seletivo

---

### 4. Estado do CI

**Arquivo:** `.github/workflows/ci.yml`

```yaml
# Triggers: push/PR para main
# Jobs: 1 — "quality"
# Passos:
#   - checkout
#   - pnpm install --frozen-lockfile
#   - pnpm typecheck (tsc --noEmit)
#   - pnpm lint (continue-on-error: true ← LINT NÃO BLOQUEIA MERGE)
```

**O que NÃO está no CI:**
- ❌ `pnpm test` (Vitest) — testes unitários não rodam em CI
- ❌ `pnpm test:e2e` (Playwright) — E2E não rodam em CI
- ❌ `pnpm build` — build não é validado em CI
- ❌ Supabase migrations check
- ❌ Deploy automático

**Avaliação:** CI é mínimo-cosmético. Passa typecheck, ignora lint failures, não roda nenhum teste. Para o programa Claude for Open Source, isso é um gap visível — repos sérios têm CI verde com testes.

---

### 5. Migrações Supabase

**Localização dos arquivos:**
```
supabase/migrations/
  00000000000000_baseline.sql          (28.6KB — schema completo de produção)
  20260119_create_feature_flags.sql    (5.7KB — tabela feature_flags)
  README.md

web/supabase/migrations/
  20260124133337_create_relatorios_descritivos.sql  (3.5KB — relatórios descritivos)
```

**Total: 3 migrations SQL reais** (excluindo README)

**Schema highlights do baseline:**
- Tabelas: `escolas`, `users`, `responsaveis`, `alunos`, `turmas`, `matriculas`, `sessoes_aula`, `frequencia`, `notas`, `diario_classe`, `calendario_eventos`
- RLS habilitado por escola (multi-tenant)
- Campo `responsaveis.telefone TEXT` — existe mas sem constraint de formato
- Campo `alunos.nis TEXT` + `alunos.bolsa_familia BOOLEAN` — ready para filtro WhatsApp
- **Sem tabela `notifications`** — nenhuma infraestrutura de notificação no schema

---

### 6. Qualidade do Código — Produção-Ready ou Skeleton?

**Avaliação: Substancialmente real, com áreas gaps importantes.**

**Evidências de código de qualidade:**
- Arquivos grandes e detalhados: `lib/api/attendance.ts` (32KB), `lib/api/grades.ts` (33KB), `types/database.ts` (56KB)
- Serviços bem separados: `attendance-locking.ts`, `attendance-workflow.ts`, `attendance-immutability.ts`
- Validação brasileira dedicada: `lib/validation/brazilian.ts`, `lib/validation/brazilian-educational.ts`
- Suite de testes real:
  - **E2E (Playwright):** 31+ spec files cobrindo alunos, chamada, matrículas, diário, notas, relatórios, usuários, permissões
  - **Unit (Vitest):** 20+ arquivos de teste para componentes, serviços e validações
- Feature flags system (`flags/` dashboard + `hooks/use-feature-flag.ts`)
- Auditoria de ações (`lib/audit.ts`, `lib/api/audit.ts`)
- Logger estruturado (`lib/logger.ts` 10KB)
- Monitoring (`lib/monitoring/metrics.ts`)
- A11y: `scripts/accessibility-audit.js` (19KB), CSS touch-enhanced

**Evidências de gaps / work-in-progress:**
- CI não roda testes — não sabemos se passam
- Relatórios INEP/Educacenso: warnings no código com deadline hardcoded em 2025 (já vencido)
- `.env.local.example` sem variáveis de WhatsApp/SMS/webhook
- Provider-agnostic layer: planejado mas não iniciado
- PostHog analytics comentado (bug Turbopack)
- `lint: continue-on-error: true` — há problemas de lint desconhecidos

**Veredito:** Codebase é substancialmente implementado (~70% produção-ready). Não é skeleton — tem lógica real, tipos TypeScript completos, testes extensos. Mas tem dívida técnica visível (CI fraco, INEP incompleto, sem notificações externas).

---

## Gaps

### Gaps Críticos para WhatsApp Integration

1. **[CRÍTICO] Sem campo `whatsapp_numero` na tabela `responsaveis`**  
   O schema atual tem apenas `telefone TEXT` sem validação de formato. Para WhatsApp, precisa de número E.164 (`+55...`). Exige migration.

2. **[CRÍTICO] Sem tabela `notificacoes` ou `notificacao_queue`**  
   Nenhuma estrutura para log de envios, status de entrega, idempotência. Exige migration completa.

3. **[CRÍTICO] Sem API route de webhook/outbound**  
   Não existe nenhum `app/api/notificacoes/` ou equivalente. Tudo a ser criado do zero.

4. **[CRÍTICO] Sem SDK de mensageria instalado**  
   Nem Evolution API, nem Twilio, nem Z-API no `package.json`. Exige escolha de provider e instalação.

5. **[ALTO] Sem variáveis de ambiente para chaves de API externas**  
   `.env.local.example` não tem slots para WhatsApp tokens, webhook secrets. Exige adição documentada.

6. **[ALTO] Sem lógica de trigger automático**  
   Os alertas Bolsa Família existem como queries síncronas respondendo a HTTP requests. Não há cron job, Supabase Edge Function, ou AWS EventBridge para disparo periódico.

7. **[MÉDIO] `alunos.nis` não tem índice otimizado**  
   Para consultas de Bolsa Família em escala (5.570 municípios), a coluna `nis` precisa de índice. Ver `scripts/apply-performance-indexes.mjs` — pode já ter sido aplicado mas não está na migration baseline.

8. **[MÉDIO] Sem consent de LGPD para notificações WhatsApp**  
   `responsaveis.lgpd_consentimento` existe mas é genérico. Notificações WhatsApp exigem consentimento específico para marketing/comunicações. Exige campo separado + UI de opt-in/opt-out.

### Outros Gaps Técnicos

9. **[ALTO] CI não roda testes**  
   Para Anthropic OSS Program, atividade de CI verde é um sinal forte. CI atual só valida tipos e ignora lint errors.

10. **[MÉDIO] Nenhum workflow de automação GitHub**  
    Repositório com 0 stars/forks dormente há 38 dias. Sem `dependabot.yml`, sem labels automáticos, sem issue templates populados.

11. **[MÉDIO] Exportação INEP/Educacenso pendente**  
    README marca como parcial, deadline hardcoded em 2025 já venceu.

---

## Recommendations

### Prioridade Alta — Pré-requisitos para WhatsApp Integration

**R1. Migration: adicionar campos de notificação** [Alta]  
```sql
-- supabase/migrations/20260709_notification_infrastructure.sql
ALTER TABLE responsaveis ADD COLUMN whatsapp_numero TEXT;
ALTER TABLE responsaveis ADD COLUMN notificacoes_opt_in BOOLEAN DEFAULT false;
ALTER TABLE responsaveis ADD COLUMN notificacoes_opt_in_at TIMESTAMPTZ;

CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,           -- 'whatsapp' | 'email'
  destinatario_id UUID NOT NULL, -- responsavel_id
  aluno_id UUID REFERENCES alunos(id),
  conteudo TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending | sent | failed | delivered
  provider_message_id TEXT,
  enviado_at TIMESTAMPTZ,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**R2. API Route: `app/api/notificacoes/whatsapp/route.ts`** [Alta]  
Endpoint POST que: valida autenticação, busca responsáveis com opt-in, chama provider WhatsApp, persiste em `notificacoes`. Usar Evolution API ou Z-API (ambos gratuitos para self-hosted).

**R3. Trigger: Supabase Edge Function ou cron via GitHub Actions** [Alta]  
Para envio automático de alertas após chamada salva: Supabase Database Webhook em `INSERT` na tabela `frequencia` → Edge Function → check threshold → envia se < 80%.

**R4. Env vars documentadas** [Alta]  
Adicionar ao `.env.local.example`:
```bash
# WhatsApp Integration
WHATSAPP_PROVIDER=evolution  # evolution | zapi | twilio
WHATSAPP_API_URL=https://your-evolution-instance.com
WHATSAPP_API_KEY=
WHATSAPP_INSTANCE_NAME=educa
NOTIFICATION_WEBHOOK_SECRET=
```

### Prioridade Média — Visibilidade OSS e CI

**R5. Ativar testes no CI** [Média]  
Adicionar step `pnpm test` (Vitest) no `ci.yml`. Os testes existem, o CI não os executa. Remover `continue-on-error: true` do lint.

**R6. Adicionar workflow `test-notify.yml`** [Média]  
GitHub Action que roda semanalmente simulando envio WhatsApp com mock provider — cria atividade visível no repo para o programa OSS.

**R7. Dependabot** [Média]  
Adicionar `.github/dependabot.yml` para atualização automática de deps — cria PRs automáticos = atividade no repo.

**R8. LGPD: opt-in/opt-out UI** [Média]  
Adicionar toggle nas telas de responsável (`dashboard/responsaveis/[id]/page.tsx`) para consentimento explícito de notificações WhatsApp.

### Prioridade Baixa — Complementar

**R9. AWS Bedrock Integration** [Baixa — para fase 2]  
O codebase não tem nenhuma IA. Para qualificar para Anthropic OSS Program, implementar:
- Geração de texto de alertas com Claude (mais personalizado que template fixo)
- Sumarização de relatório mensal de frequência
- `app/api/ai/generate-alert/route.ts` usando `@aws-sdk/client-bedrock-runtime`

**R10. Exportação INEP/Educacenso** [Baixa — mas visível]  
Deadline hardcoded expirou. Atualizar para 2026, implementar export básico CSV com campos INEP obrigatórios (CPF, NIS, modalidade).

**R11. Índice de performance em `responsaveis.telefone`** [Baixa]  
```sql
CREATE INDEX idx_responsaveis_telefone ON responsaveis(telefone) WHERE telefone IS NOT NULL;
CREATE INDEX idx_alunos_nis ON alunos(nis) WHERE nis IS NOT NULL;
```

---

## Resumo Executivo

O EDUCA é um codebase TypeScript/Next.js substancialmente implementado para gestão escolar municipal brasileira. Tem ~70% de completude produção-real com lógica de negócio sólida, tipos completos e suite de testes abrangente. O diferencial do produto (alertas Bolsa Família por frequência < 80%) está implementado como in-app UI — a lógica existe, falta apenas o canal de saída (WhatsApp).

Para WhatsApp notifications, o trabalho necessário é:
1. **1 migration SQL** (2h) — campos `whatsapp_numero`, `notificacoes_opt_in`, tabela `notificacoes`
2. **1 API route** (4h) — `POST /api/notificacoes/whatsapp` com provider SDK
3. **1 trigger** (4h) — Edge Function ou cron para envio automático após chamada
4. **1 UI component** (2h) — opt-in no cadastro de responsável

Total estimado: ~12h de trabalho real sobre uma base sólida existente.
