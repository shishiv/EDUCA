export interface SchoolSelectionProfile {
  id: string
  tipo_usuario: string | null
  escola_id: string | null
}

export interface SchoolSelectionStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type SchoolSelectionMode = 'multi' | 'single' | 'none'

export function schoolSelectionStorageKey(userId: string): string {
  return `educa-selected-escola:${userId}`
}

export function schoolSelectionMode(profile: SchoolSelectionProfile): SchoolSelectionMode {
  if (profile.tipo_usuario === 'admin' || profile.tipo_usuario === 'gestor_sme') return 'multi'
  if (profile.tipo_usuario === 'secretario' && profile.escola_id === null) return 'multi'
  if (profile.escola_id) return 'single'
  return 'none'
}

export function shouldShowSchoolSelector(profile: SchoolSelectionProfile, accessibleSchoolCount: number): boolean {
  const mode = schoolSelectionMode(profile)
  if (mode === 'multi') return true
  return (profile.tipo_usuario === 'coordenador' || profile.tipo_usuario === 'professor') && accessibleSchoolCount > 1
}

export function readStoredSchoolSelection(
  userId: string,
  accessibleSchools: readonly { id: string }[],
  storage: SchoolSelectionStorage,
): string | null {
  const key = schoolSelectionStorageKey(userId)
  const stored = storage.getItem(key)
  if (!stored) return null
  if (accessibleSchools.some(escola => escola.id === stored)) return stored
  storage.removeItem(key)
  return null
}

export function writeStoredSchoolSelection(
  userId: string,
  schoolId: string | null,
  storage: SchoolSelectionStorage,
): void {
  const key = schoolSelectionStorageKey(userId)
  if (schoolId) storage.setItem(key, schoolId)
  else storage.removeItem(key)
}
