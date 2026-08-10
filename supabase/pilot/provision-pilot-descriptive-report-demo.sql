-- Narrow companion provisioner for the isolated synthetic descriptive-report rehearsal.
--
-- The governed security migration owns this grant. This idempotent companion
-- remains explicit in the descriptive rehearsal and never applies to the demo.

BEGIN;

GRANT SELECT, INSERT, UPDATE ON TABLE public.relatorios_descritivos TO authenticated;

COMMIT;
