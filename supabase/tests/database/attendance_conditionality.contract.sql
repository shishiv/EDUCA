BEGIN;

-- This contract runs against canonical migrations without the pilot high-risk
-- field guard. It uses synthetic records only and never touches the public
-- sandbox. The application-facing contract is the PostgreSQL RPC below.

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

-- The isolated test connects as the database owner so it can create the second
-- synthetic municipality fixture without changing the production guard.

-- ---------------------------------------------------------------------------
-- Municipality scope and persisted fallback
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.attendance_municipal_thresholds WHERE is_fallback),
  'one persisted fallback margin exists for the bootstrap municipality'
);
SELECT pg_temp.assert_true(
  (SELECT municipal_critical_percent = 80 AND municipal_warning_percent = 85
   FROM public.resolve_municipal_attendance_margin(
     (SELECT id FROM public.pilot_municipality_config ORDER BY created_at, id LIMIT 1),
     DATE '2026-08-31'
   )),
  'resolver returns the persisted fallback when no dated row applies'
);

-- Add a second municipality only inside this isolated raw PostgreSQL contract.
-- The pilot product remains one dedicated project per municipality.
ALTER TABLE public.pilot_municipality_config DISABLE TRIGGER pilot_single_municipality_guard;
INSERT INTO public.pilot_municipality_config(id, municipality_slug)
VALUES ('12000000-0000-0000-0000-000000000002', 'contract-municipality-b');
ALTER TABLE public.pilot_municipality_config ENABLE TRIGGER pilot_single_municipality_guard;

INSERT INTO public.escolas(id, codigo, nome, tipo, municipio_id)
VALUES
  (
    '12000000-0000-0000-0000-000000000001',
    'COND-A',
    'Escola Conditionality A',
    'fundamental',
    (SELECT id FROM public.pilot_municipality_config ORDER BY created_at, id LIMIT 1)
  ),
  (
    '12000000-0000-0000-0000-000000000003',
    'COND-B',
    'Escola Conditionality B',
    'fundamental',
    '12000000-0000-0000-0000-000000000002'
  );

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES
  (
    '12000000-0000-0000-0000-000000000010',
    'Secretaria Conditionality',
    'conditionality.secretaria@synthetic.invalid',
    'secretario',
    NULL,
    true
  ),
  (
    '12000000-0000-0000-0000-000000000011',
    'Professor Conditionality A',
    'conditionality.professor.a@synthetic.invalid',
    'professor',
    '12000000-0000-0000-0000-000000000001',
    true
  ),
  (
    '12000000-0000-0000-0000-000000000012',
    'Professor Conditionality B',
    'conditionality.professor.b@synthetic.invalid',
    'professor',
    '12000000-0000-0000-0000-000000000003',
    true
  );

INSERT INTO public.attendance_municipal_thresholds(
  municipality_id,
  valid_from,
  valid_until,
  precedence,
  municipal_warning_percent,
  municipal_critical_percent,
  defined_by,
  source,
  is_fallback
)
VALUES
  (
    (SELECT id FROM public.pilot_municipality_config ORDER BY created_at, id LIMIT 1),
    DATE '2026-08-01',
    DATE '2026-08-31',
    10,
    82,
    77,
    '12000000-0000-0000-0000-000000000010',
    'municipal_contract_low_precedence',
    false
  ),
  (
    (SELECT id FROM public.pilot_municipality_config ORDER BY created_at, id LIMIT 1),
    DATE '2026-08-01',
    DATE '2026-08-31',
    20,
    92,
    88,
    '12000000-0000-0000-0000-000000000010',
    'municipal_contract_high_precedence',
    false
  ),
  (
    '12000000-0000-0000-0000-000000000002',
    DATE '2026-08-01',
    DATE '2026-08-31',
    10,
    65,
    55,
    '12000000-0000-0000-0000-000000000010',
    'municipal_contract_b',
    false
  );

