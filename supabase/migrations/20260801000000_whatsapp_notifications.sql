-- =============================================================================
-- WhatsApp attendance notification MVP (bounded).
--
-- External delivery is not authorized by this migration: PILOT_MODE=true and
-- missing credentials keep every send path on the deterministic local fake
-- (see app/lib/notifications/whatsapp-safety-gate.ts). Production activation,
-- templates, recipients, and credentials are later explicit approvals.
--
-- Personal-data minimization contract: this schema never stores message
-- bodies or phone numbers. Rows reference responsaveis/alunos by id only;
-- delivery content is rebuilt from live data at send time and masked in
-- receipts.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Explicit responsible-party opt-in registry.
-- One row per guardian (responsavel) and channel; consent and withdrawal keep
-- their own timestamps so the LGPD trail is never overwritten.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_notification_optins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel_id uuid NOT NULL REFERENCES responsaveis(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL REFERENCES escolas(id),
  canal text NOT NULL DEFAULT 'whatsapp' CHECK (canal = 'whatsapp'),
  opt_in boolean NOT NULL DEFAULT false,
  consentido_em timestamptz,
  cancelado_em timestamptz,
  registrado_por uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (responsavel_id, canal),
  CHECK ((opt_in AND consentido_em IS NOT NULL) OR (NOT opt_in AND cancelado_em IS NOT NULL))
);

-- School scope is derived from the guardian record, never from the caller,
-- so a request can never opt a guardian into another school's registry.
CREATE OR REPLACE FUNCTION whatsapp_optin_sync_school()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  guardian_school uuid;
BEGIN
  SELECT escola_id INTO guardian_school FROM responsaveis WHERE id = NEW.responsavel_id;
  IF guardian_school IS NULL THEN
    RAISE EXCEPTION 'PILOT_SAFETY_GATE: guardian has no escola_id, whatsapp opt-in rejected';
  END IF;
  NEW.escola_id := guardian_school;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS whatsapp_optin_school_sync ON whatsapp_notification_optins;
CREATE TRIGGER whatsapp_optin_school_sync
BEFORE INSERT OR UPDATE OF responsavel_id ON whatsapp_notification_optins
FOR EACH ROW EXECUTE FUNCTION whatsapp_optin_sync_school();

