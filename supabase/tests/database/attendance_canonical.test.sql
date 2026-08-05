BEGIN;

-- Anchor the fixture once to the database's current São Paulo calendar date.
-- The attendance trigger uses the same expression, so the test is stable
-- across wall-clock days without weakening the current-date contract.
SELECT set_config(
  'educa.attendance_test_date',
  ((now() AT TIME ZONE 'America/Sao_Paulo')::date)::text,
  true
);

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

INSERT INTO escolas(id, codigo, nome, tipo) VALUES
  ('11000000-0000-0000-0000-000000000001','ATT-A','Escola Attendance A','fundamental'),
  ('11000000-0000-0000-0000-000000000002','ATT-B','Escola Attendance B','fundamental');

INSERT INTO users(id, nome, email, tipo_usuario, escola_id, ativo) VALUES
  ('21000000-0000-0000-0000-000000000001','Professor Attendance A','attendance.prof.a@synthetic.invalid','professor','11000000-0000-0000-0000-000000000001',true),
  ('21000000-0000-0000-0000-000000000002','Professor Attendance B','attendance.prof.b@synthetic.invalid','professor','11000000-0000-0000-0000-000000000002',true),
  ('21000000-0000-0000-0000-000000000003','Diretora Attendance A','attendance.dir.a@synthetic.invalid','diretor','11000000-0000-0000-0000-000000000001',true),
  ('21000000-0000-0000-0000-000000000004','Diretora Attendance B','attendance.dir.b@synthetic.invalid','diretor','11000000-0000-0000-0000-000000000002',true),
  ('21000000-0000-0000-0000-000000000005','Secretaria Attendance','attendance.secretaria@synthetic.invalid','secretario',NULL,true),
  ('21000000-0000-0000-0000-000000000006','Admin Attendance','attendance.admin@synthetic.invalid','admin',NULL,true);

INSERT INTO turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id) VALUES
  ('31000000-0000-0000-0000-000000000001','Turma Attendance A','1 ano','matutino',2026,'11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002','Turma Attendance B','1 ano','matutino',2026,'11000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000002');

INSERT INTO alunos(id, nome_completo, data_nascimento, sexo, escola_id) VALUES
  ('41000000-0000-0000-0000-000000000001','Aluno Attendance A','2018-01-01','M','11000000-0000-0000-0000-000000000001'),
  ('41000000-0000-0000-0000-000000000002','Aluno Attendance B','2018-01-01','F','11000000-0000-0000-0000-000000000002');

INSERT INTO matriculas(id, aluno_id, turma_id, ano_letivo, situacao) VALUES
  ('51000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001',2026,'ativa'),
  ('51000000-0000-0000-0000-000000000002','41000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002',2026,'ativa');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000001',true);

-- A professor sees and opens only the titular class. The session date and
-- teacher are later derived by the frequency trigger.
INSERT INTO sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, status,
  aberta_em, conteudo_programatico
) VALUES (
  '61000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  current_setting('educa.attendance_test_date')::date, 'ABERTA', now(), 'Chamada'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM sessoes_aula WHERE id = '61000000-0000-0000-0000-000000000001'),
  'teacher can open the titular class session'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM turmas WHERE id = '31000000-0000-0000-0000-000000000001'),
  'teacher sees the own class'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM turmas WHERE id = '31000000-0000-0000-0000-000000000002'),
  'teacher cannot see another school class'
);

INSERT INTO frequencia(
  id, matricula_id, sessao_id, data_aula, status_presenca,
  presente, professor_id, marcado_por
) VALUES (
  '71000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000001',
  '1900-01-01', 'P', false,
  '21000000-0000-0000-0000-000000000006',
  '21000000-0000-0000-0000-000000000006'
);

SELECT pg_temp.assert_true(
  (SELECT data_aula = current_setting('educa.attendance_test_date')::date AND presente = true
     AND professor_id = '21000000-0000-0000-0000-000000000001'
     AND marcado_por = '21000000-0000-0000-0000-000000000001'
   FROM frequencia WHERE id = '71000000-0000-0000-0000-000000000001'),
  'frequency derives date, teacher and actor from the server context'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO frequencia(matricula_id, sessao_id, data_aula, status_presenca)
    VALUES ('51000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001',current_setting('educa.attendance_test_date')::date,'P');
    RAISE EXCEPTION 'duplicate frequency row unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END;
$$;

-- A second session on the same day is allowed after the first one closes.
UPDATE sessoes_aula
SET status = 'FECHADA', fechada_em = now()
WHERE id = '61000000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
  (SELECT status = 'FECHADA' AND hash_legal IS NOT NULL AND travada_em IS NOT NULL
   FROM sessoes_aula WHERE id = '61000000-0000-0000-0000-000000000001'),
  'closing creates an immutable session hash and lock timestamp'
);

DO $$
BEGIN
  BEGIN
    UPDATE frequencia SET status_presenca = 'F'
    WHERE id = '71000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'closed attendance update unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'ATTENDANCE_SESSION_IMMUTABLE:%' THEN RAISE; END IF;
  END;
END;
$$;

INSERT INTO sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, status,
  aberta_em, conteudo_programatico
) VALUES (
  '61000000-0000-0000-0000-000000000002',
  '31000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  current_setting('educa.attendance_test_date')::date, 'ABERTA', now(), 'Chamada'
);

INSERT INTO frequencia(
  id, matricula_id, sessao_id, data_aula, status_presenca,
  presente, professor_id, marcado_por
) VALUES (
  '71000000-0000-0000-0000-000000000002',
  '51000000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000002',
  current_setting('educa.attendance_test_date')::date, 'F', true,
  '21000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM frequencia WHERE matricula_id = '51000000-0000-0000-0000-000000000001'),
  'two sessions on one day preserve two session-scoped rows'
);

-- Director can review, mark and close within the school. A secretary and an
-- admin can read the same rows but cannot write attendance state.
SELECT set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM sessoes_aula WHERE turma_id = '31000000-0000-0000-0000-000000000001'),
  'director reads all sessions in the own school'
);
UPDATE frequencia
SET status_presenca = 'J', justificativa = 'Justificativa da direção'
WHERE id = '71000000-0000-0000-0000-000000000002';
UPDATE sessoes_aula
SET status = 'FECHADA', fechada_em = now()
WHERE id = '61000000-0000-0000-0000-000000000002';

SELECT set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000005',true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM sessoes_aula WHERE turma_id = '31000000-0000-0000-0000-000000000001'),
  'secretariat can view attendance sessions across schools'
);
DO $$
BEGIN
  BEGIN
    UPDATE sessoes_aula SET status = 'ABERTA'
    WHERE id = '61000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'secretariat session update unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000006',true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM frequencia WHERE matricula_id = '51000000-0000-0000-0000-000000000001'),
  'admin can view attendance history'
);
DO $$
BEGIN
  BEGIN
    INSERT INTO sessoes_aula(
      turma_id, escola_id, professor_id, data_aula, status, conteudo_programatico
    ) VALUES (
      '31000000-0000-0000-0000-000000000001',
      '11000000-0000-0000-0000-000000000001',
      '21000000-0000-0000-0000-000000000001',
      current_setting('educa.attendance_test_date')::date, 'ABERTA', 'Chamada'
    );
    RAISE EXCEPTION 'admin session insert unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000004',true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM sessoes_aula WHERE escola_id = '11000000-0000-0000-0000-000000000001'),
  'director from another school cannot read foreign attendance'
);

RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 3 FROM audit_trail WHERE tabela IN ('sessoes_aula', 'frequencia')),
  'attendance session and record changes create audit trail rows'
);

ROLLBACK;
