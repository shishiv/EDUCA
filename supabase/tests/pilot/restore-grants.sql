-- Contract from 20260829000000_sensitive_family_read_boundary.sql.
-- A table SELECT would also authorize CPF/NIS and must never satisfy this probe.
WITH allowed(column_name) AS (
  VALUES ('id'), ('escola_id'), ('nome_completo'), ('data_nascimento'),
    ('sexo'), ('rg'), ('telefone'), ('email'), ('endereco'), ('responsavel_id'),
    ('ativo'), ('created_at'), ('cor_raca'), ('zona_residencial'),
    ('transporte_escolar'), ('tipo_deficiencia'), ('import_source_id'),
    ('pilot_import_batch_id')
)
SELECT
  NOT has_table_privilege('authenticated', 'public.alunos', 'SELECT')
  AND NOT EXISTS (
    SELECT 1 FROM allowed
    WHERE NOT has_column_privilege('authenticated', 'public.alunos', column_name, 'SELECT')
  )
  -- Deny every other column, including CPF, NIS, PBF and family-sensitive fields.
  AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.alunos'::regclass AND attnum > 0 AND NOT attisdropped
      AND attname NOT IN (SELECT column_name FROM allowed)
      AND has_column_privilege('authenticated', attrelid, attnum, 'SELECT')
  )
  AND NOT has_any_column_privilege('anon', 'public.alunos', 'SELECT')
  AND has_table_privilege('authenticated', 'public.frequencia', 'INSERT')
  AND has_table_privilege('authenticated', 'storage.objects', 'SELECT')
  AND NOT has_any_column_privilege('authenticated', 'public.notas', 'SELECT')
  AND NOT has_any_column_privilege('anon', 'public.notas', 'SELECT');
