# Phase 9: Feature Flags - Research

**Researched:** 2026-01-19
**Domain:** Supabase feature flags with React Query caching
**Confidence:** HIGH

## Summary

This phase implements a per-school feature flag system for gradual rollout of modules (nutricao, estoque_escolar). The research focuses on:

1. Schema design following existing Supabase patterns (audit_logs, configs tables as references)
2. React Query hook pattern matching `useDiaryQuery` and established staleTime conventions
3. Admin UI following `user-list.tsx` and `configuracoes/page.tsx` patterns
4. RLS policies for escola-scoped data access

**Primary recommendation:** Use a junction table approach (escola_id + flag_name as composite key) with full audit metadata, defaulting missing flags to disabled for safe rollouts.

## Standard Stack

The established libraries/tools for this domain are already in the codebase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.x | Database client | Already used throughout codebase |
| `@tanstack/react-query` | 5.x | Client-side caching | Established pattern in lib/react-query.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | existing | Toast notifications | Flag toggle feedback |
| `lucide-react` | existing | Icons | Admin UI |
| `shadcn/ui` | existing | UI components | Table, Switch, Checkbox |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database flags | LaunchDarkly/Split | Overkill for per-escola scope, adds external dependency |
| Junction table | JSON column per escola | Junction table is cleaner, better queryability |
| Per-school flags only | Global + escola flags | Simpler; global flags can be added later if needed |

**Installation:**
```bash
# No new packages needed - all dependencies already in codebase
```

## Architecture Patterns

### Recommended Database Schema

```sql
-- Feature flags table with full audit support
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,  -- soft delete support
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction table: escola x flag with per-escola enabled status
CREATE TABLE escola_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(escola_id, flag_id)
);

-- Indexes for common queries
CREATE INDEX idx_escola_feature_flags_escola ON escola_feature_flags(escola_id);
CREATE INDEX idx_escola_feature_flags_flag ON escola_feature_flags(flag_id);
CREATE INDEX idx_feature_flags_name ON feature_flags(flag_name);
```

**Rationale for two-table design:**
1. `feature_flags` stores flag metadata (name, description, is_active for soft delete)
2. `escola_feature_flags` stores per-school enablement with audit trail
3. Enables bulk operations (enable flag X for all schools)
4. Cleaner than denormalized escola_id + flag_name in single table

### Recommended File Structure
```
gestao_fronteira/
├── lib/api/
│   └── feature-flags.ts       # FeatureFlagsApiService
├── hooks/
│   └── use-feature-flag.ts    # useFeatureFlag hook
├── types/
│   └── feature-flags.ts       # TypeScript types
└── app/(dashboard)/dashboard/flags/
    └── page.tsx               # Admin UI at /dashboard/flags
```

### Pattern 1: API Service Pattern (following VivenciasApiService)
**What:** Singleton class extending BaseApiService with typed methods
**When to use:** All feature flag CRUD operations
**Example:**
```typescript
// Source: lib/api/vivencias.ts pattern
export class FeatureFlagsApiService extends BaseApiService {
  constructor() {
    super('feature_flags')
  }

  /**
   * Get flag status for a specific escola
   * Returns false if flag doesn't exist (safe default)
   */
  async getFlagForEscola(flagName: string, escolaId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('escola_feature_flags')
        .select(`
          enabled,
          feature_flags!inner(flag_name, is_active)
        `)
        .eq('escola_id', escolaId)
        .eq('feature_flags.flag_name', flagName)
        .eq('feature_flags.is_active', true)
        .maybeSingle()

      if (error) {
        logger.error('Error fetching feature flag', error, {
          feature: 'feature-flags',
          action: 'get_flag',
          metadata: { flagName, escolaId }
        })
        return false // Safe default
      }

      return data?.enabled ?? false
    } catch (error) {
      logger.error('Error in getFlagForEscola', error)
      return false
    }
  }
}

export const featureFlagsApi = new FeatureFlagsApiService()
```

### Pattern 2: React Query Hook (following useDiaryQuery pattern)
**What:** Hook with staleTime and escola_id from context
**When to use:** Components that need to check flag status
**Example:**
```typescript
// Source: hooks/use-diary-query.ts pattern
'use client'

import { useQuery } from '@tanstack/react-query'
import { useEscola } from '@/contexts/escola-context'
import { featureFlagsApi } from '@/lib/api/feature-flags'

export const featureFlagQueryKeys = {
  all: () => ['featureFlags'] as const,
  flag: (flagName: string, escolaId: string) =>
    [...featureFlagQueryKeys.all(), flagName, escolaId] as const,
}

interface UseFeatureFlagOptions {
  enabled?: boolean
}

export function useFeatureFlag(
  flagName: string,
  options: UseFeatureFlagOptions = {}
) {
  const { selectedEscolaId } = useEscola()
  const { enabled = true } = options

  return useQuery({
    queryKey: featureFlagQueryKeys.flag(flagName, selectedEscolaId || ''),
    queryFn: async () => {
      if (!selectedEscolaId) return false
      return featureFlagsApi.getFlagForEscola(flagName, selectedEscolaId)
    },
    // Static data - flags rarely change during a session
    staleTime: 5 * 60 * 1000, // 5 minutes per CONVENTIONS.md
    gcTime: 10 * 60 * 1000,
    enabled: enabled && !!selectedEscolaId,
    // Safe default while loading
    placeholderData: false,
  })
}
```

