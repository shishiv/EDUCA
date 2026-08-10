-- Certificate issuance source of truth.
--
-- A certificate is issued only from canonical enrollment, class-session, and
-- attendance data. This migration deliberately models issuance evidence only.
-- It does not introduce a certificate renderer or a public verification UI.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Institutional identity used by a certificate issuer. One issuer belongs to
-- one school and is explicit rather than inferred from presentation text.
CREATE TABLE public.certificado_emissores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL UNIQUE REFERENCES public.escolas(id) ON DELETE RESTRICT,
  nome_institucional text NOT NULL CHECK (nullif(btrim(nome_institucional), '') IS NOT NULL),
  identificador_institucional text NOT NULL UNIQUE CHECK (nullif(btrim(identificador_institucional), '') IS NOT NULL),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- An activity or course is scoped to the canonical class whose sessions prove
-- the work. Its title is source data, not certificate-layout copy.
CREATE TABLE public.certificado_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('ATIVIDADE', 'CURSO')),
  nome text NOT NULL CHECK (nullif(btrim(nome), '') IS NOT NULL),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Each closed canonical session can substantiate one certificate activity.
-- The uniqueness rule prevents the same attendance session from being counted
-- toward unrelated certificate activities.
CREATE TABLE public.certificado_atividade_sessoes (
  atividade_id uuid NOT NULL REFERENCES public.certificado_atividades(id) ON DELETE RESTRICT,
  sessao_id uuid NOT NULL REFERENCES public.sessoes_aula(id) ON DELETE RESTRICT,
  PRIMARY KEY (atividade_id, sessao_id),
  UNIQUE (sessao_id)
);

-- The issued record contains a derived, immutable receipt. The trigger fills
-- every receipt field from the canonical source and overwrites caller input.
CREATE TABLE public.certificados_emitidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id uuid NOT NULL REFERENCES public.certificado_atividades(id) ON DELETE RESTRICT,
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id) ON DELETE RESTRICT,
  emissor_id uuid NOT NULL REFERENCES public.certificado_emissores(id) ON DELETE RESTRICT,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE RESTRICT,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  ano_letivo integer NOT NULL,
  carga_horaria_comprovada_minutos bigint NOT NULL CHECK (carga_horaria_comprovada_minutos > 0),
  sessoes_comprovadas bigint NOT NULL CHECK (sessoes_comprovadas > 0),
  frequencias_comprovadas bigint NOT NULL CHECK (frequencias_comprovadas > 0),
  fonte_fingerprint_sha256 text NOT NULL CHECK (fonte_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  codigo_verificacao text NOT NULL UNIQUE CHECK (codigo_verificacao ~ '^EDUCA-CERT-[0-9A-F]+$'),
  hash_verificacao_sha256 text NOT NULL UNIQUE CHECK (hash_verificacao_sha256 ~ '^[0-9a-f]{64}$'),
  emitido_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (atividade_id, matricula_id)
);

CREATE INDEX idx_certificado_atividades_turma ON public.certificado_atividades(turma_id);
CREATE INDEX idx_certificado_atividade_sessoes_atividade ON public.certificado_atividade_sessoes(atividade_id);
CREATE INDEX idx_certificados_emitidos_matricula ON public.certificados_emitidos(matricula_id);
CREATE INDEX idx_certificados_emitidos_emissor ON public.certificados_emitidos(emissor_id);

-- A source session must be a completed, locked canonical session in the
-- activity class, with a positive recorded workload.
CREATE OR REPLACE FUNCTION public.certificado_validar_atividade_sessao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  activity_turma_id uuid;
  session_turma_id uuid;
  session_status text;
  session_closed_at timestamptz;
  session_locked_at timestamptz;
  session_duration_minutes integer;
