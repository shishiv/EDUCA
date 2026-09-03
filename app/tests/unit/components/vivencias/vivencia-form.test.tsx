import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VivenciaForm } from '@/components/diary/VivenciaForm'

describe('VivenciaForm persistence contract', () => {
  it('keeps the five Campo selector and submits the narrative payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <VivenciaForm
        studentName="Criança Sintética"
        onSubmit={onSubmit}
        initialData={{ campos_experiencia: ['eu'] }}
      />,
    )

    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    await user.type(
      screen.getByLabelText(/descri.*viv/i),
      'A criança explorou movimentos com os colegas.',
    )
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await expect.poll(() => onSubmit.mock.calls.length).toBe(1)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      campos_experiencia: ['eu'],
      descricao: 'A criança explorou movimentos com os colegas.',
    }))
  })
})
