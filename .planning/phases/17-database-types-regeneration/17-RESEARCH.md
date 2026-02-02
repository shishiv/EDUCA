# Phase 18: Database Types Regeneration - Research

**Researched:** 2026-01-24
**Domain:** Supabase TypeScript Type Generation
**Confidence:** HIGH

## Summary

This phase requires TWO distinct actions: (1) create the missing `relatorios_descritivos` table in production, and (2) regenerate TypeScript types to match the current production schema.

**Critical Discovery:** The `relatorios_descritivos` table does NOT exist in production. The code references a table that was never created. The current `types/database.ts` file is also significantly outdated - missing 8+ tables/columns that exist in production.

**Primary recommendation:** Create the `relatorios_descritivos` table via migration, then regenerate all types using Supabase MCP or CLI.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase CLI | >=1.8.1 | Type generation | Official tooling from Supabase |
| @supabase/supabase-js | ^2.48.0 | Database client with types | Enhanced JSON type inference |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Supabase MCP | Direct API access to generate types | Available in this environment |
| `npx supabase gen types` | CLI fallback | When MCP unavailable |
| mcp__supabase__apply_migration | Apply DDL changes | Create new tables |
| mcp__supabase__generate_typescript_types | Regenerate types | After schema changes |

**Key Finding:** Supabase MCP is available and can:
1. Apply migrations directly to production
2. Generate types without needing CLI authentication

## Architecture Patterns

### Type File Location
```
gestao_fronteira/
├── types/
│   └── database.ts    # Generated Supabase types (target file)
```

### Pattern 1: MCP-Based Type Generation (Recommended)
**What:** Use Supabase MCP tools to manage schema and types
**When to use:** When MCP server is available (current environment)
**Example:**
```typescript
// Source: Supabase MCP documentation
// Step 1: Apply migration for new table
mcp__supabase__apply_migration({
  project_id: "SUPABASE-PROJECT-REF",
  name: "create_relatorios_descritivos",
  query: "CREATE TABLE public.relatorios_descritivos (...)"
})

// Step 2: Generate types
mcp__supabase__generate_typescript_types({
  project_id: "SUPABASE-PROJECT-REF"
})
```

### Pattern 2: CLI-Based Type Generation (Fallback)
**What:** Use npx supabase CLI for type generation
**When to use:** When MCP is unavailable
**Example:**
```bash
# Source: https://supabase.com/docs/guides/api/rest/generating-types
npx supabase gen types typescript --project-id "SUPABASE-PROJECT-REF" --schema public > types/database.ts
```

### Anti-Patterns to Avoid
- **Manual type editing:** Never manually edit database.ts - always regenerate
- **Partial regeneration:** Always regenerate the full file, not patch specific tables
- **Skipping migration:** Don't regenerate types if underlying table doesn't exist

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database types | Manual TypeScript interfaces | `supabase gen types` | 22+ tables, complex relationships, auto-generates Row/Insert/Update |
| Schema validation | Runtime type checks | Generated types + TypeScript | Compile-time safety, IDE autocomplete |
| Type helper utilities | Custom utility types | Generated `Tables<>`, `TablesInsert<>`, `TablesUpdate<>` | Already provided in generated file |

**Key insight:** The generated types file is 1600+ lines. Manual maintenance is error-prone and unnecessary.

## Common Pitfalls

### Pitfall 1: Missing Table in Production
**What goes wrong:** Code references `relatorios_descritivos` but table doesn't exist
**Why it happens:** Table was planned but never created via migration
**How to avoid:** Create table BEFORE regenerating types
**Warning signs:** `as any` type casts in code using the table

### Pitfall 2: Stale Types File
**What goes wrong:** TypeScript types don't match actual database schema
**Why it happens:** Schema changes in production not followed by type regeneration
**How to avoid:** Regenerate types after every schema change
**Warning signs:**
- Missing fields like `nis`, `bolsa_familia` on alunos
- Missing tables like `calendario_escolar`, `feature_flags`
- Runtime errors accessing columns that exist but aren't typed

### Pitfall 3: Wrong Project ID
**What goes wrong:** Types generated from wrong project
**Why it happens:** Multiple Supabase projects, wrong --project-id flag
**How to avoid:** Verify project ID: `SUPABASE-PROJECT-REF`
**Warning signs:** Types don't match expected schema

### Pitfall 4: Authentication Issues (CLI only)
**What goes wrong:** `npx supabase gen types` fails with auth error
**Why it happens:** No `supabase login` or expired token
**How to avoid:** Use MCP (already authenticated) or run `npx supabase login`
**Warning signs:** "Error: You need to be logged in" message

## Code Examples

