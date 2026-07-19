INSERT INTO public.escolas (
  id,
  codigo,
  nome,
  tipo
) VALUES (
  '00000000-0000-0000-0000-000000000021',
  'TESTE-CENSO',
  'Escola Teste Censo',
  'municipal'
);

INSERT INTO public.alunos (
  id,
  nome_completo,
  data_nascimento,
  sexo
) VALUES (
  '00000000-0000-0000-0000-000000000022',
  'Aluno Teste Censo',
  DATE '2015-01-01',
  'M'
);

INSERT INTO public.turmas (
  id,
  nome,
  serie,
  turno,
  ano_letivo,
  escola_id
) VALUES (
  '00000000-0000-0000-0000-000000000023',
  'Turma Teste Censo',
  '1 ano',
  'matutino',
  2026,
  '00000000-0000-0000-0000-000000000021'
);