BEGIN
  SELECT atividade.turma_id
  INTO activity_turma_id
  FROM public.certificado_atividades AS atividade
  WHERE atividade.id = NEW.atividade_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CERTIFICATE_ACTIVITY_NOT_FOUND: activity % does not exist', NEW.atividade_id;
  END IF;

  SELECT
    sessao.turma_id,
    sessao.status,
    sessao.fechada_em,
    sessao.travada_em,
    sessao.duracao_minutos
  INTO
    session_turma_id,
    session_status,
    session_closed_at,
    session_locked_at,
    session_duration_minutes
  FROM public.sessoes_aula AS sessao
  WHERE sessao.id = NEW.sessao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CERTIFICATE_SESSION_NOT_FOUND: session % does not exist', NEW.sessao_id;
  END IF;

  IF session_turma_id IS DISTINCT FROM activity_turma_id THEN
    RAISE EXCEPTION 'CERTIFICATE_SESSION_CLASS_MISMATCH: session % is outside activity class %', NEW.sessao_id, NEW.atividade_id;
  END IF;

  IF session_status IS DISTINCT FROM 'FECHADA'
     OR session_closed_at IS NULL
     OR session_locked_at IS NULL THEN
    RAISE EXCEPTION 'CERTIFICATE_SESSION_NOT_CLOSED: session % is not a closed, locked canonical source', NEW.sessao_id;
  END IF;

  IF session_duration_minutes IS NULL OR session_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'CERTIFICATE_SOURCE_WORKLOAD_INVALID: session % has no positive canonical workload', NEW.sessao_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER certificado_validar_atividade_sessao
BEFORE INSERT OR UPDATE OF atividade_id, sessao_id ON public.certificado_atividade_sessoes
FOR EACH ROW EXECUTE FUNCTION public.certificado_validar_atividade_sessao();

