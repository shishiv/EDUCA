# Supabase Style Guide

## Client Configuration

### Supabase Client Setup
Always use properly typed Supabase client:

```typescript
// ✅ lib/supabase.ts - Client-side
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

export const supabase = createClientComponentClient<Database>()

// ✅ lib/supabase-server.ts - Server-side
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export const createServerSupabaseClient = () => {
  return createServerComponentClient<Database>({ cookies })
}

// ✅ lib/supabase-admin.ts - Admin operations
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Environment Variables
Required environment configuration:

```bash
# ✅ Required Supabase environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key

# Optional for local development
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres
```

## Row Level Security (RLS) Patterns

### School-Based Multi-Tenancy
Implement strict school-based data isolation:

```sql
-- ✅ RLS Policy for students table
CREATE POLICY "Students isolated by school"
ON alunos
FOR ALL
USING (
  escola_id IN (
    SELECT escola_id
    FROM user_escola_access
    WHERE user_id = auth.uid()
  )
);

-- ✅ RLS Policy for attendance records
CREATE POLICY "Attendance records school isolation"
ON frequencia
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM alunos a
    JOIN turmas t ON a.turma_id = t.id
    WHERE a.id = frequencia.aluno_id
    AND t.escola_id IN (
      SELECT escola_id
      FROM user_escola_access
      WHERE user_id = auth.uid()
    )
  )
);

-- ✅ Teacher-specific RLS for attendance marking
CREATE POLICY "Teachers can only mark attendance for their classes"
ON frequencia
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM turmas t
    WHERE t.id = (
      SELECT turma_id FROM alunos
      WHERE id = frequencia.aluno_id
    )
    AND t.professor_id = auth.uid()
  )
);
```

### Role-Based Policies
Implement 5-role RBAC system:

```sql
-- ✅ Role-based RLS policies
-- Admin: Full access to all schools
CREATE POLICY "Admins have full access"
ON alunos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Director: Access to their school only
CREATE POLICY "Directors access their school"
ON alunos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_escola_access uea ON up.id = uea.user_id
    WHERE up.id = auth.uid()
    AND up.role = 'diretor'
    AND uea.escola_id = alunos.escola_id
  )
);

-- Teacher: Access to their students only
CREATE POLICY "Teachers access their students"
ON alunos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM turmas t
    WHERE t.id = alunos.turma_id
    AND t.professor_id = auth.uid()
  )
);
```

## Database Operations

### Query Patterns
Use consistent and secure query patterns:

```typescript
// ✅ Server Component queries
export async function getStudentsByClass(turmaId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alunos')
    .select(`
      id,
      nome,
      cpf,
      situacao,
      turma:turmas(id, nome)
    `)
    .eq('turma_id', turmaId)
    .eq('situacao', 'ativo')
    .order('nome')

  if (error) {
    throw new EducationalError(
      'Failed to fetch students',
      'STUDENT_FETCH_ERROR',
      { turmaId, error: error.message }
    )
  }

  return data
}

