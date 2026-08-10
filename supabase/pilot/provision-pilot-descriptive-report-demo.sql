-- Narrow companion provisioner for the isolated synthetic descriptive-report rehearsal.
--
-- Apply only after provision-pilot-module-gate.sql and only from
-- app/scripts/run-pilot-descriptive-e2e.sh. The base pilot gate keeps this
-- table revoked in every other pilot path.

BEGIN;

GRANT SELECT, INSERT, UPDATE ON TABLE public.relatorios_descritivos TO authenticated;

COMMIT;
