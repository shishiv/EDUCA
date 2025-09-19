# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-18-abrir-aula-workflow/spec.md

> Created: 2025-09-18
> Version: 1.0.0

## Technical Requirements

### Frontend Architecture

#### Next.js 15.5.3 App Router Implementation
- **Route Structure:**
  ```
  app/
  ├── (authenticated)/
  │   ├── professor/
  │   │   ├── classes/
  │   │   │   ├── [classId]/
  │   │   │   │   ├── page.tsx          # Class overview with "Abrir Aula" button
  │   │   │   │   ├── attendance/
  │   │   │   │   │   └── page.tsx      # Active attendance marking interface
  │   │   │   │   └── components/
  │   │   │   │       ├── ClassHeader.tsx
  │   │   │   │       ├── AttendanceGrid.tsx
  │   │   │   │       └── TimeLockIndicator.tsx
  │   │   │   └── page.tsx              # Assigned classes list
  │   │   └── dashboard/
  │   │       └── page.tsx              # Enhanced professor dashboard
  ```

- **Server Components:** Use for initial data fetching and SEO optimization
- **Client Components:** Required for real-time interactions and form handling
- **Middleware:** Extend existing auth middleware to validate professor-class assignments

#### React Hook Form + Zod Validation
- **Attendance Form Schema:**
  ```typescript
  const attendanceSchema = z.object({
    classSessionId: z.string().uuid(),
    attendanceRecords: z.array(z.object({
      studentId: z.string().uuid(),
      matriculaId: z.string().uuid(),
      isPresent: z.boolean(),
      timestamp: z.date()
    })),
    sessionOpenedAt: z.date(),
    submittedAt: z.date().optional()
  });
  ```

- **Validation Rules:**
  - All enrolled students must have attendance status
  - Session must be opened before attendance submission
  - Time-lock validation for edit attempts
  - Mobile input validation for touch interfaces

#### Supabase Real-time Subscriptions
- **Class Session Status Channel:**
  ```typescript
  const classSessionChannel = supabase
    .channel(`class-session-${classId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'class_sessions',
      filter: `class_id=eq.${classId}`
    }, (payload) => {
      updateSessionStatus(payload.new);
    });
  ```

- **Live Attendance Updates:** Real-time synchronization for collaborative attendance marking
- **Lock Status Broadcasting:** Notify all connected clients when time-lock activates

#### Mobile-First Responsive Design
- **Breakpoints:**
  - Mobile: 375px - 767px (primary teacher phone interface)
  - Tablet: 768px - 1023px (classroom tablet interface)
  - Desktop: 1024px+ (administrative oversight)

- **Touch Optimization:**
  - Minimum touch target: 44px x 44px
  - Swipe gestures for student navigation
  - Haptic feedback simulation via vibration API
  - Large checkbox interfaces with visual feedback

- **Performance Targets:**
  - First Contentful Paint: < 2s on 3G networks
  - Attendance marking response: < 1s per student
  - Class session opening: < 2s total workflow

### Backend Integration

#### Time-Lock Mechanism Implementation
- **Database-Level Constraints:**
  ```sql
  -- Add time-lock columns to frequencia table
  ALTER TABLE frequencia
  ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN lock_timeout_minutes INTEGER DEFAULT 15,
  ADD COLUMN is_locked BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN locked_at IS NULL THEN FALSE
      WHEN NOW() > (locked_at + INTERVAL '1 minute' * lock_timeout_minutes) THEN TRUE
      ELSE FALSE
    END
  ) STORED;
  ```

- **Application-Level Logic:**
  - Configurable timeout (default: 15 minutes)
  - Automatic background job to finalize locks
  - Emergency unlock capability for authorized administrators
  - Audit trail for all lock/unlock operations

#### Gestao Fronteira Database Integration
- **Enhanced Tables:**
  ```sql
  -- New class_sessions table for workflow tracking
  CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID REFERENCES turmas(id),
    professor_id UUID REFERENCES users(id),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) CHECK (status IN ('opened', 'active', 'locked', 'closed')),
    escola_id UUID REFERENCES escolas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **Modified Frequency Table:**
  - Add `class_session_id` foreign key
  - Implement time-lock columns
  - Add audit trail columns

#### Row Level Security (RLS) Enhancement
- **Professor Class Access Policy:**
  ```sql
  CREATE POLICY "Professors can only access their assigned classes"
    ON class_sessions FOR ALL
    TO authenticated
    USING (
      professor_id = auth.uid()
      AND escola_id IN (
        SELECT escola_id FROM users WHERE id = auth.uid()
      )
    );
  ```

- **Attendance Record Protection:**
  ```sql
  CREATE POLICY "Locked attendance records are read-only"
    ON frequencia FOR UPDATE
    TO authenticated
    USING (NOT is_locked);
  ```

#### TypeScript Integration
- **Generated Types:** Extend existing Supabase type generation
- **Custom Types:**
  ```typescript
  interface ClassSession {
    id: string;
    turma_id: string;
    professor_id: string;
    opened_at: string;
    closed_at?: string;
    status: 'opened' | 'active' | 'locked' | 'closed';
    escola_id: string;
    attendanceRecords?: AttendanceRecord[];
  }

  interface AttendanceRecord {
    id: string;
    student_id: string;
    matricula_id: string;
    class_session_id: string;
    is_present: boolean;
    marked_at: string;
    is_locked: boolean;
    locked_at?: string;
  }
  ```

