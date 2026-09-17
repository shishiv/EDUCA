-- COPY runs with replica triggers to preserve immutable snapshots/deadlines.
-- PostgreSQL does not retroactively validate those FKs when triggers resume.
-- Check every public FK, including edges into explicitly excluded domains.
DO $$
DECLARE
  fk record;
  join_keys text;
  nonnull_keys text;
  orphan boolean;
BEGIN
  FOR fk IN
    SELECT c.* FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'
  LOOP
    SELECT string_agg(format('child.%I = parent.%I', a.attname, b.attname), ' AND '),
      string_agg(format('child.%I IS NOT NULL', a.attname), ' AND ')
    INTO join_keys, nonnull_keys
    FROM unnest(fk.conkey, fk.confkey) AS keys(child_key, parent_key)
    JOIN pg_attribute a ON a.attrelid = fk.conrelid AND a.attnum = keys.child_key
    JOIN pg_attribute b ON b.attrelid = fk.confrelid AND b.attnum = keys.parent_key;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s child WHERE %s AND NOT EXISTS (SELECT 1 FROM %s parent WHERE %s))',
      fk.conrelid::regclass, nonnull_keys, fk.confrelid::regclass, join_keys) INTO orphan;
    IF orphan THEN
      RAISE EXCEPTION 'RESTORE_DEPENDENCY_MISSING: % on %', fk.conname, fk.conrelid::regclass;
    END IF;
  END LOOP;
END;
$$;
-- Hash the original captured payload with PostgreSQL JSONB text serialization,
-- never JavaScript JSON.stringify and never a new preview of mutable sources.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.relatorios_descritivos r
    WHERE r.fontes_snapshot IS NOT NULL AND (
      (r.status = 'finalizado'
        AND r.fontes_snapshot->>'versao' = 'vivencias-v1'
        AND r.fontes_snapshot->>'algoritmo' = 'SHA-256/postgresql-jsonb-v1'
        AND r.fontes_snapshot->>'capturado_por' = r.finalizado_por::text
        AND (r.fontes_snapshot->>'capturado_em')::timestamptz = r.finalizado_em
        AND r.fontes_snapshot->>'fingerprint' = encode(sha256(convert_to(
          jsonb_build_object('periodo', r.fontes_snapshot->'periodo', 'fontes', r.fontes_snapshot->'fontes')::text, 'UTF8')), 'hex')
      ) IS DISTINCT FROM true
    )
  ) THEN
    RAISE EXCEPTION 'RESTORE_SNAPSHOT_INVALID: original PostgreSQL JSONB fingerprint or capture metadata differs';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.attendance_reopen_requests
    WHERE correction_deadline_at IS NOT NULL AND (
      status = 'APROVADA' AND approved_at = decided_at
      AND correction_deadline_at = approved_at + make_interval(hours => correction_window_hours)
    ) IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION 'RESTORE_DEADLINE_INVALID: original approval metadata differs';
  END IF;
END;
$$;
\echo RESTORE_INTEGRITY_OK: foreign keys, PostgreSQL JSONB fingerprints and captured deadline consistency