SELECT pg_temp.assert_true(
  (SELECT municipal_critical_percent = 88
          AND municipal_warning_percent = 92
          AND precedence = 20
          AND is_fallback = false
   FROM public.resolve_municipal_attendance_margin(
     (SELECT id FROM public.pilot_municipality_config ORDER BY created_at, id LIMIT 1),
     DATE '2026-08-15'
   )),
  'dated municipality margin wins by explicit precedence'
);
SELECT pg_temp.assert_true(
  (SELECT municipal_critical_percent = 55
          AND municipal_warning_percent = 65
          AND municipality_id = '12000000-0000-0000-0000-000000000002'
   FROM public.resolve_municipal_attendance_margin(
     '12000000-0000-0000-0000-000000000002',
     DATE '2026-08-15'
   )),
  'municipality B resolves its own persisted margin'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 4 FROM public.attendance_municipal_threshold_audit),
  'every persisted margin definition has an audit snapshot'
);

-- ---------------------------------------------------------------------------
-- Matrículas and attendance fixture
-- ---------------------------------------------------------------------------
INSERT INTO public.turmas(
  id, nome, serie, turno, ano_letivo, capacidade, escola_id, professor_id,
  ativo, etapa_ensino
)
VALUES
  (
    '12000000-0000-0000-0000-000000000021',
    'Turma 4 a 6',
    'Educação Infantil',
    'matutino',
    2026,
    30,
    '12000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000011',
    true,
    'EI'
  ),
  (
    '12000000-0000-0000-0000-000000000022',
    'Turma 6 a 18 sem conclusão',
    '2º Ano',
    'vespertino',
    2026,
    30,
    '12000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000011',
    true,
    'AI'
  ),
  (
    '12000000-0000-0000-0000-000000000023',
    'Turma concluinte atual',
    '3º Ano Ensino Médio',
    'noturno',
    2026,
    30,
    '12000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000011',
    true,
    'EM'
  ),
  (
    '12000000-0000-0000-0000-000000000024',
    'Turma 6 a 18 Município B',
    '2º Ano',
    'matutino',
    2026,
    30,
    '12000000-0000-0000-0000-000000000003',
    '12000000-0000-0000-0000-000000000012',
    true,
    'AI'
  ),
  (
    '12000000-0000-0000-0000-000000000025',
    'Histórico concluído Ensino Médio',
    '3º Ano Ensino Médio',
    'noturno',
    2025,
    30,
    '12000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000011',
    true,
    'EM'
  );

INSERT INTO public.alunos(
  id, nome_completo, data_nascimento, sexo, nis, bolsa_familia, escola_id, ativo
)
VALUES
  (
    '12000000-0000-0000-0000-000000000031',
    'Aluno faixa 4 a 6',
    DATE '2021-01-01',
    'M',
    'COND-NIS-031',
    true,
    '12000000-0000-0000-0000-000000000001',
    true
  ),
  (
    '12000000-0000-0000-0000-000000000032',
    'Aluno faixa 6 a 18',
    DATE '2019-01-01',
    'F',
    'COND-NIS-032',
    true,
    '12000000-0000-0000-0000-000000000001',
    true
  ),
  (
    '12000000-0000-0000-0000-000000000033',
    'Aluno com básica concluída',
    DATE '2009-01-01',
    'M',
    'COND-NIS-033',
    true,
    '12000000-0000-0000-0000-000000000001',
    true
  ),
  (
    '12000000-0000-0000-0000-000000000034',
    'Aluno município B',
    DATE '2019-01-01',
    'F',
    'COND-NIS-034',
    true,
    '12000000-0000-0000-0000-000000000003',
    true
  );

INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES
  (
    '12000000-0000-0000-0000-000000000041',
    '12000000-0000-0000-0000-000000000031',
    '12000000-0000-0000-0000-000000000021',
    2026,
    'ativa'
  ),
  (
    '12000000-0000-0000-0000-000000000042',
    '12000000-0000-0000-0000-000000000032',
    '12000000-0000-0000-0000-000000000022',
    2026,
    'ativa'
  ),
  (
    '12000000-0000-0000-0000-000000000043',
    '12000000-0000-0000-0000-000000000033',
    '12000000-0000-0000-0000-000000000023',
    2026,
    'ativa'
  ),
  (
    '12000000-0000-0000-0000-000000000044',
    '12000000-0000-0000-0000-000000000034',
    '12000000-0000-0000-0000-000000000024',
    2026,
    'ativa'
  ),
  (
    '12000000-0000-0000-0000-000000000045',
    '12000000-0000-0000-0000-000000000033',
    '12000000-0000-0000-0000-000000000025',
    2025,
    'concluida'
  );

