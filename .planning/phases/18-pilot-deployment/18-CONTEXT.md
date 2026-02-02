# Phase 18: Pilot Deployment - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy EDUCA to 1-2 pilot schools. Onboard users, collect feedback, monitor production. Full rollout to remaining schools is a future phase.

</domain>

<decisions>
## Implementation Decisions

### Pilot School Selection
- **EMEI Maisa** — selected (proximity to support)
- **Escola José Maria Bastos** — selected (proximity to support)
- Two schools provide comparison data while keeping support manageable

### User Onboarding
- Start with directors and secretaries — they manage school-wide operations
- Teachers onboarded in waves after admin users are comfortable
- Simple PDF quick-start guide (2-3 pages) covering daily tasks
- WhatsApp group for pilot users to share questions/feedback
- 1-hour hands-on session per school (in-person if possible)

### Feedback Collection
- Weekly check-in via WhatsApp group for first 2 weeks
- Google Form for structured feedback after 1 week of use
- Focus areas: ease of use, missing features, bugs encountered
- Direct line to developer for critical issues

### Production Monitoring
- Vercel deployment (existing infrastructure)
- Supabase dashboard for database monitoring
- Browser console errors logged via existing structured logger
- Manual review of logs weekly during pilot period
- No Sentry/PostHog (user decided against analytics in Phase 16)

### Rollback Plan
- Keep staging environment synced with production
- Document rollback procedure before go-live
- If critical issues: revert Vercel deployment, communicate via WhatsApp

</decisions>

<specifics>
## Specific Ideas

- Proximity is key — EMEI Maisa and José Maria Bastos are closest schools
- Support can be provided in-person if needed
- Start small, expand after validation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-pilot-deployment*
*Context gathered: 2026-01-27*
