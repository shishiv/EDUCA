BEGIN;

-- This test is the database seam for certificate source truth. It uses only
-- canonical enrollment, session, and attendance rows. It does not construct
-- a certificate from presentation data.
CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

SELECT pg_temp.assert_true(
  to_regclass('public.certificado_emissores') IS NOT NULL
  AND to_regclass('public.certificado_atividades') IS NOT NULL
  AND to_regclass('public.certificado_atividade_sessoes') IS NOT NULL
  AND to_regclass('public.certificados_emitidos') IS NOT NULL,
  'certificate source tables exist'
);

SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.certificado_emissores'::regclass)
  AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.certificado_atividades'::regclass)
  AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.certificado_atividade_sessoes'::regclass)
  AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.certificados_emitidos'::regclass),
  'certificate source tables enable row-level security'
);

INSERT INTO escolas(id, codigo, nome, tipo, ativo)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'CERT-A',
  'Escola Certificate Test',
  'fundamental',
  true
);

INSERT INTO users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES (
  'a2000000-0000-0000-0000-000000000001',
  'Professor Certificate Test',
  'certificate.professor@synthetic.invalid',
  'professor',
  'a1000000-0000-0000-0000-000000000001',
  true
);

INSERT INTO turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id)
VALUES (
  'a3000000-0000-0000-0000-000000000001',
  'Turma Certificate Test',
  '1 ano',
  'matutino',
  2026,
  'a1000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001'
);

INSERT INTO alunos(id, nome_completo, data_nascimento, sexo, escola_id, ativo)
VALUES
  (
    'a4000000-0000-0000-0000-000000000001',
    'Certificate Student Complete Source',
    DATE '2018-01-01',
    'F',
    'a1000000-0000-0000-0000-000000000001',
    true
  ),
  (
    'a4000000-0000-0000-0000-000000000002',
    'Certificate Student Missing Attendance',
    DATE '2018-01-02',
    'M',
    'a1000000-0000-0000-0000-000000000001',
    true
  );

INSERT INTO matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES
  (
    'a5000000-0000-0000-0000-000000000001',
    'a4000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000001',
    2026,
    'ativa'
  ),
  (
    'a5000000-0000-0000-0000-000000000002',
    'a4000000-0000-0000-0000-000000000002',
    'a3000000-0000-0000-0000-000000000001',
    2026,
    'ativa'
  );

INSERT INTO sessoes_aula(
  id,
  turma_id,
  escola_id,
  professor_id,
  data_aula,
  duracao_minutos,
  status,
  conteudo_programatico,
  aberta_em,
  fechada_em,
  travada_em
)
VALUES
  (
    'a6000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001',
    DATE '2026-08-03',
    45,
    'FECHADA',
    'Atividade certificavel parte 1',
    TIMESTAMPTZ '2026-08-03 08:00:00-03',
    TIMESTAMPTZ '2026-08-03 08:45:00-03',
    TIMESTAMPTZ '2026-08-03 08:45:00-03'
  ),
  (
    'a6000000-0000-0000-0000-000000000002',
    'a3000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001',
    DATE '2026-08-04',
    45,
    'FECHADA',
    'Atividade certificavel parte 2',
    TIMESTAMPTZ '2026-08-04 08:00:00-03',
    TIMESTAMPTZ '2026-08-04 08:45:00-03',
    TIMESTAMPTZ '2026-08-04 08:45:00-03'
  );

INSERT INTO frequencia(id, matricula_id, sessao_id, data_aula, status_presenca)
VALUES
  (
    'a7000000-0000-0000-0000-000000000001',
    'a5000000-0000-0000-0000-000000000001',
    'a6000000-0000-0000-0000-000000000001',
    DATE '2026-08-03',
    'P'
  ),
  (
    'a7000000-0000-0000-0000-000000000002',
    'a5000000-0000-0000-0000-000000000001',
    'a6000000-0000-0000-0000-000000000002',
    DATE '2026-08-04',
    'P'
  );