INSERT INTO public.sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, status,
  aberta_em, fechada_em, travada_em, conteudo_programatico
)
SELECT
  gen_random_uuid(),
  class.id,
  class.escola_id,
  class.professor_id,
  day::date,
  'FECHADA',
  timestamptz '2026-08-01 08:00:00+00',
  timestamptz '2026-08-01 12:00:00+00',
  timestamptz '2026-08-01 12:00:00+00',
  'Contrato de condicionalidade'
FROM public.turmas AS class
CROSS JOIN generate_series(
  DATE '2026-08-01',
  DATE '2026-08-10',
  INTERVAL '1 day'
) AS day
WHERE class.id IN (
  '12000000-0000-0000-0000-000000000021',
  '12000000-0000-0000-0000-000000000022',
  '12000000-0000-0000-0000-000000000023',
  '12000000-0000-0000-0000-000000000024'
);

INSERT INTO public.frequencia(
  id, matricula_id, sessao_id, data_aula, status_presenca, presente
)
SELECT
  gen_random_uuid(),
  enrollment.id,
  session.id,
  session.data_aula,
  CASE
    WHEN enrollment.id = '12000000-0000-0000-0000-000000000041'
      THEN CASE WHEN session.data_aula <= DATE '2026-08-05' THEN 'P' ELSE 'F' END
    WHEN enrollment.id = '12000000-0000-0000-0000-000000000042'
      THEN CASE WHEN session.data_aula <= DATE '2026-08-07' THEN 'P' ELSE 'F' END
    WHEN enrollment.id = '12000000-0000-0000-0000-000000000043'
      THEN CASE WHEN session.data_aula <= DATE '2026-08-04' THEN 'P' ELSE 'F' END
    ELSE CASE WHEN session.data_aula <= DATE '2026-08-06' THEN 'P' ELSE 'F' END
  END,
  false
FROM public.matriculas AS enrollment
JOIN public.sessoes_aula AS session ON session.turma_id = enrollment.turma_id
WHERE enrollment.id IN (
  '12000000-0000-0000-0000-000000000041',
  '12000000-0000-0000-0000-000000000042',
  '12000000-0000-0000-0000-000000000043',
  '12000000-0000-0000-0000-000000000044'
);

-- ---------------------------------------------------------------------------
-- Beneficiary selection contract: 26 of 50 active enrollments have the
-- boolean benefit flag. Every fixture student has a synthetic NIS, so a
-- deliberate return to NIS-based selection makes the 26-row assertion red.
-- ---------------------------------------------------------------------------
INSERT INTO public.turmas(
  id, nome, serie, turno, ano_letivo, capacidade, escola_id, professor_id,
  ativo, etapa_ensino
)
VALUES (
  '12000000-0000-0000-0000-000000000026',
  'Turma seleção Bolsa Família',
  '2º Ano',
  'matutino',
  2026,
  60,
  '12000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000011',
  true,
  'AI'
);

INSERT INTO public.alunos(
  id, nome_completo, data_nascimento, sexo, nis, bolsa_familia, escola_id, ativo
)
SELECT
  ('12000000-0000-0000-0000-' || lpad((100 + student_number)::text, 12, '0'))::uuid,
  format('Aluno seleção BF %s', lpad(student_number::text, 2, '0')),
  DATE '2018-01-01',
  CASE WHEN student_number % 2 = 0 THEN 'F' ELSE 'M' END,
  'COND-BF-NIS-' || lpad(student_number::text, 3, '0'),
  student_number <= 26,
  '12000000-0000-0000-0000-000000000001',
  true
FROM generate_series(1, 51) AS fixture(student_number);

INSERT INTO public.matriculas(
  id, aluno_id, turma_id, ano_letivo, situacao
)
SELECT
  ('12000000-0000-0000-0000-' || lpad((200 + student_number)::text, 12, '0'))::uuid,
  ('12000000-0000-0000-0000-' || lpad((100 + student_number)::text, 12, '0'))::uuid,
  '12000000-0000-0000-0000-000000000026',
  2026,
  CASE WHEN student_number = 51 THEN 'cancelada' ELSE 'ativa' END
