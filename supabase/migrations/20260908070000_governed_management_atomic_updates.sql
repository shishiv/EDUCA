BEGIN;

-- Make the school fields and director relationship one governed transaction.
CREATE OR REPLACE FUNCTION public.update_governed_school(
  p_school_id uuid,
  p_changes jsonb
)
RETURNS TABLE (school_id uuid, audit_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_school public.escolas%ROWTYPE;
  director_row public.users%ROWTYPE;
  next_nome text;
  next_codigo text;
  next_tipo text;
  next_email text;
  next_telefone text;
  next_endereco text;
  next_ativo boolean;
  next_director_id uuid;
  director_changed boolean;
  school_fields_changed boolean;
  director_audit_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.pilot_is_secretariat() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ROLE_DENIED: municipal secretariat authority is required';
  END IF;
  IF jsonb_typeof(p_changes) <> 'object'
     OR p_changes - ARRAY['nome', 'codigo', 'tipo', 'email', 'telefone', 'endereco', 'ativo', 'diretor_id'] <> '{}'::jsonb THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_INVALID: unsupported school update';
  END IF;
  IF (p_changes ? 'nome' AND jsonb_typeof(p_changes->'nome') <> 'string')
     OR (p_changes ? 'codigo' AND jsonb_typeof(p_changes->'codigo') <> 'string')
     OR (p_changes ? 'tipo' AND jsonb_typeof(p_changes->'tipo') <> 'string')
     OR (p_changes ? 'email' AND jsonb_typeof(p_changes->'email') NOT IN ('null', 'string'))
     OR (p_changes ? 'telefone' AND jsonb_typeof(p_changes->'telefone') NOT IN ('null', 'string'))
     OR (p_changes ? 'endereco' AND jsonb_typeof(p_changes->'endereco') NOT IN ('null', 'string'))
     OR (p_changes ? 'diretor_id' AND jsonb_typeof(p_changes->'diretor_id') NOT IN ('null', 'string'))
     OR (p_changes ? 'diretor_id' AND jsonb_typeof(p_changes->'diretor_id') = 'string'
       AND nullif(btrim(p_changes->>'diretor_id'), '') IS NOT NULL
       AND p_changes->>'diretor_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
     OR (p_changes ? 'ativo' AND jsonb_typeof(p_changes->'ativo') <> 'boolean') THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_INVALID: school update values are invalid';
  END IF;

  SELECT * INTO current_school
  FROM public.escolas
  WHERE id = p_school_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_NOT_FOUND: school target was not found';
  END IF;

  next_nome := CASE WHEN p_changes ? 'nome' THEN btrim(coalesce(p_changes->>'nome', '')) ELSE current_school.nome END;
  next_codigo := CASE WHEN p_changes ? 'codigo' THEN btrim(coalesce(p_changes->>'codigo', '')) ELSE current_school.codigo END;
  next_tipo := CASE WHEN p_changes ? 'tipo' THEN p_changes->>'tipo' ELSE current_school.tipo END;
  next_email := CASE WHEN p_changes ? 'email' THEN NULLIF(btrim(p_changes->>'email'), '') ELSE current_school.email END;
  next_telefone := CASE WHEN p_changes ? 'telefone' THEN NULLIF(btrim(p_changes->>'telefone'), '') ELSE current_school.telefone END;
  next_endereco := CASE WHEN p_changes ? 'endereco' THEN NULLIF(btrim(p_changes->>'endereco'), '') ELSE current_school.endereco END;
  next_ativo := CASE
    WHEN p_changes ? 'ativo' AND jsonb_typeof(p_changes->'ativo') = 'boolean' THEN (p_changes->>'ativo')::boolean
    WHEN p_changes ? 'ativo' THEN NULL
    ELSE current_school.ativo
  END;
  next_director_id := CASE
    WHEN p_changes ? 'diretor_id' THEN NULLIF(btrim(p_changes->>'diretor_id'), '')::uuid
    ELSE current_school.diretor_id
  END;
  director_changed := next_director_id IS DISTINCT FROM current_school.diretor_id;
  school_fields_changed := next_nome IS DISTINCT FROM current_school.nome
    OR next_codigo IS DISTINCT FROM current_school.codigo
    OR next_tipo IS DISTINCT FROM current_school.tipo
    OR next_email IS DISTINCT FROM current_school.email
    OR next_telefone IS DISTINCT FROM current_school.telefone
    OR next_endereco IS DISTINCT FROM current_school.endereco
    OR next_ativo IS DISTINCT FROM current_school.ativo;

  IF next_nome IS NULL OR next_nome = ''
     OR next_codigo IS NULL OR next_codigo = ''
     OR next_tipo IS NULL OR next_tipo NOT IN ('creche', 'pre_escola', 'fundamental')
     OR next_ativo IS NULL THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_INVALID: school update is invalid';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(next_codigo, 0));
  IF EXISTS (SELECT 1 FROM public.escolas WHERE codigo = next_codigo AND id <> p_school_id) THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_CONFLICT: school code already exists';
  END IF;

  IF director_changed AND next_director_id IS NOT NULL THEN
    SELECT * INTO director_row
    FROM public.users
    WHERE id = next_director_id
    FOR UPDATE;
    IF NOT FOUND OR director_row.ativo IS DISTINCT FROM true OR director_row.tipo_usuario <> 'diretor' THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_DIRECTOR_DENIED: director target must be active';
    END IF;
    IF director_row.escola_id IS NOT NULL AND director_row.escola_id <> p_school_id THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_DIRECTOR_CONFLICT: director already belongs to another school';
    END IF;
  END IF;

  IF director_changed AND current_school.diretor_id IS NOT NULL THEN
    UPDATE public.users
    SET escola_id = NULL
    WHERE id = current_school.diretor_id
      AND escola_id = p_school_id;
  END IF;

  IF director_changed AND next_director_id IS NOT NULL THEN
    UPDATE public.users
    SET escola_id = p_school_id
    WHERE id = next_director_id;
  END IF;

  UPDATE public.escolas
  SET nome = next_nome,
      codigo = next_codigo,
      tipo = next_tipo,
      email = next_email,
      telefone = next_telefone,
      endereco = next_endereco,
      ativo = next_ativo,
      diretor_id = next_director_id
  WHERE id = p_school_id;

  school_id := p_school_id;
  IF school_fields_changed OR NOT director_changed THEN
    audit_id := public.record_governed_management_audit('school_updated', p_school_id, 'school', p_school_id);
  END IF;
  IF director_changed THEN
    director_audit_id := public.record_governed_management_audit(
      'school_director_assigned', p_school_id, 'school', p_school_id
    );
    audit_id := coalesce(audit_id, director_audit_id);
  END IF;
  RETURN NEXT;
END;
$$;

-- Class audit events describe an actual teacher identity change, not merely
-- the presence of professor_id in a full-form payload.
CREATE OR REPLACE FUNCTION public.write_governed_turma(
  p_turma_id uuid DEFAULT NULL,
  p_changes jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (turma_id uuid, escola_id uuid, audit_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_turma public.turmas%ROWTYPE;
  target_school_id uuid;
  target_teacher_id uuid;
  target_teacher public.users%ROWTYPE;
  next_nome text;
  next_serie text;
  next_turno text;
  next_ano_letivo integer;
  next_capacidade integer;
  next_ativo boolean;
  active_enrollment_count integer;
  event_name text;
  teacher_changed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_AUTH_REQUIRED: authenticated actor required';
  END IF;
  IF jsonb_typeof(p_changes) <> 'object'
     OR p_changes - ARRAY['nome', 'serie', 'turno', 'ano_letivo', 'capacidade', 'escola_id', 'professor_id', 'ativo'] <> '{}'::jsonb THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_INVALID: unsupported class update';
  END IF;
  IF (p_changes ? 'nome' AND jsonb_typeof(p_changes->'nome') <> 'string')
     OR (p_changes ? 'serie' AND jsonb_typeof(p_changes->'serie') <> 'string')
     OR (p_changes ? 'turno' AND jsonb_typeof(p_changes->'turno') <> 'string')
     OR (p_changes ? 'ano_letivo' AND (
       jsonb_typeof(p_changes->'ano_letivo') <> 'number'
       OR p_changes->>'ano_letivo' !~ '^[0-9]{1,4}$'
     ))
     OR (p_changes ? 'capacidade' AND (
       jsonb_typeof(p_changes->'capacidade') <> 'number'
       OR p_changes->>'capacidade' !~ '^[0-9]{1,3}$'
     ))
     OR (p_changes ? 'escola_id' AND (
       jsonb_typeof(p_changes->'escola_id') <> 'string'
       OR p_changes->>'escola_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     ))
     OR (p_changes ? 'professor_id' AND jsonb_typeof(p_changes->'professor_id') NOT IN ('null', 'string'))
     OR (p_changes ? 'professor_id' AND jsonb_typeof(p_changes->'professor_id') = 'string'
       AND nullif(btrim(p_changes->>'professor_id'), '') IS NOT NULL
       AND p_changes->>'professor_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
     OR (p_changes ? 'ativo' AND jsonb_typeof(p_changes->'ativo') <> 'boolean') THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_INVALID: class update values are invalid';
  END IF;

  IF p_turma_id IS NULL THEN
    IF NOT (p_changes ?& ARRAY['nome', 'serie', 'turno', 'ano_letivo', 'capacidade', 'escola_id']) THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_INVALID: class creation requires all core fields';
    END IF;
    target_school_id := (p_changes->>'escola_id')::uuid;
  ELSE
    SELECT * INTO current_turma
    FROM public.turmas
    WHERE id = p_turma_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_NOT_FOUND: class target was not found';
    END IF;
    target_school_id := current_turma.escola_id;
    IF p_changes ? 'escola_id' AND (p_changes->>'escola_id')::uuid <> target_school_id THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_SCHOOL_DENIED: class cannot move between schools';
    END IF;
  END IF;

  IF target_school_id IS NULL OR public.pilot_can_manage_school(target_school_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_SCHOOL_DENIED: actor cannot manage the target school';
  END IF;

  PERFORM 1
  FROM public.escolas AS target_school
  WHERE target_school.id = target_school_id
    AND target_school.ativo IS TRUE
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_SCHOOL_DENIED: target school must be active';
  END IF;

  next_nome := CASE WHEN p_changes ? 'nome' THEN btrim(coalesce(p_changes->>'nome', '')) ELSE current_turma.nome END;
  next_serie := CASE WHEN p_changes ? 'serie' THEN btrim(coalesce(p_changes->>'serie', '')) ELSE current_turma.serie END;
  next_turno := CASE WHEN p_changes ? 'turno' THEN p_changes->>'turno' ELSE current_turma.turno END;
  next_ano_letivo := CASE WHEN p_changes ? 'ano_letivo' THEN (p_changes->>'ano_letivo')::integer ELSE current_turma.ano_letivo END;
  next_capacidade := CASE WHEN p_changes ? 'capacidade' THEN (p_changes->>'capacidade')::integer ELSE current_turma.capacidade END;
  next_ativo := CASE
    WHEN p_changes ? 'ativo' AND jsonb_typeof(p_changes->'ativo') = 'boolean' THEN (p_changes->>'ativo')::boolean
    WHEN p_changes ? 'ativo' THEN NULL
    ELSE coalesce(current_turma.ativo, true)
  END;
  target_teacher_id := CASE
    WHEN p_changes ? 'professor_id' THEN NULLIF(btrim(p_changes->>'professor_id'), '')::uuid
    ELSE current_turma.professor_id
  END;
  IF p_turma_id IS NOT NULL THEN
    teacher_changed := current_turma.professor_id IS DISTINCT FROM target_teacher_id;
  END IF;

  IF next_nome IS NULL OR next_nome = ''
     OR next_serie IS NULL OR next_serie = ''
     OR next_turno IS NULL OR next_turno NOT IN ('matutino', 'vespertino', 'integral')
     OR next_ano_letivo IS NULL OR next_ano_letivo NOT BETWEEN 2020 AND 2100
     OR next_capacidade IS NULL OR next_capacidade NOT BETWEEN 1 AND 100
     OR next_ativo IS NULL THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_INVALID: class values are invalid';
  END IF;

  PERFORM 1
  FROM public.anos_letivos AS academic_year
  WHERE academic_year.escola_id = target_school_id
    AND academic_year.ano = next_ano_letivo
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_YEAR_DENIED: class year must be configured for the target school';
  END IF;

  IF target_teacher_id IS NOT NULL THEN
    SELECT * INTO target_teacher
    FROM public.users
    WHERE id = target_teacher_id
    FOR SHARE;
    IF NOT FOUND OR target_teacher.ativo IS DISTINCT FROM true OR target_teacher.tipo_usuario <> 'professor'
       OR target_teacher.escola_id IS DISTINCT FROM target_school_id THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_TEACHER_DENIED: teacher must be active and belong to the target school';
    END IF;
  END IF;

  IF p_turma_id IS NOT NULL THEN
    SELECT count(*) INTO active_enrollment_count
    FROM public.matriculas AS enrollment
    WHERE enrollment.turma_id = p_turma_id
      AND enrollment.situacao = 'ativa';
    IF active_enrollment_count > next_capacidade THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_CAPACITY_DENIED: capacity is below active enrollment count';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.matriculas AS enrollment
      WHERE enrollment.turma_id = p_turma_id
        AND enrollment.situacao = 'ativa'
        AND enrollment.ano_letivo IS DISTINCT FROM next_ano_letivo
    ) THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_YEAR_DENIED: class year cannot diverge from active enrollments';
    END IF;
  END IF;

  IF p_turma_id IS NULL THEN
    INSERT INTO public.turmas (
      nome, serie, turno, ano_letivo, capacidade, escola_id, professor_id, ativo
    ) VALUES (
      next_nome, next_serie, next_turno, next_ano_letivo, next_capacidade, target_school_id, target_teacher_id, next_ativo
    )
    RETURNING id INTO turma_id;
    event_name := 'class_created';
  ELSE
    UPDATE public.turmas
    SET nome = next_nome,
        serie = next_serie,
        turno = next_turno,
        ano_letivo = next_ano_letivo,
        capacidade = next_capacidade,
        professor_id = target_teacher_id,
        ativo = next_ativo
    WHERE id = p_turma_id;
    turma_id := p_turma_id;
    event_name := CASE WHEN teacher_changed THEN 'class_teacher_assigned' ELSE 'class_updated' END;
  END IF;

  escola_id := target_school_id;
  audit_id := public.record_governed_management_audit(event_name, target_school_id, 'turma', turma_id);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.update_governed_school(uuid, jsonb)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.write_governed_turma(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_governed_school(uuid, jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_governed_turma(uuid, jsonb)
  TO authenticated;

COMMIT;
