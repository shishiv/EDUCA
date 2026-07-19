BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(15);

INSERT INTO public.escolas (
  id,
  codigo,
  nome,
  tipo,
  localizacao_diferenciada
) VALUES (
  '00000000-0000-0000-0000-000000000021',
  'TESTE-CENSO',
  'Escola Teste Censo',
  'municipal',
  'nenhuma'
);

INSERT INTO public.alunos (
  id,
  nome_completo,
  data_nascimento,
  sexo,
  cor_raca,
  tipo_deficiencia
) VALUES (
  '00000000-0000-0000-0000-000000000022',
  'Aluno Teste Censo',
  DATE '2015-01-01',
  'M',
  'parda',
  ARRAY['surdez']
);

INSERT INTO public.turmas (
  id,
  nome,
  serie,
  turno,
  ano_letivo,
  escola_id,
  etapa_ensino
) VALUES (
  '00000000-0000-0000-0000-000000000023',
  'Turma Teste Censo',
  '1 ano',
  'matutino',
  2026,
  '00000000-0000-0000-0000-000000000021',
  'AI'
);

SELECT is(
  (SELECT zona_residencial FROM public.alunos WHERE id = '00000000-0000-0000-0000-000000000022'),
  'urbana',
  'alunos.zona_residencial defaults to urbana'
);
SELECT is(
  (SELECT transporte_escolar FROM public.alunos WHERE id = '00000000-0000-0000-0000-000000000022'),
  false,
  'alunos.transporte_escolar defaults to false'
);
SELECT is(
  (SELECT tipo_mediacao FROM public.turmas WHERE id = '00000000-0000-0000-0000-000000000023'),
  'presencial',
  'turmas.tipo_mediacao defaults to presencial'
);
SELECT is(
  (SELECT tempo_integral FROM public.turmas WHERE id = '00000000-0000-0000-0000-000000000023'),
  false,
  'turmas.tempo_integral defaults to false'
);
SELECT is(
  (SELECT in_biblioteca FROM public.escolas WHERE id = '00000000-0000-0000-0000-000000000021'),
  false,
  'escolas.in_biblioteca defaults to false'
);
SELECT is(
  (SELECT in_laboratorio_informatica FROM public.escolas WHERE id = '00000000-0000-0000-0000-000000000021'),
  false,
  'escolas.in_laboratorio_informatica defaults to false'
);
SELECT is(
  (SELECT in_internet FROM public.escolas WHERE id = '00000000-0000-0000-0000-000000000021'),
  false,
  'escolas.in_internet defaults to false'
);
SELECT is(
  (SELECT in_acessibilidade FROM public.escolas WHERE id = '00000000-0000-0000-0000-000000000021'),
  false,
  'escolas.in_acessibilidade defaults to false'
);
SELECT is(
  (SELECT in_quadra_esportes FROM public.escolas WHERE id = '00000000-0000-0000-0000-000000000021'),
  false,
  'escolas.in_quadra_esportes defaults to false'
);
SELECT is(
  (SELECT in_refeitorio FROM public.escolas WHERE id = '00000000-0000-0000-0000-000000000021'),
  false,
  'escolas.in_refeitorio defaults to false'
);

SELECT throws_like(
  $$INSERT INTO public.alunos (nome_completo, data_nascimento, sexo, cor_raca)
    VALUES ('Cor invalida', DATE '2015-01-01', 'F', 'azul')$$,
  '%violates check constraint "alunos_cor_raca_check"%',
  'alunos.cor_raca rejects unsupported values'
);
SELECT throws_like(
  $$INSERT INTO public.alunos (nome_completo, data_nascimento, sexo, zona_residencial)
    VALUES ('Zona invalida', DATE '2015-01-01', 'F', 'maritima')$$,
  '%violates check constraint "alunos_zona_residencial_check"%',
  'alunos.zona_residencial rejects unsupported values'
);
SELECT throws_like(
  $$INSERT INTO public.turmas (nome, serie, turno, ano_letivo, escola_id, etapa_ensino)
    VALUES ('Etapa invalida', '1 ano', 'matutino', 2026,
      '00000000-0000-0000-0000-000000000021', 'SUPERIOR')$$,
  '%violates check constraint "turmas_etapa_ensino_check"%',
  'turmas.etapa_ensino rejects unsupported values'
);
SELECT throws_like(
  $$INSERT INTO public.turmas (nome, serie, turno, ano_letivo, escola_id, tipo_mediacao)
    VALUES ('Mediacao invalida', '1 ano', 'matutino', 2026,
      '00000000-0000-0000-0000-000000000021', 'hibrido')$$,
  '%violates check constraint "turmas_tipo_mediacao_check"%',
  'turmas.tipo_mediacao rejects unsupported values'
);
SELECT throws_like(
  $$INSERT INTO public.escolas (codigo, nome, tipo, localizacao_diferenciada)
    VALUES ('TESTE-CENSO-INVALIDO', 'Localizacao invalida', 'municipal', 'ribeirinha')$$,
  '%violates check constraint "escolas_localizacao_diferenciada_check"%',
  'escolas.localizacao_diferenciada rejects unsupported values'
);

SELECT * FROM finish();
ROLLBACK;
