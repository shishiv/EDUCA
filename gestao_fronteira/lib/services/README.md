# Active Services

This directory contains core services actively used in the gestao_fronteira MVP. These services implement the three-phase attendance workflow with legal compliance enforcement.

---

## Quick Reference

| Service | Purpose | Status | Usage |
|---------|---------|--------|-------|
| `attendance-workflow.ts` | 3-phase workflow manager | Active | Hook integration |
| `attendance-locking.ts` | Session locking mechanism | Active | Hook integration |
| `attendance-immutability.ts` | Immutability enforcement | Active | API layer |
| `attendance-bulk-operations.ts` | Bulk marking operations | Active | Workflow integration |
| `index.ts` | Central exports | Active | Infrastructure |

---

## Core Architecture: Three-Phase Attendance Workflow

The Brazilian educational attendance system implements three distinct phases:

```
PREPARATION  ->  OPENING  ->  MARKING  ->  CLOSING  ->  COMPLETED
```

### Phase 1: PREPARATION
- Initial state before class starts
- Setup and validation

### Phase 2: OPENING (Abrir Aula)
- Teacher opens class session
- Records lesson plan content (`conteudo_programatico`)
- Optional: teaching method, resources, observations
- Transition: `openSession()`

### Phase 3: MARKING (Marcar Frequência)
- Teacher marks attendance for each student
- Status options: `presente`, `falta`, `justificada`, `atestado`
- Optional: per-student observations
- Bulk operations: mark all present, mark all absent, smart predictions
- Transition: `startMarking()`

### Phase 4: CLOSING (Fechar Aula)
- Session becomes immutable
- Legal hash generated for integrity
- Records cannot be modified after closing
- Enforces "não existe o esquecer" principle
- Transition: `closeSession()`

### Phase 5: COMPLETED
- Workflow finished
- Final state for completed sessions
- Transition: `completeWorkflow()`

---

## Service Details

### 1. attendance-workflow.ts

**Purpose**: Three-phase workflow state management
**Integration**: Used via `lib/hooks/use-attendance-workflow.ts`
**Key Class**: `AttendanceWorkflowManager`

#### Main API
```typescript
// Create workflow
const workflow = createAttendanceWorkflow(classId, teacherId, date)

// Phase transitions
await workflow.executeTransition('open_session')
await workflow.executeTransition('start_marking')
await workflow.executeTransition('close_session')
await workflow.executeTransition('complete_workflow')

// Attendance marking
await workflow.markStudentAttendance(studentId, status, observations)

// Bulk operations
await workflow.bulkMarkAttendance('all_present', excludeStudents)
await workflow.bulkMarkAttendance('all_absent', excludeStudents)
await workflow.bulkMarkAttendance('smart_prediction')

// State access
const state = workflow.getState()
const progress = workflow.getOverallProgress()
const actions = workflow.getAvailableActions()
```

#### State Structure
```typescript
WorkflowState {
  phase: WorkflowPhase
  sessionId?: string
  classId: string
  teacherId: string
  date: string

  openingData?: { /* lesson details */ }
  markingData?: { /* student attendance */ }
  closingData?: { /* closure details */ }

  started_at: string
  current_phase_started: string
  errors: string[]
  warnings: string[]
}
```

#### Integration Points
- `attendance-immutability.ts` - Enforce immutability after closing
- `attendance-bulk-operations.ts` - Handle bulk marking
- `lib/api/attendance.ts` - Database persistence
- `lib/hooks/use-attendance-workflow.ts` - React integration

---

### 2. attendance-locking.ts

**Purpose**: Session locking mechanism for legal compliance
**Integration**: Used via `lib/hooks/use-attendance-locking.ts`
**Key Object**: `attendanceLocking`

#### Main API
```typescript
// Lock/unlock session
await attendanceLocking.lockSession(sessionId, rules)
await attendanceLocking.unlockSession(sessionId, permission)

// Unlock requests (approval workflow)
await attendanceLocking.requestUnlock(sessionId, reason, requestedBy)
await attendanceLocking.approveUnlockRequest(requestId, approvedBy)
await attendanceLocking.rejectUnlockRequest(requestId, reason)

// Status checking
const status = await attendanceLocking.getSessionLockStatus(sessionId)
const isLocked = await attendanceLocking.isSessionLocked(sessionId)

// Time-based operations
await attendanceLocking.enforceTimeBasedLocking(sessionId, rules)
```

