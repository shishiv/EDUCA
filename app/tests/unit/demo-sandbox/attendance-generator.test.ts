import { describe, expect, it } from 'vitest'
import {
  DEMO_SCHOOL_DAYS,
  LOW_ATTENDANCE_MATRICULA_ID,
  LOW_ATTENDANCE_RATE,
  MATRICULAS,
  TURMAS,
  attendanceSql,
  attendanceRateFor,
  generateAttendance,
  hashString,
  isPresentOn,
  schoolDaysEndingOn,
} from '../../../../supabase/seed-demo/attendance-generator'

const ANCHOR = '2026-07-01' // quarta-feira

describe('attendance-generator determinismo', () => {
  it('produz SQL byte-identico para a mesma ancora', () => {
    const a = attendanceSql({ anchorDate: ANCHOR })
    const b = attendanceSql({ anchorDate: ANCHOR })
    expect(b).toBe(a)
  })

  it('produca datasets diferentes para ancoras diferentes', () => {
    const a = attendanceSql({ anchorDate: '2026-07-01' })
    const b = attendanceSql({ anchorDate: '2026-07-08' })
    expect(b).not.toBe(a)
  })

  it('hashString e estavel (mesma entrada, mesma saida)', () => {
    expect(hashString('00000000-0000-0000-0000-000000000401')).toBe(
      hashString('00000000-0000-0000-0000-000000000401')
    )
  })

  it('a janela tem exatamente 20 dias letivos e nao inclui fins de semana', () => {
    const days = schoolDaysEndingOn(ANCHOR, DEMO_SCHOOL_DAYS)
    expect(days).toHaveLength(DEMO_SCHOOL_DAYS)
    for (const day of days) {
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
      expect([1, 2, 3, 4, 5]).toContain(weekday)
    }
    // ancoras de fim de semana retrocedem para a ultima sexta
    const sunday = schoolDaysEndingOn('2026-07-05', 1)
    expect(sunday[0]).toBe('2026-07-03')
  })

  it('a ultima data da janela e a ancora quando ela e dia util', () => {
    const days = schoolDaysEndingOn(ANCHOR, DEMO_SCHOOL_DAYS)
    expect(days[days.length - 1]).toBe(ANCHOR)
  })
})

describe('atendimento (volume medido)', () => {
  it('gera 5 turmas x 20 dias = 100 aulas e 50 matriculas x 20 dias = 1000 frequencias', () => {
    const { aulas, frequencia } = generateAttendance({ anchorDate: ANCHOR })
    expect(aulas).toHaveLength(TURMAS.length * DEMO_SCHOOL_DAYS) // 100
    expect(frequencia).toHaveLength(MATRICULAS.length * DEMO_SCHOOL_DAYS) // 1000
  })

  it('ids de aulas e frequencias sao unicos dentro de cada tabela', () => {
    const { aulas, frequencia } = generateAttendance({ anchorDate: ANCHOR })
    expect(new Set(aulas.map(a => a.id)).size).toBe(aulas.length)
    expect(new Set(frequencia.map(f => f.id)).size).toBe(frequencia.length)
  })

  it('cada frequencia aponta para a aula da propria turma na mesma data', () => {
    const { aulas, frequencia } = generateAttendance({ anchorDate: ANCHOR })
    const aulaById = new Map(aulas.map(a => [a.id, a]))
    for (const f of frequencia) {
      const aula = aulaById.get(f.aulaId)
      expect(aula).toBeDefined()
      expect(aula!.dataAula).toBe(f.dataAula)
      const matricula = MATRICULAS.find(m => m.id === f.matriculaId)!
      expect(aula!.turmaId).toBe(matricula.turmaRef.id)
      expect(aula!.professorId).toBe(matricula.turmaRef.professorId)
    }
  })

  it('rejeita janelas acima do limite suportado pelo esquema de ids', () => {
    expect(() => generateAttendance({ anchorDate: ANCHOR, schoolDays: 21 })).toThrow(/schoolDays/)
  })
})

describe('caso de alerta Bolsa Familia (< 80%)', () => {
  it('a matricula designada tem taxa fixa de 70% e presenca exata de 70% em 20 dias', () => {
    expect(attendanceRateFor(LOW_ATTENDANCE_MATRICULA_ID)).toBe(LOW_ATTENDANCE_RATE)
    const days = schoolDaysEndingOn(ANCHOR, DEMO_SCHOOL_DAYS)
    const present = days.filter((day, i) => isPresentOn(LOW_ATTENDANCE_MATRICULA_ID, day, i)).length
    expect(present).toBe(14) // 14/20 = 70% < 80%
  })

  it('todas as outras matriculas ficam entre 86% e 98%', () => {
    for (const matricula of MATRICULAS) {
      if (matricula.id === LOW_ATTENDANCE_MATRICULA_ID) continue
      const rate = attendanceRateFor(matricula.id)
      expect(rate).toBeGreaterThanOrEqual(0.86)
      expect(rate).toBeLessThanOrEqual(0.98)
    }
  })

  it('a presenca por matricula e deterministica para a mesma ancora', () => {
    const days = schoolDaysEndingOn(ANCHOR, DEMO_SCHOOL_DAYS)
    for (const matricula of MATRICULAS) {
      const a = days.filter((day, i) => isPresentOn(matricula.id, day, i)).length
      const b = days.filter((day, i) => isPresentOn(matricula.id, day, i)).length
      expect(a).toBe(b)
    }
  })
})

describe('dados sinteticos variados', () => {
  it('produz tanto presencas quanto ausencias entre os alunos', () => {
    const { frequencia } = generateAttendance({ anchorDate: ANCHOR })
    const presences = frequencia.filter(f => f.presente).length
    const absences = frequencia.length - presences
    expect(presences).toBeGreaterThan(0)
    expect(absences).toBeGreaterThan(0)
    // a presenca varia por aluno: existem pelo menos 2 taxas distintas
    const days = schoolDaysEndingOn(ANCHOR, DEMO_SCHOOL_DAYS)
    const rates = new Set(
      MATRICULAS.map(m => days.filter((day, i) => isPresentOn(m.id, day, i)).length)
    )
    expect(rates.size).toBeGreaterThanOrEqual(2)
  })

  it('ausencias podem carregar justificativa de atestado medico (deterministico)', () => {
    const { frequencia } = generateAttendance({ anchorDate: ANCHOR })
    const withJustification = frequencia.filter(f => f.justificativa !== null)
    const absent = frequencia.filter(f => !f.presente)
    expect(withJustification.length).toBeGreaterThan(0)
    for (const f of withJustification) {
      expect(f.presente).toBe(false)
    }
    // justificativas sao deterministas para a mesma ancora
    const again = generateAttendance({ anchorDate: ANCHOR }).frequencia
    expect(again.map(f => f.justificativa)).toEqual(frequencia.map(f => f.justificativa))
    expect(absent.length).toBeGreaterThan(withJustification.length)
  })
})
