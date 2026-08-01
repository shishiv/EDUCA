/**
 * WhatsApp delivery-mode safety gate.
 *
 * External delivery is a later explicit approval. This gate makes that
 * approval structural: PILOT_MODE=true always forces the deterministic local
 * fake, and any missing Meta credential downgrades to the local fake with a
 * named reason. The visible local receipt path is preserved in every
 * downgrade (see whatsapp-gateway-factory.ts).
 */

export interface WhatsAppSafetyEnvironment {
  pilotMode?: string
  metaEnabled?: string
  metaPhoneNumberId?: string
  metaAccessToken?: string
  metaAppSecret?: string
  metaVerifyToken?: string
}

export type WhatsAppDeliveryMode =
  | { kind: 'local-fake'; reason: 'pilot_mode' | 'missing_credentials' | 'not_enabled' }
  | { kind: 'meta' }

function isNonEmpty(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Resolves which adapter may run. Order matters: pilot mode wins over
 * everything, then explicit enablement, then credential completeness.
 */
export function resolveWhatsAppDeliveryMode(
  environment: WhatsAppSafetyEnvironment = {
    pilotMode: process.env.PILOT_MODE,
    metaEnabled: process.env.WHATSAPP_META_ENABLED,
    metaPhoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID,
    metaAccessToken: process.env.WHATSAPP_META_TOKEN,
    metaAppSecret: process.env.WHATSAPP_META_APP_SECRET,
    metaVerifyToken: process.env.WHATSAPP_META_VERIFY_TOKEN,
  }
): WhatsAppDeliveryMode {
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
    metaEnabled: process.env.WHATSAPP_META_ENABLED,
    metaPhoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID,
    metaAccessToken: process.env.WHATSAPP_META_TOKEN,
    metaAppSecret: process.env.WHATSAPP_META_APP_SECRET,
    metaVerifyToken: process.env.WHATSAPP_META_VERIFY_TOKEN,
  }
): boolean {
  return resolveWhatsAppDeliveryMode(environment).kind === 'meta'
}
