-- Pilot-only provisioning for the synthetic municipal pilot foundation.
--
-- This file is NOT a canonical migration. It is applied explicitly, and only by
-- the synthetic pilot harnesses, so that a plain `supabase db push` in a
-- non-pilot environment keeps the Censo Escolar fields and the previously
-- shipped grade/report/Educacenso modules exactly as they were.
--
-- Applied by:
--   app/scripts/run-pilot-e2e.sh
--   supabase/tests/database/run.sh
--   supabase/tests/pilot/run-backup-restore.sh
--
-- The script is idempotent and may be replayed against an already-gated
-- database.

-- -----------------------------------------------------------------------------
-- Grades, Educacenso, and the legacy Bolsa Família view remain inaccessible.
-- Governed descriptive reports and the new security-invoker conditionality
-- RPC/view are released only by the hardening migration and its tests.
-- -----------------------------------------------------------------------------
REVOKE ALL ON notas, educacenso_exports, codigos_inep FROM anon, authenticated;
REVOKE ALL ON vw_alunos_risco_bolsa_familia FROM anon, authenticated;

DROP POLICY IF EXISTS pilot_escolas_update ON public.escolas;
CREATE POLICY pilot_escolas_update ON public.escolas
FOR UPDATE TO authenticated
USING (public.pilot_current_role() = 'admin')
WITH CHECK (public.pilot_current_role() = 'admin');
REVOKE UPDATE ON public.escolas FROM authenticated;
GRANT UPDATE (nome, codigo, tipo, endereco, telefone, email, diretor_id, ativo)
ON public.escolas TO authenticated;

-- -----------------------------------------------------------------------------
-- High-risk fields are blocked at the database seam while the synthetic pilot
-- foundation is active.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pilot_reject_high_risk_student_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.nis IS NOT NULL
     OR coalesce(NEW.bolsa_familia, false)
     OR NEW.necessidades_especiais IS NOT NULL
     OR NEW.cor_raca IN ('nao_declarada', 'branca', 'preta', 'parda', 'amarela', 'indigena')
     OR NEW.tipo_deficiencia IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'PILOT_SAFETY_GATE: NIS/PBF/health/disability/race fields are disabled';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pilot_high_risk_student_guard ON alunos;
CREATE TRIGGER pilot_high_risk_student_guard
BEFORE INSERT OR UPDATE ON alunos
FOR EACH ROW EXECUTE FUNCTION pilot_reject_high_risk_student_fields();
