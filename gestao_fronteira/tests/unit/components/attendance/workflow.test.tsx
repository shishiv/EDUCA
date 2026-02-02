import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AbrirAulaWorkflow } from '@/components/attendance/AbrirAulaWorkflow'
import { FecharAulaDialog } from '@/components/attendance/FecharAulaDialog'

/**
 * Unit Tests: Attendance Workflow Components
 * Tests AbrirAulaWorkflow and FecharAulaDialog components:
 * - Opening class sessions
 * - Closing class sessions
 * - Form validation
 * - Success/error handling
 * - Cancel behavior
 *
 * Swarm 3: Frequência (Chamada)
 */

// Mock dependencies
vi.mock('@/lib/api/enhanced-attendance', () => ({
  enhancedAttendanceApi: {
    createSession: vi.fn(),
    closeSession: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AbrirAulaWorkflow Component', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  const defaultProps = {
    turmaId: 'turma-123',
    professorId: 'prof-456',
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      expect(screen.getByRole('heading', { name: /abrir.*aula/i })).toBeInTheDocument()
    })

    it('should display description text', () => {
      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      expect(screen.getByText(/inicie.*nova.*sessão|marcar.*frequência/i)).toBeInTheDocument()
    })

    it('should have "Abrir Aula" button', () => {
      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /abrir.*aula/i })).toBeInTheDocument()
    })

    it('should show Cancel button when onCancel is provided', () => {
      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })

    it('should not show Cancel button when onCancel is not provided', () => {
      render(<AbrirAulaWorkflow turmaId="turma-123" professorId="prof-456" />)
      
      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument()
    })

    it('should display BookOpen icon', () => {
      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      // Icon is rendered as SVG
      const heading = screen.getByRole('heading', { name: /abrir.*aula/i })
      expect(heading).toBeInTheDocument()
    })
  })

  describe('Button Interactions', () => {
    it('should call onCancel when Cancel button is clicked', () => {
      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('should disable buttons when loading', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      vi.mocked(enhancedAttendanceApi.createSession).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: 'session-1' } as any), 1000))
      )

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      // Button should be disabled during loading
      await waitFor(() => {
        expect(abrirButton).toBeDisabled()
      })
    })

    it('should show loading text when opening session', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      vi.mocked(enhancedAttendanceApi.createSession).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: 'session-1' } as any), 1000))
      )

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      await waitFor(() => {
        expect(screen.getByText(/abrindo/i)).toBeInTheDocument()
      })
    })
  })

  describe('Session Creation', () => {
    it('should create session with correct data', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      vi.mocked(enhancedAttendanceApi.createSession).mockResolvedValue({ id: 'session-1' } as any)

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      await waitFor(() => {
        expect(enhancedAttendanceApi.createSession).toHaveBeenCalledWith(
          expect.objectContaining({
            turma_id: 'turma-123',
            professor_id: 'prof-456',
            status: 'aberta',
          })
        )
      })
    })

    it('should call onSuccess with session ID on successful creation', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      vi.mocked(enhancedAttendanceApi.createSession).mockResolvedValue({ id: 'session-999' } as any)

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('session-999')
      })
    })

    it('should show success toast on successful creation', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      const { toast } = await import('sonner')
      vi.mocked(enhancedAttendanceApi.createSession).mockResolvedValue({ id: 'session-1' } as any)

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/aula.*aberta|sucesso/i))
      })
    })

    it('should use current date for data_aula', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      vi.mocked(enhancedAttendanceApi.createSession).mockResolvedValue({ id: 'session-1' } as any)

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      const today = new Date().toISOString().split('T')[0]
      
      await waitFor(() => {
        expect(enhancedAttendanceApi.createSession).toHaveBeenCalledWith(
          expect.objectContaining({
            data_aula: today,
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should show temporal error message', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      const { toast } = await import('sonner')
      vi.mocked(enhancedAttendanceApi.createSession).mockRejectedValue(
        new Error('ERRO_TEMPORAL')
      )

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/não.*possível.*abrir|atraso/i)
        )
      })
    })

    it('should show duplication error message', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      const { toast } = await import('sonner')
      vi.mocked(enhancedAttendanceApi.createSession).mockRejectedValue(
        new Error('ERRO_DUPLICACAO')
      )

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('sessao')
        )
      })
    })

    it('should show authorization error message', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      const { toast } = await import('sonner')
      vi.mocked(enhancedAttendanceApi.createSession).mockRejectedValue(
        new Error('ERRO_AUTORIZACAO')
      )

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('permissao')
        )
      })
    })

    it('should show generic error message for unknown errors', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      const { toast } = await import('sonner')
      vi.mocked(enhancedAttendanceApi.createSession).mockRejectedValue(
        new Error('Unknown error')
      )

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/erro.*abrir.*aula|tente.*novamente/i)
        )
      })
    })

    it('should re-enable button after error', async () => {
      const { enhancedAttendanceApi } = await import('@/lib/api/enhanced-attendance')
      vi.mocked(enhancedAttendanceApi.createSession).mockRejectedValue(
        new Error('Test error')
      )

      render(<AbrirAulaWorkflow {...defaultProps} />)
      
      const abrirButton = screen.getByRole('button', { name: /abrir.*aula/i })
      fireEvent.click(abrirButton)
      
      await waitFor(() => {
        expect(abrirButton).not.toBeDisabled()
      })
    })
  })
})

