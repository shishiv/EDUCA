BEGIN;

CREATE OR REPLACE FUNCTION public.pilot_can_view_sensitive_family(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    target_school_id IS NOT NULL
    AND public.pilot_current_role() IN ('admin', 'diretor', 'secretario')
    AND public.pilot_can_access_school(target_school_id),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.pilot_can_view_sensitive_family(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_can_view_sensitive_family(uuid) TO service_role;

DROP POLICY IF EXISTS pilot_alunos_select ON public.alunos;
CREATE POLICY pilot_alunos_select ON public.alunos
FOR SELECT TO authenticated
USING (
  (
    public.pilot_current_role() <> 'professor'
    AND public.pilot_can_access_school(escola_id)
  )
  OR (
    public.pilot_current_role() = 'professor'
    AND EXISTS (
      SELECT 1
      FROM public.matriculas AS enrollment
      JOIN public.turmas AS class ON class.id = enrollment.turma_id
      WHERE enrollment.aluno_id = alunos.id
        AND enrollment.situacao = 'ativa'
        AND class.professor_id = auth.uid()
        AND public.pilot_teacher_owns_class(class.id)
    )
  )
);

DROP POLICY IF EXISTS pilot_responsaveis_select ON public.responsaveis;
CREATE POLICY pilot_responsaveis_select ON public.responsaveis
FOR SELECT TO authenticated
USING (
  public.pilot_current_role() IN ('admin', 'diretor', 'secretario')
  AND public.pilot_can_access_school(escola_id)
);

CREATE OR REPLACE FUNCTION public.get_authorized_student_profiles(
  p_student_id uuid DEFAULT NULL,
  p_school_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  escola_id uuid,
  nome_completo text,
  data_nascimento date,
  sexo text,
  cpf text,
  rg text,
  nome_mae text,
  nome_pai text,
  telefone text,
  email text,
  endereco text,
  necessidades_especiais text,
  responsavel_id uuid,
  ativo boolean,
  created_at timestamptz,
  cor_raca text,
  zona_residencial text,
  transporte_escolar boolean,
  tipo_deficiencia text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    student.id,
    student.escola_id,
    student.nome_completo,
    student.data_nascimento,
    student.sexo,
    student.cpf,
    student.rg,
    student.nome_mae,
    student.nome_pai,
    student.telefone,
    student.email,
    student.endereco,
    student.necessidades_especiais,
    student.responsavel_id,
    student.ativo,
    student.created_at,
    student.cor_raca,
    student.zona_residencial,
    student.transporte_escolar,
    student.tipo_deficiencia
  FROM public.alunos AS student
  WHERE public.pilot_can_view_sensitive_family(student.escola_id)
    AND (p_student_id IS NULL OR student.id = p_student_id)
    AND (p_school_id IS NULL OR student.escola_id = p_school_id)
  ORDER BY student.nome_completo;
$$;

CREATE OR REPLACE FUNCTION public.get_authorized_guardian_profiles(
  p_guardian_id uuid DEFAULT NULL,
  p_school_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  escola_id uuid,
  nome text,
  cpf text,
  parentesco text,
  telefone text,
  email text,
  endereco text,
  rg text,
  orgao_emissor_rg text,
  data_nascimento date,
  nacionalidade text,
  estado_civil text,
  escolaridade text,
  profissao text,
  renda_familiar numeric,
  lgpd_consentimento boolean,
  lgpd_data_consentimento timestamptz,
  ativo boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    guardian.id,
    guardian.escola_id,
    guardian.nome,
    guardian.cpf,
    guardian.parentesco,
    guardian.telefone,
    guardian.email,
    guardian.endereco,
    guardian.rg,
    guardian.orgao_emissor_rg,
    guardian.data_nascimento,
    guardian.nacionalidade,
    guardian.estado_civil,
    guardian.escolaridade,
    guardian.profissao,
    guardian.renda_familiar,
    guardian.lgpd_consentimento,
    guardian.lgpd_data_consentimento,
    guardian.ativo,
    guardian.created_at
  FROM public.responsaveis AS guardian
  WHERE public.pilot_can_view_sensitive_family(guardian.escola_id)
    AND (p_guardian_id IS NULL OR guardian.id = p_guardian_id)
    AND (p_school_id IS NULL OR guardian.escola_id = p_school_id)
  ORDER BY guardian.nome;
$$;

REVOKE ALL ON FUNCTION public.get_authorized_student_profiles(uuid, uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.get_authorized_guardian_profiles(uuid, uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_authorized_student_profiles(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_authorized_guardian_profiles(uuid, uuid) TO authenticated;

REVOKE SELECT ON public.alunos FROM authenticated;
GRANT SELECT (
  id,
  escola_id,
  nome_completo,
  data_nascimento,
  sexo,
  rg,
  telefone,
  email,
  endereco,
  responsavel_id,
  ativo,
  created_at,
  cor_raca,
  zona_residencial,
  transporte_escolar,
  tipo_deficiencia,
  import_source_id,
  pilot_import_batch_id
) ON public.alunos TO authenticated;

REVOKE SELECT ON public.responsaveis FROM authenticated;
GRANT SELECT (
  id,
  escola_id,
  nome,
  parentesco,
  email,
  endereco,
  rg,
  orgao_emissor_rg,
  data_nascimento,
  nacionalidade,
  estado_civil,
  escolaridade,
  profissao,
  lgpd_consentimento,
  lgpd_data_consentimento,
  ativo,
  created_at,
  import_source_id,
  pilot_import_batch_id
) ON public.responsaveis TO authenticated;

ALTER TABLE public.pilot_audit_log
  DROP CONSTRAINT IF EXISTS pilot_audit_sensitive_family_metadata_check;
ALTER TABLE public.pilot_audit_log
  ADD CONSTRAINT pilot_audit_sensitive_family_metadata_check
  CHECK (NOT (redacted_metadata ?| ARRAY[
    'cpf',
    'telefone',
    'renda_familiar',
    'nome_mae',
    'nome_pai',
    'necessidades_especiais'
  ]));

COMMIT;
