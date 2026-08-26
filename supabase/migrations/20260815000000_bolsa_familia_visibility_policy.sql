BEGIN;

INSERT INTO public.configs (
  chave,
  valor,
  categoria,
  descricao,
  tipo_valor,
  valor_padrao,
  escola_id,
  ativo
)
SELECT
  'bolsa_familia_visible_roles',
  'admin,diretor,secretario',
  'seguranca',
  'Perfis autorizados a visualizar Bolsa Familia: admin, diretor e secretario',
  'string',
  'admin,diretor,secretario',
  school.id,
  true
FROM public.escolas AS school
WHERE NOT EXISTS (
  SELECT 1
  FROM public.configs AS config
  WHERE config.escola_id = school.id
    AND config.chave = 'bolsa_familia_visible_roles'
);

CREATE UNIQUE INDEX IF NOT EXISTS configs_bolsa_familia_visibility_school
ON public.configs(escola_id, chave)
WHERE escola_id IS NOT NULL
  AND chave = 'bolsa_familia_visible_roles';

CREATE OR REPLACE FUNCTION public.create_bolsa_familia_visibility_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.configs (
    chave,
    valor,
    categoria,
    descricao,
    tipo_valor,
    valor_padrao,
    escola_id,
    ativo
  )
  SELECT
    'bolsa_familia_visible_roles',
    'admin,diretor,secretario',
    'seguranca',
    'Perfis autorizados a visualizar Bolsa Familia: admin, diretor e secretario',
    'string',
    'admin,diretor,secretario',
    NEW.id,
    true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.configs AS config
    WHERE config.escola_id = NEW.id
      AND config.chave = 'bolsa_familia_visible_roles'
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_bolsa_familia_visibility_config() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS create_bolsa_familia_visibility_config ON public.escolas;
CREATE TRIGGER create_bolsa_familia_visibility_config
AFTER INSERT ON public.escolas
FOR EACH ROW
EXECUTE FUNCTION public.create_bolsa_familia_visibility_config();

DROP POLICY IF EXISTS bolsa_familia_visibility_config_update ON public.configs;
CREATE POLICY bolsa_familia_visibility_config_update
ON public.configs
FOR UPDATE
TO authenticated
USING (
  chave = 'bolsa_familia_visible_roles'
  AND escola_id IS NOT NULL
  AND (
    public.pilot_current_role() = 'admin'
    OR (
      public.pilot_current_role() = 'diretor'
      AND public.pilot_can_manage_school(escola_id)
    )
  )
)
WITH CHECK (
  chave = 'bolsa_familia_visible_roles'
  AND escola_id IS NOT NULL
  AND valor ~ '^(none|admin(,diretor)?(,secretario)?|diretor(,secretario)?|secretario)$'
  AND (
    public.pilot_current_role() = 'admin'
    OR (
      public.pilot_current_role() = 'diretor'
      AND public.pilot_can_manage_school(escola_id)
    )
  )
);

GRANT UPDATE (valor, updated_at) ON public.configs TO authenticated;

ALTER TABLE public.pilot_audit_log
  DROP CONSTRAINT IF EXISTS pilot_audit_bolsa_familia_metadata_check;
ALTER TABLE public.pilot_audit_log
  ADD CONSTRAINT pilot_audit_bolsa_familia_metadata_check
  CHECK (NOT (redacted_metadata ?| ARRAY[
    'bolsa_familia',
    'is_bolsa_familia',
    'bolsaFamilia'
  ]));

