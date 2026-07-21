import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DescriptiveReportForm } from '@/components/reports/DescriptiveReportForm'

const labels = [
  /o eu, o outro e o nos/i,
  /corpo, gestos e movimentos/i,
  /tracos, sons, cores e formas/i,
  /escuta, fala, pensamento e imaginacao/i,
  /espacos, tempos, quantidades/i,
]
const completeText = 'A criança demonstrou evolução consistente e participou ativamente das experiências propostas.'

const renderForm = (props: Partial<React.ComponentProps<typeof DescriptiveReportForm>> = {}) => {
  const onSaveDraft = vi.fn().mockResolvedValue(undefined)
  const onFinalize = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  render(
    <DescriptiveReportForm
      studentName="Ana E2E"
      semesterLabel="1º Semestre 2026"
      autoSaveInterval={0}
      onSaveDraft={onSaveDraft}
      onFinalize={onFinalize}
      onCancel={onCancel}
      {...props}
    />
  )
  return { onSaveDraft, onFinalize, onCancel }
}

describe('DescriptiveReportForm', () => {
  it('renders student, semester, status and five experience fields', () => {
    renderForm()
    expect(screen.getByText('Ana E2E')).toBeInTheDocument()
    expect(screen.getByText(/1º Semestre 2026/)).toBeInTheDocument()
    expect(screen.getByText(/rascunho/i)).toBeInTheDocument()
    for (const label of labels) expect(screen.getByLabelText(label)).toBeInTheDocument()
  })

  it('tracks progress and unsaved changes', async () => {
    renderForm()
    expect(screen.getByText('0%')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(labels[0]), { target: { value: completeText } })
    await waitFor(() => expect(screen.getByText('20%')).toBeInTheDocument())
    expect(screen.getByText(/alteracoes nao salvas/i)).toBeInTheDocument()
  })

  it('saves a changed draft', async () => {
    const { onSaveDraft } = renderForm()
    fireEvent.change(screen.getByLabelText(labels[0]), { target: { value: completeText } })
    const save = screen.getByRole('button', { name: /salvar rascunho/i })
    await waitFor(() => expect(save).toBeEnabled())
    fireEvent.click(save)
    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledOnce())
  })

  it('enables finalization only after all required fields are complete', async () => {
    const { onFinalize } = renderForm()
    const finalize = screen.getByRole('button', { name: /finalizar/i })
    expect(finalize).toBeDisabled()
    for (const label of labels) fireEvent.change(screen.getByLabelText(label), { target: { value: completeText } })
    await waitFor(() => expect(finalize).toBeEnabled())
    fireEvent.click(finalize)
    await waitFor(() => expect(onFinalize).toHaveBeenCalledOnce())
  })

  it('locks a finalized report', () => {
    renderForm({ status: 'finalizado' })
    expect(screen.getByText(/finalizado/i)).toBeInTheDocument()
    for (const label of labels) expect(screen.getByLabelText(label)).toBeDisabled()
    expect(screen.queryByRole('button', { name: /salvar rascunho/i })).not.toBeInTheDocument()
  })

  it('calls cancel from the Voltar action', () => {
    const { onCancel } = renderForm()
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
