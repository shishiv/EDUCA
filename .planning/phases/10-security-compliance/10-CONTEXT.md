# Phase 10: Security & Compliance - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Versionar migrations no Supabase CLI e documentar RLS policies para auditoria. Atualizar privacy policy com contato real. Infrastructure setup and compliance documentation — no new features.

</domain>

<decisions>
## Implementation Decisions

### RLS Documentation Depth
- Primary audience: Both developers AND auditors/compliance — technical detail with plain language summaries
- Every policy includes rationale explaining WHY it exists and what it protects
- Organized by role/perfil (admin, diretor, professor, responsavel) — shows what each role can do
- Security matrix (role × action × resource) at the START of document for quick reference

### Contact Information
- Entity: Secretaria de Educação de Fronteira (data controller / responsável pelo tratamento)
- Phone: Official Secretaria de Educação number
- Email: Official Secretaria de Educação email address
- Address: Full address including street, city, state, CEP

### Documentation Format
- SQL policy code included in APPENDIX (not inline) — plain language first
- Bilingual: Portuguese explanations, English technical terms
- Include Mermaid diagrams for data flow and access patterns
- Visual security matrix at start for quick reference

### Claude's Discretion
- Detail level per policy explanation (concise vs detailed based on complexity)
- Mermaid diagram design and placement
- Migration file naming conventions
- Supabase CLI configuration approach

</decisions>

<specifics>
## Specific Ideas

- Security matrix should be scannable by auditors — "what can a diretor do?" at a glance
- RLS document should work for both internal devs maintaining code AND external compliance review
- Contact info must be verifiable official channels — not personal phones/emails

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-security-compliance*
*Context gathered: 2026-01-19*