#### Locking Rules
```typescript
LockingRule {
  rule: 'immediate' | 'time_based' | 'role_based'
  enforceAfterMinutes?: number
  unlockableByRoles?: ('admin' | 'diretor' | 'secretario')[]
  requiresApproval?: boolean
  legalReference?: string
}
```

#### Status Tracking
```typescript
LockingStatus {
  isLocked: boolean
  lockedAt: string
  lockedUntil?: string
  lockedBy?: string
  unlockRequests: UnlockRequest[]
  legalHash: string
  complianceLevel: 'STRICT' | 'STANDARD' | 'FLEXIBLE'
}
```

#### Key Features
- Immediate locking (after phase closure)
- Time-based locking (e.g., locked after 48 hours)
- Role-based unlock permissions
- Unlock request workflow with approval
- Legal hash generation for integrity
- Compliance tracking

#### Legal Compliance
Implements "não existe o esquecer" principle:
- Attendance records cannot be modified after closure
- Only specific roles (admin, diretor) can unlock
- Unlock requires audit trail entry
- Legal documentation of all unlock actions

---

### 3. attendance-immutability.ts

**Purpose**: Immutability enforcement (legal requirement)
**Integration**: Used in `lib/api/attendance.ts`
**Key Object**: `attendanceImmutability`

#### Main API
```typescript
// Validate immutability
const violations = await attendanceImmutability.validateImmutability(sessionId)
const isImmutable = await attendanceImmutability.isImmutable(sessionId)

// Get immutability status
const status = await attendanceImmutability.getImmutabilityStatus(sessionId)

// Enforce rules
const canModify = await attendanceImmutability.canModifyAttendance(sessionId, recordId)

// Compliance checking
const compliance = await attendanceImmutability.checkComplianceViolations(sessionId)
```

#### Immutability Rules
- Records immutable after session closure
- Cannot modify `presente`, `falta`, `justificada`, `atestado`
- Can only add observations/notes
- Complete audit trail of any attempted modifications
- Legal hash prevents tampering

#### Immutability Status
```typescript
ImmutabilityStatus {
  isImmutable: boolean
  since: string
  violations: ImmutabilityViolation[]
  legalHash: string
  complianceScore: number
}

ImmutabilityViolation {
  type: 'illegal_modification_attempt' | 'after_closure' | 'unauthorized_access'
  timestamp: string
  userId: string
  details: string
  severity: 'critical' | 'high' | 'medium'
}
```

#### Legal Compliance
- "Único documento oficial" - attendance is the official legal document
- Cannot be modified after session closes
- Prevents retroactive attendance changes
- Audit trail proves integrity
- Complies with Brazilian educational law

---

### 4. attendance-bulk-operations.ts

**Purpose**: Bulk attendance marking with performance optimization
**Integration**: Used in workflow and performance tests
**Key Class**: `AttendanceBulkOperationsService`

#### Main API
```typescript
// Create bulk operations service
const bulkService = new AttendanceBulkOperationsService()

// Bulk marking
await bulkService.markAllPresent(sessionId, studentIds, excludeStudents)
await bulkService.markAllAbsent(sessionId, studentIds, excludeStudents)

// Smart predictions
await bulkService.predictAttendance(sessionId, studentIds, historicalData)

// Batch operations
await bulkService.batchUpdateAttendance(sessionId, updates)

// Performance tracking
const metrics = await bulkService.getPerformanceMetrics()
```

#### Operation Results
```typescript
BulkOperationResult {
  success: boolean
  operationId: string
  recordsProcessed: number
  recordsSucceeded: number
  recordsFailed: number
  startTime: string
  endTime: string
  duration: number // milliseconds
  performance: {
    recordsPerSecond: number
    averageTimePerRecord: number
    memoryUsed: number
  }
}
```

#### Bulk Marking Request
```typescript
BulkMarkingRequest {
  sessionId: string
  studentIds: string[]
  status: 'presente' | 'falta' | 'justificada' | 'atestado'
  bulkType: 'all_present' | 'all_absent' | 'selective'
  excludeStudents?: string[]
  reason?: string
}
```

#### Performance Optimization
- Batch database operations (reduces roundtrips)
- Optimized for large class sizes (30+ students)
- Rollback on partial failure
- Memory-efficient processing
- Progress tracking

