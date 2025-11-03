# lib/hooks/ - Educational Domain Hooks

This directory contains **specialized hooks for educational domain operations**. These hooks implement complex business logic specific to Brazilian educational compliance, attendance workflows, and real-time coordination.

## Organization Principle

**`lib/hooks/`** contains hooks that are:
- Specific to the educational domain
- Complex business logic for attendance/enrollment/compliance
- Brazilian educational standards (INEP, LGPD, Educacenso)
- Integration with domain services (lib/services/)
- Not reusable across other projects

## Hooks Reference

### Attendance Workflow Management

#### `use-attendance-workflow.ts`
**Purpose:** Three-phase attendance marking workflow state management
**Dependencies:** `@tanstack/react-query`, `sonner` (toast)
**Exports:** `useAttendanceWorkflow()`

Manages the complete "Abrir aula" (open class) workflow with performance tracking and compliance validation.

```tsx
const { state, actions, performance, progress } = useAttendanceWorkflow({
  classId: 'turma-123',
  teacherId: 'prof-456',
  autoSave: true
})

// Phase transitions
await actions.openSession({ conteudo_programatico: '...' })
await actions.startMarking()
await actions.markStudent('aluno-1', 'presente')
await actions.closeSession()
await actions.completeWorkflow()
```

**Key Features:**
- Three-phase workflow: PREPARATION → MARKING → COMPLETION
- Individual and bulk marking operations
- Smart bulk marking with AI predictions
- Auto-save progress to localStorage
- Performance metrics tracking (timing, efficiency)
- Compliance report generation
- Error recovery and retry mechanisms

**Workflow Phases:**
1. **PREPARATION** - Open aula session with content and methodology
2. **MARKING** - Mark individual student attendance (presente, falta, justificada, atestado)
3. **COMPLETION** - Close and lock attendance records

### Attendance Record Locking

#### `use-attendance-locking.ts`
**Purpose:** Manage immutability and locking rules for attendance records
**Dependencies:** `@tanstack/react-query`, `sonner` (toast)
**Exports:** `useAttendanceLocking()`

Enforces legal requirement that attendance records cannot be modified after closure ("não existe o esquecer").

```tsx
const { lockingStatus, actions, canRequestUnlock } = useAttendanceLocking({
  sessionId: 'session-789',
  userId: 'user-123'
})

// Check if locked
if (lockingStatus?.isLocked) {
  // Request unlock with justification
  const permission = await actions.requestUnlock({
    reason: 'Correção necessária',
    justification: 'Erro de marcação',
    emergency: false
  })
}
```

**Key Features:**
- Session locking after closure
- Grace period for corrections
- Unlock request workflow with approval
- Emergency unlock mechanism
- Locking rule management (mandatory, conditional)
- Compliance tracking and audit trail
- Time-based automatic locking

**Lock States:**
- **OPEN** - Record can be modified
- **GRACE_PERIOD** - Limited time for corrections (configurable)
- **LOCKED** - Record immutable without special permission
- **UNLOCK_REQUESTED** - Awaiting administrator approval
- **TEMPORARY_UNLOCK** - Time-limited unlock window

### Attendance History & Audit

#### `use-attendance-history.ts`
**Purpose:** Access attendance history, audit trails, and compliance patterns
**Dependencies:** `@tanstack/react-query`, `sonner` (toast)
**Exports:** `useAttendanceHistory()`

Provides complete audit trail for all attendance modifications with compliance validation.

```tsx
const { history, auditReport, actions, complianceStatus } = useAttendanceHistory({
  sessionId: 'session-789',
  autoLoad: true,
  realTimeUpdates: true
})

// Search history with filters
await actions.searchHistory({
  operation: ['UPDATE', 'DELETE'],
  startDate: '2025-01-01',
  complianceFlags: ['POST_CLOSURE_MODIFICATION']
})

// Generate audit report
const report = await actions.generateAuditReport('session-789')
await actions.downloadAuditReport(report, 'pdf')

// Analyze student patterns
const pattern = await actions.getStudentPattern('aluno-1', '2025-01-01', '2025-02-01')
```

**Key Features:**
- Complete modification history with user attribution
- Compliance flag tracking (post-closure edits, retroactive changes)
- Audit report generation (PDF/Excel)
- Student attendance pattern analysis
- Post-closure modification detection
- Pagination and filtering
- Real-time history updates
- Compliance scoring

**Audit Report Contents:**
- Session summary
- Modification timeline
- User activity breakdown
- Compliance violations
- Attendance pattern analysis
- Integrity score

### Real-time Attendance Coordination

#### `use-realtime-attendance.ts`
**Purpose:** Real-time attendance updates with conflict prevention
**Dependencies:** `@supabase/supabase-js`
**Exports:** `useRealtimeAttendance()`, `useRealtimeClassMonitoring()`

