import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithMessages } from '../render-with-messages'
import { StudentReport, type AttendanceSummary } from '@/components/reports/StudentReport'

function renderReport(percentual: number, bands: AttendanceSummary['bands']) {
  renderWithMessages(<StudentReport
    student={{ id: 'synthetic', nome: 'Aluno Sintético', turma: 'A', serie: '1º ano', escola: 'Escola Sintética', anoLetivo: 2026 }}
    municipalityName="Município Sintético"
    grades={[{ disciplina: 'matematica', bimestre1: 9, bimestre2: 9, bimestre3: 9, bimestre4: 9, media: 9 }]}
    attendance={{ bands, percentual, totalAulas: 100, presencas: percentual, faltas: 100 - percentual, atestados: 0 }}
  />)
}

function reportCard(title: string) {
  const heading = screen.getByRole('heading', { name: title })
  const card = heading.parentElement?.parentElement
  if (!card) throw new Error('Report section missing')
  return within(card)
}

describe('general attendance alert is independent from report-card approval', () => {
  it('uses a lower municipal reference without changing the failing approval floor', () => {
    renderReport(78, { reference: 70, attention: 75 })
    expect(screen.queryByText(/Frequência abaixo da referência municipal/)).not.toBeInTheDocument()
    expect(reportCard('Frequencia').getByText('78.0%')).toHaveClass('text-green-800')
    expect(reportCard('Resultado Final').getByText('Reprovado')).toBeInTheDocument()
    expect(reportCard('Resultado Final').getByText('78.0%')).toHaveClass('text-red-700')
  })

  it('uses a higher municipal reference without changing a passing approval result', () => {
    renderReport(82, { reference: 90, attention: 95 })
    expect(screen.getByText('Frequência abaixo da referência municipal de 90%')).toBeInTheDocument()
    expect(reportCard('Frequencia').getByText('82.0%')).toHaveClass('text-red-800')
    expect(reportCard('Resultado Final').getByText('Aprovado')).toBeInTheDocument()
    expect(reportCard('Resultado Final').getByText('82.0%')).toHaveClass('text-green-700')
  })
})
