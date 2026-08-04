-- PostgREST upsert needs an unconditional conflict arbiter for the
-- (sessao_id, matricula_id) target. The canonical migration uses a partial
-- index while legacy rows can still have NULL sessao_id, but that predicate
-- cannot be inferred from the server action's onConflict declaration.
--
-- A full unique index still allows multiple legacy NULL sessao_id rows because
-- PostgreSQL does not treat NULL values as equal. The canonical write trigger
-- rejects new attendance rows without a session, so all new writes use the
-- conflict target below.
DROP INDEX IF EXISTS public.idx_frequencia_sessao_matricula_unique;

CREATE UNIQUE INDEX idx_frequencia_sessao_matricula_unique
  ON public.frequencia (sessao_id, matricula_id);
