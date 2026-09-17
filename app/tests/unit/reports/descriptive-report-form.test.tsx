import { screen } from '@testing-library/react'
import { renderWithMessages as render } from '../components/render-with-messages'
import { describe, expect, it } from 'vitest'
import { DescriptiveReportForm } from '@/components/reports/DescriptiveReportForm'

describe('DescriptiveReportForm', () => {
  it('renders the draft header, progress and actions', () => {
    render(
      <DescriptiveReportForm
        studentName="Criança Sintética"
        semesterLabel="1 Semestre de 2026"
        autoSaveInterval={0}
      />,
    )

    expect(screen.getByText('Criança Sintética').parentElement).toHaveTextContent('1 Semestre de 2026')
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar Rascunho' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Finalizar' })).toBeDisabled()
  })

  it('keeps finalized reports read-only without draft actions', () => {
    render(
      <DescriptiveReportForm
        studentName="Criança Sintética"
        semesterLabel="1 Semestre de 2026"
        status="finalizado"
      />,
    )

    expect(screen.getByText('Finalizado')).toBeInTheDocument()
    expect(screen.getByText('Relatório Finalizado')).toBeInTheDocument()
    for (const textbox of screen.getAllByRole('textbox')) expect(textbox).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Salvar Rascunho' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Finalizar' })).not.toBeInTheDocument()
  })
})