// ✅ Client Component queries with React Query
export function useStudents(turmaId: string) {
  return useQuery({
    queryKey: ['students', turmaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alunos')
        .select('id, nome, cpf, situacao')
        .eq('turma_id', turmaId)
        .eq('situacao', 'ativo')

      if (error) throw error
      return data
    },
    enabled: !!turmaId,
  })
}
```

### Insert Operations
Implement secure data insertion with validation:

```typescript
// ✅ Student creation with validation
export async function createStudent(studentData: StudentInsert) {
  const supabase = createServerSupabaseClient()

  // Validate CPF uniqueness
  const { data: existingStudent } = await supabase
    .from('alunos')
    .select('id')
    .eq('cpf', studentData.cpf)
    .single()

  if (existingStudent) {
    throw new EducationalError(
      'CPF já cadastrado no sistema',
      'DUPLICATE_CPF',
      { cpf: studentData.cpf }
    )
  }

  // Insert with audit trail
  const { data, error } = await supabase
    .from('alunos')
    .insert({
      ...studentData,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new EducationalError(
      'Erro ao criar aluno',
      'STUDENT_CREATION_ERROR',
      { error: error.message }
    )
  }

  return data
}
```

### Update Operations with Audit Trail
Implement updates with complete audit tracking:

```typescript
// ✅ Student update with audit trail
export async function updateStudent(
  studentId: string,
  updates: StudentUpdate
) {
  const supabase = createServerSupabaseClient()
  const userId = (await supabase.auth.getUser()).data.user?.id

  // Get original data for audit
  const { data: originalData } = await supabase
    .from('alunos')
    .select('*')
    .eq('id', studentId)
    .single()

  if (!originalData) {
    throw new EducationalError(
      'Aluno não encontrado',
      'STUDENT_NOT_FOUND',
      { studentId }
    )
  }

  // Update student
  const { data, error } = await supabase
    .from('alunos')
    .update({
      ...updates,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId)
    .select()
    .single()

  if (error) {
    throw new EducationalError(
      'Erro ao atualizar aluno',
      'STUDENT_UPDATE_ERROR',
      { error: error.message }
    )
  }

  // Create audit log
  await supabase
    .from('audit_log')
    .insert({
      table_name: 'alunos',
      record_id: studentId,
      action: 'UPDATE',
      old_values: originalData,
      new_values: data,
      user_id: userId,
      timestamp: new Date().toISOString(),
    })

  return data
}
```

## Real-time Subscriptions

### Attendance Real-time Updates
Implement real-time attendance tracking:

```typescript
// ✅ Real-time attendance subscription
export function useAttendanceRealtime(sessionId: string) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    const channel = supabase
      .channel(`attendance-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'frequencia',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAttendanceRecords(prev => [...prev, payload.new as AttendanceRecord])
          } else if (payload.eventType === 'UPDATE') {
            setAttendanceRecords(prev =>
              prev.map(record =>
                record.id === payload.new.id ? payload.new as AttendanceRecord : record
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return attendanceRecords
}
```

### Live User Presence
Track active teachers in classes:

```typescript
// ✅ Teacher presence tracking
export function useTeacherPresence(turmaId: string) {
  const [activeTeachers, setActiveTeachers] = useState<string[]>([])

  useEffect(() => {
    const channel = supabase
      .channel(`class-${turmaId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        const teachers = Object.keys(presenceState)
        setActiveTeachers(teachers)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const user = await supabase.auth.getUser()
          if (user.data.user) {
            await channel.track({
              user_id: user.data.user.id,
              timestamp: new Date().toISOString(),
            })
          }
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [turmaId])

  return activeTeachers
}
```

## Authentication Patterns

### User Session Management
Handle authentication state properly:

```typescript
// ✅ Auth state management
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle educational domain logic
        if (event === 'SIGNED_IN' && session?.user) {
          // Initialize user educational context
          initializeEducationalContext(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          // Clear educational context
          clearEducationalContext()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

### Role-based Route Protection
Implement educational role-based access:

```typescript
// ✅ Role-based route protection
export async function requireRole(requiredRoles: UserRole[]) {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, escola_id')
    .eq('id', user.id)
    .single()

  if (!profile || !requiredRoles.includes(profile.role)) {
    throw new EducationalError(
      'Acesso negado para esta funcionalidade',
      'UNAUTHORIZED_ACCESS',
      { userRole: profile?.role, requiredRoles }
    )
  }

  return { user, profile }
}

// Usage in Server Components
export default async function AttendancePage() {
  const { user, profile } = await requireRole(['professor', 'diretor'])

  // Page content
}
```

## Performance Optimization

### Database Indexes
Implement proper indexing for educational queries:

```sql
-- ✅ Essential indexes for performance
-- Student queries by class
CREATE INDEX idx_alunos_turma_situacao ON alunos(turma_id, situacao);

-- Attendance queries by date and class
CREATE INDEX idx_frequencia_turma_data ON frequencia(turma_id, data);

-- User school access
CREATE INDEX idx_user_escola_access_user_escola ON user_escola_access(user_id, escola_id);

-- Audit log queries
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id, timestamp);

-- CPF uniqueness
CREATE UNIQUE INDEX idx_alunos_cpf_unique ON alunos(cpf) WHERE situacao = 'ativo';
```

### Query Optimization
Use efficient query patterns:

```typescript
// ✅ Optimized attendance query
export async function getClassAttendance(turmaId: string, date: Date) {
  const supabase = createServerSupabaseClient()
  const dateStr = date.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('alunos')
    .select(`
      id,
      nome,
      frequencia!left(presente, observacao)
    `)
    .eq('turma_id', turmaId)
    .eq('situacao', 'ativo')
    .eq('frequencia.data', dateStr)
    .order('nome')

  if (error) throw error
  return data
}

// ✅ Efficient pagination
export async function getStudentsPaginated(
  page: number = 1,
  pageSize: number = 20,
  filters?: StudentFilters
) {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('alunos')
    .select('*', { count: 'exact' })
    .range((page - 1) * pageSize, page * pageSize - 1)
    .order('nome')

  if (filters?.escola_id) {
    query = query.eq('escola_id', filters.escola_id)
  }

  if (filters?.situacao) {
    query = query.eq('situacao', filters.situacao)
  }

  const { data, error, count } = await query

  if (error) throw error

  return {
    data,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  }
}
```

## Brazilian Educational Compliance

### Immutable Attendance Records
Implement "não existe o esquecer" principle:

```typescript
// ✅ Attendance immutability enforcement
export async function markAttendance(
  attendanceData: AttendanceInsert
): Promise<AttendanceRecord> {
  const supabase = createServerSupabaseClient()

  // Check if attendance already exists and is locked
  const { data: existingRecord } = await supabase
    .from('frequencia')
    .select('id, locked, lock_reason')
    .eq('aluno_id', attendanceData.aluno_id)
    .eq('data', attendanceData.data)
    .single()

  if (existingRecord?.locked) {
    throw new EducationalError(
      'Presença já foi confirmada e não pode ser alterada (não existe o esquecer)',
      'RETROACTIVE_ATTENDANCE_FORBIDDEN',
      {
        existingRecordId: existingRecord.id,
        lockReason: existingRecord.lock_reason
      }
    )
  }

  // Insert or update attendance
  const { data, error } = await supabase
    .from('frequencia')
    .upsert({
      ...attendanceData,
      locked: false, // Will be locked when session closes
      registered_by: (await supabase.auth.getUser()).data.user?.id,
      registered_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new EducationalError(
      'Erro ao registrar presença',
      'ATTENDANCE_REGISTRATION_ERROR',
      { error: error.message }
    )
  }

  return data
}

// ✅ Lock attendance session (implements immutability)
export async function lockAttendanceSession(sessionId: string) {
  const supabase = createServerSupabaseClient()

  // Lock all attendance records for this session
  const { error } = await supabase
    .from('frequencia')
    .update({
      locked: true,
      lock_reason: 'Sessão de aula finalizada',
      locked_at: new Date().toISOString(),
      locked_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .eq('session_id', sessionId)

  if (error) {
    throw new EducationalError(
      'Erro ao finalizar sessão de presença',
      'SESSION_LOCK_ERROR',
      { error: error.message }
    )
  }

  // Update session status
  await supabase
    .from('sessoes_aula')
    .update({
      status: 'fechada',
      horario_fechamento: new Date().toISOString(),
    })
    .eq('id', sessionId)
}
```

Remember: Always prioritize data integrity, Brazilian educational compliance, and proper audit trails in all Supabase operations.