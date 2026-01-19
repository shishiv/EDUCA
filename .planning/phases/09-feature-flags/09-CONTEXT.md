# Phase 9: Feature Flags - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Sistema de feature flags por escola para rollout gradual de módulos. Permite habilitar/desabilitar funcionalidades (nutrição, estoque_escolar) por escola individualmente via Supabase.

**Includes:**
- Database schema for feature_flags table
- useFeatureFlag hook for frontend checks
- Admin UI at /admin/flags for managing flags
- Initial flags for nutricao and estoque_escolar modules

**Excludes:**
- Actual module implementations (future phases)
- Per-user flags (school-level only)
- A/B testing capabilities

</domain>

<decisions>
## Implementation Decisions

### Flag Schema Design
- Full audit metadata: timestamps (created_at, updated_at) + updated_by (user who toggled)
- Flag descriptions stored in database (single source of truth for admin UI)
- Soft delete support: is_active flag to deactivate flags system-wide without deleting data

### Hook Behavior
- Missing flag defaults to disabled (safe for gradual rollouts)
- Features hidden until flag confirmed enabled

### Admin UI Layout
- List by flag layout: select a flag, see all schools with toggle status
- Bulk toggle with checkboxes: select multiple schools, enable/disable at once
- Access restricted to super admin only (secretaria profile)

### Default Values & Lifecycle
- New flags start disabled for all schools (opt-in model)
- Initial flags (nutricao, estoque_escolar) both start disabled

### Claude's Discretion
- Flag scoping strategy (per-school only vs hybrid with global flags)
- Flag naming convention (flat vs namespaced)
- Hook loading state behavior (false vs undefined while loading)
- Cache duration (follow existing staleTime patterns from CONVENTIONS.md)
- Hook escola_id parameter (auto from EscolaContext vs explicit parameter)
- Audit trail visibility in UI (show last_updated_by or just current state)
- Flag creation mechanism (migration-only vs admin-creatable)

</decisions>

<specifics>
## Specific Ideas

- Layout "list by flag" enables efficient rollout management: "Enable nutrição for these 5 pilot schools"
- Bulk operations needed for scenario: "Turn on estoque_escolar for all schools in phase 2"
- Super admin restriction ensures controlled rollout (not accidentally enabled by diretor)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-feature-flags*
*Context gathered: 2026-01-19*
