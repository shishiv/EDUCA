-- Runs only against the isolated pre-migration fixture database.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','d8100000-0000-4000-8000-000000000001',false);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.relatorios_descritivos
    WHERE id='d8500000-0000-4000-8000-000000000001' AND status='finalizado'
      AND fontes_snapshot IS NULL AND finalizado_em='2026-07-31T12:00:00Z') THEN
    RAISE EXCEPTION 'legacy report was lost or assigned fabricated provenance';
  END IF;
  BEGIN
    UPDATE public.relatorios_descritivos SET fontes_snapshot='{}' WHERE id='d8500000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'legacy report was rewritten';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_FINALIZED_IMMUTABLE' THEN RAISE; END IF;
  END;
END $$;
