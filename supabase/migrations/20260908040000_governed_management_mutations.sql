BEGIN;

-- School, class, teacher, and enrollment writes are owned here. Browser state
-- may choose a target, but every relationship is re-read and authorized in
-- the transaction that changes it.
CREATE OR REPLACE FUNCTION public.pilot_can_manage_school(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    public.pilot_current_role() = 'diretor'
      AND target_school_id = public.pilot_current_school_id(),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.pilot_can_manage_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pilot_can_manage_school(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_governed_management_audit(
  p_event_type text,
  p_escola_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  audit_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.pilot_current_role() IS NULL THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_AUDIT_AUTH_REQUIRED: authenticated active actor required';
  END IF;

  IF p_event_type NOT IN (
    'school_created', 'school_updated', 'school_director_assigned',
    'class_created', 'class_updated', 'class_teacher_assigned',
    'enrollment_created', 'enrollment_status_changed'
  ) THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_AUDIT_EVENT_DENIED: event is not governed';
  END IF;

  INSERT INTO public.pilot_audit_log (
    actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
  ) VALUES (
    auth.uid(), p_escola_id, p_event_type, p_entity_type, p_entity_id::text, '{}'::jsonb
  )
  RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_governed_management_audit(text, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_governed_school(
  p_nome text,
  p_codigo text,
  p_tipo text,
  p_diretor_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_endereco text DEFAULT NULL
)
RETURNS TABLE (school_id uuid, diretor_id uuid, audit_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  school_row public.escolas%ROWTYPE;
  director_row public.users%ROWTYPE;
  normalized_codigo text := btrim(coalesce(p_codigo, ''));
  normalized_nome text := btrim(coalesce(p_nome, ''));
BEGIN
  IF auth.uid() IS NULL OR public.pilot_is_secretariat() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ROLE_DENIED: municipal secretariat authority is required';
  END IF;
  IF normalized_nome = '' OR normalized_codigo = '' THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_INVALID: name and code are required';
  END IF;
  IF p_tipo IS NULL OR p_tipo NOT IN ('creche', 'pre_escola', 'fundamental') THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_INVALID: school type is invalid';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(normalized_codigo, 0));
  IF EXISTS (SELECT 1 FROM public.escolas WHERE codigo = normalized_codigo) THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_CONFLICT: school code already exists';
  END IF;

  IF p_diretor_id IS NOT NULL THEN
    SELECT * INTO director_row
    FROM public.users
    WHERE id = p_diretor_id
    FOR UPDATE;

    IF NOT FOUND OR director_row.ativo IS DISTINCT FROM true OR director_row.tipo_usuario <> 'diretor' THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_DIRECTOR_DENIED: director target must be active';
    END IF;
    IF director_row.escola_id IS NOT NULL THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_DIRECTOR_CONFLICT: director already belongs to a school';
    END IF;
  END IF;

  INSERT INTO public.escolas (nome, codigo, tipo, email, telefone, endereco, ativo)
  VALUES (
    normalized_nome,
    normalized_codigo,
    p_tipo,
    NULLIF(btrim(p_email), ''),
    NULLIF(btrim(p_telefone), ''),
    NULLIF(btrim(p_endereco), ''),
    true
  )
  RETURNING * INTO school_row;

  IF p_diretor_id IS NOT NULL THEN
    UPDATE public.users
    SET escola_id = school_row.id
    WHERE id = p_diretor_id;

    UPDATE public.escolas
    SET diretor_id = p_diretor_id
    WHERE id = school_row.id
    RETURNING * INTO school_row;
  END IF;

  school_id := school_row.id;
  diretor_id := school_row.diretor_id;
  audit_id := public.record_governed_management_audit('school_created', school_row.id, 'school', school_row.id);
  RETURN NEXT;
END;
$$;

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
  next_nome text;
  next_codigo text;
  next_tipo text;
  next_email text;
  next_telefone text;
  next_endereco text;
  next_ativo boolean;
BEGIN
  IF auth.uid() IS NULL OR public.pilot_is_secretariat() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ROLE_DENIED: municipal secretariat authority is required';
  END IF;
  IF jsonb_typeof(p_changes) <> 'object'
     OR p_changes - ARRAY['nome', 'codigo', 'tipo', 'email', 'telefone', 'endereco', 'ativo'] <> '{}'::jsonb THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_INVALID: unsupported school update';
  END IF;
  IF (p_changes ? 'nome' AND jsonb_typeof(p_changes->'nome') <> 'string')
     OR (p_changes ? 'codigo' AND jsonb_typeof(p_changes->'codigo') <> 'string')
     OR (p_changes ? 'tipo' AND jsonb_typeof(p_changes->'tipo') <> 'string')
     OR (p_changes ? 'email' AND jsonb_typeof(p_changes->'email') NOT IN ('null', 'string'))
     OR (p_changes ? 'telefone' AND jsonb_typeof(p_changes->'telefone') NOT IN ('null', 'string'))
     OR (p_changes ? 'endereco' AND jsonb_typeof(p_changes->'endereco') NOT IN ('null', 'string'))
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

  UPDATE public.escolas
  SET nome = next_nome,
      codigo = next_codigo,
      tipo = next_tipo,
      email = next_email,
      telefone = next_telefone,
      endereco = next_endereco,
      ativo = next_ativo
  WHERE id = p_school_id;

  school_id := p_school_id;
  audit_id := public.record_governed_management_audit('school_updated', p_school_id, 'school', p_school_id);
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_governed_school_director(
  p_school_id uuid,
  p_diretor_id uuid DEFAULT NULL
)
RETURNS TABLE (school_id uuid, diretor_id uuid, audit_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  school_row public.escolas%ROWTYPE;
  director_row public.users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.pilot_is_secretariat() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ROLE_DENIED: municipal secretariat authority is required';
  END IF;

  SELECT * INTO school_row
  FROM public.escolas
  WHERE id = p_school_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_SCHOOL_NOT_FOUND: school target was not found';
  END IF;

  IF p_diretor_id IS NOT NULL THEN
    SELECT * INTO director_row
    FROM public.users
    WHERE id = p_diretor_id
    FOR UPDATE;
    IF NOT FOUND OR director_row.ativo IS DISTINCT FROM true OR director_row.tipo_usuario <> 'diretor' THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_DIRECTOR_DENIED: director target must be active';
    END IF;
    IF director_row.escola_id IS NOT NULL AND director_row.escola_id <> p_school_id THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_DIRECTOR_CONFLICT: director already belongs to another school';
    END IF;
  END IF;

  IF school_row.diretor_id IS NOT NULL AND school_row.diretor_id IS DISTINCT FROM p_diretor_id THEN
    UPDATE public.users
    SET escola_id = NULL
    WHERE id = school_row.diretor_id
      AND escola_id = p_school_id;
  END IF;

  IF p_diretor_id IS NOT NULL THEN
    UPDATE public.users
    SET escola_id = p_school_id
    WHERE id = p_diretor_id;
  END IF;

  UPDATE public.escolas
  SET diretor_id = p_diretor_id
  WHERE id = p_school_id;

  school_id := p_school_id;
  diretor_id := p_diretor_id;
  audit_id := public.record_governed_management_audit('school_director_assigned', p_school_id, 'school', p_school_id);
  RETURN NEXT;
END;
$$;

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
    event_name := CASE WHEN p_changes ? 'professor_id' THEN 'class_teacher_assigned' ELSE 'class_updated' END;
  END IF;

  escola_id := target_school_id;
  audit_id := public.record_governed_management_audit(event_name, target_school_id, 'turma', turma_id);
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_governed_enrollment(
  p_aluno_id uuid,
  p_turma_id uuid,
  p_ano_letivo integer,
  p_data_matricula date DEFAULT CURRENT_DATE,
  p_observacoes text DEFAULT NULL
)
RETURNS TABLE (matricula_id uuid, escola_id uuid, audit_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  class_row public.turmas%ROWTYPE;
  student_row public.alunos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_AUTH_REQUIRED: authenticated actor required';
  END IF;

  SELECT * INTO class_row
  FROM public.turmas
  WHERE id = p_turma_id
  FOR UPDATE;
  IF NOT FOUND OR class_row.ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_NOT_FOUND: active class target was not found';
  END IF;
  IF public.pilot_can_manage_school(class_row.escola_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ENROLLMENT_SCHOOL_DENIED: actor cannot manage the target school';
  END IF;

  SELECT * INTO student_row
  FROM public.alunos
  WHERE id = p_aluno_id
  FOR SHARE;
  IF NOT FOUND OR student_row.ativo IS DISTINCT FROM true
     OR student_row.escola_id IS DISTINCT FROM class_row.escola_id THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_STUDENT_DENIED: student must be active in the target school';
  END IF;
  IF p_ano_letivo IS DISTINCT FROM class_row.ano_letivo THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ENROLLMENT_YEAR_DENIED: enrollment year must match the class';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_aluno_id::text || ':' || p_ano_letivo::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.matriculas
    WHERE aluno_id = p_aluno_id
      AND ano_letivo = p_ano_letivo
      AND situacao = 'ativa'
  ) THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ENROLLMENT_CONFLICT: student already has an active enrollment for the school year';
  END IF;

  INSERT INTO public.matriculas (
    aluno_id, turma_id, ano_letivo, data_matricula, situacao, observacoes
  ) VALUES (
    p_aluno_id, p_turma_id, p_ano_letivo, coalesce(p_data_matricula, CURRENT_DATE), 'ativa', NULLIF(btrim(p_observacoes), '')
  )
  RETURNING id INTO matricula_id;

  escola_id := class_row.escola_id;
  audit_id := public.record_governed_management_audit('enrollment_created', class_row.escola_id, 'matricula', matricula_id);
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_governed_enrollment(
  p_matricula_id uuid,
  p_situacao text,
  p_observacoes text DEFAULT NULL
)
RETURNS TABLE (matricula_id uuid, escola_id uuid, audit_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  enrollment_row public.matriculas%ROWTYPE;
  class_row public.turmas%ROWTYPE;
  student_row public.alunos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_AUTH_REQUIRED: authenticated actor required';
  END IF;
  IF p_situacao IS NULL OR p_situacao NOT IN ('ativa', 'transferida', 'concluida', 'cancelada') THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ENROLLMENT_INVALID: enrollment status is invalid';
  END IF;

  SELECT * INTO enrollment_row
  FROM public.matriculas
  WHERE id = p_matricula_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ENROLLMENT_NOT_FOUND: enrollment target was not found';
  END IF;
  SELECT * INTO class_row
  FROM public.turmas
  WHERE id = enrollment_row.turma_id
  FOR UPDATE;
  IF NOT FOUND OR public.pilot_can_manage_school(class_row.escola_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PILOT_MANAGEMENT_ENROLLMENT_SCHOOL_DENIED: actor cannot manage the enrollment school';
  END IF;

  IF p_situacao = 'ativa' AND enrollment_row.situacao IS DISTINCT FROM 'ativa' THEN
    IF class_row.ativo IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_CLASS_NOT_FOUND: active class target was not found';
    END IF;
    IF enrollment_row.ano_letivo IS DISTINCT FROM class_row.ano_letivo THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_ENROLLMENT_YEAR_DENIED: enrollment year must match the class';
    END IF;
    SELECT * INTO student_row
    FROM public.alunos AS student
    WHERE student.id = enrollment_row.aluno_id
    FOR SHARE;
    IF NOT FOUND OR student_row.ativo IS DISTINCT FROM true
       OR student_row.escola_id IS DISTINCT FROM class_row.escola_id THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_STUDENT_DENIED: student must be active in the target school';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(enrollment_row.aluno_id::text || ':' || enrollment_row.ano_letivo::text, 0));
    IF EXISTS (
      SELECT 1 FROM public.matriculas AS enrollment
      WHERE enrollment.aluno_id = enrollment_row.aluno_id
        AND enrollment.ano_letivo = enrollment_row.ano_letivo
        AND enrollment.situacao = 'ativa'
        AND enrollment.id <> enrollment_row.id
    ) THEN
      RAISE EXCEPTION 'PILOT_MANAGEMENT_ENROLLMENT_CONFLICT: student already has an active enrollment for the school year';
    END IF;
  END IF;

  UPDATE public.matriculas
  SET situacao = p_situacao,
      observacoes = NULLIF(btrim(p_observacoes), '')
  WHERE id = enrollment_row.id;

  matricula_id := enrollment_row.id;
  escola_id := class_row.escola_id;
  audit_id := public.record_governed_management_audit('enrollment_status_changed', class_row.escola_id, 'matricula', enrollment_row.id);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_governed_school(text, text, text, uuid, text, text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_governed_school(uuid, jsonb)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_governed_school_director(uuid, uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.write_governed_turma(uuid, jsonb)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_governed_enrollment(uuid, uuid, integer, date, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_governed_enrollment(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_governed_school(text, text, text, uuid, text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_governed_school(uuid, jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_governed_school_director(uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_governed_turma(uuid, jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_governed_enrollment(uuid, uuid, integer, date, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_governed_enrollment(uuid, text, text)
  TO authenticated;

-- The governed RPCs above are now the only browser mutation seam for schools,
-- classes, and enrollments. RLS remains the independent read boundary.
REVOKE INSERT, UPDATE, DELETE ON public.escolas, public.turmas, public.matriculas FROM authenticated;

COMMIT;
