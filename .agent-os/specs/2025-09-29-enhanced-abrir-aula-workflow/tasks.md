# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-09-29-enhanced-abrir-aula-workflow/spec.md

> Created: 2025-09-30
> Status: Ready for Implementation

## Tasks

- [x] 1. Database Schema and Auto-Lock Infrastructure
  - [x] 1.1 Write database migration tests for aula_aberta table structure
  - [x] 1.2 Create migration: `20250930_enhanced_abrir_aula_workflow.sql` with aula_aberta table (id, turma_id, data, fase, aberta_em, aberta_por, trancada_em, timestamps)
  - [x] 1.3 Write tests for PostgreSQL auto-lock trigger function
  - [x] 1.4 Implement auto-lock trigger: `travar_aula_automaticamente()` executes daily at 18:00 via pg_cron
  - [x] 1.5 Write tests for RLS policies on aula_aberta table (professor can open/view own classes, admin can view all)
  - [x] 1.6 Apply RLS policies with school-based multi-tenancy isolation
  - [x] 1.7 Run local migration with `supabase db push` and verify schema
  - [x] 1.8 Verify all database tests pass and trigger executes correctly

- [x] 2. State Management and API Integration
  - [x] 2.1 Write unit tests for Zustand store: `useAulaAbertraStore` (state: currentAula, fase, isLocked, actions: openAula, markAttendance, closeAula)
  - [x] 2.2 Implement Zustand store with optimistic updates and error rollback
  - [x] 2.3 Write tests for TanStack Query hooks: `useAulaStatus`, `useOpenAula`, `useCloseAula`
  - [x] 2.4 Implement TanStack Query hooks with 30s stale time and automatic refetch on window focus
  - [x] 2.5 Write tests for server actions: `openAulaAction`, `markAttendanceAction`, `closeAulaAction`, `checkAulaLockAction`
  - [x] 2.6 Implement server actions with proper error handling and lock enforcement validation
  - [x] 2.7 Write integration tests for state management + API flow (open → mark → close)
  - [x] 2.8 Verify all state management and API tests pass

- [x] 3. UI Components - Phase Indicators and Workflow
  - [x] 3.1 Write Playwright E2E tests for `AulaPhaseIndicator` component (3 phases with visual feedback)
  - [x] 3.2 Implement `AulaPhaseIndicator` with React 19 + shadcn/ui Badge component (Pendente: yellow, Marcando: green, Encerrada: gray)
  - [x] 3.3 Write Playwright tests for `AbrirAulaButton` component (disabled when locked, toast notifications)
  - [x] 3.4 Implement `AbrirAulaButton` with lock enforcement and accessible touch targets (min 44px)
  - [x] 3.5 Write Playwright tests for enhanced `AttendanceGrid` with phase awareness and batch operations
  - [x] 3.6 Enhance `AttendanceGrid` with optimistic updates, batch save (debounced 2s), and mobile touch optimization
  - [x] 3.7 Write Playwright tests for `EncerrarAulaDialog` confirmation modal with attendance summary
  - [x] 3.8 Implement `EncerrarAulaDialog` with summary display (total students, present, absent) and lock warning

- [x] 4. Mobile Responsiveness and Accessibility
  - [x] 4.1 Write Playwright tests for responsive layout on mobile (375x667), tablet (768x1024), desktop (1920x1080)
  - [x] 4.2 Optimize AttendanceGrid for touch interfaces: increase touch targets to 48px, add haptic feedback simulation
  - [x] 4.3 Write accessibility tests with Chrome DevTools Lighthouse (target: Accessibility score > 95)
  - [x] 4.4 Implement WCAG 2.1 AA compliance: color contrast validation, keyboard navigation, ARIA labels
  - [x] 4.5 Write tests for offline support: service worker caches attendance grid UI
  - [x] 4.6 Implement service worker for offline UI caching (attendance grid accessible without network)
  - [x] 4.7 Run Chrome DevTools MCP Lighthouse audit and fix any issues below threshold
  - [x] 4.8 Verify all mobile responsiveness and accessibility tests pass

- [x] 5. Performance Optimization and Quality Assurance
  - [x] 5.1 Write performance tests: attendance marking < 1s per student, batch save < 2s for 30 students
  - [x] 5.2 Implement optimistic UI updates with immediate visual feedback and background API calls
  - [x] 5.3 Write tests for database query optimization: indexed queries on (turma_id, data), (trancada_em)
  - [x] 5.4 Add database indexes and verify query performance with EXPLAIN ANALYZE
  - [x] 5.5 Write stress tests with Playwright: 50 concurrent users marking attendance simultaneously
  - [x] 5.6 Run full E2E test suite with Playwright MCP (open aula → mark 30 students → close aula)
  - [x] 5.7 Run Chrome DevTools MCP performance profiling: validate no memory leaks, FPS > 30
  - [x] 5.8 Verify all performance benchmarks met and full test suite passes (unit + integration + E2E)