### relatorios_descritivos Table Schema
Based on code analysis, the table needs these columns:
```sql
-- Source: Analysis of gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/diario/relatorio/page.tsx
CREATE TABLE public.relatorios_descritivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id),
  turma_id uuid NOT NULL REFERENCES public.turmas(id),
  professor_id uuid NOT NULL REFERENCES public.users(id),
  ano_letivo integer NOT NULL,
  semestre text NOT NULL CHECK (semestre IN ('primeiro', 'segundo')),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),

  -- BNCC fields (Campos de Experiência da Educação Infantil)
  campo_eu_outro_nos text,      -- "O eu, o outro e o nós"
  campo_corpo_gestos text,      -- "Corpo, gestos e movimentos"
  campo_tracos_sons text,       -- "Traços, sons, cores e formas"
  campo_escuta_fala text,       -- "Escuta, fala, pensamento e imaginação"
  campo_espacos_tempos text,    -- "Espaços, tempos, quantidades..."

  observacoes_gerais text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.users(id),
  finalized_at timestamptz,
  finalized_by uuid REFERENCES public.users(id),

  UNIQUE(matricula_id, ano_letivo, semestre)
);

-- RLS Policy
ALTER TABLE public.relatorios_descritivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports from their escola"
  ON public.relatorios_descritivos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matriculas m
      JOIN public.turmas t ON m.turma_id = t.id
      WHERE m.id = relatorios_descritivos.matricula_id
      AND t.escola_id = auth_get_user_escola()
    )
  );
```

### Type Generation Command
```bash
# Using CLI (requires login)
cd gestao_fronteira
npx supabase gen types typescript --project-id "SUPABASE-PROJECT-REF" --schema public > types/database.ts
```

## Current Schema Gap Analysis

### Tables/Views in Production but NOT in types/database.ts:
| Item | Type | Exists in Prod | In Current Types |
|------|------|----------------|------------------|
| `calendario_escolar` | Table | YES | NO |
| `feature_flags` | Table | YES | NO |
| `escola_feature_flags` | Table | YES | NO |
| `vw_alunos_risco_bolsa_familia` | View | YES | NO |
| `relatorios_descritivos` | Table | **NO** | NO |

### Columns in Production but NOT in types/database.ts:
| Table | Column | Exists in Prod | In Current Types |
|-------|--------|----------------|------------------|
| `alunos` | `nis` | YES | NO |
| `alunos` | `bolsa_familia` | YES | NO |
| `users` | `primeiro_login` | YES | NO |
| `users` | `senha_padrao` | YES | NO |
| `users` | `data_ultimo_acesso` | YES | NO |

### Columns in Current Types but NOT in Production:
| Table | Column | In Current Types | Exists in Prod |
|-------|--------|------------------|----------------|
| `users` | `wizard_completed` | YES | NO |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual types | Generated types | supabase-js v2 | Type-safe database access |
| CLI only | CLI + MCP | Supabase MCP | Direct API access, no auth needed |

**Deprecated/outdated:**
- `wizard_completed` column: Appears in current types but doesn't exist in production database

## Open Questions

1. **RLS Policies for relatorios_descritivos**
   - What we know: Other tables use `auth_get_user_escola()` function for RLS
   - What's unclear: Exact policy requirements for professors vs directors
   - Recommendation: Follow pattern from sessoes_aula table

2. **Index Requirements**
   - What we know: Queries filter by matricula_id, ano_letivo, semestre
   - What's unclear: Query volume to determine index need
   - Recommendation: Add unique constraint covers primary query pattern

## Sources

### Primary (HIGH confidence)
- Supabase MCP - `list_tables`, `generate_typescript_types`, `execute_sql` tools
- Current production database schema via `mcp__supabase__list_tables`
- Official Supabase docs: https://supabase.com/docs/guides/api/rest/generating-types

### Secondary (MEDIUM confidence)
- Code analysis of `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/diario/relatorio/page.tsx`
- Current `types/database.ts` file comparison

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Supabase documentation and MCP tools
- Architecture: HIGH - Verified MCP availability and commands
- Pitfalls: HIGH - Verified by comparing current types vs production schema
- relatorios_descritivos schema: MEDIUM - Derived from code analysis, may need adjustment

**Research date:** 2026-01-24
**Valid until:** 30 days (stable tooling)

## Phase Scope Recommendation

**CRITICAL:** This phase needs to be split into TWO clear tasks:

1. **Task 1: Create relatorios_descritivos table**
   - Apply migration to create the table
   - Add RLS policies
   - Verify table exists

2. **Task 2: Regenerate all TypeScript types**
   - Use MCP or CLI to regenerate
   - Replace entire types/database.ts
   - Verify build passes

The original phase description assumed the table exists - this research reveals it doesn't.

## Project Reference

- **Project ID:** `SUPABASE-PROJECT-REF`
- **Project Name:** EDUCA
- **Region:** sa-east-1
- **Database Version:** 17.6.1.003
- **Types File:** `gestao_fronteira/types/database.ts`
