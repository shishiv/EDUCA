import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { VivenciaForm } from '@/components/diary/VivenciaForm'

const description = 'A criança participou da atividade, compartilhou descobertas e interagiu com autonomia.'

const setup = (props: Partial<React.ComponentProps<typeof VivenciaForm>> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  render(<VivenciaForm studentName="Ana E2E" onSubmit={onSubmit} onCancel={onCancel} {...props} />)
  return { onSubmit, onCancel }
}

describe('VivenciaForm', () => {
  it('renders student context and accessible fields', () => {
    setup()
    expect(screen.getByText('Ana E2E')).toBeInTheDocument()
    expect(screen.getByLabelText(/data da vivencia/i)).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText(/descricao da vivencia/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/observacoes adicionais/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /campos de experiencia/i })).toBeInTheDocument()
  })

  it('validates required fields on submit', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /salvar vivencia/i }))
    await waitFor(() => expect(screen.getByText(/data.*obrigatoria|required/i)).toBeInTheDocument())
  })

  it('selects multiple experience fields with accessible checkbox state', () => {
    setup()
    const fields = screen.getAllByRole('checkbox')
    fireEvent.click(fields[0])
    fireEvent.click(fields[1])
    expect(fields[0]).toHaveAttribute('aria-checked', 'true')
    expect(fields[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('submits normalized form values', async () => {
    const { onSubmit } = setup()
    fireEvent.change(screen.getByLabelText(/data da vivencia/i), { target: { value: '2026-07-10' } })
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    fireEvent.change(screen.getByLabelText(/descricao da vivencia/i), { target: { value: description } })
    fireEvent.change(screen.getByLabelText(/observacoes adicionais/i), { target: { value: 'Observação opcional' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar vivencia/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      data_vivencia: '2026-07-10',
      descricao: description,
      observacoes: 'Observação opcional',
    })))
  })

  it('disables controls in loading state', () => {
    setup({ isLoading: true })
    expect(screen.getByLabelText(/data da vivencia/i)).toBeDisabled()
    expect(screen.getByLabelText(/descricao da vivencia/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled()
  })

  it('calls cancel', () => {
    const { onCancel } = setup()
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
