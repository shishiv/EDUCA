/**
 * Unit tests for AbrirAulaButton component
 * Testing Brazilian educational workflow compliance
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { AbrirAulaButton } from '@/components/attendance/abrir-aula-button'
import { toast } from 'sonner'

// Mock the sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}))

// Mock the API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('AbrirAulaButton Component', () => {
  const defaultProps = {
    turmaId: 'turma-123',
    professorId: 'prof-456',
    turmaNome: '1º Ano A',
    className: 'test-class'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Initial State', () => {
    it('should render button with correct initial text', () => {
      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })

    it('should display class name in button text', () => {
      render(<AbrirAulaButton {...defaultProps} />)

      expect(screen.getByText(/1º ano a/i)).toBeInTheDocument()
    })

    it('should show unlock icon when session is not open', () => {
      render(<AbrirAulaButton {...defaultProps} />)

      const unlockIcon = document.querySelector('svg[data-testid="unlock-icon"]')
      expect(unlockIcon).toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    it('should call API with correct parameters when clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            aula_id: 'aula-789',
            status: 'aberta',
            pode_marcar_frequencia: true
          }
        })
      })

      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/aulas/abrir', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            turma_id: 'turma-123',
            observacoes: 'Aula aberta via interface do professor'
          })
        })
      })
    })

    it('should show loading state during API call', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(promise)

      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      // Button should be disabled and show loading state
      expect(button).toBeDisabled()
      expect(screen.getByText(/abrindo/i)).toBeInTheDocument()

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { aula_id: 'aula-789', status: 'aberta' }
        })
      })

      await waitFor(() => {
        expect(button).not.toBeDisabled()
      })
    })

    it('should handle API success and show success message', async () => {
      const onSuccess = jest.fn()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            aula_id: 'aula-789',
            status: 'aberta',
            pode_marcar_frequencia: true
          }
        })
      })

      render(<AbrirAulaButton {...defaultProps} onSuccess={onSuccess} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Aula aberta com sucesso! Agora você pode marcar a frequência dos alunos.'
        )
        expect(onSuccess).toHaveBeenCalledWith({
          aula_id: 'aula-789',
          status: 'aberta',
          pode_marcar_frequencia: true
        })
      })
    })

    it('should handle API error and show error message', async () => {
      const onError = jest.fn()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: {
            code: 'SESSION_ALREADY_OPEN',
            message: 'Já existe uma aula aberta para esta turma hoje'
          }
        })
      })

      render(<AbrirAulaButton {...defaultProps} onError={onError} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Já existe uma aula aberta para esta turma hoje'
        )
        expect(onError).toHaveBeenCalledWith({
          code: 'SESSION_ALREADY_OPEN',
          message: 'Já existe uma aula aberta para esta turma hoje'
        })
      })
    })

    it('should handle network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Erro de conexão. Verifique sua internet e tente novamente.'
        )
      })
    })
  })

  describe('Visual States', () => {
    it('should change to "Aula Aberta" state after successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            aula_id: 'aula-789',
            status: 'aberta',
            pode_marcar_frequencia: true
          }
        })
      })

      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/aula aberta/i)).toBeInTheDocument()
        expect(screen.getByText(/frequência liberada/i)).toBeInTheDocument()
      })
    })

    it('should show different icon when session is open', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            aula_id: 'aula-789',
            status: 'aberta',
            pode_marcar_frequencia: true
          }
        })
      })

      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      await waitFor(() => {
        const checkIcon = document.querySelector('svg[data-testid="check-icon"]')
        expect(checkIcon).toBeInTheDocument()
      })
    })

    it('should disable button when session is already open', async () => {
      render(<AbrirAulaButton {...defaultProps} isSessionOpen={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText(/aula aberta/i)).toBeInTheDocument()
    })
  })

  describe('Brazilian Educational Compliance', () => {
    it('should include compliance notice in success message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            aula_id: 'aula-789',
            status: 'aberta',
            pode_marcar_frequencia: true
          }
        })
      })

      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Aula aberta com sucesso')
        )
      })
    })

    it('should prevent double-clicking to avoid duplicate sessions', async () => {
      let resolveCount = 0
      mockFetch.mockImplementation(() => {
        resolveCount++
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { aula_id: `aula-${resolveCount}`, status: 'aberta' }
          })
        })
      })

      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })

      // Double click rapidly
      fireEvent.click(button)
      fireEvent.click(button)

      await waitFor(() => {
        // Should only call API once due to loading state protection
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle session conflict error (Brazilian requirement)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: {
            code: 'SESSION_ALREADY_OPEN',
            message: 'Já existe uma aula aberta para esta turma hoje'
          }
        })
      })

      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Já existe uma aula aberta para esta turma hoje'
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Abrir aula'))
    })

    it('should be keyboard accessible', () => {
      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      button.focus()

      expect(button).toHaveFocus()
    })

    it('should show loading state with proper screen reader text', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(promise)

      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(button)

      expect(screen.getByText(/abrindo/i)).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-disabled', 'true')

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { aula_id: 'aula-789', status: 'aberta' }
        })
      })

      await waitFor(() => {
        expect(button).not.toHaveAttribute('aria-disabled')
      })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should have appropriate touch target size', () => {
      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })
      const styles = getComputedStyle(button)

      // Button should have minimum 44px height for touch accessibility
      expect(parseInt(styles.minHeight || '0')).toBeGreaterThanOrEqual(44)
    })

    it('should be responsive on mobile screens', () => {
      render(<AbrirAulaButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /abrir aula/i })

      // Should have responsive classes for mobile
      expect(button).toHaveClass('w-full', 'sm:w-auto')
    })
  })
})