#### shadcn/ui Component Integration
- **Enhanced Components:**
  - `<Button variant="destructive">` for "Abrir Aula" primary action
  - `<Checkbox>` with custom styling for attendance marking
  - `<Badge>` for attendance status indicators
  - `<Progress>` for time-lock countdown
  - `<Alert>` for compliance notifications

- **Custom Components:**
  - `<AttendanceGrid>` - Mobile-optimized student attendance interface
  - `<ClassSessionHeader>` - Session status and controls
  - `<TimeLockIndicator>` - Visual countdown for submission deadline
  - `<AttendanceStats>` - Real-time attendance percentage display

### State Management Architecture

#### Zustand Store Structure
```typescript
interface AttendanceStore {
  // Session State
  currentSession: ClassSession | null;
  sessionStatus: 'idle' | 'opening' | 'active' | 'locking' | 'locked';

  // Attendance State
  attendanceRecords: Record<string, AttendanceRecord>;
  pendingChanges: boolean;

  // UI State
  selectedStudents: string[];
  showLockWarning: boolean;
  timeRemaining: number;

  // Actions
  openClassSession: (classId: string) => Promise<void>;
  markAttendance: (studentId: string, present: boolean) => void;
  submitAttendance: () => Promise<void>;
  startLockCountdown: () => void;
}
```

#### TanStack Query Integration
- **Key Patterns:**
  ```typescript
  // Class sessions
  ['class-sessions', professorId]
  ['class-session', sessionId]

  // Attendance records
  ['attendance', sessionId]
  ['student-attendance', studentId, dateRange]
  ```

- **Optimistic Updates:** Immediate UI feedback for attendance marking
- **Background Sync:** Automatic retry for failed submissions
- **Cache Invalidation:** Smart invalidation on session status changes

### Performance Optimizations

#### Client-Side Optimizations
- **Code Splitting:** Dynamic imports for attendance interface
- **Image Optimization:** Student photos with Next.js Image component
- **Virtual Scrolling:** For large class sizes (>50 students)
- **Service Worker:** Offline capability for attendance marking

#### Database Optimizations
- **Indexes:** Optimized for professor-class-date queries
- **Connection Pooling:** Supabase connection optimization
- **Prepared Statements:** Reduce query parsing overhead
- **Batch Operations:** Single transaction for attendance submission

### Security Considerations

#### Authentication Flow
- **JWT Validation:** Verify professor role and school assignment
- **Session Security:** Secure class session token generation
- **CSRF Protection:** Double-submit cookie pattern for forms
- **Rate Limiting:** Prevent attendance manipulation attacks

#### Data Protection
- **Encryption:** Sensitive data encrypted at rest in Supabase
- **Audit Logging:** Complete trail of attendance modifications
- **Input Sanitization:** XSS prevention for all user inputs
- **GDPR Compliance:** Data anonymization capabilities

### Monitoring and Observability

#### Key Metrics
- **Performance:** Attendance marking latency per student
- **Reliability:** Session opening success rate
- **Usage:** Daily active teachers and attendance submissions
- **Compliance:** Time-lock activation rates and audit trail completeness

#### Error Tracking
- **Client-side:** React Error Boundaries with reporting
- **Server-side:** Database constraint violation monitoring
- **Network:** Offline detection and queue management
- **User Experience:** Form validation error patterns

## Approach

### Phase 1: Core Infrastructure (Week 1)
1. **Database Schema Updates**
   - Create `class_sessions` table with proper constraints
   - Add time-lock columns to `frequencia` table
   - Implement enhanced RLS policies

2. **Authentication Enhancement**
   - Extend middleware for professor-class validation
   - Create session management utilities
   - Implement time-lock verification functions

### Phase 2: Frontend Implementation (Week 2)
1. **Route Structure**
   - Create Next.js 15.5.3 App Router pages
   - Implement server and client component architecture
   - Add middleware for route protection

2. **Core Components**
   - Build `AttendanceGrid` with mobile optimization
   - Create `ClassSessionHeader` with status management
   - Implement `TimeLockIndicator` with countdown

### Phase 3: Real-time Features (Week 3)
1. **Supabase Integration**
   - Configure real-time subscriptions
   - Implement optimistic updates
   - Add offline capability

2. **State Management**
   - Configure Zustand stores
   - Setup TanStack Query patterns
   - Implement background synchronization

### Phase 4: Testing and Optimization (Week 4)
1. **Performance Testing**
   - Mobile performance optimization
   - Database query optimization
   - Load testing for concurrent usage

2. **Compliance Validation**
   - Audit trail completeness verification
   - Time-lock mechanism validation
   - Brazilian educational regulation compliance

### Integration Strategy

#### Leveraging Existing Components
- **AuthGuard:** Extend for professor role validation
- **Sidebar:** Add attendance workflow navigation
- **LoginForm:** No changes required
- **Database Schema:** Build upon existing 85% complete foundation

#### Migration Approach
- **Backward Compatibility:** Existing attendance data remains accessible
- **Gradual Rollout:** Teacher-by-teacher activation
- **Fallback Mechanism:** Emergency access to legacy attendance interface
- **Data Integrity:** Comprehensive validation during transition

This technical specification provides a comprehensive foundation for implementing the "Abrir Aula" workflow while maintaining the architectural integrity of the existing gestao_fronteira system and ensuring Brazilian educational compliance through robust time-locking mechanisms.