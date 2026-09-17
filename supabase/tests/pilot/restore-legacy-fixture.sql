-- Load before 20260914000000 only. A genuine pre-migration finalized report,
-- not a disabled-trigger INSERT pretending to be legacy provenance.
INSERT INTO public.relatorios_descritivos(
  id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status,
  campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons,
  campo_escuta_fala, campo_espacos_tempos, created_by, finalizado_por, finalizado_em
) VALUES (
  '85000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002', 2026, 'primeiro', 'finalizado',
  repeat('legacy synthetic eu ', 4), repeat('legacy synthetic corpo ', 4),
  repeat('legacy synthetic tracos ', 4), repeat('legacy synthetic escuta ', 4),
  repeat('legacy synthetic espacos ', 4),
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002', '2026-07-31T12:00:00Z'
);