Handles concurrent teacher scenarios and live attendance record updates via Supabase subscriptions.

```tsx
// Single class real-time monitoring
const { activeSession, attendanceRecords, hasConflictingSession } = useRealtimeAttendance({
  classId: 'turma-123',
  teacherId: 'prof-456'
})

// Monitor multiple classes (for administrators)
const { activeSessions, activeClassCount } = useRealtimeClassMonitoring(['turma-1', 'turma-2'])
```

**Key Features:**
- Real-time session state synchronization
- Conflict detection (multiple teachers same class)
- Live attendance record updates
- Concurrent modification prevention
- Session status tracking
- Performance metrics calculation
- Data refresh capability
- Multi-class monitoring for admins

**Conflict Scenarios Handled:**
- Multiple teachers opening attendance for same class
- Concurrent attendance record modifications
- Teacher logout during active session
- Network disconnection recovery

## Integration with Services

These hooks are built on top of domain services (lib/services/):

```
hooks/                          (UI State & Actions)
  ├── use-attendance-workflow.ts  → services/attendance-workflow
  ├── use-attendance-locking.ts   → services/attendance-locking
  ├── use-attendance-history.ts   → services/attendance-history
  └── use-realtime-attendance.ts  → supabase (real-time)

services/                       (Business Logic)
  ├── attendance-workflow.ts
  ├── attendance-locking.ts
  ├── attendance-history.ts
  └── (direct Supabase integration)
```

## Import Statements

```tsx
// Direct imports
import { useAttendanceWorkflow } from '@/lib/hooks/use-attendance-workflow'
import { useAttendanceLocking } from '@/lib/hooks/use-attendance-locking'
import { useAttendanceHistory } from '@/lib/hooks/use-attendance-history'
import { useRealtimeAttendance } from '@/lib/hooks/use-realtime-attendance'

// Barrel export (recommended)
import {
  useAttendanceWorkflow,
  useAttendanceLocking,
  useAttendanceHistory,
  useRealtimeAttendance
} from '@/lib/hooks'
```

## When to Add New Hooks Here

Add a new hook to `lib/hooks/` when:
- It implements educational domain business logic
- It's specific to attendance, enrollment, or compliance workflows
- It integrates with domain services (lib/services/)
- It implements Brazilian educational standards
- It's NOT reusable across other domains

## When to Use `hooks/` Instead

Use `hooks/` for:
- Generic UI patterns (forms, modals, notifications)
- Browser API integration (service workers, storage)
- Generic React patterns (state management)
- Reusable across multiple features
- Not specific to education domain

## Best Practices

1. **Domain-focused** - Keep business logic in services, use hooks for state management
2. **Service integration** - Always use domain services, not direct API calls
3. **Compliance first** - Ensure all operations respect educational compliance rules
4. **Clear naming** - Use `use-[domain]-[operation]` pattern
5. **Document workflows** - Explain the workflow phases and constraints
6. **Error handling** - Comprehensive error states and recovery
7. **Audit trail** - Log all modifications for compliance
8. **Performance** - Track operation timing and efficiency

## Common Patterns

### Attendance Workflow Pattern
```tsx
// 1. Initialize workflow
const { state, actions } = useAttendanceWorkflow({ classId, teacherId })

// 2. Open session
await actions.openSession({ conteudo_programatico: '...' })

// 3. Mark attendance
for (const student of students) {
  await actions.markStudent(student.id, 'presente')
}

// 4. Close and lock
await actions.closeSession()
await actions.completeWorkflow()
```

### Compliance Verification Pattern
```tsx
// 1. Get audit trail
const { history, actions } = useAttendanceHistory({ sessionId })
await actions.loadSessionHistory(sessionId)

// 2. Generate audit report
const report = await actions.generateAuditReport(sessionId)

// 3. Check for violations
if (report.summary.hasComplianceIssues) {
  // Handle violations
}
```

### Lock Management Pattern
```tsx
const { lockingStatus, actions } = useAttendanceLocking({ sessionId, userId })

// Try to modify locked record
if (lockingStatus?.isLocked) {
  // Request unlock
  const permission = await actions.requestUnlock({
    reason: 'Correção de erro',
    justification: 'Dados incorretos na marcação'
  })

  // If approved, execute unlock
  if (permission.allowed) {
    await actions.executeUnlock()
  }
}
```

## See Also

- **Generic Hooks:** See `hooks/README.md` for UI and generic hooks
- **Domain Services:** See `lib/services/` for business logic
- **API Clients:** See `lib/api/` for server communication
- **Database Schema:** See `supabase/migrations/` for schema details
- **CLAUDE.md:** Project documentation and guidelines
