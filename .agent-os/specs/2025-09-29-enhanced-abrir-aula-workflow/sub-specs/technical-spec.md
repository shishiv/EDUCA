# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-29-enhanced-abrir-aula-workflow/spec.md

> Created: 2025-09-29
> Version: 1.0.0

## Technical Requirements

### 1. Component Architecture (Complete Existing 85% Implementation)

**Existing Components to Enhance:**
- `gestao_fronteira/components/attendance/AbrirAulaWorkflow.tsx` - Main three-phase workflow orchestrator
- `gestao_fronteira/components/attendance/FrequenciaWorkflow.tsx` - Attendance marking interface
- `gestao_fronteira/components/attendance/FecharAulaDialog.tsx` - Session completion confirmation
- `gestao_fronteira/components/attendance/AttendanceGrid.tsx` - Student attendance marking grid

**Required Enhancements:**
- Add phase state management (planning → attendance → completion) with visual indicators
- Implement session locking UI enforcement (disable all inputs after completion/18:00)
- Add optimistic updates for <1s marking performance
- Enhance mobile responsiveness with touch targets ≥44px
- Add "Documento Legal Oficial" badge display for completed sessions

### 2. State Management (Zustand + TanStack Query)

**Session State Store:**
```typescript
// lib/stores/attendance-session-store.ts
interface AttendanceSessionState {
  currentPhase: 'planning' | 'attendance' | 'completion' | 'locked'
  sessionId: string | null
  isLocked: boolean
  cutoffTime: Date
  actions: {
    transitionPhase: (phase) => void
    lockSession: () => void
    checkLockStatus: () => boolean
  }
}
```

**TanStack Query Hooks:**
- `useAttendanceSession` - Fetch session with lock status
- `useMarkAttendance` - Optimistic mutation for marking
- `useCloseSession` - Complete session mutation
- `useSessionLockStatus` - Real-time lock status polling

### 3. API Integration (Next.js App Router Server Actions)

**Server Actions Required:**
- `app/actions/attendance/open-session.ts` - Create session record (planning phase)
- `app/actions/attendance/mark-attendance.ts` - Update individual attendance with timestamp
- `app/actions/attendance/close-session.ts` - Complete session (trigger immutability)
- `app/actions/attendance/check-lock-status.ts` - Validate if session is editable

**API Validation Rules:**
- Reject modifications if session status = 'completed' or 'locked'
- Reject modifications if current_time > 18:00 on session date
- Return error with Portuguese message: "Frequência já finalizada. Não existe o esquecer."

### 4. Performance Optimization

**Database Query Optimization:**
- Use existing indexes on `frequencia.sessao_aula_id` and `frequencia.aluno_id`
- Implement batch marking API to reduce round trips (mark multiple students in single request)
- Add Supabase RLS policy optimization for session-based filtering

**Frontend Optimization:**
- Implement optimistic updates for marking actions (immediate UI feedback)
- Use React.memo() for AttendanceGrid row components
- Debounce session notes autosave (500ms delay)
- Lazy load student photos with placeholder

**Target Performance Metrics:**
- Attendance marking: <1s per student (including network round trip)
- Session open: <2s (includes student list fetch)
- Session close: <3s (includes validation and locking)

### 5. Mobile/Tablet UI/UX Requirements

**Responsive Design (Tailwind CSS):**
- Touch targets: minimum 44x44px (className: "min-h-[44px] min-w-[44px]")
- Grid layout: 2 columns on mobile (375px), 3 columns on tablet (768px), 4 columns on desktop (1024px+)
- Bottom sheet for "Fechar Aula" dialog on mobile (sheet component from shadcn/ui)
- Sticky header with phase indicator and session info

**Touch Interactions:**
- Single tap to toggle Presente/Ausente
- Long press (500ms) to show Justificado option
- Swipe gestures disabled to prevent accidental navigation
- Haptic feedback on marking (if device supports)

### 6. Immutability Enforcement

**UI-Level Enforcement:**
- Disable all attendance marking buttons when `isLocked === true`
- Display read-only badge: "Documento Legal Oficial - Não Editável"
- Show lock icon (Lucide: Lock) next to session title
- Gray out entire AttendanceGrid with 60% opacity

**API-Level Enforcement:**
- Validate session lock status in server action before mutation
- Return 403 Forbidden with Portuguese error message
- Log attempted modifications to audit trail (basic: user_id, timestamp, action)

