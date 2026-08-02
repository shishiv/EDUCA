import { describe, expect, it } from 'vitest'
import {
  ATTENDANCE_ROUTE,
  quickAccessItems,
  resolveVisibleQuickAccess,
  resolveVisibleQuickActionCards,
} from '@/lib/dashboard/quick-access'

const attendanceItem = quickAccessItems.find((item) => item.name === 'Frequência')!

describe('dashboard quick access routes', () => {
  it('points attendance at the canonical /diario/frequencia route', () => {
    expect(ATTENDANCE_ROUTE).toBe('/diario/frequencia')
    expect(attendanceItem.href).toBe(ATTENDANCE_ROUTE)
    expect(attendanceItem.pilotHref).toBeUndefined()
  })

  it('resolves the attendance route to /diario/frequencia in every supported mode', () => {
    for (const pilotMode of [false, true]) {
      const visible = resolveVisibleQuickAccess(quickAccessItems, {
        role: 'diretor',
        pilotMode,
        canManageSchool: true,
      })
      const attendance = visible.find((item) => item.name === 'Frequência')
      expect(attendance?.href).toBe('/diario/frequencia')
    }
  })

  it('keeps attendance visible to professors while hiding writes they cannot manage', () => {
    const visible = resolveVisibleQuickAccess(quickAccessItems, {
      role: 'professor',
      pilotMode: true,
      canManageSchool: false,
    })
    expect(visible.map((item) => item.name)).toContain('Frequência')
    expect(visible.some((item) => item.schoolWrite)).toBe(false)
  })

  it('hides everything without a role', () => {
    expect(
      resolveVisibleQuickAccess(quickAccessItems, { role: null, pilotMode: false, canManageSchool: true })
    ).toHaveLength(0)
  })

  it('applies pilot role narrowing for Novo Aluno', () => {
    const secretarioPilot = resolveVisibleQuickAccess(quickAccessItems, {
      role: 'secretario',
      pilotMode: true,
      canManageSchool: true,
    })
    expect(secretarioPilot.map((item) => item.name)).not.toContain('Novo Aluno')

    const diretorPilot = resolveVisibleQuickAccess(quickAccessItems, {
      role: 'diretor',
      pilotMode: true,
      canManageSchool: true,
    })
    expect(diretorPilot.map((item) => item.name)).toContain('Novo Aluno')
  })

  it('filters school-write action cards when the caller cannot manage the school', () => {
    const restricted = resolveVisibleQuickActionCards(true, false)
    expect(restricted.some((card) => card.schoolWrite)).toBe(false)
    expect(restricted.find((card) => card.name === 'Nova Chamada')?.href).toBe('/diario/frequencia')
  })
})
