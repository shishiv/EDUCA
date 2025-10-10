-- Fix DELETE RLS Policies for turmas and matriculas tables
-- Bug: Delete buttons not working because FOR ALL policies don't include DELETE operations
-- Solution: Add explicit DELETE policies with proper permission checks

-- ============================================================================
-- TURMAS DELETE POLICY
-- ============================================================================

-- Allow admins and directors to delete classes from their school
CREATE POLICY "turmas_delete_policy" ON turmas
    FOR DELETE
    USING (
        -- Admin users can delete any class
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario = 'admin'
            AND ativo = true
        )
        OR
        -- Directors can delete classes from their school
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'diretor'
            AND u.escola_id = turmas.escola_id
            AND u.ativo = true
        )
        OR
        -- Secretaries can delete classes from their school
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'secretario'
            AND u.escola_id = turmas.escola_id
            AND u.ativo = true
        )
    );

-- ============================================================================
-- MATRICULAS DELETE POLICY
-- ============================================================================

-- Allow admins and authorized staff to delete enrollments from their school
CREATE POLICY "matriculas_delete_policy" ON matriculas
    FOR DELETE
    USING (
        -- Admin users can delete any enrollment
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario = 'admin'
            AND ativo = true
        )
        OR
        -- Directors can delete enrollments from their school
        EXISTS (
            SELECT 1 FROM users u
            JOIN turmas t ON t.id = matriculas.turma_id
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'diretor'
            AND u.escola_id = t.escola_id
            AND u.ativo = true
        )
        OR
        -- Secretaries can delete enrollments from their school
        EXISTS (
            SELECT 1 FROM users u
            JOIN turmas t ON t.id = matriculas.turma_id
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'secretario'
            AND u.escola_id = t.escola_id
            AND u.ativo = true
        )
    );

-- ============================================================================
-- UPDATE EXISTING POLICIES TO BE EXPLICIT
-- ============================================================================

-- Drop and recreate the turmas_school_isolation policy to be explicit about operations
DROP POLICY IF EXISTS "turmas_school_isolation" ON turmas;

CREATE POLICY "turmas_school_isolation" ON turmas
    FOR SELECT
    USING (
        -- Admin users can see all classes
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario = 'admin'
        )
        OR
        -- Users can only see classes from their school
        escola_id = (SELECT escola_id FROM users WHERE id = auth.uid())
        OR
        -- Teachers can see classes they teach
        professor_id = auth.uid()
    );

-- Add INSERT policy for turmas
CREATE POLICY "turmas_insert_policy" ON turmas
    FOR INSERT
    WITH CHECK (
        -- Admin users can insert any class
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario = 'admin'
            AND ativo = true
        )
        OR
        -- Directors can insert classes in their school
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'diretor'
            AND u.escola_id = turmas.escola_id
            AND u.ativo = true
        )
        OR
        -- Secretaries can insert classes in their school
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'secretario'
            AND u.escola_id = turmas.escola_id
            AND u.ativo = true
        )
    );

-- Add UPDATE policy for turmas
CREATE POLICY "turmas_update_policy" ON turmas
    FOR UPDATE
    USING (
        -- Admin users can update any class
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario = 'admin'
            AND ativo = true
        )
        OR
        -- Directors can update classes from their school
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'diretor'
            AND u.escola_id = turmas.escola_id
            AND u.ativo = true
        )
        OR
        -- Secretaries can update classes from their school
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'secretario'
            AND u.escola_id = turmas.escola_id
            AND u.ativo = true
        )
    );

-- Drop and recreate the matriculas_school_isolation policy to be explicit
DROP POLICY IF EXISTS "matriculas_school_isolation" ON matriculas;

CREATE POLICY "matriculas_school_isolation" ON matriculas
    FOR SELECT
    USING (
        -- Admin users can see all enrollments
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario = 'admin'
        )
        OR
        -- Users can only see enrollments from their school
        EXISTS (
            SELECT 1 FROM turmas t
            JOIN users u ON u.id = auth.uid()
            WHERE t.id = matriculas.turma_id
            AND t.escola_id = u.escola_id
        )
    );

-- Add INSERT policy for matriculas
CREATE POLICY "matriculas_insert_policy" ON matriculas
    FOR INSERT
    WITH CHECK (
        -- Admin users can insert any enrollment
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario = 'admin'
            AND ativo = true
        )
        OR
        -- Directors can insert enrollments in their school
        EXISTS (
            SELECT 1 FROM users u
            JOIN turmas t ON t.id = matriculas.turma_id
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'diretor'
            AND u.escola_id = t.escola_id
            AND u.ativo = true
        )
        OR
        -- Secretaries can insert enrollments in their school
        EXISTS (
            SELECT 1 FROM users u
            JOIN turmas t ON t.id = matriculas.turma_id
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'secretario'
            AND u.escola_id = t.escola_id
            AND u.ativo = true
        )
    );

-- Add UPDATE policy for matriculas
CREATE POLICY "matriculas_update_policy" ON matriculas
    FOR UPDATE
    USING (
        -- Admin users can update any enrollment
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario = 'admin'
            AND ativo = true
        )
        OR
        -- Directors can update enrollments from their school
        EXISTS (
            SELECT 1 FROM users u
            JOIN turmas t ON t.id = matriculas.turma_id
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'diretor'
            AND u.escola_id = t.escola_id
            AND u.ativo = true
        )
        OR
        -- Secretaries can update enrollments from their school
        EXISTS (
            SELECT 1 FROM users u
            JOIN turmas t ON t.id = matriculas.turma_id
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'secretario'
            AND u.escola_id = t.escola_id
            AND u.ativo = true
        )
    );

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    details
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    'system_security_enhanced',
    'turmas,matriculas',
    'delete_policies_added',
    jsonb_build_object(
        'migration', 'fix_delete_rls_policies',
        'issue', 'FOR_ALL_policies_missing_DELETE',
        'fix', 'explicit_DELETE_policies_with_role_checks',
        'affected_tables', ARRAY['turmas', 'matriculas'],
        'policies_added', 6,
        'security_level', 'production_ready'
    )
);

COMMENT ON POLICY "turmas_delete_policy" ON turmas IS
'Allows admins, directors, and secretaries to delete classes from their school. Teachers cannot delete classes.';

COMMENT ON POLICY "matriculas_delete_policy" ON matriculas IS
'Allows admins, directors, and secretaries to delete enrollments from their school. Prevents accidental data loss.';
