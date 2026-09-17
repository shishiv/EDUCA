// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  readStoredSchoolSelection,
  schoolSelectionMode,
  schoolSelectionStorageKey,
  shouldShowSchoolSelector,
  writeStoredSchoolSelection,
  type SchoolSelectionStorage,
} from '@/contexts/escola-selection'

function profile(tipoUsuario: string, escolaId: string | null) {
  return { id: `user-${tipoUsuario}-${escolaId ?? 'municipal'}`, tipo_usuario: tipoUsuario, escola_id: escolaId }
}

function memoryStorage(): SchoolSelectionStorage {
  const values = new Map<string, string>()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
  }
}

describe('school selection policy', () => {
  it('gives municipal secretariat the multi-school selector', () => {
    const municipalSecretariat = profile('secretario', null)
    expect(schoolSelectionMode(profile('admin', null))).toBe('multi')
    expect(schoolSelectionMode(profile('gestor_sme', null))).toBe('multi')
    expect(schoolSelectionMode(municipalSecretariat)).toBe('multi')
    expect(shouldShowSchoolSelector(municipalSecretariat, 2)).toBe(true)
  })

  it('does not widen linked secretariat, director, professor, or guardian access', () => {
    expect(schoolSelectionMode(profile('secretario', 'school-a'))).toBe('single')
    expect(schoolSelectionMode(profile('diretor', 'school-a'))).toBe('single')
    expect(schoolSelectionMode(profile('diretor', null))).toBe('none')
    expect(schoolSelectionMode(profile('professor', 'school-a'))).toBe('single')
    expect(schoolSelectionMode(profile('professor', null))).toBe('none')
    expect(schoolSelectionMode(profile('responsavel', null))).toBe('none')
    expect(shouldShowSchoolSelector(profile('secretario', 'school-a'), 2)).toBe(false)
    expect(shouldShowSchoolSelector(profile('diretor', 'school-a'), 2)).toBe(false)
    expect(shouldShowSchoolSelector(profile('professor', 'school-a'), 1)).toBe(false)
  })

  it('scopes persisted choices by user and rejects inaccessible schools', () => {
    const storage = memoryStorage()
    writeStoredSchoolSelection('user-a', 'school-a', storage)
    writeStoredSchoolSelection('user-b', 'school-b', storage)

    expect(schoolSelectionStorageKey('user-a')).not.toBe(schoolSelectionStorageKey('user-b'))
    expect(readStoredSchoolSelection('user-a', [{ id: 'school-a' }], storage)).toBe('school-a')
    expect(readStoredSchoolSelection('user-b', [{ id: 'school-b' }], storage)).toBe('school-b')
    expect(readStoredSchoolSelection('user-a', [{ id: 'school-c' }], storage)).toBeNull()
    expect(readStoredSchoolSelection('user-b', [{ id: 'school-b' }], storage)).toBe('school-b')
  })
})
