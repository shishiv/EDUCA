-- Performance Test Data Seeding Script
-- Task 5.4: Generate realistic data to validate index performance
-- Creates: 1000 sessions, 30000 attendance records

-- ============================================================================
-- 1. Insert Test Schools (if not exists)
-- ============================================================================

INSERT INTO escolas (id, nome, codigo_inep, municipio, estado, ativo)
VALUES
  (gen_random_uuid(), 'Escola Teste Performance 1', '99999001', 'Fronteira', 'MG', true),
  (gen_random_uuid(), 'Escola Teste Performance 2', '99999002', 'Fronteira', 'MG', true)
ON CONFLICT (codigo_inep) DO NOTHING;

-- ============================================================================
-- 2. Insert Test Teachers (if not exists)
-- ============================================================================

WITH escola AS (
  SELECT id FROM escolas WHERE codigo_inep = '99999001' LIMIT 1
)
INSERT INTO users (id, email, nome, role, escola_id, ativo)
SELECT
  gen_random_uuid(),
  'professor.teste' || i || '@performance.test',
  'Professor Teste ' || i,
  'professor',
  (SELECT id FROM escola),
  true
FROM generate_series(1, 10) AS i
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 3. Insert Test Classes (Turmas)
-- ============================================================================

WITH escola AS (
  SELECT id FROM escolas WHERE codigo_inep = '99999001' LIMIT 1
)
INSERT INTO turmas (id, nome, ano_letivo, turno, escola_id, ativo)
SELECT
  gen_random_uuid(),
  'Turma Teste ' || i || '° Ano - ' || CASE WHEN i % 2 = 0 THEN 'Manhã' ELSE 'Tarde' END,
  2025,
  CASE WHEN i % 2 = 0 THEN 'matutino' ELSE 'vespertino' END,
  (SELECT id FROM escola),
  true
FROM generate_series(1, 20) AS i
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Insert Test Students (Alunos) - 30 per turma = 600 students
-- ============================================================================

WITH escola AS (
  SELECT id FROM escolas WHERE codigo_inep = '99999001' LIMIT 1
),
turmas_teste AS (
  SELECT id, nome FROM turmas WHERE nome LIKE 'Turma Teste%' LIMIT 20
)
INSERT INTO alunos (id, nome, cpf, data_nascimento, escola_id, ativo)
SELECT
  gen_random_uuid(),
  'Aluno Teste ' || (t.row_num * 30 + s.i),
  lpad((t.row_num * 30 + s.i)::text, 11, '0'), -- Fake CPF
  CURRENT_DATE - (10 * 365 + s.i) * INTERVAL '1 day', -- Ages 10-11
  (SELECT id FROM escola),
  true
FROM (
  SELECT id, nome, ROW_NUMBER() OVER (ORDER BY id) as row_num
  FROM turmas_teste
) t
CROSS JOIN generate_series(1, 30) AS s(i)
ON CONFLICT (cpf) DO NOTHING;

-- ============================================================================
-- 5. Insert Matriculas (Enrollments) - Link students to turmas
-- ============================================================================

WITH escola AS (
  SELECT id FROM escolas WHERE codigo_inep = '99999001' LIMIT 1
),
turmas_teste AS (
  SELECT id, nome, ROW_NUMBER() OVER (ORDER BY id) as row_num
  FROM turmas WHERE nome LIKE 'Turma Teste%' LIMIT 20
),
alunos_teste AS (
  SELECT id, nome, ROW_NUMBER() OVER (ORDER BY id) as row_num
  FROM alunos WHERE nome LIKE 'Aluno Teste%'
)
INSERT INTO matriculas (id, aluno_id, turma_id, ano_letivo, status, escola_id)
SELECT
  gen_random_uuid(),
  a.id,
  t.id,
  2025,
  'ativo',
  (SELECT id FROM escola)
FROM alunos_teste a
JOIN turmas_teste t ON ((a.row_num - 1) / 30 + 1) = t.row_num;

-- ============================================================================
-- 6. Insert 1000 Sessions (Sessoes Aula) - 50 per turma
-- ============================================================================

