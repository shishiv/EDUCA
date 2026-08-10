import { describe, expect, it } from 'vitest'
import {
  ATTENDANCE_ROUTE,
  quickAccessItems,
  resolveVisibleQuickAccess,
  resolveVisibleQuickActionCards,
  type QuickAccessRole,
} from '@/lib/dashboard/quick-access'

const attendanceItem = quickAccessItems.find((item) => item.name === 'Frequência')!

describe('dashboard quick access routes', () => {
  it('points attendance at the canonical turma entry route', () => {
    expect(ATTENDANCE_ROUTE).toBe('/dashboard/turmas')
    expect(attendanceItem.href).toBe(ATTENDANCE_ROUTE)
    expect(attendanceItem.pilotHref).toBeUndefined()
  })

  it('resolves attendance to the canonical turma entry in every supported mode', () => {
    for (const pilotMode of [false, true]) {
      const visible = resolveVisibleQuickAccess(quickAccessItems, {
        role: 'diretor',
        pilotMode,
        canManageSchool: true,
      })
      const attendance = visible.find((item) => item.name === 'Frequência')
      expect(attendance?.href).toBe('/dashboard/turmas')
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

  it('shows the class diary in pilot mode while keeping other modules blocked', () => {
    for (const role of ['admin', 'diretor', 'secretario', 'professor']) {
      const visible = resolveVisibleQuickAccess(quickAccessItems, {
        role: role as QuickAccessRole,
        pilotMode: true,
        canManageSchool: role !== 'professor',
      })
      expect(visible.map((item) => item.name)).toContain('Diário de Classe')
    }

    const diretorPilot = resolveVisibleQuickAccess(quickAccessItems, {
      role: 'diretor',
      pilotMode: true,
      canManageSchool: true,
    })
    expect(diretorPilot.map((item) => item.name)).not.toContain('Relatórios')
    expect(diretorPilot.map((item) => item.name)).not.toContain('Config')
    expect(diretorPilot.find((item) => item.name === 'Diário de Classe')?.href).toBe('/dashboard/diario')

    const professorPilot = resolveVisibleQuickAccess(quickAccessItems, {
      role: 'professor',
      pilotMode: true,
      canManageSchool: false,
    })
    expect(professorPilot.some((item) => item.schoolWrite)).toBe(false)
  })

  it('keeps the diary quick action reachable in demo mode through the explicit diary capability', () => {
    const diretorDemo = resolveVisibleQuickAccess(quickAccessItems, {
      role: 'diretor',
      pilotMode: true,
      demoSandbox: true,
      canManageSchool: true,
    })
    expect(diretorDemo.map((item) => item.name)).toContain('Diário de Classe')
    expect(diretorDemo.map((item) => item.name)).toContain('Relatórios')
  })

  it('exposes safe synthetic capabilities in demo without widening role checks', () => {
    const secretarioDemo = resolveVisibleQuickAccess(quickAccessItems, {
      role: 'secretario',
      pilotMode: true,
      demoSandbox: true,
      canManageSchool: true,
    })
    expect(secretarioDemo.map((item) => item.name)).toContain('Novo Aluno')
    expect(secretarioDemo.map((item) => item.name)).toContain('Relatórios')

    const professorDemo = resolveVisibleQuickAccess(quickAccessItems, {
      role: 'professor',
      pilotMode: true,
      demoSandbox: true,
      canManageSchool: false,
    })
    expect(professorDemo.some((item) => item.schoolWrite)).toBe(false)
    expect(resolveVisibleQuickActionCards(true, true, true).map((card) => card.name)).toContain('Lançar Notas')
  })

  it('filters school-write action cards when the caller cannot manage the school', () => {
    const restricted = resolveVisibleQuickActionCards(true, false)
    expect(restricted.some((card) => card.schoolWrite)).toBe(false)
    expect(restricted.find((card) => card.name === 'Nova Chamada')?.href).toBe('/dashboard/turmas')
  })
})