-- -----------------------------------------------------------------------------
-- Outbound message log with delivery state machine.
--
-- Status transitions:
--   queued -> accepted -> sent -> delivered -> read   (Meta webhook, monotonic)
--   queued -> delivered                                (local fake path)
--   queued/failed -> blocked | failed                  (policy / permanent)
--   queued/failed -> queued with later proxima_tentativa (retry backoff)
-- Only apply_whatsapp_delivery_status() may write webhook-driven transitions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_notification_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel_id uuid NOT NULL REFERENCES responsaveis(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL REFERENCES escolas(id),
  tipo text NOT NULL CHECK (tipo IN ('presenca_falta', 'presenca_presente')),
  data_aula date NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'accepted', 'sent', 'delivered', 'read', 'failed', 'blocked')),
  external_message_id text,
  idempotency_key text NOT NULL,
  tentativas smallint NOT NULL DEFAULT 0 CHECK (tentativas >= 0 AND tentativas <= 10),
  proxima_tentativa timestamptz NOT NULL DEFAULT now(),
  ultimo_erro_codigo text,
  bloqueado_motivo text CHECK (bloqueado_motivo IN
    ('pilot_mode', 'missing_credentials', 'not_enabled', 'opt_out', 'recipient_missing', 'template_pending')),
  entregue_em timestamptz,
  lido_em timestamptz,
  falhou_em timestamptz,
  bloqueado_em timestamptz,
  ultimo_status_em timestamptz,
  criado_por uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key),
  CHECK (status <> 'blocked' OR bloqueado_em IS NOT NULL),
  CHECK (bloqueado_motivo IS NULL OR status = 'blocked'),
  CHECK (ultimo_erro_codigo IS NULL OR status = 'failed'),
  CHECK (status <> 'accepted' OR external_message_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id
  ON whatsapp_notification_messages(external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_due
  ON whatsapp_notification_messages(status, proxima_tentativa)
  WHERE status IN ('queued', 'failed');

-- -----------------------------------------------------------------------------
-- Delivery-status ordering used by the webhook RPC. sent < delivered < read;
-- failed is the terminal rank. Everything else ranks 0 (no webhook write).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION whatsapp_delivery_status_rank(status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE status
    WHEN 'sent' THEN 1
    WHEN 'delivered' THEN 2
    WHEN 'read' THEN 3
    WHEN 'failed' THEN 4
    ELSE 0
  END;
$$;

-- -----------------------------------------------------------------------------
-- Applies a Meta delivery receipt by WhatsApp message id (wamid). Idempotent
-- and monotonic: duplicate receipts and regressions (delivered -> sent) are
-- no-ops. Terminal states (failed, blocked) never change. Rows without a
-- matching wamid are ignored (the receipt is not ours).
--
-- SECURITY DEFINER and not granted to anon/authenticated: the only caller is
-- the webhook route, which authenticates the payload signature first and runs
-- with the service-role client.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_whatsapp_delivery_status(
  p_external_message_id text,
  p_status text,
  p_timestamp timestamptz,
  p_error_code text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_status text;
  current_rank integer;
  new_rank integer;
BEGIN
  SELECT status INTO current_status
  FROM whatsapp_notification_messages
  WHERE external_message_id = p_external_message_id
  FOR UPDATE;

  IF current_status IS NULL THEN
    RETURN false;
  END IF;

  IF current_status IN ('failed', 'blocked') THEN
    RETURN false;
  END IF;

  new_rank := whatsapp_delivery_status_rank(p_status);
  current_rank := whatsapp_delivery_status_rank(current_status);
  IF new_rank = 0 OR new_rank <= current_rank THEN
    RETURN false;
  END IF;

  UPDATE whatsapp_notification_messages
  SET status = p_status,
      ultimo_status_em = p_timestamp,
      ultimo_erro_codigo = CASE WHEN p_status = 'failed' THEN p_error_code ELSE ultimo_erro_codigo END,
      entregue_em = CASE WHEN p_status = 'delivered' THEN p_timestamp ELSE entregue_em END,
      lido_em = CASE WHEN p_status = 'read' THEN p_timestamp ELSE lido_em END,
      falhou_em = CASE WHEN p_status = 'failed' THEN p_timestamp ELSE falhou_em END,
      updated_at = now()
  WHERE external_message_id = p_external_message_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION apply_whatsapp_delivery_status(text, text, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION whatsapp_delivery_status_rank(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_whatsapp_delivery_status(text, text, timestamptz, text) TO service_role;

-- -----------------------------------------------------------------------------
-- RLS: school-scoped reads for pilot staff; writes only for managers of the
-- guardian's school. Service-driven message transitions run as the staff
-- session; webhook-driven transitions go exclusively through
-- apply_whatsapp_delivery_status (not callable by app roles). Delete is
-- never granted: rows are append-only evidence.
-- -----------------------------------------------------------------------------
ALTER TABLE whatsapp_notification_optins ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_notification_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_optins_select ON whatsapp_notification_optins FOR SELECT TO authenticated
USING (pilot_can_access_school(escola_id));
CREATE POLICY whatsapp_optins_insert ON whatsapp_notification_optins FOR INSERT TO authenticated
WITH CHECK (pilot_can_manage_school(escola_id));
CREATE POLICY whatsapp_optins_update ON whatsapp_notification_optins FOR UPDATE TO authenticated
USING (pilot_can_manage_school(escola_id)) WITH CHECK (pilot_can_manage_school(escola_id));

CREATE POLICY whatsapp_messages_select ON whatsapp_notification_messages FOR SELECT TO authenticated
USING (pilot_can_access_school(escola_id));
CREATE POLICY whatsapp_messages_insert ON whatsapp_notification_messages FOR INSERT TO authenticated
WITH CHECK (pilot_can_manage_school(escola_id));
-- Service-driven transitions (queued -> accepted/delivered/blocked/failed and
-- retry scheduling) run as the staff session; webhook-driven transitions are
-- restricted to apply_whatsapp_delivery_status, which owns the monotonic rules.
CREATE POLICY whatsapp_messages_update ON whatsapp_notification_messages FOR UPDATE TO authenticated
USING (pilot_can_manage_school(escola_id)) WITH CHECK (pilot_can_manage_school(escola_id));

REVOKE ALL ON whatsapp_notification_optins FROM anon;
REVOKE ALL ON whatsapp_notification_messages FROM anon;
REVOKE DELETE ON whatsapp_notification_messages FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON whatsapp_notification_optins TO authenticated;
GRANT SELECT, INSERT, UPDATE ON whatsapp_notification_messages TO authenticated;

-- -----------------------------------------------------------------------------
-- Compliance trail: consent changes and delivery state changes land in the
-- append-only pilot audit log with the same redaction contract as core tables.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS pilot_audit_core_change ON whatsapp_notification_optins;
CREATE TRIGGER pilot_audit_core_change AFTER INSERT OR UPDATE OR DELETE ON whatsapp_notification_optins
FOR EACH ROW EXECUTE FUNCTION pilot_audit_core_change();

DROP TRIGGER IF EXISTS pilot_audit_core_change ON whatsapp_notification_messages;
CREATE TRIGGER pilot_audit_core_change AFTER INSERT OR UPDATE OR DELETE ON whatsapp_notification_messages
FOR EACH ROW EXECUTE FUNCTION pilot_audit_core_change();
