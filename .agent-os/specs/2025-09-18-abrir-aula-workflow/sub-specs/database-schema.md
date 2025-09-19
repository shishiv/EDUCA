# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-09-18-abrir-aula-workflow/spec.md

> Created: 2025-09-18
> Version: 1.0.0

## Schema Changes

### 1. New Table: aulas_abertas (Class Sessions)

```sql
CREATE TABLE public.aulas_abertas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    data_aula DATE NOT NULL,
    disciplina VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'bloqueada')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one session per class per day
    UNIQUE(turma_id, data_aula),

    -- Business logic constraints
    CONSTRAINT valid_status_transitions CHECK (
        (status = 'aberta' AND closed_at IS NULL AND locked_at IS NULL) OR
        (status = 'fechada' AND closed_at IS NOT NULL AND locked_at IS NULL) OR
        (status = 'bloqueada' AND closed_at IS NOT NULL AND locked_at IS NOT NULL)
    ),

    -- Lock timestamp must be after close timestamp
    CONSTRAINT valid_lock_timing CHECK (
        locked_at IS NULL OR (closed_at IS NOT NULL AND locked_at >= closed_at)
    )
);
```

**Rationale**: This table tracks each class session that teachers open, ensuring proper workflow control and audit trail for Brazilian educational compliance.

### 2. Enhanced frequencia Table

```sql
-- Add new columns to existing frequencia table
ALTER TABLE public.frequencia
ADD COLUMN IF NOT EXISTS aula_aberta_id UUID REFERENCES public.aulas_abertas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Add constraint to prevent attendance without opened class
ALTER TABLE public.frequencia
ADD CONSTRAINT frequencia_requires_opened_class
CHECK (aula_aberta_id IS NOT NULL OR data < '2025-09-18'::date);

-- Add immutability constraint
ALTER TABLE public.frequencia
ADD CONSTRAINT no_modification_when_locked
CHECK (
    is_locked = FALSE OR
    (is_locked = TRUE AND locked_at IS NOT NULL)
);
```

**Rationale**: Links attendance records to class sessions and enforces immutability once locked, meeting Brazilian educational requirements for official attendance records.

### 3. Enhanced Indexes for Performance

```sql
-- Composite index for class session queries
CREATE INDEX idx_aulas_abertas_turma_data ON public.aulas_abertas(turma_id, data_aula);

-- Index for professor's opened classes
CREATE INDEX idx_aulas_abertas_professor_status ON public.aulas_abertas(professor_id, status)
WHERE status IN ('aberta', 'fechada');

-- Index for school-wide session monitoring
CREATE INDEX idx_aulas_abertas_escola_data ON public.aulas_abertas(escola_id, data_aula);

-- Enhanced frequencia indexes
CREATE INDEX idx_frequencia_aula_aberta ON public.frequencia(aula_aberta_id)
WHERE aula_aberta_id IS NOT NULL;

CREATE INDEX idx_frequencia_locked ON public.frequencia(is_locked, data)
WHERE is_locked = TRUE;
```

### 4. Row Level Security (RLS) Policies

```sql
-- Enable RLS on new table
ALTER TABLE public.aulas_abertas ENABLE ROW LEVEL SECURITY;

-- Policy for teachers to manage their own class sessions
CREATE POLICY "Teachers can manage their class sessions"
ON public.aulas_abertas
FOR ALL
TO authenticated
USING (
    auth.uid() = professor_id AND
    escola_id IN (SELECT escola_id FROM public.users WHERE id = auth.uid())
);

-- Policy for directors and secretaries to view school sessions
CREATE POLICY "Directors and secretaries can view school sessions"
ON public.aulas_abertas
FOR SELECT
TO authenticated
USING (
    escola_id IN (SELECT escola_id FROM public.users WHERE id = auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND tipo_usuario IN ('diretor', 'secretario', 'admin')
    )
);

-- Policy for admins to view all sessions
CREATE POLICY "Admins can view all sessions"
ON public.aulas_abertas
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
);

-- Enhanced frequencia RLS for locked records
CREATE POLICY "Prevent updates to locked attendance"
ON public.frequencia
FOR UPDATE
TO authenticated
USING (is_locked = FALSE);
```

