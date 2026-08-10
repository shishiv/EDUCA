BEGIN;

-- This test is the independent PostgreSQL oracle for the content-report
-- contract. It does not call application code or reuse its query builder.
CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.content_report_rows(filter_code text)
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT count(*)
  FROM conteudo_aula c
  JOIN sessoes_aula s ON s.id = c.sessao_id
  JOIN turmas t ON t.id = s.turma_id
  JOIN escolas e ON e.id = t.escola_id
  JOIN users u ON u.id = s.professor_id
  JOIN disciplinas d ON d.id = s.disciplina_id
  WHERE s.data_aula BETWEEN DATE '2026-08-01' AND DATE '2026-08-31'
    AND d.codigo = filter_code
$$;

INSERT INTO escolas(id, codigo, nome, tipo)
VALUES (
  '81000000-0000-0000-0000-000000000001',
  'CR-A',
  'Escola Content Report A',
  'fundamental'
);

INSERT INTO users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES (
  '82000000-0000-0000-0000-000000000001',
  'Professor Content Report',
  'content.report@synthetic.invalid',
  'professor',
  '81000000-0000-0000-0000-000000000001',
  true
);

INSERT INTO turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id)
VALUES (
  '83000000-0000-0000-0000-000000000001',
  'Turma Content Report',
  '1 ano',
  'matutino',
  2026,
  '81000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001'
);

INSERT INTO disciplinas(id, codigo, nome, escola_id, ativa)
VALUES
  (
    '84000000-0000-0000-0000-000000000001',
    'MAT',
    'Matematica',
    '81000000-0000-0000-0000-000000000001',
    true
  ),
  (
    '84000000-0000-0000-0000-000000000002',
    'PORT',
    'Portugues',
    '81000000-0000-0000-0000-000000000001',
    true
  );

INSERT INTO sessoes_aula(
  id,
  turma_id,
  escola_id,
  professor_id,
  disciplina_id,
  data_aula,
  inicio_aula,
  fim_aula,
  status,
  conteudo_programatico,
  aberta_em,
  fechada_em,
  travada_em
)
VALUES
  (
    '85000000-0000-0000-0000-000000000001',
    '83000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000001',
    DATE '2026-08-10',
    TIME '08:00',
    TIME '08:50',
    'FECHADA',
    'Adicao',
    TIMESTAMPTZ '2026-08-10 08:00:00-03',
    TIMESTAMPTZ '2026-08-10 08:50:00-03',
    TIMESTAMPTZ '2026-08-10 08:50:00-03'
  ),
  (
    '85000000-0000-0000-0000-000000000002',
    '83000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000002',
    DATE '2026-08-11',
    TIME '09:00',
    TIME '09:50',
    'FECHADA',
    'Leitura',
    TIMESTAMPTZ '2026-08-11 09:00:00-03',
    TIMESTAMPTZ '2026-08-11 09:50:00-03',
    TIMESTAMPTZ '2026-08-11 09:50:00-03'
  );

INSERT INTO conteudo_aula(
  id,
  sessao_id,
  tema,
  objetivo,
  habilidades_bncc,
  metodologia,
  recursos,
  observacoes,
  created_by
)
VALUES
  (
    '86000000-0000-0000-0000-000000000001',
    '85000000-0000-0000-0000-000000000001',
    'Adicao com numeros naturais',
    'Resolver problemas de adicao',
    ARRAY['EF01MA06'],
    'Resolucao colaborativa',
    'Material dourado',
    'Fonte canonica de teste',
    '82000000-0000-0000-0000-000000000001'
  ),
  (
    '86000000-0000-0000-0000-000000000002',
    '85000000-0000-0000-0000-000000000002',
    'Leitura de textos',
    'Localizar informacoes explicitas',
    ARRAY['EF01LP02'],
    'Leitura compartilhada',
    'Livro didatico',
    'Fonte canonica de teste',
    '82000000-0000-0000-0000-000000000001'
  );

-- The independent oracle proves every report fact comes from the same
-- canonical chain: content, session, class, school, teacher, discipline and
-- BNCC skill data.
SELECT pg_temp.assert_true(
  (
    SELECT c.tema = 'Adicao com numeros naturais'
      AND s.data_aula = DATE '2026-08-10'
      AND t.nome = 'Turma Content Report'
      AND e.nome = 'Escola Content Report A'
      AND u.nome = 'Professor Content Report'
      AND d.codigo = 'MAT'
      AND c.habilidades_bncc @> ARRAY['EF01MA06']
    FROM conteudo_aula c
    JOIN sessoes_aula s ON s.id = c.sessao_id
    JOIN turmas t ON t.id = s.turma_id
    JOIN escolas e ON e.id = t.escola_id
    JOIN users u ON u.id = s.professor_id
    JOIN disciplinas d ON d.id = s.disciplina_id
    WHERE c.id = '86000000-0000-0000-0000-000000000001'
  ),
  'content report row joins canonical content/session/class/school/teacher/discipline/BNCC data'
);

SELECT pg_temp.assert_true(
  pg_temp.content_report_rows('MAT') = 1
    AND pg_temp.content_report_rows('PORT') = 1
    AND pg_temp.content_report_rows('CIEN') = 0,
  'discipline filter selects only the canonical session discipline'
);

-- Deliberate break receipt: removing the source row must turn the expected
-- report oracle red. The exception is caught only to prove that the red state
-- occurred inside this otherwise-green test transaction.
DELETE FROM conteudo_aula
WHERE id = '86000000-0000-0000-0000-000000000001';

DO $$
BEGIN
  BEGIN
    PERFORM pg_temp.assert_true(
      pg_temp.content_report_rows('MAT') = 1,
      'deliberate source removal was not detected'
    );
    RAISE EXCEPTION 'deliberate break did not turn the content oracle red';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'assertion failed: deliberate source removal was not detected' THEN
      RAISE;
    END IF;
  END;
END;
$$;

-- Restore the canonical row and prove the same oracle is green again.
INSERT INTO conteudo_aula(
  id,
  sessao_id,
  tema,
  objetivo,
  habilidades_bncc,
  metodologia,
  recursos,
  observacoes,
  created_by
)
VALUES (
  '86000000-0000-0000-0000-000000000001',
  '85000000-0000-0000-0000-000000000001',
  'Adicao com numeros naturais',
  'Resolver problemas de adicao',
  ARRAY['EF01MA06'],
  'Resolucao colaborativa',
  'Material dourado',
  'Fonte canonica de teste',
  '82000000-0000-0000-0000-000000000001'
);

SELECT pg_temp.assert_true(
  pg_temp.content_report_rows('MAT') = 1,
  'restored canonical content makes the report oracle green'
);

ROLLBACK;
