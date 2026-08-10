-- Atomic server-side capacity guard for active class enrollments.
--
-- The class row is the lockable capacity resource. The row trigger locks it
-- before a write, then the statement trigger counts the committed result. This
-- handles both concurrent single-row inserts and multi-row enrollment writes.

BEGIN;

CREATE OR REPLACE FUNCTION public.pilot_lock_matricula_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  class_capacity integer;
BEGIN
  IF NEW.situacao IS DISTINCT FROM 'ativa' THEN
    RETURN NEW;
  END IF;

  SELECT capacidade
  INTO class_capacity
  FROM public.turmas
  WHERE id = NEW.turma_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_CAPACITY_CLASS_NOT_FOUND: turma % does not exist', NEW.turma_id;
  END IF;

  IF class_capacity IS NULL OR class_capacity < 0 THEN
    RAISE EXCEPTION
      'PILOT_CAPACITY_CONFIGURATION_INVALID: turma % has invalid capacidade %',
      NEW.turma_id,
      class_capacity;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.pilot_validate_matricula_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  class_row record;
  active_enrollments integer;
BEGIN
  FOR class_row IN
    SELECT t.id, t.capacidade
    FROM public.turmas AS t
    JOIN (
      SELECT DISTINCT turma_id
      FROM pilot_matriculas_new
      WHERE situacao = 'ativa'
    ) AS changed ON changed.turma_id = t.id
    ORDER BY t.id
  LOOP
    SELECT count(*)
    INTO active_enrollments
    FROM public.matriculas
    WHERE turma_id = class_row.id
      AND situacao = 'ativa';

    IF active_enrollments > class_row.capacidade THEN
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        MESSAGE = format(
          'PILOT_CAPACITY_EXCEEDED: turma %s has capacity %s and %s active enrollments',
          class_row.id,
          class_row.capacidade,
          active_enrollments
        ),
        DETAIL = 'Active enrollment was rejected by the database capacity guard.';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS pilot_lock_matricula_capacity ON public.matriculas;
CREATE TRIGGER pilot_lock_matricula_capacity
BEFORE INSERT OR UPDATE OF turma_id, situacao ON public.matriculas
FOR EACH ROW
EXECUTE FUNCTION public.pilot_lock_matricula_capacity();

DROP TRIGGER IF EXISTS pilot_validate_matricula_capacity ON public.matriculas;
DROP TRIGGER IF EXISTS pilot_validate_matricula_capacity_insert ON public.matriculas;
CREATE TRIGGER pilot_validate_matricula_capacity_insert
AFTER INSERT ON public.matriculas
REFERENCING NEW TABLE AS pilot_matriculas_new
FOR EACH STATEMENT
EXECUTE FUNCTION public.pilot_validate_matricula_capacity();

DROP TRIGGER IF EXISTS pilot_validate_matricula_capacity_update ON public.matriculas;
CREATE TRIGGER pilot_validate_matricula_capacity_update
AFTER UPDATE ON public.matriculas
REFERENCING NEW TABLE AS pilot_matriculas_new
FOR EACH STATEMENT
EXECUTE FUNCTION public.pilot_validate_matricula_capacity();

REVOKE ALL ON FUNCTION public.pilot_lock_matricula_capacity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pilot_validate_matricula_capacity() FROM PUBLIC, anon, authenticated;

COMMIT;