CREATE OR REPLACE FUNCTION public.pilot_can_view_bolsa_familia(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    target_school_id IS NOT NULL
    AND public.pilot_current_role() IN ('admin', 'diretor', 'secretario')
    AND public.pilot_can_access_school(target_school_id)
    AND public.pilot_current_role() = ANY(
      string_to_array(
        coalesce(
          (
            SELECT config.valor
            FROM public.configs AS config
            WHERE config.escola_id = target_school_id
              AND config.chave = 'bolsa_familia_visible_roles'
              AND config.ativo = true
            ORDER BY config.updated_at DESC, config.created_at DESC, config.id DESC
            LIMIT 1
          ),
          'admin,diretor,secretario'
        ),
        ','
      )
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.pilot_can_view_bolsa_familia(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_can_view_bolsa_familia(uuid) TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.get_attendance_conditionality_unrestricted(date,date,uuid,uuid)') IS NULL THEN
    ALTER FUNCTION public.get_attendance_conditionality(date, date, uuid, uuid)
      RENAME TO get_attendance_conditionality_unrestricted;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_attendance_conditionality_unrestricted(date, date, uuid, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_conditionality_unrestricted(date, date, uuid, uuid)
TO service_role;

CREATE OR REPLACE FUNCTION public.get_attendance_conditionality(
  p_start_date date,
  p_end_date date,
  p_escola_id uuid DEFAULT NULL,
  p_turma_id uuid DEFAULT NULL
)
RETURNS TABLE (
  matricula_id uuid,
  aluno_id uuid,
  aluno_nome text,
  nis text,
  is_bolsa_familia boolean,
  data_nascimento date,
  idade_anos integer,
  educacao_basica_concluida boolean,
  turma_id uuid,
  turma_nome text,
  turma_serie text,
  etapa_ensino text,
  escola_id uuid,
  escola_nome text,
  municipio_id uuid,
  total_aulas bigint,
  presencas bigint,
  faltas bigint,
  atestados bigint,
  percentual_frequencia numeric,
  tem_dados_frequencia boolean,
  condicionalidade_legal text,
  piso_legal_percent numeric,
  condicionalidade_legal_status text,
  margem_municipal_id uuid,
  margem_municipal_critica_percent numeric,
  margem_municipal_alerta_percent numeric,
  margem_municipal_status text,
  margem_municipal_precedencia integer,
  margem_municipal_origem text,
  margem_municipal_definida_por uuid,
  margem_municipal_definida_em timestamptz,
  margem_municipal_fallback boolean,
  margem_municipal_fallback_motivo text,
  margem_municipal_vigencia_inicio date,
  margem_municipal_vigencia_fim date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT source.*
  FROM public.get_attendance_conditionality_unrestricted(
    p_start_date,
    p_end_date,
    p_escola_id,
    p_turma_id
  ) AS source
  WHERE public.pilot_can_view_bolsa_familia(source.escola_id);
$$;

REVOKE ALL ON FUNCTION public.get_attendance_conditionality(date, date, uuid, uuid)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_attendance_conditionality(date, date, uuid, uuid)
TO authenticated;

DROP VIEW IF EXISTS public.vw_frequencia_condicionalidade;
CREATE VIEW public.vw_frequencia_condicionalidade
WITH (security_invoker = true)
AS
SELECT *
FROM public.get_attendance_conditionality(
  date_trunc('month', current_date)::date,
  current_date,
  NULL,
  NULL
);

REVOKE ALL ON public.vw_frequencia_condicionalidade FROM PUBLIC, anon, service_role;
GRANT SELECT ON public.vw_frequencia_condicionalidade TO authenticated;

CREATE OR REPLACE FUNCTION public.get_student_bolsa_familia(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT student.bolsa_familia
  FROM public.alunos AS student
  WHERE student.id = p_student_id
    AND public.pilot_can_view_bolsa_familia(student.escola_id);
$$;

REVOKE ALL ON FUNCTION public.get_student_bolsa_familia(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_student_bolsa_familia(uuid) TO authenticated;

REVOKE SELECT ON public.alunos FROM authenticated;
GRANT SELECT (
  id,
  nome_completo,
  data_nascimento,
  sexo,
  cpf,
  rg,
  nome_mae,
  nome_pai,
  telefone,
  email,
  endereco,
  necessidades_especiais,
  responsavel_id,
  ativo,
  created_at,
  cor_raca,
  zona_residencial,
  transporte_escolar,
  tipo_deficiencia,
  escola_id,
  import_source_id,
  pilot_import_batch_id
) ON public.alunos TO authenticated;

ALTER FUNCTION public.create_student_admission(
  text,
  date,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) SECURITY DEFINER;

COMMIT;
