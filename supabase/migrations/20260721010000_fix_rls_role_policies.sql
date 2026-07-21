-- Fix recursive/incomplete RLS policies and grant application roles the DML
-- privileges required by EDUCA's browser API calls.

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.escolas,
  public.users,
  public.alunos,
  public.responsaveis,
  public.aluno_responsaveis,
  public.turmas,
  public.matriculas,
  public.disciplinas,
  public.frequencia,
  public.notas,
  public.sessoes_aula,
  public.aulas_abertas,
  public.calendario_escolar,
  public.configs,
  public.relatorios_descritivos,
  public.feature_flags,
  public.escola_feature_flags
TO authenticated;

-- SECURITY DEFINER helpers avoid self-referential users policies.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tipo_usuario FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT escola_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = ANY(roles), false);
$$;

CREATE OR REPLACE FUNCTION public.can_access_school(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role('admin', 'gestor_sme')
    OR target_school_id = public.current_user_school_id();
$$;

CREATE OR REPLACE FUNCTION public.can_access_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role('admin', 'gestor_sme') OR EXISTS (
    SELECT 1
    FROM public.turmas t
    WHERE t.id = target_class_id
      AND (
        t.escola_id = public.current_user_school_id()
        OR t.professor_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_enrollment(target_enrollment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role('admin', 'gestor_sme') OR EXISTS (
    SELECT 1
    FROM public.matriculas m
    WHERE m.id = target_enrollment_id
      AND public.can_access_class(m.turma_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_enrollment(uuid) TO authenticated;

-- Remove baseline policies that recursively query public.users.
DROP POLICY IF EXISTS users_select_same_escola ON public.users;
DROP POLICY IF EXISTS turmas_select_escola ON public.turmas;
DROP POLICY IF EXISTS alunos_select_via_matricula ON public.alunos;
DROP POLICY IF EXISTS matriculas_select_escola ON public.matriculas;
DROP POLICY IF EXISTS frequencia_select_escola ON public.frequencia;
DROP POLICY IF EXISTS sessoes_aula_select_escola ON public.sessoes_aula;

-- Read policies.
DROP POLICY IF EXISTS users_select_authorized ON public.users;
CREATE POLICY users_select_authorized ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_any_role('admin', 'gestor_sme')
    OR escola_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS escolas_select_authenticated ON public.escolas;
CREATE POLICY escolas_select_authenticated ON public.escolas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS turmas_select_authorized ON public.turmas;
CREATE POLICY turmas_select_authorized ON public.turmas
  FOR SELECT TO authenticated USING (public.can_access_class(id));

DROP POLICY IF EXISTS alunos_select_authorized ON public.alunos;
CREATE POLICY alunos_select_authorized ON public.alunos
  FOR SELECT TO authenticated
  USING (
    public.has_any_role('admin', 'diretor', 'secretario', 'gestor_sme')
    OR EXISTS (
      SELECT 1 FROM public.matriculas m
      WHERE m.aluno_id = alunos.id AND public.can_access_class(m.turma_id)
    )
  );

DROP POLICY IF EXISTS matriculas_select_authorized ON public.matriculas;
CREATE POLICY matriculas_select_authorized ON public.matriculas
  FOR SELECT TO authenticated USING (public.can_access_class(turma_id));

DROP POLICY IF EXISTS responsaveis_select_authorized ON public.responsaveis;
CREATE POLICY responsaveis_select_authorized ON public.responsaveis
  FOR SELECT TO authenticated
  USING (public.has_any_role('admin', 'diretor', 'secretario', 'gestor_sme'));

DROP POLICY IF EXISTS aluno_responsaveis_select_authorized ON public.aluno_responsaveis;
CREATE POLICY aluno_responsaveis_select_authorized ON public.aluno_responsaveis
  FOR SELECT TO authenticated
  USING (public.has_any_role('admin', 'diretor', 'secretario', 'gestor_sme'));

DROP POLICY IF EXISTS disciplinas_select_authorized ON public.disciplinas;
CREATE POLICY disciplinas_select_authorized ON public.disciplinas
  FOR SELECT TO authenticated
  USING (public.can_access_school(escola_id));

DROP POLICY IF EXISTS frequencia_select_authorized ON public.frequencia;
CREATE POLICY frequencia_select_authorized ON public.frequencia
  FOR SELECT TO authenticated USING (public.can_access_enrollment(matricula_id));

DROP POLICY IF EXISTS notas_select_authorized ON public.notas;
CREATE POLICY notas_select_authorized ON public.notas
  FOR SELECT TO authenticated USING (public.can_access_enrollment(matricula_id));

DROP POLICY IF EXISTS sessoes_aula_select_authorized ON public.sessoes_aula;
CREATE POLICY sessoes_aula_select_authorized ON public.sessoes_aula
  FOR SELECT TO authenticated USING (public.can_access_class(turma_id));

DROP POLICY IF EXISTS aulas_abertas_select_authorized ON public.aulas_abertas;
CREATE POLICY aulas_abertas_select_authorized ON public.aulas_abertas
  FOR SELECT TO authenticated USING (public.can_access_class(turma_id));

DROP POLICY IF EXISTS calendario_select_authorized ON public.calendario_escolar;
CREATE POLICY calendario_select_authorized ON public.calendario_escolar
  FOR SELECT TO authenticated USING (public.can_access_school(escola_id));

DROP POLICY IF EXISTS configs_select_authorized ON public.configs;
CREATE POLICY configs_select_authorized ON public.configs
  FOR SELECT TO authenticated
  USING (escola_id IS NULL OR public.can_access_school(escola_id));

-- Attendance upsert requires a real conflict target.
CREATE UNIQUE INDEX IF NOT EXISTS idx_frequencia_sessao_matricula_unique
  ON public.frequencia (sessao_id, matricula_id);

-- Admin has full access to system-managed tables.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'escolas', 'users', 'alunos', 'responsaveis', 'aluno_responsaveis',
    'turmas', 'matriculas', 'disciplinas', 'frequencia', 'notas',
    'sessoes_aula', 'aulas_abertas', 'calendario_escolar', 'configs',
    'relatorios_descritivos', 'feature_flags', 'escola_feature_flags'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_full_access ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY admin_full_access ON public.%I FOR ALL TO authenticated USING (public.has_any_role(''admin'', ''gestor_sme'')) WITH CHECK (public.has_any_role(''admin'', ''gestor_sme''))',
      table_name
    );
  END LOOP;
END $$;

-- School management roles can manage school-scoped cadastro data.
DROP POLICY IF EXISTS school_staff_manage_alunos ON public.alunos;
CREATE POLICY school_staff_manage_alunos ON public.alunos
  FOR ALL TO authenticated
  USING (public.has_any_role('diretor', 'secretario'))
  WITH CHECK (public.has_any_role('diretor', 'secretario'));

DROP POLICY IF EXISTS school_staff_manage_responsaveis ON public.responsaveis;
CREATE POLICY school_staff_manage_responsaveis ON public.responsaveis
  FOR ALL TO authenticated
  USING (public.has_any_role('diretor', 'secretario'))
  WITH CHECK (public.has_any_role('diretor', 'secretario'));

DROP POLICY IF EXISTS school_staff_manage_links ON public.aluno_responsaveis;
CREATE POLICY school_staff_manage_links ON public.aluno_responsaveis
  FOR ALL TO authenticated
  USING (public.has_any_role('diretor', 'secretario'))
  WITH CHECK (public.has_any_role('diretor', 'secretario'));

DROP POLICY IF EXISTS school_staff_manage_turmas ON public.turmas;
CREATE POLICY school_staff_manage_turmas ON public.turmas
  FOR ALL TO authenticated
  USING (
    public.has_any_role('diretor', 'secretario')
    AND public.can_access_school(escola_id)
  )
  WITH CHECK (
    public.has_any_role('diretor', 'secretario')
    AND public.can_access_school(escola_id)
  );

DROP POLICY IF EXISTS school_staff_manage_matriculas ON public.matriculas;
CREATE POLICY school_staff_manage_matriculas ON public.matriculas
  FOR ALL TO authenticated
  USING (
    public.has_any_role('diretor', 'secretario')
    AND public.can_access_class(turma_id)
  )
  WITH CHECK (
    public.has_any_role('diretor', 'secretario')
    AND public.can_access_class(turma_id)
  );

-- Academic write permissions. Secretario remains read-only for attendance/grades.
DROP POLICY IF EXISTS academic_manage_frequencia ON public.frequencia;
CREATE POLICY academic_manage_frequencia ON public.frequencia
  FOR ALL TO authenticated
  USING (
    public.has_any_role('diretor', 'professor')
    AND public.can_access_enrollment(matricula_id)
  )
  WITH CHECK (
    public.has_any_role('diretor', 'professor')
    AND public.can_access_enrollment(matricula_id)
  );

DROP POLICY IF EXISTS academic_manage_notas ON public.notas;
CREATE POLICY academic_manage_notas ON public.notas
  FOR ALL TO authenticated
  USING (
    public.has_any_role('diretor', 'professor')
    AND public.can_access_enrollment(matricula_id)
  )
  WITH CHECK (
    public.has_any_role('diretor', 'professor')
    AND public.can_access_enrollment(matricula_id)
  );

DROP POLICY IF EXISTS academic_manage_sessoes ON public.sessoes_aula;
CREATE POLICY academic_manage_sessoes ON public.sessoes_aula
  FOR ALL TO authenticated
  USING (
    public.has_any_role('diretor', 'professor')
    AND public.can_access_class(turma_id)
  )
  WITH CHECK (
    public.has_any_role('diretor', 'professor')
    AND public.can_access_class(turma_id)
  );

COMMIT;
