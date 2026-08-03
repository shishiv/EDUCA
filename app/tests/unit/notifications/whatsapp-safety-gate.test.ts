import { describe, expect, it } from 'vitest'
import {
  resolveWhatsAppDeliveryMode,
  whatsAppExternalDeliveryAllowed,
} from '@/lib/notifications/whatsapp-safety-gate'
import { createWhatsAppNotificationGateway } from '@/lib/notifications/whatsapp-gateway-factory'

const FULL_CREDENTIALS = {
  pilotMode: undefined,
  metaEnabled: 'true',
  metaPhoneNumberId: '106540352242922',
  metaAccessToken: 'token-test',
  metaAppSecret: 'secret-test',
  metaVerifyToken: 'verify-test',
}

describe('whatsapp delivery mode safety gate', () => {
  it('forces the local fake when PILOT_MODE=true even with full credentials', () => {
    const mode = resolveWhatsAppDeliveryMode({ ...FULL_CREDENTIALS, pilotMode: 'true' })
    expect(mode).toEqual({ kind: 'local-fake', reason: 'pilot_mode' })
    expect(whatsAppExternalDeliveryAllowed({ ...FULL_CREDENTIALS, pilotMode: 'true' })).toBe(false)
  })

  it('blocks real Meta delivery in demo sandbox even when pilot mode is off', () => {
    const environment = { ...FULL_CREDENTIALS, pilotMode: 'false', demoSandbox: 'true' }
    expect(resolveWhatsAppDeliveryMode(environment)).toEqual({ kind: 'local-fake', reason: 'demo_sandbox' })
    expect(whatsAppExternalDeliveryAllowed(environment)).toBe(false)
    expect(createWhatsAppNotificationGateway(environment).identity().adapterName).toBe('local-fake')
  })

  it('stays local when Meta is not explicitly enabled', () => {
    const mode = resolveWhatsAppDeliveryMode({ ...FULL_CREDENTIALS, metaEnabled: 'false' })
    expect(mode).toEqual({ kind: 'local-fake', reason: 'not_enabled' })
  })

  it('stays local when any credential is missing', () => {
    const missing = { ...FULL_CREDENTIALS, metaAccessToken: undefined }
    const mode = resolveWhatsAppDeliveryMode(missing)
    expect(mode).toEqual({ kind: 'local-fake', reason: 'missing_credentials' })
    expect(whatsAppExternalDeliveryAllowed(missing)).toBe(false)
  })

  it('allows Meta only with explicit enablement and complete credentials', () => {
    expect(resolveWhatsAppDeliveryMode(FULL_CREDENTIALS)).toEqual({ kind: 'meta' })
    expect(whatsAppExternalDeliveryAllowed(FULL_CREDENTIALS)).toBe(true)
  })

  it('factory never returns the Meta adapter without approval', () => {
    const gateway = createWhatsAppNotificationGateway({ ...FULL_CREDENTIALS, pilotMode: 'true' })
    expect(gateway.identity().adapterName).toBe('local-fake')
  })
})