#### Performance Targets
- Single attendance mark: <1 second
- Batch marking (30 students): <5 seconds
- Records per second: >6 students/second

---

## Usage Patterns

### In React Components

```typescript
import { useAttendanceWorkflow } from '@/lib/hooks/use-attendance-workflow'
import { useAttendanceLocking } from '@/lib/hooks/use-attendance-locking'

export function AttendanceComponent() {
  const workflow = useAttendanceWorkflow({
    classId: 'turma-123',
    teacherId: 'professor-456',
    date: new Date().toISOString().split('T')[0],
    autoSave: true,
    performanceTracking: true
  })

  const locking = useAttendanceLocking({
    sessionId: workflow.state?.sessionId,
    userRole: 'professor'
  })

  // Open session
  await workflow.actions.openSession({
    conteudo_programatico: 'Matemática - Frações',
    duracao_minutos: 50
  })

  // Mark students
  for (const student of students) {
    await workflow.actions.markStudent(student.id, 'presente')
  }

  // Close session (becomes immutable)
  await workflow.actions.closeSession()

  // Lock session
  if (locking.status?.isLocked) {
    // Session is locked, cannot modify
  }
}
```

### In API Routes

```typescript
import { attendanceImmutability } from '@/lib/services'
import { supabase } from '@/lib/supabase'

export async function updateAttendance(sessionId: string, recordId: string, updates: any) {
  // Check immutability before allowing modification
  const canModify = await attendanceImmutability.canModifyAttendance(sessionId, recordId)

  if (!canModify) {
    throw new Error('Session is closed and immutable')
  }

  // Proceed with update
  const { data, error } = await supabase
    .from('frequencia')
    .update(updates)
    .eq('id', recordId)
}
```

---

## Error Handling

All services follow consistent error handling:

```typescript
interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  details?: {
    code: string
    phase?: string
    severity: 'critical' | 'high' | 'medium' | 'low'
  }
}
```

Common error codes:
- `INVALID_PHASE_TRANSITION` - Workflow phase is invalid
- `SESSION_LOCKED` - Session is locked and immutable
- `IMMUTABILITY_VIOLATION` - Attempting to modify immutable record
- `INVALID_STATUS` - Invalid attendance status
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `DATABASE_ERROR` - Database operation failed

---

## Performance Monitoring

Services track performance metrics:

```typescript
interface PerformanceMetrics {
  sessionOpenTime: number      // ms to open session
  markingStartTime: number     // ms to start marking phase
  averageMarkingTime: number   // ms per student
  totalMarkingTime: number     // total marking phase time
  sessionCloseTime: number     // ms to close session
  overallDuration: number      // total workflow duration
  studentsPerMinute: number    // marking efficiency
}
```

Monitor against thresholds:
- **Dashboard Load**: <3 seconds
- **Attendance Mark**: <1 second per student
- **Bulk Operations**: <5 seconds for 30 students
- **Session Close**: <3 seconds

---

## Brazilian Compliance

All services enforce:

1. **"Não existe o esquecer"** - Immutability after closure
2. **"Único documento oficial"** - Attendance as legal document
3. **LGPD Compliance** - Data privacy and protection
4. **School Isolation** - Row-level security by school
5. **Role-Based Access** - 5-role RBAC system
6. **Audit Trail** - Complete change tracking
7. **Bolsa Família** - 80% attendance threshold tracking

---

## Debugging Guide

### Common Issues

**Workflow stuck in OPENING phase**
- Check `validateOpeningPrerequisites()`
- Ensure all required fields present
- Check database connectivity

**Immutability violations not enforced**
- Verify `attendanceImmutability` is called before updates
- Check `lib/api/attendance.ts` integration
- Validate RLS policies

**Bulk operations failing**
- Check student list validity
- Verify database batch operation limits
- Monitor performance metrics

---

## Testing

Services are tested with:
- **Unit tests**: Jest with Zod validation
- **Integration tests**: Database operations
- **E2E tests**: Playwright workflow tests
- **Performance tests**: Bulk operation benchmarks

Run tests:
```bash
pnpm test              # Unit tests
pnpm test:e2e          # E2E tests
pnpm test:coverage     # Coverage report
```

---

## Next Steps

1. For planned services, see `lib/services/planned/README.md`
2. For detailed analysis, see `SERVICES_ANALYSIS.md`
3. For known issues, see `BUGS-ANALYSIS.md`
4. For project roadmap, see `CLAUDE.md`