### Pattern 3: Admin UI (following user-list.tsx pattern)
**What:** Flag-centric layout with escola toggles
**When to use:** /dashboard/flags admin page
**Layout decision:** List by flag (per CONTEXT.md), show all escolas with toggle status

### Anti-Patterns to Avoid
- **Hand-rolling caching:** Use React Query, don't implement custom cache
- **Truthy while loading:** Always default to false (disabled) during loading
- **Global flags mixed with escola flags:** Keep scope clear - this phase is escola-only
- **Inline Supabase queries:** Use FeatureFlagsApiService, not direct queries in components

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Caching | Custom flag cache | React Query with staleTime | Handles invalidation, deduplication |
| Auth check | Manual role checking | hasPermission from lib/auth.ts | Consistent with codebase |
| Escola scope | Manual context reading | useEscola hook | Already handles single/multi escola |
| Toast feedback | Custom notification | sonner toast | Consistent UX |
| Bulk selection | Custom checkbox state | useAppStore bulkSelection | Pattern exists in user-list.tsx |

**Key insight:** All supporting patterns already exist in codebase. Feature flags is composition, not creation.

## Common Pitfalls

### Pitfall 1: Flag Check Returns True While Loading
**What goes wrong:** Feature appears briefly then disappears when flag resolves to false
**Why it happens:** Using `undefined` or optimistic true during loading
**How to avoid:** Always use `placeholderData: false` in useQuery; hook returns `false` while loading
**Warning signs:** Flash of content in disabled features

### Pitfall 2: Missing Escola Selection Breaks Admin UI
**What goes wrong:** Admin without escola selected sees empty/broken flag management
**Why it happens:** Admin users have shouldShowSelector=true but may not have selected escola
**How to avoid:** Admin UI operates on all escolas, not selected escola. Use different query pattern for admin vs end-user
**Warning signs:** Admin can't manage flags, page shows loading forever

### Pitfall 3: Forgetting Soft Delete (is_active)
**What goes wrong:** Deleting flag loses all escola assignments
**Why it happens:** Using DELETE instead of setting is_active=false
**How to avoid:** API service should only soft-delete; query always filters is_active=true
**Warning signs:** "Where did my flag data go?" after removing a flag

### Pitfall 4: RLS Policy Too Restrictive
**What goes wrong:** Admin can't manage flags for all schools
**Why it happens:** RLS checking escola_id = user's escola_id
**How to avoid:** RLS allows admin/gestor_sme to read/write all; others read only their escola
**Warning signs:** 403 errors for admin operations

### Pitfall 5: Race Condition on Bulk Toggle
**What goes wrong:** Some schools don't get toggled in bulk operation
**Why it happens:** Sequential updates instead of batch upsert
**How to avoid:** Use single upsert with ON CONFLICT for bulk operations
**Warning signs:** Inconsistent toggle results

## Code Examples

Verified patterns from official sources and codebase:

### Migration Example
```sql
-- Source: Supabase standard migration pattern
-- Migration: 20260119_create_feature_flags.sql

-- 1. Create feature_flags table (flag definitions)
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create escola_feature_flags junction table
CREATE TABLE IF NOT EXISTS escola_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  CONSTRAINT unique_escola_flag UNIQUE(escola_id, flag_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_escola_feature_flags_escola
  ON escola_feature_flags(escola_id);
CREATE INDEX IF NOT EXISTS idx_escola_feature_flags_flag
  ON escola_feature_flags(flag_id);

-- 4. RLS Policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE escola_feature_flags ENABLE ROW LEVEL SECURITY;

-- feature_flags: all authenticated users can read active flags
CREATE POLICY "Authenticated users can read active flags"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (is_active = true);

-- feature_flags: only admin can insert/update/delete
CREATE POLICY "Admin can manage flags"
  ON feature_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario IN ('admin', 'gestor_sme')
    )
  );

-- escola_feature_flags: users can read their escola's flags
CREATE POLICY "Users can read own escola flags"
  ON escola_feature_flags FOR SELECT
  TO authenticated
  USING (
    escola_id IN (
      SELECT escola_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario IN ('admin', 'gestor_sme')
    )
  );

-- escola_feature_flags: only admin can manage
CREATE POLICY "Admin can manage escola flags"
  ON escola_feature_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario IN ('admin', 'gestor_sme')
    )
  );

-- 5. Seed initial flags (disabled by default)
INSERT INTO feature_flags (flag_name, description)
VALUES
  ('nutricao', 'Modulo de gestao nutricional escolar'),
  ('estoque_escolar', 'Modulo de controle de estoque escolar');

-- 6. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_feature_flags_updated_at();

CREATE TRIGGER trigger_escola_feature_flags_updated_at
  BEFORE UPDATE ON escola_feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_feature_flags_updated_at();
```