FROM generate_series(1, 51) AS fixture(student_number);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 50
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01', DATE '2026-08-31', NULL,
     '12000000-0000-0000-0000-000000000026'
   )),
  'beneficiary fixture contains exactly 50 active enrollment rows'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) FILTER (WHERE is_bolsa_familia) = 26
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01', DATE '2026-08-31', NULL,
     '12000000-0000-0000-0000-000000000026'
   )),
  'beneficiary selection uses bolsa_familia=true: 26 of 50 active rows'
);
SELECT pg_temp.assert_true(
  (SELECT is_bolsa_familia = false
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01', DATE '2026-08-31', NULL,
     '12000000-0000-0000-0000-000000000026'
   )
   WHERE nis = 'COND-BF-NIS-027'),
  'an active student with NIS but bolsa_familia=false stays outside selection'
);
SELECT pg_temp.assert_true(
  (SELECT NOT EXISTS (
     SELECT 1
     FROM public.get_attendance_conditionality(
       DATE '2026-08-01', DATE '2026-08-31', NULL,
       '12000000-0000-0000-0000-000000000026'
     )
     WHERE nis = 'COND-BF-NIS-051'
   )),
  'a bolsa_familia student with an inactive matrícula stays outside selection'
);

-- ---------------------------------------------------------------------------
-- Legal floors and municipal margins through the canonical read model
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT idade_anos = 5
          AND piso_legal_percent = 60
          AND condicionalidade_legal = '4_A_6_ANOS_INCOMPLETOS'
          AND condicionalidade_legal_status = 'CRITICO'
          AND margem_municipal_critica_percent = 88
          AND margem_municipal_alerta_percent = 92
          AND margem_municipal_status = 'CRITICO'
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01', DATE '2026-08-31',
     '12000000-0000-0000-0000-000000000001', NULL
   )
   WHERE matricula_id = '12000000-0000-0000-0000-000000000041'),
  '4 to 6 incomplete uses the legal 60 percent floor and never the 75 percent floor'
);
SELECT pg_temp.assert_true(
  (SELECT idade_anos = 7
          AND piso_legal_percent = 75
          AND condicionalidade_legal = '6_A_18_ANOS_INCOMPLETOS_SEM_CONCLUSAO_DA_EDUCACAO_BASICA'
          AND educacao_basica_concluida = false
          AND condicionalidade_legal_status = 'CRITICO'
          AND percentual_frequencia = 70
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01', DATE '2026-08-31',
     '12000000-0000-0000-0000-000000000001', NULL
   )
   WHERE matricula_id = '12000000-0000-0000-0000-000000000042'),
  '6 to 18 incomplete without basic education completion uses the legal 75 percent floor'
);
SELECT pg_temp.assert_true(
  (SELECT educacao_basica_concluida = true
          AND piso_legal_percent IS NULL
          AND condicionalidade_legal_status = 'NAO_APLICAVEL'
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01', DATE '2026-08-31',
     '12000000-0000-0000-0000-000000000001', NULL
   )
   WHERE matricula_id = '12000000-0000-0000-0000-000000000043'),
  'completion is derived from a concluded Ensino Médio matrícula and disables the 75 percent rule'
);
SELECT pg_temp.assert_true(
  (SELECT margem_municipal_critica_percent = 55
          AND margem_municipal_alerta_percent = 65
          AND margem_municipal_status = 'ALERTA'
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01', DATE '2026-08-31',
     '12000000-0000-0000-0000-000000000003', NULL
   )
   WHERE matricula_id = '12000000-0000-0000-0000-000000000044'),
  'municipality B uses its own early-warning margin instead of municipality A'
);

SELECT pg_temp.assert_true(
  (SELECT reloptions @> ARRAY['security_invoker=true']
   FROM pg_class
   WHERE oid = 'public.vw_frequencia_condicionalidade'::regclass),
  'canonical read model view applies caller RLS'
);

-- Exercise the same RPC as the authenticated application roles. This is the
-- boundary that catches a view or function accidentally bypassing school RLS.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000010',true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 54
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01', DATE '2026-08-31', NULL, NULL
   )),
  'municipal secretariat reads all active scoped municipality rows through the RPC'
);
SELECT set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000011',true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 53
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01', DATE '2026-08-31', NULL, NULL
   )),
  'school teacher reads only the own school active rows through the RPC'
);

RESET ROLE;
ROLLBACK;