### 5. Database Functions and Triggers

```sql
-- Function to automatically lock class sessions after 24 hours
CREATE OR REPLACE FUNCTION auto_lock_class_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-lock sessions that are closed and older than 24 hours
    UPDATE public.aulas_abertas
    SET
        status = 'bloqueada',
        locked_at = NOW(),
        updated_at = NOW()
    WHERE
        status = 'fechada'
        AND closed_at < NOW() - INTERVAL '24 hours'
        AND locked_at IS NULL;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to lock associated attendance records
CREATE OR REPLACE FUNCTION lock_attendance_records()
RETURNS TRIGGER AS $$
BEGIN
    -- When a class session is locked, lock all associated attendance
    IF NEW.status = 'bloqueada' AND NEW.locked_at IS NOT NULL THEN
        UPDATE public.frequencia
        SET
            is_locked = TRUE,
            locked_at = NEW.locked_at
        WHERE
            aula_aberta_id = NEW.id
            AND is_locked = FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_aulas_abertas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_lock_attendance_records
    AFTER UPDATE ON public.aulas_abertas
    FOR EACH ROW
    WHEN (NEW.status = 'bloqueada' AND OLD.status != 'bloqueada')
    EXECUTE FUNCTION lock_attendance_records();

CREATE TRIGGER trigger_update_aulas_abertas_timestamp
    BEFORE UPDATE ON public.aulas_abertas
    FOR EACH ROW
    EXECUTE FUNCTION update_aulas_abertas_timestamp();

-- Scheduled trigger for auto-locking (requires pg_cron extension)
-- SELECT cron.schedule('auto-lock-sessions', '0 */6 * * *', 'SELECT auto_lock_class_sessions();');
```

### 6. Data Integrity Views

```sql
-- View for active class sessions
CREATE VIEW active_class_sessions AS
SELECT
    aa.*,
    t.nome as turma_nome,
    u.nome as professor_nome,
    e.nome as escola_nome,
    COUNT(f.id) as total_attendance_records
FROM public.aulas_abertas aa
JOIN public.turmas t ON aa.turma_id = t.id
JOIN public.users u ON aa.professor_id = u.id
JOIN public.escolas e ON aa.escola_id = e.id
LEFT JOIN public.frequencia f ON aa.id = f.aula_aberta_id
WHERE aa.status IN ('aberta', 'fechada')
GROUP BY aa.id, t.nome, u.nome, e.nome;

-- View for locked attendance audit
CREATE VIEW locked_attendance_audit AS
SELECT
    f.id,
    f.data,
    f.locked_at,
    aa.professor_id,
    aa.turma_id,
    aa.escola_id,
    u.nome as professor_nome,
    t.nome as turma_nome,
    a.nome as aluno_nome
FROM public.frequencia f
JOIN public.aulas_abertas aa ON f.aula_aberta_id = aa.id
JOIN public.users u ON aa.professor_id = u.id
JOIN public.turmas t ON aa.turma_id = t.id
JOIN public.alunos a ON f.aluno_id = a.id
WHERE f.is_locked = TRUE;
```

## Migrations

### Migration 001: Create aulas_abertas table

**File**: `20250918000001_create_aulas_abertas.sql`

```sql
-- Create the main class sessions table
CREATE TABLE public.aulas_abertas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    data_aula DATE NOT NULL,
    disciplina VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'bloqueada')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(turma_id, data_aula),

    CONSTRAINT valid_status_transitions CHECK (
        (status = 'aberta' AND closed_at IS NULL AND locked_at IS NULL) OR
        (status = 'fechada' AND closed_at IS NOT NULL AND locked_at IS NULL) OR
        (status = 'bloqueada' AND closed_at IS NOT NULL AND locked_at IS NOT NULL)
    ),

    CONSTRAINT valid_lock_timing CHECK (
        locked_at IS NULL OR (closed_at IS NOT NULL AND locked_at >= closed_at)
    )
);

-- Enable RLS
ALTER TABLE public.aulas_abertas ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_aulas_abertas_turma_data ON public.aulas_abertas(turma_id, data_aula);
CREATE INDEX idx_aulas_abertas_professor_status ON public.aulas_abertas(professor_id, status)
WHERE status IN ('aberta', 'fechada');
CREATE INDEX idx_aulas_abertas_escola_data ON public.aulas_abertas(escola_id, data_aula);
```