**Database-Level Enforcement (Trigger):**
- See database-schema.md for PostgreSQL trigger implementation

### 7. Accessibility (WCAG 2.1 AA Compliance)

**Keyboard Navigation:**
- Tab order: Session info → Attendance grid (row by row) → Close button
- Enter/Space to toggle attendance status
- Escape to close dialogs

**Screen Reader Support:**
- ARIA labels for attendance status buttons
- Live region announcements for marking confirmations
- Descriptive button text: "Marcar Presente para [Student Name]"

**Color Contrast:**
- Presente (green): #16a34a on white background (7.35:1 ratio)
- Ausente (red): #dc2626 on white background (5.94:1 ratio)
- Justificado (yellow): #ca8a04 on white background (4.89:1 ratio)

### 8. Error Handling

**User-Facing Error Messages (Portuguese):**
- Session already exists: "Já existe uma aula aberta para esta turma hoje."
- Session locked: "Frequência já finalizada. Não existe o esquecer."
- After 18:00 cutoff: "Prazo para fechar aula encerrado às 18:00. Sessão bloqueada automaticamente."
- Network error: "Erro de conexão. Suas marcações serão salvas quando a conexão for restabelecida."

**Error Recovery:**
- Offline queue for marking actions (store in localStorage)
- Retry logic with exponential backoff (3 attempts)
- Toast notifications for success/error feedback (using shadcn/ui Toast)

### 9. Testing Requirements

**Unit Tests (Jest + React Testing Library):**
- Phase state transitions (planning → attendance → completion → locked)
- Optimistic UI updates for marking
- Lock status validation logic
- Error message display

**Integration Tests (Playwright):**
- Full three-phase workflow completion
- 18:00 cutoff enforcement (mock system time)
- Mobile responsiveness (375x667px viewport)
- Touch interaction testing

**Performance Tests:**
- Mark 40 students in <40s (1s per student average)
- Session open with 200 students in <3s
- Network throttling test (3G speed simulation)

### 10. Integration Points

**Existing System Integration:**
- AttendanceGrid component (existing) - enhance with lock status awareness
- Sidebar navigation (existing) - add session status indicators
- Dashboard stats (existing) - update with completion rate widget
- Notification system (future) - hook for 17:30 reminder (post-MVP)

**Supabase Real-time (Optional Enhancement):**
- Subscribe to session lock status changes
- Multi-teacher collaborative marking prevention
- Live session completion notifications

## Approach

### Implementation Strategy

**Phase 1: State Management Foundation (4h)**
- Create Zustand attendance session store
- Implement TanStack Query hooks for session operations
- Add optimistic update middleware for marking mutations

**Phase 2: UI Component Enhancements (6h)**
- Add phase indicators to AbrirAulaWorkflow
- Implement session locking UI in AttendanceGrid
- Enhance mobile responsiveness with touch targets
- Add "Documento Legal Oficial" badge component

**Phase 3: API & Backend Integration (5h)**
- Create server actions for session lifecycle
- Add validation rules for immutability enforcement
- Implement error handling with Portuguese messages
- Add basic audit trail logging

**Phase 4: Performance Optimization (3h)**
- Implement optimistic UI updates
- Add React.memo to grid components
- Create batch marking API endpoint
- Add debounced autosave for notes

**Phase 5: Testing & Quality Assurance (4h)**
- Write unit tests for state transitions
- Create Playwright E2E tests for full workflow
- Performance testing with 40+ students
- Mobile responsiveness validation

### Risk Mitigation

**Technical Risks:**
- **Optimistic Updates Complexity**: Implement rollback mechanism for failed mutations
- **18:00 Cutoff Edge Cases**: Use server-side time validation to prevent client-side manipulation
- **Mobile Performance**: Lazy load student photos and implement virtual scrolling if needed

**User Experience Risks:**
- **Accidental Session Closure**: Add confirmation dialog with session summary
- **Network Connectivity**: Implement offline queue with visual indicators
- **Teacher Training**: Create in-app tooltips for first-time workflow usage

## External Dependencies

No new external dependencies required. All implementation uses existing tech stack:
- React 19.1.1 (existing)
- Next.js 15.5.3 (existing)
- Zustand 5.0.8 (existing)
- TanStack Query 5.87.4 (existing)
- shadcn/ui components (existing)
- Supabase 2.57.4 (existing)
- Tailwind CSS 3.4.17 (existing)