/**
 * WhatsApp gateway factory - the only place that decides which adapter runs.
 *
 * The safety gate (whatsapp-safety-gate.ts) is applied here, not at call
 * sites: demo sandbox mode, PILOT_MODE=true and missing credentials always
 * produce the local fake, so no caller can accidentally reach Meta. The local
 * fake writes masked receipts to pilot evidence, preserving a visible local
 * result in every downgrade.
 */

import type { WhatsAppNotificationGateway } from './whatsapp-gateway'
import { WhatsAppLocalAdapter, type WhatsAppLocalFakeMode } from './whatsapp-local-adapter'
import { WhatsAppMetaAdapter } from './whatsapp-meta-adapter'
import { resolveWhatsAppDeliveryMode, type WhatsAppSafetyEnvironment } from './whatsapp-safety-gate'

export interface WhatsAppGatewayFactoryEnvironment extends WhatsAppSafetyEnvironment {
  localFakeMode?: string
}

/**
 * Builds the gateway for the current environment. Never throws: every unsafe
 * configuration resolves to the local fake with a named reason.
 */
export function createWhatsAppNotificationGateway(
  environment: WhatsAppGatewayFactoryEnvironment = {
    pilotMode: process.env.PILOT_MODE,
    demoSandbox: process.env.NEXT_PUBLIC_DEMO_SANDBOX ?? process.env.DEMO_SANDBOX,
    metaEnabled: process.env.WHATSAPP_META_ENABLED,
    metaPhoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID,
    metaAccessToken: process.env.WHATSAPP_META_TOKEN,
    metaAppSecret: process.env.WHATSAPP_META_APP_SECRET,
    metaVerifyToken: process.env.WHATSAPP_META_VERIFY_TOKEN,
    localFakeMode: process.env.WHATSAPP_LOCAL_FAKE_MODE,
  }
): WhatsAppNotificationGateway {
  const mode = resolveWhatsAppDeliveryMode(environment)

  if (mode.kind === 'meta') {
    return new WhatsAppMetaAdapter({
      phoneNumberId: environment.metaPhoneNumberId!,
      accessToken: environment.metaAccessToken!,
      appSecret: environment.metaAppSecret!,
      verifyToken: environment.metaVerifyToken!,
    })
  }

  const fakeMode = (environment.localFakeMode ?? 'deliver') as WhatsAppLocalFakeMode
  return new WhatsAppLocalAdapter({ mode: fakeMode })
}
