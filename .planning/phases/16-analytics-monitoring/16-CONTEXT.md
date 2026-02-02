# Phase 16: Analytics & Monitoring Integration - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean up analytics/monitoring scaffolding. Remove broken/placeholder implementations. Defer external service integration to future milestone.

**Note:** Phase scope changed from "add analytics" to "remove analytics scaffolding" based on user decision to skip external services for now.

</domain>

<decisions>
## Implementation Decisions

### Analytics Provider
- Remove PostHog/analytics entirely — not worth debugging Turbopack issues now
- Delete AnalyticsProvider.tsx placeholder component
- Remove .env.example PostHog variables completely (no commented references)

### Error Tracking
- Skip Sentry integration — no external error tracking for now
- No @sentry/nextjs package

### Logger Integration
- Remove `sendToMonitoringService()` method entirely (the TODO)
- Delete empty `instrumentation.ts` file

### Claude's Discretion
- Whether to simplify logger further (remove buffer/flush logic) or keep structured logging for dev/debugging
- Cleanup approach for any other analytics-related code

</decisions>

<specifics>
## Specific Ideas

Clean removal — no placeholders, no "for future" scaffolding. If analytics is needed later, it will be a fresh implementation.

</specifics>

<deferred>
## Deferred Ideas

- PostHog analytics integration — future milestone when Turbopack issues resolved
- Sentry error tracking — future milestone
- External monitoring service connection — future milestone

</deferred>

---

*Phase: 16-analytics-monitoring*
*Context gathered: 2026-01-24*
