# Provider-Agnostic Roadmap

**Status:** Planejado — financiado pelos créditos do programa Codex for Open Source (OpenAI)

---

## Problema Atual

O EDUCA está acoplado ao Supabase SDK em 4 camadas:

| Camada | Dependência | Impacto |
|---|---|---|
| **Auth** | `@supabase/ssr`, `supabase.auth.*` | Login, sessões, middleware de rota |
| **Banco** | `supabase.from('...')` em todas as queries | Leitura e escrita de dados |
| **RLS** | Políticas no Supabase PostgreSQL | Isolamento multi-tenant por escola |
| **Realtime** | `supabase.channel(...)` | Atualizações em tempo real (chamada) |

Isso significa que municípios com restrição a SaaS externo (infraestrutura municipal própria, exigências de auditoria TCE/TCM) não podem adotar o EDUCA sem dependência de serviço terceiro.

---

## Objetivo

Criar um **adapter pattern** que permita três modos de deploy:

| Provider | Caso de uso |
|---|---|
| `SupabaseAdapter` | Deploy rápido via Supabase Cloud (padrão atual) |
| `PostgresAdapter` | PostgreSQL próprio + Auth.js (municípios com infra própria) |
| `SqliteAdapter` | SQLite em memória (desenvolvimento e testes sem dependências externas) |

O código de aplicação (componentes, páginas, lógica de negócio) **não muda** — só a configuração de provider.

---

## Interface Proposta

### `DatabaseAdapter`

```typescript
interface DatabaseAdapter {
  // Query builder
  from<T>(table: string): QueryBuilder<T>

  // Auth state
  getUser(): Promise<User | null>
  getSession(): Promise<Session | null>

  // Admin (server-side only)
  admin: {
    listUsers(): Promise<User[]>
    createUser(data: CreateUserData): Promise<User>
    deleteUser(id: string): Promise<void>
  }
}

interface QueryBuilder<T> {
  select(columns?: string): QueryBuilder<T>
  insert(data: Partial<T> | Partial<T>[]): QueryBuilder<T>
  update(data: Partial<T>): QueryBuilder<T>
  delete(): QueryBuilder<T>
  eq(column: string, value: unknown): QueryBuilder<T>
  filter(column: string, op: string, value: unknown): QueryBuilder<T>
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>
  limit(count: number): QueryBuilder<T>
  single(): Promise<{ data: T | null; error: Error | null }>
  execute(): Promise<{ data: T[]; error: Error | null }>
}
```

### `AuthAdapter`

```typescript
interface AuthAdapter {
  signIn(email: string, password: string): Promise<AuthResult>
  signOut(): Promise<void>
  getUser(): Promise<User | null>
  onAuthStateChange(callback: (user: User | null) => void): Unsubscribe

  // Server-side (middleware)
  getSessionFromRequest(request: Request): Promise<Session | null>
  refreshSession(request: Request, response: Response): Promise<Response>
}
```

---

## Fases de Migração

### Fase 1 — Inventário e abstração de queries críticas *(2–3 semanas)*
- Mapear todos os `supabase.from(...)` no código
- Criar interface `DatabaseAdapter`
- Implementar `SupabaseAdapter` (wrapper do SDK atual, comportamento idêntico)
- Trocar chamadas diretas pelo adapter — sem mudança de comportamento

### Fase 2 — Auth desacoplada *(2 semanas)*
- Criar `AuthAdapter` com `SupabaseAuthAdapter` como implementação padrão
- Implementar `AuthJsAdapter` para Auth.js v5 (NextAuth)
- Migrar middleware de rota para usar `AuthAdapter`

### Fase 3 — PostgresAdapter *(3–4 semanas)*
- Implementar `PostgresAdapter` usando `pg` (node-postgres)
- Replicar políticas RLS como middleware de aplicação (para contextos sem Supabase)
- Testes de integração com ambos os adapters

### Fase 4 — SqliteAdapter para dev/test *(1–2 semanas)*
- Implementar `SqliteAdapter` usando `better-sqlite3`
- CI sem dependência de serviço externo
- Seed de testes determinístico

---

## Módulos por Ordem de Migração

| Prioridade | Módulo | Razão |
|---|---|---|
| 1 | `lib/supabase.ts` | Ponto de entrada do cliente |
| 2 | `lib/auth.ts` | Controla acesso a todas as rotas |
| 3 | `app/api/alunos/` | Mais usado, melhor ROI de teste |
| 4 | `app/api/frequencia/` | Crítico para Bolsa Família |
| 5 | `app/api/notas/` | Lógica complexa, bom test coverage |
| 6 | Realtime (chamada) | Mais acoplado, migrar por último |

---

## Por que os Créditos do Codex Financiam Exatamente Isso

A migração para provider-agnostic é um refactor de alta precisão: cada query precisa manter semântica idêntica (incluindo comportamento de RLS e transações). Codex é ideal para:

1. **Gerar o `SupabaseAdapter` automaticamente** a partir dos tipos existentes
2. **Validar cada migração com testes** — comparar output do adapter atual vs. novo
3. **Security audit** dos dados de alunos (CPF, NIS, necessidades especiais — menores sob LGPD) durante a refatoração
4. **Code review automatizado** das contribuições de outros municípios que farão PRs após a publicação

Estimativa: ~200–400h de trabalho de engenharia reduzido para ~4–6 semanas com assistência Codex.