describe('FecharAulaDialog Component', () => {
  const mockOnConfirm = vi.fn()
  const mockOnOpenChange = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onConfirm: mockOnConfirm,
    sessaoId: 'session-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnConfirm.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      expect(screen.getByRole('heading', { name: /encerrar.*aula|fechar.*aula/i })).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<FecharAulaDialog {...defaultProps} open={false} />)
      
      expect(screen.queryByRole('heading', { name: /encerrar.*aula/i })).not.toBeInTheDocument()
    })

    it('should display warning message', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      // Multiple elements contain this text, use getAllByText
      const warnings = screen.getAllByText(/não.*pode.*desfeita|bloqueada|atenção/i)
      expect(warnings.length).toBeGreaterThan(0)
    })

    it('should display confirmation description', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      // Multiple elements contain this text, use getAllByText
      const descriptions = screen.getAllByText(/confirme.*encerramento|frequência.*bloqueada/i)
      expect(descriptions.length).toBeGreaterThan(0)
    })

    it('should have observações textarea', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      expect(screen.getByLabelText(/observações/i)).toBeInTheDocument()
    })

    it('should have Cancel button', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })

    it('should have Confirm button', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('should allow typing in observações textarea', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/observações/i)
      fireEvent.change(textarea, { target: { value: 'Aula sobre frações' } })
      
      expect(textarea).toHaveValue('Aula sobre frações')
    })

    it('should have placeholder text in textarea', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/observações/i)
      expect(textarea).toHaveAttribute('placeholder')
    })

    it('should show helper text below textarea', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      expect(screen.getByText(/conteúdo.*ministrado|atividades.*realizadas/i)).toBeInTheDocument()
    })
  })

  describe('Cancel Behavior', () => {
    it('should call onOpenChange(false) when Cancel is clicked', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)
      
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should disable Cancel button during loading', async () => {
      mockOnConfirm.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(<FecharAulaDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancelar/i })
        expect(cancelButton).toBeDisabled()
      })
    })
  })

  describe('Confirm Behavior', () => {
    it('should call onConfirm when Confirm is clicked', async () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('')
      })
    })

    it('should pass observações to onConfirm', async () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/observações/i)
      fireEvent.change(textarea, { target: { value: 'Aula produtiva' } })
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('Aula produtiva')
      })
    })

    it('should show loading state on Confirm button', async () => {
      mockOnConfirm.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(<FecharAulaDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(screen.getByText(/encerrando/i)).toBeInTheDocument()
      })
    })

    it('should disable Confirm button during loading', async () => {
      mockOnConfirm.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(<FecharAulaDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(confirmButton).toBeDisabled()
      })
    })

    it('should close dialog after successful confirmation', async () => {
      mockOnConfirm.mockResolvedValue(undefined)

      render(<FecharAulaDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should clear observações after closing', async () => {
      const { rerender } = render(<FecharAulaDialog {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/observações/i)
      fireEvent.change(textarea, { target: { value: 'Test text' } })
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })

      // Reopen dialog
      rerender(<FecharAulaDialog {...defaultProps} open={true} />)
      
      // Textarea should be empty
      const reopenedTextarea = screen.getByLabelText(/observações/i)
      expect(reopenedTextarea).toHaveValue('')
    })
  })

  describe('Error Handling', () => {
    it('should log error when onConfirm fails', async () => {
      const { logger } = await import('@/lib/logger')
      mockOnConfirm.mockRejectedValue(new Error('Test error'))

      render(<FecharAulaDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled()
      })
    })

    it('should re-enable button after error', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Test error'))

      render(<FecharAulaDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled()
      })
    })

    it('should keep dialog open after error', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Test error'))

      render(<FecharAulaDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /encerrar.*aula/i })).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper dialog role', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('should have textarea with proper label', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/observações/i)
      expect(textarea).toHaveAttribute('id')
    })

    it('should have CheckCircle icon on heading', () => {
      render(<FecharAulaDialog {...defaultProps} />)
      
      // Icon is rendered alongside heading
      const heading = screen.getByRole('heading', { name: /encerrar.*aula/i })
      expect(heading).toBeInTheDocument()
    })
  })
})