### Bulk Toggle Pattern
```typescript
// Source: Supabase upsert pattern
async toggleFlagsForEscolas(
  flagId: string,
  escolaIds: string[],
  enabled: boolean,
  userId: string
): Promise<void> {
  const records = escolaIds.map(escolaId => ({
    escola_id: escolaId,
    flag_id: flagId,
    enabled,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('escola_feature_flags')
    .upsert(records, {
      onConflict: 'escola_id,flag_id',
      ignoreDuplicates: false
    })

  if (error) {
    logger.error('Error bulk toggling flags', error)
    throw error
  }
}
```

### Hook Usage Example
```typescript
// Component checking feature flag
'use client'

import { useFeatureFlag } from '@/hooks/use-feature-flag'

export function NutricaoModule() {
  const { data: isEnabled, isLoading } = useFeatureFlag('nutricao')

  // Hidden while loading or disabled - no flash
  if (isLoading || !isEnabled) {
    return null
  }

  return <NutricaoContent />
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global feature flags | Per-tenant flags | Industry trend | Enables gradual rollout |
| Config file flags | Database flags | Established | Runtime toggling |
| Boolean column per flag | Junction table | Best practice | Scalable, auditable |

**Deprecated/outdated:**
- Hardcoded feature checks: Use database flags for runtime control
- Global-only flags: Per-escola granularity required for municipal system

## Open Questions

Things that couldn't be fully resolved:

1. **Flag creation in admin UI**
   - What we know: CONTEXT.md says "Claude's discretion" on creation mechanism
   - What's unclear: Should admin be able to create new flags, or migration-only?
   - Recommendation: Migration-only for v1 (safer); flags are pre-defined module names

2. **Audit trail visibility**
   - What we know: CONTEXT.md marks this as discretionary
   - What's unclear: Show updated_by in UI or just store it?
   - Recommendation: Store updated_by; show only current state in UI (simpler)

3. **Hook escola_id parameter**
   - What we know: CONTEXT.md says discretionary (auto from context vs explicit)
   - What's unclear: Should hook allow explicit override?
   - Recommendation: Auto from EscolaContext for simplicity; admin UI uses separate query pattern

## Sources

### Primary (HIGH confidence)
- `lib/api/vivencias.ts` - Exemplar API service pattern
- `hooks/use-diary-query.ts` - React Query hook pattern with staleTime
- `contexts/escola-context.tsx` - Escola context pattern
- `types/database.ts` - Existing schema patterns (configs, audit_logs tables)
- `components/admin/users/user-list.tsx` - Admin UI with bulk selection pattern
- `lib/auth.ts` - Role hierarchy and permission checking

### Secondary (MEDIUM confidence)
- `app/(dashboard)/dashboard/configuracoes/page.tsx` - Config management UI pattern
- Supabase documentation for RLS policies and upsert

### Tertiary (LOW confidence)
- None - all research based on codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase
- Architecture: HIGH - Follows established patterns exactly
- Pitfalls: HIGH - Based on codebase analysis and common React Query issues

**Research date:** 2026-01-19
**Valid until:** 60 days (stable patterns, no external dependencies)

---

## Planner Quick Reference

**Key decisions from CONTEXT.md to follow:**
- Full audit metadata: timestamps + updated_by
- Flag descriptions stored in DB
- Soft delete via is_active
- Missing flag defaults to disabled
- List by flag layout (select flag, see all escolas)
- Bulk toggle with checkboxes
- Super admin only (secretaria profile = admin role in codebase)
- New flags start disabled
- Initial flags: nutricao, estoque_escolar (both disabled)

**Discretionary items resolved:**
- Flag scoping: Per-school only (simpler)
- Flag naming: Flat (nutricao, estoque_escolar) not namespaced
- Hook loading: Returns false while loading
- Cache duration: 5min (static data per CONVENTIONS.md)
- Hook escola_id: Auto from EscolaContext
- Audit visibility: Store updated_by, show current state only
- Flag creation: Migration-only for v1
