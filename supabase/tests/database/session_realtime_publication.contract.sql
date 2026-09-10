CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

CREATE PUBLICATION supabase_realtime FOR TABLE public.turmas;

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sessoes_aula'
  ),
  'sessoes_aula is absent before the realtime publication migration'
);

\ir ../../migrations/20260908110000_session_realtime_publication.sql

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sessoes_aula'
  ),
  'realtime publication includes sessoes_aula after migration'
);

\ir ../../migrations/20260908110000_session_realtime_publication.sql

SELECT pg_temp.assert_true(
  (SELECT count(*)
   FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
     AND schemaname = 'public'
     AND tablename = 'sessoes_aula') = 1,
  'reapplying the migration leaves one sessoes_aula membership'
);
SELECT pg_temp.assert_true(
  (SELECT array_agg(tablename::text ORDER BY tablename::text)
   FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
     AND schemaname = 'public') = ARRAY['sessoes_aula', 'turmas']::text[],
  'migration expands no table other than sessoes_aula'
);

DROP PUBLICATION supabase_realtime;