INSERT INTO certificado_emissores(id, escola_id, nome_institucional, identificador_institucional)
VALUES (
  'a8000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Emissor Institucional de Teste',
  'CERTIFICATE-TEST-ISSUER'
);

INSERT INTO escolas(id, codigo, nome, tipo, ativo)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  'CERT-B',
  'Escola Certificate Outra',
  'fundamental',
  true
);

INSERT INTO certificado_emissores(id, escola_id, nome_institucional, identificador_institucional)
VALUES (
  'a8000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000002',
  'Emissor Institucional de Outra Escola',
  'CERTIFICATE-OTHER-ISSUER'
);

INSERT INTO certificado_atividades(id, turma_id, tipo, nome)
VALUES (
  'a9000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001',
  'ATIVIDADE',
  'Atividade certificavel de teste'
);

INSERT INTO certificado_atividade_sessoes(atividade_id, sessao_id)
VALUES
  ('a9000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001'),
  ('a9000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000002');

DO $$
BEGIN
  BEGIN
    INSERT INTO certificados_emitidos(id, atividade_id, matricula_id, emissor_id)
    VALUES (
      'aa000000-0000-0000-0000-000000000004',
      'a9000000-0000-0000-0000-000000000001',
      'a5000000-0000-0000-0000-000000000001',
      'a8000000-0000-0000-0000-000000000002'
    );
    RAISE EXCEPTION 'certificate issuance accepted an issuer from another school';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'CERTIFICATE_ISSUER_SCHOOL_MISMATCH:%' THEN RAISE; END IF;
  END;
END;
$$;

INSERT INTO certificados_emitidos(id, atividade_id, matricula_id, emissor_id, emitido_em)
VALUES (
  'aa000000-0000-0000-0000-000000000001',
  'a9000000-0000-0000-0000-000000000001',
  'a5000000-0000-0000-0000-000000000001',
  'a8000000-0000-0000-0000-000000000001',
  TIMESTAMPTZ '2026-08-05 10:00:00-03'
);

SELECT pg_temp.assert_true(
  (
    SELECT
      c.aluno_id = 'a4000000-0000-0000-0000-000000000001'
      AND c.turma_id = 'a3000000-0000-0000-0000-000000000001'
      AND c.ano_letivo = 2026
      AND c.carga_horaria_comprovada_minutos = 90
      AND c.sessoes_comprovadas = 2
      AND c.frequencias_comprovadas = 2
      AND c.codigo_verificacao = 'EDUCA-CERT-AA000000000000000000000000000001'
      AND c.fonte_fingerprint_sha256 ~ '^[0-9a-f]{64}$'
      AND c.hash_verificacao_sha256 = encode(
        extensions.digest(c.codigo_verificacao || '|' || c.fonte_fingerprint_sha256, 'sha256'),
        'hex'
      )
    FROM certificados_emitidos AS c
    WHERE c.id = 'aa000000-0000-0000-0000-000000000001'
  ),
  'issuance stores its canonical enrollment, workload receipt, and verifiable identifier'
);

SELECT pg_temp.assert_true(
  public.certificado_verificar_fonte('aa000000-0000-0000-0000-000000000001'),
  'complete canonical source verifies after issuance'
);