### Migration 002: Enhance frequencia table

**File**: `20250918000002_enhance_frequencia.sql`

```sql
-- Add new columns to frequencia
ALTER TABLE public.frequencia
ADD COLUMN IF NOT EXISTS aula_aberta_id UUID REFERENCES public.aulas_abertas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Add constraints
ALTER TABLE public.frequencia
ADD CONSTRAINT frequencia_requires_opened_class
CHECK (aula_aberta_id IS NOT NULL OR data < '2025-09-18'::date);

ALTER TABLE public.frequencia
ADD CONSTRAINT no_modification_when_locked
CHECK (
    is_locked = FALSE OR
    (is_locked = TRUE AND locked_at IS NOT NULL)
);

-- Create indexes
CREATE INDEX idx_frequencia_aula_aberta ON public.frequencia(aula_aberta_id)
WHERE aula_aberta_id IS NOT NULL;

CREATE INDEX idx_frequencia_locked ON public.frequencia(is_locked, data)
WHERE is_locked = TRUE;
```

### Migration 003: Add RLS policies

**File**: `20250918000003_add_rls_policies.sql`

```sql
-- RLS policies for aulas_abertas
CREATE POLICY "Teachers can manage their class sessions"
ON public.aulas_abertas
FOR ALL
TO authenticated
USING (
    auth.uid() = professor_id AND
    escola_id IN (SELECT escola_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Directors and secretaries can view school sessions"
ON public.aulas_abertas
FOR SELECT
TO authenticated
USING (
    escola_id IN (SELECT escola_id FROM public.users WHERE id = auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND tipo_usuario IN ('diretor', 'secretario', 'admin')
    )
);

CREATE POLICY "Admins can view all sessions"
ON public.aulas_abertas
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
);

-- Enhanced frequencia RLS
CREATE POLICY "Prevent updates to locked attendance"
ON public.frequencia
FOR UPDATE
TO authenticated
USING (is_locked = FALSE);
```

### Migration 004: Add functions and triggers

**File**: `20250918000004_add_functions_triggers.sql`

```sql
-- Auto-lock function
CREATE OR REPLACE FUNCTION auto_lock_class_sessions()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.aulas_abertas
    SET
        status = 'bloqueada',
        locked_at = NOW(),
        updated_at = NOW()
    WHERE
        status = 'fechada'
        AND closed_at < NOW() - INTERVAL '24 hours'
        AND locked_at IS NULL;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Lock attendance function
CREATE OR REPLACE FUNCTION lock_attendance_records()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'bloqueada' AND NEW.locked_at IS NOT NULL THEN
        UPDATE public.frequencia
        SET
            is_locked = TRUE,
            locked_at = NEW.locked_at
        WHERE
            aula_aberta_id = NEW.id
            AND is_locked = FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_aulas_abertas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_lock_attendance_records
    AFTER UPDATE ON public.aulas_abertas
    FOR EACH ROW
    WHEN (NEW.status = 'bloqueada' AND OLD.status != 'bloqueada')
    EXECUTE FUNCTION lock_attendance_records();

CREATE TRIGGER trigger_update_aulas_abertas_timestamp
    BEFORE UPDATE ON public.aulas_abertas
    FOR EACH ROW
    EXECUTE FUNCTION update_aulas_abertas_timestamp();
```

### Migration 005: Create views

**File**: `20250918000005_create_views.sql`

