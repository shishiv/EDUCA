import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { FecharAulaDialog } from '@/components/attendance/FecharAulaDialog'

describe('FecharAulaDialog', () => {
  it('submits the closing observation', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(
      <FecharAulaDialog
        open
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        sessaoId="sessao-sintetica"
      />,
    )

    fireEvent.change(screen.getByLabelText(/observações/i), { target: { value: 'Aula sintética' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Aula sintética'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
