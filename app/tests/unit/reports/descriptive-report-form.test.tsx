import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DescriptiveReportForm } from '@/components/reports/DescriptiveReportForm'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => ({
    'components.descriptive.unsaved': 'Alterações não salvas',
    'components.descriptive.saved': 'Todas as alterações salvas',
    'components.descriptive.finalTitle': 'Relatório finalizado',
    'components.descriptive.finalizedReadOnly': 'Este relatório não pode ser alterado',
    'components.descriptive.complementary': 'Observações complementares',
    'components.descriptive.saveDraft': 'Salvar rascunho',
  })[key] ?? key,
}))

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
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled()
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
    expect(screen.getByText('Relatório finalizado')).toBeInTheDocument()
    for (const textbox of screen.getAllByRole('textbox')) expect(textbox).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Finalizar' })).not.toBeInTheDocument()
  })
})
