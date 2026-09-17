import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { StudentReport } from '@/components/reports/StudentReport'
import { StudentReportInfantil } from '@/components/reports/StudentReportInfantil'
import { AttendanceReportTable } from '@/components/reports/AttendanceReportTable'

import { getMessagesForLocale } from '@/i18n/messages'

describe('municipal report branding', () => {
  it('renders the resolved municipality in every printable report footer', () => {
    render(<NextIntlClientProvider locale="pt-BR" messages={getMessagesForLocale('pt-BR')}><>
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
    </></NextIntlClientProvider>)

    expect(screen.getAllByText('Município de Prova')).toHaveLength(3)
  })
})