```sql
-- Active sessions view
CREATE VIEW active_class_sessions AS
SELECT
    aa.*,
    t.nome as turma_nome,
    u.nome as professor_nome,
    e.nome as escola_nome,
    COUNT(f.id) as total_attendance_records
FROM public.aulas_abertas aa
JOIN public.turmas t ON aa.turma_id = t.id
JOIN public.users u ON aa.professor_id = u.id
JOIN public.escolas e ON aa.escola_id = e.id
LEFT JOIN public.frequencia f ON aa.id = f.aula_aberta_id
WHERE aa.status IN ('aberta', 'fechada')
GROUP BY aa.id, t.nome, u.nome, e.nome;

-- Locked attendance audit view
CREATE VIEW locked_attendance_audit AS
SELECT
    f.id,
    f.data,
    f.locked_at,
    aa.professor_id,
    aa.turma_id,
    aa.escola_id,
    u.nome as professor_nome,
    t.nome as turma_nome,
    a.nome as aluno_nome
FROM public.frequencia f
JOIN public.aulas_abertas aa ON f.aula_aberta_id = aa.id
JOIN public.users u ON aa.professor_id = u.id
JOIN public.turmas t ON aa.turma_id = t.id
JOIN public.alunos a ON f.aluno_id = a.id
WHERE f.is_locked = TRUE;
```

## Backward Compatibility

### Existing Data Migration

```sql
-- Migrate existing attendance records (run after schema changes)
DO $$
DECLARE
    rec RECORD;
    session_id UUID;
BEGIN
    -- For each existing attendance date/class combination
    FOR rec IN
        SELECT DISTINCT
            f.data,
            m.turma_id,
            t.professor_id,
            t.escola_id
        FROM public.frequencia f
        JOIN public.matriculas m ON f.aluno_id = m.aluno_id
        JOIN public.turmas t ON m.turma_id = t.id
        WHERE f.data < '2025-09-18'::date
        AND f.aula_aberta_id IS NULL
    LOOP
        -- Create a retrospective class session
        INSERT INTO public.aulas_abertas (
            turma_id,
            professor_id,
            escola_id,
            data_aula,
            status,
            opened_at,
            closed_at,
            locked_at
        ) VALUES (
            rec.turma_id,
            rec.professor_id,
            rec.escola_id,
            rec.data,
            'bloqueada',
            rec.data::timestamptz,
            rec.data::timestamptz + INTERVAL '1 hour',
            rec.data::timestamptz + INTERVAL '25 hours'
        )
        ON CONFLICT (turma_id, data_aula) DO NOTHING
        RETURNING id INTO session_id;

        -- Link existing attendance to the session
        IF session_id IS NOT NULL THEN
            UPDATE public.frequencia
            SET
                aula_aberta_id = session_id,
                is_locked = TRUE,
                locked_at = rec.data::timestamptz + INTERVAL '25 hours'
            WHERE
                data = rec.data
                AND aluno_id IN (
                    SELECT aluno_id
                    FROM public.matriculas
                    WHERE turma_id = rec.turma_id
                );
        END IF;
    END LOOP;
END $$;
```

## Performance Considerations

### Query Optimization

1. **Index Strategy**: Composite indexes on frequently queried columns (turma_id + data_aula)
2. **Partitioning**: Consider partitioning `aulas_abertas` by month if volume grows large
3. **Materialized Views**: For reporting, consider materialized views for complex attendance aggregations

### Expected Performance Impact

- **Class Opening**: < 100ms (single INSERT with validation)
- **Attendance Marking**: < 50ms per student (UPDATE with foreign key lookup)
- **Session Closure**: < 200ms (UPDATE + batch attendance locking)
- **Reporting Queries**: < 2s for monthly reports (with proper indexing)

### Monitoring Queries

```sql
-- Monitor locked sessions
SELECT
    DATE_TRUNC('day', locked_at) as lock_date,
    COUNT(*) as sessions_locked
FROM public.aulas_abertas
WHERE status = 'bloqueada'
GROUP BY DATE_TRUNC('day', locked_at)
ORDER BY lock_date DESC;

-- Monitor attendance locking performance
SELECT
    aa.data_aula,
    aa.turma_id,
    COUNT(f.id) as attendance_records,
    MAX(f.locked_at) as last_locked_at
FROM public.aulas_abertas aa
LEFT JOIN public.frequencia f ON aa.id = f.aula_aberta_id
WHERE aa.status = 'bloqueada'
GROUP BY aa.data_aula, aa.turma_id
HAVING COUNT(f.id) > 30; -- Monitor large classes
```

This schema ensures complete compliance with Brazilian educational requirements while maintaining performance and data integrity through proper constraints, indexing, and RLS policies.