WITH escola AS (
  SELECT id FROM escolas WHERE codigo_inep = '99999001' LIMIT 1
),
turmas_teste AS (
  SELECT id FROM turmas WHERE nome LIKE 'Turma Teste%'
),
professores AS (
  SELECT id FROM users WHERE email LIKE 'professor.teste%' LIMIT 10
)
INSERT INTO sessoes_aula (
  id, turma_id, professor_id, data_aula, conteudo_programatico,
  duracao_minutos, status, inicio_aula, escola_id, documento_oficial
)
SELECT
  gen_random_uuid(),
  t.id,
  (SELECT id FROM professores OFFSET (i % 10) LIMIT 1),
  CURRENT_DATE - (s.day_offset) * INTERVAL '1 day',
  'Conteúdo programático teste ' || s.day_offset,
  50,
  CASE
    WHEN s.day_offset > 30 THEN 'fechada'
    WHEN s.day_offset > 7 THEN 'attendance'
    ELSE 'planning'
  END,
  CURRENT_TIMESTAMP - (s.day_offset) * INTERVAL '1 day',
  (SELECT id FROM escola),
  (s.day_offset > 30)
FROM turmas_teste t
CROSS JOIN (
  SELECT
    ROW_NUMBER() OVER () as i,
    generate_series(1, 50) as day_offset
) s;

-- ============================================================================
-- 7. Insert 30000 Attendance Records (Frequencia) - 30 per session
-- ============================================================================

WITH sessoes_teste AS (
  SELECT sa.id as sessao_id, sa.turma_id, sa.data_aula, sa.status
  FROM sessoes_aula sa
  JOIN turmas t ON t.id = sa.turma_id
  WHERE t.nome LIKE 'Turma Teste%'
),
matriculas_teste AS (
  SELECT m.id, m.aluno_id, m.turma_id
  FROM matriculas m
  JOIN alunos a ON a.id = m.aluno_id
  WHERE a.nome LIKE 'Aluno Teste%'
)
INSERT INTO frequencia (
  id, matricula_id, data_aula, presente, status_presenca,
  aula_id, sessao_id, marcado_em, bloqueado, documento_oficial
)
SELECT
  gen_random_uuid(),
  m.id,
  s.data_aula,
  (random() > 0.15), -- 85% attendance rate
  CASE WHEN (random() > 0.15) THEN 'presente' ELSE 'ausente' END,
  s.sessao_id,
  s.sessao_id,
  s.data_aula + INTERVAL '8 hours',
  (s.status = 'fechada'),
  (s.status = 'fechada')
FROM sessoes_teste s
JOIN matriculas_teste m ON m.turma_id = s.turma_id;

-- ============================================================================
-- 8. Update some sessions to "travada" (locked) status
-- ============================================================================

UPDATE sessoes_aula
SET
  travada_em = data_aula + INTERVAL '18 hours',
  status = 'fechada',
  fim_aula = data_aula + INTERVAL '9 hours',
  documento_oficial = true
WHERE data_aula < CURRENT_DATE - INTERVAL '30 days'
  AND turma_id IN (SELECT id FROM turmas WHERE nome LIKE 'Turma Teste%');

-- ============================================================================
-- 9. Verification Queries
-- ============================================================================

-- Count inserted records
SELECT
  'Sessoes' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'planning') as planning,
  COUNT(*) FILTER (WHERE status = 'attendance') as attendance,
  COUNT(*) FILTER (WHERE status = 'fechada') as fechada,
  COUNT(*) FILTER (WHERE travada_em IS NOT NULL) as travada
FROM sessoes_aula
WHERE turma_id IN (SELECT id FROM turmas WHERE nome LIKE 'Turma Teste%')

UNION ALL

SELECT
  'Frequencia' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE presente = true) as present,
  COUNT(*) FILTER (WHERE presente = false) as absent,
  COUNT(*) FILTER (WHERE bloqueado = true) as locked,
  NULL
FROM frequencia
WHERE sessao_id IN (
  SELECT id FROM sessoes_aula
  WHERE turma_id IN (SELECT id FROM turmas WHERE nome LIKE 'Turma Teste%')
);
