/**
 * WhatsApp delivery-mode safety gate.
 *
 * External delivery is a later explicit approval. This gate makes that
 * approval structural: the public demo and PILOT_MODE=true always force the
 * deterministic local fake, and missing Meta credentials also downgrade to
 * the local fake with a named reason. The visible local receipt path is
 * preserved in every downgrade (see whatsapp-gateway-factory.ts).
 */

export interface WhatsAppSafetyEnvironment {
  pilotMode?: string
  demoSandbox?: string
  metaEnabled?: string
  metaPhoneNumberId?: string
  metaAccessToken?: string
  metaAppSecret?: string
  metaVerifyToken?: string
}

export type WhatsAppDeliveryMode =
  | { kind: 'local-fake'; reason: 'demo_sandbox' | 'pilot_mode' | 'missing_credentials' | 'not_enabled' }
  | { kind: 'meta' }

function isNonEmpty(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Resolves which adapter may run. The public demo wins first, then pilot
 * mode, explicit enablement and credential completeness.
 */
export function resolveWhatsAppDeliveryMode(
  environment: WhatsAppSafetyEnvironment = {
    pilotMode: process.env.PILOT_MODE,
    demoSandbox: process.env.NEXT_PUBLIC_DEMO_SANDBOX ?? process.env.DEMO_SANDBOX,
    metaEnabled: process.env.WHATSAPP_META_ENABLED,
    metaPhoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID,
    metaAccessToken: process.env.WHATSAPP_META_TOKEN,
    metaAppSecret: process.env.WHATSAPP_META_APP_SECRET,
    metaVerifyToken: process.env.WHATSAPP_META_VERIFY_TOKEN,
  }
): WhatsAppDeliveryMode {
  // A public demo can never send to Meta, even if someone accidentally sets
  // PILOT_MODE=false or supplies complete Meta credentials.
  if (environment.demoSandbox === 'true') {
    return { kind: 'local-fake', reason: 'demo_sandbox' }
  }
  if (environment.pilotMode === 'true') {
    return { kind: 'local-fake', reason: 'pilot_mode' }
  }
  if (environment.metaEnabled !== 'true') {
    return { kind: 'local-fake', reason: 'not_enabled' }
  }
  const credentialsComplete =
    isNonEmpty(environment.metaPhoneNumberId) &&
    isNonEmpty(environment.metaAccessToken) &&
    isNonEmpty(environment.metaAppSecret) &&
    isNonEmpty(environment.metaVerifyToken)
  if (!credentialsComplete) {
    return { kind: 'local-fake', reason: 'missing_credentials' }
  }
  return { kind: 'meta' }
}

/** True when the resolved mode permits real Meta delivery. */
export function whatsAppExternalDeliveryAllowed(
  environment: WhatsAppSafetyEnvironment = {
    pilotMode: process.env.PILOT_MODE,
    demoSandbox: process.env.NEXT_PUBLIC_DEMO_SANDBOX ?? process.env.DEMO_SANDBOX,
    metaEnabled: process.env.WHATSAPP_META_ENABLED,
    metaPhoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID,
    metaAccessToken: process.env.WHATSAPP_META_TOKEN,
    metaAppSecret: process.env.WHATSAPP_META_APP_SECRET,
    metaVerifyToken: process.env.WHATSAPP_META_VERIFY_TOKEN,
  }
): boolean {
  return resolveWhatsAppDeliveryMode(environment).kind === 'meta'
}