-- Calculate a certificate receipt from canonical rows. This is deliberately
-- the only derivation path used for issuance and later verification. Issuance
-- requires an active enrollment; later verification preserves a valid receipt
-- when that enrollment reaches a later status.
CREATE OR REPLACE FUNCTION public.certificado_calcular_fonte(
  p_atividade_id uuid,
  p_matricula_id uuid,
  p_emissor_id uuid,
  p_exigir_matricula_ativa boolean DEFAULT true
)
RETURNS TABLE (
  aluno_id uuid,
  turma_id uuid,
  ano_letivo integer,
  carga_horaria_comprovada_minutos bigint,
  sessoes_comprovadas bigint,
  frequencias_comprovadas bigint,
  fonte_fingerprint_sha256 text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  activity_row public.certificado_atividades%ROWTYPE;
  enrollment_row public.matriculas%ROWTYPE;
  issuer_row public.certificado_emissores%ROWTYPE;
  class_school_id uuid;
  source_session_count bigint;
  valid_source_session_count bigint;
  source_workload_minutes bigint;
  source_attendance_count bigint;
  source_sessions jsonb;
  source_payload text;
BEGIN
  -- The activity row is the serialization point for issuance and source-map
  -- changes. A source session cannot be appended while a receipt is captured.
  SELECT *
  INTO activity_row
  FROM public.certificado_atividades AS activity
  WHERE activity.id = p_atividade_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CERTIFICATE_ACTIVITY_NOT_FOUND: activity % does not exist', p_atividade_id;
  END IF;

  SELECT *
  INTO enrollment_row
  FROM public.matriculas AS enrollment
  WHERE enrollment.id = p_matricula_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CERTIFICATE_ENROLLMENT_NOT_FOUND: enrollment % does not exist', p_matricula_id;
  END IF;

  IF p_exigir_matricula_ativa
     AND enrollment_row.situacao IS DISTINCT FROM 'ativa' THEN
    RAISE EXCEPTION 'CERTIFICATE_ENROLLMENT_INACTIVE: enrollment % is not active', p_matricula_id;
  END IF;

  IF enrollment_row.turma_id IS DISTINCT FROM activity_row.turma_id THEN
    RAISE EXCEPTION 'CERTIFICATE_ENROLLMENT_CLASS_MISMATCH: enrollment % is outside activity % class', p_matricula_id, p_atividade_id;
  END IF;

  SELECT *
  INTO issuer_row
  FROM public.certificado_emissores AS issuer
  WHERE issuer.id = p_emissor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CERTIFICATE_ISSUER_NOT_FOUND: issuer % does not exist', p_emissor_id;
  END IF;

  SELECT turma.escola_id
  INTO class_school_id
  FROM public.turmas AS turma
  WHERE turma.id = activity_row.turma_id;

  IF class_school_id IS DISTINCT FROM issuer_row.escola_id THEN
    RAISE EXCEPTION 'CERTIFICATE_ISSUER_SCHOOL_MISMATCH: issuer % does not belong to activity % school', p_emissor_id, p_atividade_id;
  END IF;

  SELECT
    count(*)::bigint,
    count(*) FILTER (
      WHERE sessao.status = 'FECHADA'
        AND sessao.fechada_em IS NOT NULL
        AND sessao.travada_em IS NOT NULL
        AND sessao.duracao_minutos > 0
    )::bigint,
    coalesce(sum(sessao.duracao_minutos), 0)::bigint,
    count(frequencia.id) FILTER (WHERE frequencia.status_presenca = 'P')::bigint,
    jsonb_agg(
      jsonb_build_object(
        'sessao_id', sessao.id,
        'data_aula', sessao.data_aula,
        'duracao_minutos', sessao.duracao_minutos,
        'frequencia_id', frequencia.id,
        'status_presenca', frequencia.status_presenca
      )
      ORDER BY sessao.data_aula, sessao.id
    )
  INTO
    source_session_count,
    valid_source_session_count,
    source_workload_minutes,
    source_attendance_count,
    source_sessions
  FROM public.certificado_atividade_sessoes AS activity_session
  JOIN public.sessoes_aula AS sessao ON sessao.id = activity_session.sessao_id
  LEFT JOIN public.frequencia AS frequencia
    ON frequencia.sessao_id = sessao.id
   AND frequencia.matricula_id = enrollment_row.id
  WHERE activity_session.atividade_id = activity_row.id;

  IF source_session_count = 0 THEN
    RAISE EXCEPTION 'CERTIFICATE_SOURCE_SESSIONS_REQUIRED: activity % has no canonical sessions', p_atividade_id;
  END IF;

  IF valid_source_session_count <> source_session_count
     OR source_workload_minutes <= 0 THEN
    RAISE EXCEPTION 'CERTIFICATE_SOURCE_WORKLOAD_INVALID: activity % has an incomplete canonical workload source', p_atividade_id;
  END IF;

  IF source_attendance_count <> source_session_count THEN
    RAISE EXCEPTION 'CERTIFICATE_ATTENDANCE_INCOMPLETE: enrollment % lacks P attendance for every activity session', p_matricula_id;
  END IF;

  source_payload := jsonb_build_object(
    'versao', 'EDUCA_CERTIFICATE_SOURCE_V1',
    'atividade', jsonb_build_object(
      'id', activity_row.id,
      'turma_id', activity_row.turma_id,
      'tipo', activity_row.tipo,
      'nome', activity_row.nome
    ),
    'matricula', jsonb_build_object(
      'id', enrollment_row.id,
      'aluno_id', enrollment_row.aluno_id,
      'turma_id', enrollment_row.turma_id,
      'ano_letivo', enrollment_row.ano_letivo
    ),
    'emissor', jsonb_build_object(
      'id', issuer_row.id,
      'escola_id', issuer_row.escola_id,
      'nome_institucional', issuer_row.nome_institucional,
      'identificador_institucional', issuer_row.identificador_institucional
    ),
    'sessoes', source_sessions
  )::text;

  RETURN QUERY
  SELECT
    enrollment_row.aluno_id,
    enrollment_row.turma_id,
    enrollment_row.ano_letivo,
    source_workload_minutes,
    source_session_count,
    source_attendance_count,
    encode(extensions.digest(source_payload, 'sha256'), 'hex');
END;
$$;

-- Populate the persisted receipt before constraints run. Caller-provided
-- workload, source hash, code, and verification hash are never trusted.
CREATE OR REPLACE FUNCTION public.certificado_preparar_emissao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  source_receipt record;
BEGIN
  NEW.id := coalesce(NEW.id, gen_random_uuid());

  SELECT *
  INTO source_receipt
  FROM public.certificado_calcular_fonte(
    NEW.atividade_id,
    NEW.matricula_id,
    NEW.emissor_id,
    true
  );

  NEW.aluno_id := source_receipt.aluno_id;
  NEW.turma_id := source_receipt.turma_id;
  NEW.ano_letivo := source_receipt.ano_letivo;
  NEW.carga_horaria_comprovada_minutos := source_receipt.carga_horaria_comprovada_minutos;
  NEW.sessoes_comprovadas := source_receipt.sessoes_comprovadas;
  NEW.frequencias_comprovadas := source_receipt.frequencias_comprovadas;
  NEW.fonte_fingerprint_sha256 := source_receipt.fonte_fingerprint_sha256;
  NEW.codigo_verificacao := 'EDUCA-CERT-' || upper(replace(NEW.id::text, '-', ''));
  NEW.hash_verificacao_sha256 := encode(
    extensions.digest(NEW.codigo_verificacao || '|' || NEW.fonte_fingerprint_sha256, 'sha256'),
    'hex'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER certificado_preparar_emissao
BEFORE INSERT ON public.certificados_emitidos
FOR EACH ROW EXECUTE FUNCTION public.certificado_preparar_emissao();

-- An issued certificate is a historical receipt. It cannot be edited or
-- deleted after the source has been captured.
CREATE OR REPLACE FUNCTION public.certificado_bloquear_mutacao_emitida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'CERTIFICATE_ISSUANCE_IMMUTABLE: issued certificates cannot be changed or deleted';
END;
$$;

CREATE TRIGGER certificado_bloquear_mutacao_emitida
BEFORE UPDATE OR DELETE ON public.certificados_emitidos
FOR EACH ROW EXECUTE FUNCTION public.certificado_bloquear_mutacao_emitida();

-- An activity, its session map, and its issuer remain editable only until the
-- first certificate uses them. This keeps every stored fingerprint meaningful.
CREATE OR REPLACE FUNCTION public.certificado_bloquear_mutacao_fonte_emitida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  protected_activity_id uuid;
  replacement_activity_id uuid;
  protected_issuer_id uuid;
  source_in_use boolean;
BEGIN
  IF TG_TABLE_NAME = 'certificado_atividades' THEN
    protected_activity_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  ELSIF TG_TABLE_NAME = 'certificado_atividade_sessoes' THEN
    IF TG_OP = 'INSERT' THEN
      protected_activity_id := NEW.atividade_id;
    ELSIF TG_OP = 'DELETE' THEN
      protected_activity_id := OLD.atividade_id;
    ELSE
      protected_activity_id := OLD.atividade_id;
      replacement_activity_id := NEW.atividade_id;
    END IF;

    PERFORM 1
    FROM public.certificado_atividades AS activity
    WHERE activity.id IN (protected_activity_id, replacement_activity_id)
    FOR UPDATE;
  ELSIF TG_TABLE_NAME = 'certificado_emissores' THEN
    protected_issuer_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.certificados_emitidos AS certificate
    WHERE certificate.atividade_id = protected_activity_id
       OR certificate.atividade_id = replacement_activity_id
       OR certificate.emissor_id = protected_issuer_id
  )
  INTO source_in_use;

  IF source_in_use THEN
    RAISE EXCEPTION 'CERTIFICATE_SOURCE_IMMUTABLE: certificate source cannot change after issuance';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER certificado_bloquear_mutacao_atividade_emitida
BEFORE UPDATE OR DELETE ON public.certificado_atividades
FOR EACH ROW EXECUTE FUNCTION public.certificado_bloquear_mutacao_fonte_emitida();

CREATE TRIGGER certificado_bloquear_mutacao_atividade_sessoes_emitida
BEFORE INSERT OR UPDATE OR DELETE ON public.certificado_atividade_sessoes
FOR EACH ROW EXECUTE FUNCTION public.certificado_bloquear_mutacao_fonte_emitida();

CREATE TRIGGER certificado_bloquear_mutacao_emissor_emitido
BEFORE UPDATE OR DELETE ON public.certificado_emissores
FOR EACH ROW EXECUTE FUNCTION public.certificado_bloquear_mutacao_fonte_emitida();

-- Recompute the receipt and verification hash. Any missing canonical source,
-- workload mutation, or unexpected fingerprint drift returns false.
CREATE OR REPLACE FUNCTION public.certificado_verificar_fonte(p_certificado_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  certificate_row public.certificados_emitidos%ROWTYPE;
  source_receipt record;
  expected_code text;
  expected_hash text;
BEGIN
  SELECT *
  INTO certificate_row
  FROM public.certificados_emitidos AS certificate
  WHERE certificate.id = p_certificado_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  BEGIN
    SELECT *
    INTO source_receipt
    FROM public.certificado_calcular_fonte(
      certificate_row.atividade_id,
      certificate_row.matricula_id,
      certificate_row.emissor_id,
      false
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  expected_code := 'EDUCA-CERT-' || upper(replace(certificate_row.id::text, '-', ''));
  expected_hash := encode(
    extensions.digest(expected_code || '|' || source_receipt.fonte_fingerprint_sha256, 'sha256'),
    'hex'
  );

  RETURN certificate_row.aluno_id IS NOT DISTINCT FROM source_receipt.aluno_id
    AND certificate_row.turma_id IS NOT DISTINCT FROM source_receipt.turma_id
    AND certificate_row.ano_letivo IS NOT DISTINCT FROM source_receipt.ano_letivo
    AND certificate_row.carga_horaria_comprovada_minutos IS NOT DISTINCT FROM source_receipt.carga_horaria_comprovada_minutos
    AND certificate_row.sessoes_comprovadas IS NOT DISTINCT FROM source_receipt.sessoes_comprovadas
    AND certificate_row.frequencias_comprovadas IS NOT DISTINCT FROM source_receipt.frequencias_comprovadas
    AND certificate_row.fonte_fingerprint_sha256 IS NOT DISTINCT FROM source_receipt.fonte_fingerprint_sha256
    AND certificate_row.codigo_verificacao IS NOT DISTINCT FROM expected_code
    AND certificate_row.hash_verificacao_sha256 IS NOT DISTINCT FROM expected_hash;
END;
$$;

ALTER TABLE public.certificado_emissores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificado_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificado_atividade_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_emitidos ENABLE ROW LEVEL SECURITY;

-- Rendering and public verification are deliberately deferred. Until their
-- authorization contract exists, only the service role may access this model.
REVOKE ALL ON TABLE public.certificado_emissores FROM anon, authenticated;
REVOKE ALL ON TABLE public.certificado_atividades FROM anon, authenticated;
REVOKE ALL ON TABLE public.certificado_atividade_sessoes FROM anon, authenticated;
REVOKE ALL ON TABLE public.certificados_emitidos FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.certificado_emissores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.certificado_atividades TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.certificado_atividade_sessoes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.certificados_emitidos TO service_role;

REVOKE ALL ON FUNCTION public.certificado_validar_atividade_sessao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.certificado_calcular_fonte(uuid, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.certificado_preparar_emissao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.certificado_bloquear_mutacao_emitida() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.certificado_bloquear_mutacao_fonte_emitida() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.certificado_verificar_fonte(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.certificado_calcular_fonte(uuid, uuid, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.certificado_verificar_fonte(uuid) TO service_role;

COMMIT;
