import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const PILOT_IMPORT_ENCRYPTION_ALGORITHM = 'aes-256-gcm' as const

export interface PilotEncryptedImportPayload {
  encryptionKeyId: string
  ciphertext: string
  iv: string
  authTag: string
}

/** Validates the base64 AES-256 key used for encrypted import staging. */
export function validatePilotImportEncryptionKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64')
  if (key.length !== 32) throw new Error('PILOT_IMPORT_KEY_INVALID: expected a base64 AES-256 key')
  return key
}

/** Encrypts the source CSV before it reaches proof-database storage. */
export function encryptPilotImportPayload(
  csv: string,
  base64Key: string,
  encryptionKeyId: string
): PilotEncryptedImportPayload {
  const iv = randomBytes(12)
  const cipher = createCipheriv(PILOT_IMPORT_ENCRYPTION_ALGORITHM, validatePilotImportEncryptionKey(base64Key), iv)
  const ciphertext = Buffer.concat([cipher.update(csv, 'utf8'), cipher.final()])
  return {
    encryptionKeyId,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

/** Decrypts an authenticated payload only inside the server-side import process. */
export function decryptPilotImportPayload(
  payload: PilotEncryptedImportPayload,
  base64Key: string
): string {
  const decipher = createDecipheriv(
    PILOT_IMPORT_ENCRYPTION_ALGORITHM,
    validatePilotImportEncryptionKey(base64Key),
    Buffer.from(payload.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/** Binds an approval dry run to the exact source fingerprint without storing CSV text. */
export function createPilotDryRunValidationToken(contentSha256: string, base64Key: string): string {
  return createHmac('sha256', validatePilotImportEncryptionKey(base64Key))
    .update(`educa-pilot-dry-run:${contentSha256}`)
    .digest('hex')
}

/** Verifies a dry-run token with a constant-time comparison. */
export function verifyPilotDryRunValidationToken(
  contentSha256: string,
  token: string,
  base64Key: string
): boolean {
  let actual: Buffer
  try {
    actual = Buffer.from(token, 'hex')
  } catch {
    return false
  }
  const expected = Buffer.from(createPilotDryRunValidationToken(contentSha256, base64Key), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
