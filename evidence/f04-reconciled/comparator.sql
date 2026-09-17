-- Local synthetic comparator only. No migrations or grants are changed.
BEGIN;
CREATE TEMP TABLE f04_comparator_before AS SELECT nome,
  (SELECT count(*) FROM public.pilot_audit_log WHERE entity_id='10000000-0000-0000-0000-000000000001') AS audits
FROM public.escolas WHERE id='10000000-0000-0000-0000-000000000001';
CREATE FUNCTION pg_temp.f04_comparator_fault() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_type='school_updated' THEN RAISE EXCEPTION 'F04_COMPARATOR_RECEIPT_FAILURE'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER f04_comparator_fault BEFORE INSERT ON public.pilot_audit_log
FOR EACH ROW EXECUTE FUNCTION pg_temp.f04_comparator_fault();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
DO $$
BEGIN
  BEGIN
    PERFORM public.update_governed_school('10000000-0000-0000-0000-000000000001','{"nome":"F04 comparator cannot commit"}');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='F04_COMPARATOR_RECEIPT_FAILURE' THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'F04 comparator unexpectedly accepted a failed receipt';
END $$;
RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.escolas e, f04_comparator_before b
    WHERE e.id='10000000-0000-0000-0000-000000000001' AND e.nome=b.nome
    AND b.audits=(SELECT count(*) FROM public.pilot_audit_log WHERE entity_id=e.id::text)) THEN
    RAISE EXCEPTION 'F04 comparator left partial school state or audit';
  END IF;
END $$;
ROLLBACK;
\echo F04_COMPARATOR_OK: real update_governed_school receipt throw rolls back school and audit
