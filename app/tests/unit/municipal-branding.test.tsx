import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StudentReport } from '@/components/reports/StudentReport'
import { StudentReportInfantil } from '@/components/reports/StudentReportInfantil'
import { AttendanceReportTable } from '@/components/reports/AttendanceReportTable'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

describe('municipal report branding', () => {
  it('renders the resolved municipality in every printable report footer', () => {
    render(<>
      <StudentReport
        student={{ id: 'student-1', nome: 'Aluno Sintético', turma: 'Turma A', serie: '1º ano', escola: 'Escola Sintética', anoLetivo: 2026 }}
        grades={[]}
        municipalityName="Município de Prova"
        printMode
      />
      <StudentReportInfantil
        student={{ id: 'student-2', nome: 'Criança Sintética', turma: 'Turma B', escola: 'Escola Sintética', anoLetivo: 2026 }}
        reports={[]}
        municipalityName="Município de Prova"
        printMode
      />
      <AttendanceReportTable data={[]} municipalityName="Município de Prova" printMode />
    </>)

    expect(screen.getAllByText('Município de Prova')).toHaveLength(3)
  })
})
