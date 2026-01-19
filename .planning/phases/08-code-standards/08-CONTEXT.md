# Phase 8: Code Standards - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Standardize data fetching, filtering, and logging patterns across the codebase. Migrate inline Supabase queries to centralized API layer, establish consistent filter behavior, and replace console.error with structured logging.

Requirements:
- STD-01: Padrão único de data fetching documentado (React Query + API layer)
- STD-02: Padrão único de filtros (valor default: 'todos')
- STD-03: Queries Supabase centralizadas em lib/api/
- STD-04: Console.error substituido por lib/logger.ts estruturado

</domain>

<decisions>
## Implementation Decisions

### Logger Design
- Log levels: **error, warn, info, debug** (4 levels - Extended)
- This is the only locked decision — user explicitly chose extended levels

### Claude's Discretion

**Data Fetching Pattern:**
- Caching strategy — choose based on data type (user profile vs lists)
- Error handling — choose based on context (critical vs non-critical data)
- Loading UI — choose based on component type (skeletons vs spinners)
- Optimistic updates — choose based on operation type (delete vs create)

**Filter Behavior:**
- URL sync — decide based on page type (shareable pages vs local state)
- Reset UX — decide based on filter complexity
- "All" option display — decide based on context (Todos vs Todos os [items])
- Show counts — decide based on data volume

**API Layer Structure:**
- File organization — decide based on existing codebase patterns (by domain or feature)
- Naming convention — decide based on existing patterns (CRUD verbs or fetch/mutate)
- Return types — decide based on use case (raw Supabase vs transformed)
- Types location — decide based on type complexity (centralized vs co-located)

**Logger (beyond levels):**
- Structured metadata — decide based on observability needs
- Output destination — console for now, can add external service later
- Debug visibility in dev — decide based on dev experience

</decisions>

<specifics>
## Specific Ideas

No specific requirements — user gave Claude full discretion on implementation approach, except for logger log levels (4 levels: error, warn, info, debug).

The phase should:
- Follow existing patterns in the codebase where they exist
- Make decisions that support future maintainability
- Document chosen patterns in CONVENTIONS.md

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-code-standards*
*Context gathered: 2026-01-19*