-- No session source means no certificate. The issuance trigger must reject the
-- row instead of accepting presentation-only activity metadata.
INSERT INTO certificado_atividades(id, turma_id, tipo, nome)
VALUES (
  'a9000000-0000-0000-0000-000000000002',
  'a3000000-0000-0000-0000-000000000001',
  'CURSO',
  'Curso sem sessao comprovada'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO certificados_emitidos(id, atividade_id, matricula_id, emissor_id)
    VALUES (
      'aa000000-0000-0000-0000-000000000002',
      'a9000000-0000-0000-0000-000000000002',
      'a5000000-0000-0000-0000-000000000001',
      'a8000000-0000-0000-0000-000000000001'
    );
    RAISE EXCEPTION 'certificate issuance accepted an activity without session source';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'CERTIFICATE_SOURCE_SESSIONS_REQUIRED:%' THEN RAISE; END IF;
  END;
END;
$$;

-- A linked session alone is not enough. The enrolled student needs one P
-- frequency row for every sourced session before issuance can succeed.
DO $$
BEGIN
  BEGIN
    INSERT INTO certificados_emitidos(id, atividade_id, matricula_id, emissor_id)
    VALUES (
      'aa000000-0000-0000-0000-000000000003',
      'a9000000-0000-0000-0000-000000000001',
      'a5000000-0000-0000-0000-000000000002',
      'a8000000-0000-0000-0000-000000000001'
    );
    RAISE EXCEPTION 'certificate issuance accepted missing attendance source';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'CERTIFICATE_ATTENDANCE_INCOMPLETE:%' THEN RAISE; END IF;
  END;
END;
$$;

-- A certificate issued from an active enrollment remains verifiable after the
-- enrollment advances to a later lifecycle status. The status is an issuance
-- precondition, not a mutable fingerprint input.
UPDATE matriculas
SET situacao = 'concluida'
WHERE id = 'a5000000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
  public.certificado_verificar_fonte('aa000000-0000-0000-0000-000000000001'),
  'later enrollment status preserves the issued certificate receipt'
);

DO $$
BEGIN
  BEGIN
    UPDATE certificados_emitidos
    SET carga_horaria_comprovada_minutos = 1
    WHERE id = 'aa000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'issued certificate source receipt unexpectedly changed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'CERTIFICATE_ISSUANCE_IMMUTABLE:%' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE certificado_atividades
    SET nome = 'Atividade alterada apos emissao'
    WHERE id = 'a9000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'issued certificate activity source unexpectedly changed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'CERTIFICATE_SOURCE_IMMUTABLE:%' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE certificado_atividade_sessoes
    SET atividade_id = 'a9000000-0000-0000-0000-000000000002'
    WHERE atividade_id = 'a9000000-0000-0000-0000-000000000001'
      AND sessao_id = 'a6000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'issued certificate session source unexpectedly moved';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'CERTIFICATE_SOURCE_IMMUTABLE:%' THEN RAISE; END IF;
  END;
END;
$$;

-- Deliberate-break receipt: erase the canonical workload on one closed source
-- session. The verifier must turn red. The attendance guard is disabled only
-- inside this rollback-only test to simulate storage corruption, not a user
-- action. If the workload check is removed from production code, this test
-- fails at "deliberate break did not turn the certificate oracle red".
ALTER TABLE public.sessoes_aula DISABLE TRIGGER attendance_protect_session_state;
UPDATE public.sessoes_aula
SET duracao_minutos = NULL
WHERE id = 'a6000000-0000-0000-0000-000000000002';
ALTER TABLE public.sessoes_aula ENABLE TRIGGER attendance_protect_session_state;

DO $$
BEGIN
  BEGIN
    PERFORM pg_temp.assert_true(
      public.certificado_verificar_fonte('aa000000-0000-0000-0000-000000000001'),
      'deliberate workload removal was not detected'
    );
    RAISE EXCEPTION 'deliberate break did not turn the certificate oracle red';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'assertion failed: deliberate workload removal was not detected' THEN RAISE; END IF;
  END;
END;
$$;

ALTER TABLE public.sessoes_aula DISABLE TRIGGER attendance_protect_session_state;
UPDATE public.sessoes_aula
SET duracao_minutos = 45
WHERE id = 'a6000000-0000-0000-0000-000000000002';
ALTER TABLE public.sessoes_aula ENABLE TRIGGER attendance_protect_session_state;

SELECT pg_temp.assert_true(
  public.certificado_verificar_fonte('aa000000-0000-0000-0000-000000000001'),
  'restoring the canonical workload makes the verifier green again'
);

ROLLBACK;
