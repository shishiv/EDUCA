-- =============================================================================
-- seed_demo_validation.sql
--
-- Asserts estruturais sobre o dataset sintetico do sandbox publico (issue #23).
-- Roda apos seed-demo.sql + a saida de emit-verify.ts em um cluster PostgreSQL
-- descartavel (verify-sql.sh). Todas as expectativas tem receipt:
--  - 3 escolas / 5 turmas / 10 professores + 1 admin / 50 alunos: issue #23;
--  - 20 dias letivos: DEMO_SCHOOL_DAYS em attendance-generator.ts;
--  - alerta < 80%: issue #23 + app/lib/reports/bolsa-familia-reports.ts
--    (BOLSA_FAMILIA_THRESHOLD = 80) + configs.frequencia_minima = 80;
--  - marcador: configs.demo_synthetic_marker = 'SYNTHETIC-EDUCA-DEMO'.
-- =============================================================================

BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. Contagens do contrato
-- -----------------------------------------------------------------------------
SELECT pg_temp.assert_true((SELECT count(*) = 3 FROM escolas), '3 escolas');
SELECT pg_temp.assert_true((SELECT count(*) = 11 FROM users), '11 usuarios (1 admin + 10 professores)');
SELECT pg_temp.assert_true((SELECT count(*) = 10 FROM users WHERE tipo_usuario = 'professor'), '10 professores');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM users WHERE email = 'demo@educa.app.br' AND tipo_usuario = 'admin'), '1 admin demo');
SELECT pg_temp.assert_true((SELECT count(*) = 5 FROM turmas), '5 turmas');
SELECT pg_temp.assert_true((SELECT count(*) = 15 FROM disciplinas), '15 disciplinas');
SELECT pg_temp.assert_true((SELECT count(*) = 50 FROM responsaveis), '50 responsaveis');
SELECT pg_temp.assert_true((SELECT count(*) = 50 FROM alunos), '50 alunos');
SELECT pg_temp.assert_true((SELECT count(*) = 50 FROM aluno_responsaveis), '50 vinculos aluno-responsavel');
SELECT pg_temp.assert_true((SELECT count(*) = 50 FROM matriculas), '50 matriculas');
SELECT pg_temp.assert_true((SELECT count(*) = 300 FROM notas), '300 notas');
SELECT pg_temp.assert_true((SELECT count(*) = 15 FROM calendario_escolar), '15 eventos de calendario');
SELECT pg_temp.assert_true(
  (SELECT count(*) FROM conteudo_aula) = (SELECT count(*) FROM sessoes_aula)
    AND (SELECT count(*) FROM conteudo_aula) = 100,
  '100 conteudos canonicos para 100 sessoes geradas'
);

-- -----------------------------------------------------------------------------
-- 2. Relacionamentos
-- -----------------------------------------------------------------------------
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM turmas t LEFT JOIN escolas e ON e.id = t.escola_id WHERE e.id IS NULL), 'toda turma tem escola');
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM matriculas m
   JOIN alunos a ON a.id = m.aluno_id
   JOIN turmas t ON t.id = m.turma_id
   WHERE a.escola_id IS DISTINCT FROM t.escola_id),
  'aluno pertence a escola da propria turma'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM (SELECT aluno_id FROM matriculas GROUP BY aluno_id HAVING count(*) <> 1) x),
  'cada aluno tem exatamente 1 matricula'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM frequencia f
   LEFT JOIN matriculas m ON m.id = f.matricula_id
   LEFT JOIN sessoes_aula s ON s.id = f.sessao_id
   WHERE m.id IS NULL OR s.id IS NULL),
  'toda frequencia tem matricula e sessao'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM frequencia f
   JOIN matriculas m ON m.id = f.matricula_id
   JOIN sessoes_aula s ON s.id = f.sessao_id
   WHERE s.turma_id <> m.turma_id OR s.data_aula <> f.data_aula),
  'frequencia aponta para sessao da mesma turma na mesma data'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM conteudo_aula c
   LEFT JOIN sessoes_aula s ON s.id = c.sessao_id
   LEFT JOIN turmas t ON t.id = s.turma_id
   LEFT JOIN escolas e ON e.id = t.escola_id
   LEFT JOIN users u ON u.id = s.professor_id
   LEFT JOIN disciplinas d ON d.id = s.disciplina_id
   WHERE s.id IS NULL OR t.id IS NULL OR e.id IS NULL OR u.id IS NULL OR d.id IS NULL),
  'cada conteudo usa a sessao, turma, escola, professor e disciplina canonicos'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) FROM sessoes_aula s JOIN conteudo_aula c ON c.sessao_id = s.id) =
    (SELECT count(*) FROM sessoes_aula),
  'cada sessao gerada tem conteudo canonico'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM aluno_responsaveis ar
   LEFT JOIN alunos a ON a.id = ar.aluno_id
   LEFT JOIN responsaveis r ON r.id = ar.responsavel_id
   WHERE a.id IS NULL OR r.id IS NULL),
  'vinculos aluno-responsavel integros'
);

-- -----------------------------------------------------------------------------
-- 3. Marcadores synthetic-only
-- -----------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM configs WHERE chave = 'demo_synthetic_marker' AND valor = 'SYNTHETIC-EDUCA-DEMO'),
  'marcador SYNTHETIC-EDUCA-DEMO presente'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM users WHERE email NOT LIKE '%@educa.app.br'),
  'usuarios do demo usam apenas @educa.app.br'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM responsaveis WHERE email NOT LIKE '%@example.com'),
  'responsaveis usam apenas o dominio reservado example.com'
);

-- -----------------------------------------------------------------------------
-- 4. Caso de alerta Bolsa Familia (< 80%)
-- -----------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  EXISTS (
   SELECT 1
   FROM matriculas m
   JOIN alunos a ON a.id = m.aluno_id
   JOIN frequencia f ON f.matricula_id = m.id
   WHERE a.bolsa_familia = true
   GROUP BY m.id
   HAVING 100.0 * count(*) FILTER (WHERE f.presente) / count(*) < 80
  ),
  'existe aluno bolsa_familia com frequencia < 80% (alerta)'
);
SELECT pg_temp.assert_true(
  (SELECT 100.0 * count(*) FILTER (WHERE presente) / count(*) < 80
   FROM frequencia WHERE matricula_id = '00000000-0000-0000-0000-000000000401'),
  'matricula 401 e o caso designado de alerta (< 80%)'
);

-- -----------------------------------------------------------------------------
-- 5. Datas recentes: a janela termina na data de ancoragem (var psql anchor_date)
-- -----------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT max(data_aula) = :'anchor_date'::date FROM frequencia),
  'a frequencia mais recente termina na ancora'
);

COMMIT;
