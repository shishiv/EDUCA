/**
 * Strict file-level identifiers from the official 2026 import/export layout.
 *
 * - Record 00, field 2: school code, fixed 8 numeric characters.
 * - Records 30/40/50/60, field 4: unique Inep person identifier, fixed 12
 *   numeric characters when present.
 */
export function isSchoolInepCode2026(value: string): boolean {
  return /^\d{8}$/.test(value)
}

export function isPersonInepId2026(value: string): boolean {
  return /^\d{12}$/.test(value)
}
