import { renderWithMessages as render } from '../render-with-messages'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import { VivenciaForm } from '@/components/diary/VivenciaForm'
import type { VivenciaFormData } from '@/types/diario-infantil'

/**
 * Unit Tests: VivenciaForm Component
 * Tests for child observation form (Educação Infantil)
 */

describe('VivenciaForm', () => {
  const mockOnSubmit = vi.fn<(data: VivenciaFormData) => Promise<void>>()
  const mockOnCancel = vi.fn()
  
  const defaultProps = {
    onSubmit: mockOnSubmit,
    studentName: 'João Silva Santos',
  }

  beforeEach(() => {
    mockOnSubmit.mockReset()
    mockOnSubmit.mockResolvedValue(undefined)
    mockOnCancel.mockReset()
  })

  describe('Basic Rendering', () => {
    it('should render student name', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      expect(screen.getByText('João Silva Santos')).toBeInTheDocument()
    })

    it('should render date field', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      const dateInput = screen.getByLabelText(/data.*vivência/i)
      expect(dateInput).toBeInTheDocument()
      expect(dateInput).toHaveAttribute('type', 'date')
    })

    it('should render campos de experiencia selector', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      expect(screen.getByText(/campos.*experiência/i)).toBeInTheDocument()
    })

    it('should render description textarea', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/descrição.*vivência/i)
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('should render observations field', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      expect(screen.getByLabelText(/observações.*adicionais/i)).toBeInTheDocument()
    })

    it('should render save button', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
    })

    it('should not render cancel button by default', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument()
    })

    it('should render cancel button when onCancel is provided', () => {
      render(<VivenciaForm {...defaultProps} onCancel={mockOnCancel} />)
      
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })
  })

  describe('Default Values', () => {
    it('should default date to today', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      const dateInput = screen.getByLabelText(/data/i)
      const today = format(new Date(), 'yyyy-MM-dd')
      
      expect(dateInput).toHaveValue(today)
    })

    it('should use initial data when provided', () => {
      const initialData: Partial<VivenciaFormData> = {
        data_vivencia: '2024-01-15',
        campos_experiencia: ['eu', 'corpo'],
        descricao: 'Test description',
        observacoes: 'Test observations',
      }
      
      render(<VivenciaForm {...defaultProps} initialData={initialData} />)
      
      const dateInput = screen.getByLabelText(/data/i)
      expect(dateInput).toHaveValue('2024-01-15')
    })

    it('should have empty campos by default', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      expect(screen.getAllByRole('checkbox')).toHaveLength(5)
      expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0)
    })
  })

  describe('Form Interaction', () => {
    it('should allow changing date', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const dateInput = screen.getByLabelText(/data/i)
      await user.clear(dateInput)
      await user.type(dateInput, '2024-02-15')
      
      expect(dateInput).toHaveValue('2024-02-15')
    })

    it('should allow typing description', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/descrição/i)
      await user.type(textarea, 'A criança demonstrou interesse em atividades artísticas')
      
      expect(textarea).toHaveValue('A criança demonstrou interesse em atividades artísticas')
    })

    it('should allow typing observations', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const obsTextarea = screen.getByLabelText(/observações/i)
      await user.type(obsTextarea, 'Observação adicional')
      
      expect(obsTextarea).toHaveValue('Observação adicional')
    })

    it('should update character count for description', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/descrição/i)
      await user.type(textarea, 'Test')
      
      // Should show character count
      expect(screen.getByText(/4\//)).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('should show error when date is empty', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const dateInput = screen.getByLabelText(/data/i)
      await user.clear(dateInput)
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/data.*obrigatória/i)).toBeInTheDocument()
      })
    })

    it('should show error when no campo is selected', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/descrição/i)
      await user.type(textarea, 'A'.repeat(50))
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/selecione.*campo/i)
      })
    })

    it('should show error when description is too short', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/descrição/i)
      await user.type(textarea, 'abc')
      
      await user.click(screen.getByRole('button', { name: /salvar/i }))
      
      await waitFor(() => {
        expect(textarea).toHaveAccessibleDescription(/mínimo.*caracteres/i)
        expect(textarea).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('should show error when description is too long', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/descrição/i)
      const longText = 'a'.repeat(2001)
      fireEvent.change(textarea, { target: { value: longText } })
      await user.click(screen.getByRole('button', { name: /salvar/i }))
      
      await waitFor(() => {
        expect(textarea).toHaveAccessibleDescription(/máximo.*2000.*caracteres/i)
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('should validate observations length', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const obsTextarea = screen.getByLabelText(/observações/i)
      const longText = 'a'.repeat(501)
      fireEvent.change(obsTextarea, { target: { value: longText } })
      await user.click(screen.getByRole('button', { name: /salvar/i }))
      
      await waitFor(() => {
        expect(obsTextarea).toHaveAccessibleDescription(/máximo.*500.*caracteres/i)
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      
      render(<VivenciaForm {...defaultProps} />)
      
      // Fill form
      const textarea = screen.getByLabelText(/descrição/i)
      await user.type(textarea, 'Descrição completa da vivência observada com a criança')
      
      await user.click(screen.getByRole('checkbox', { name: /O eu, o outro/i }))
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(saveButton)
      
      await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledExactlyOnceWith({
        data_vivencia: format(new Date(), 'yyyy-MM-dd'),
        campos_experiencia: ['eu'],
        descricao: 'Descrição completa da vivência observada com a criança',
        observacoes: '',
      }))
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      const submission = Promise.withResolvers<void>()
      mockOnSubmit.mockReturnValue(submission.promise)
      
      const initialData: Partial<VivenciaFormData> = {
        campos_experiencia: ['eu'],
        descricao: 'Descrição completa da vivência observada',
      }
      
      render(<VivenciaForm {...defaultProps} initialData={initialData} />)
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/salvando/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).toHaveBeenCalledOnce()
      await act(async () => { submission.resolve() })
      expect(screen.getByRole('button', { name: /salvar/i })).toBeEnabled()
    })

    it('should disable form during submission', async () => {
      const user = userEvent.setup()
      const submission = Promise.withResolvers<void>()
      mockOnSubmit.mockReturnValue(submission.promise)
      
      const initialData: Partial<VivenciaFormData> = {
        campos_experiencia: ['eu'],
        descricao: 'Descrição válida da vivência observada',
      }
      
      render(<VivenciaForm {...defaultProps} initialData={initialData} />)
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/descrição/i)
        expect(textarea).toBeDisabled()
      })
      expect(mockOnSubmit).toHaveBeenCalledOnce()
      await act(async () => { submission.resolve() })
      expect(screen.getByLabelText(/descrição/i)).toBeEnabled()
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} onCancel={mockOnCancel} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      await user.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('should not call onSubmit when form is invalid', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      // Don't fill required fields
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(saveButton)
      
      // Wait a bit to ensure async validation completes
      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })
  })

  describe('Disabled State', () => {
    it('should disable all inputs when disabled prop is true', () => {
      render(<VivenciaForm {...defaultProps} disabled={true} />)
      
      const dateInput = screen.getByLabelText(/data/i)
      const descriptionTextarea = screen.getByLabelText(/descrição/i)
      const observationsTextarea = screen.getByLabelText(/observações/i)
      
      expect(dateInput).toBeDisabled()
      expect(descriptionTextarea).toBeDisabled()
      expect(observationsTextarea).toBeDisabled()
    })

    it('should disable save button when disabled', () => {
      render(<VivenciaForm {...defaultProps} disabled={true} />)
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      expect(saveButton).toBeDisabled()
    })

    it('should not disable cancel button when form is disabled', () => {
      render(<VivenciaForm {...defaultProps} disabled={true} onCancel={mockOnCancel} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      expect(cancelButton).not.toBeDisabled()
    })
  })

  describe('Loading State', () => {
    it('should disable form when isLoading is true', () => {
      render(<VivenciaForm {...defaultProps} isLoading={true} />)
      
      const saveButton = screen.getByRole('button', { name: /salvando|salvar/i })
      expect(saveButton).toBeDisabled()
    })

    it('should show loading text in save button', () => {
      render(<VivenciaForm {...defaultProps} isLoading={true} />)
      
      expect(screen.getByText(/salvando/i)).toBeInTheDocument()
    })
  })

  describe('Character Count Display', () => {
    it('should show character count for description', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      // Should show 0/max format
      expect(screen.getByText(/0\//)).toBeInTheDocument()
    })

    it('should update character count as user types', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/descrição/i)
      await user.type(textarea, 'Test input')
      
      expect(screen.getByText(/10\//)).toBeInTheDocument()
    })

    it('should show warning color when below minimum', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/descrição/i)
      await user.type(textarea, 'Short')
      
      // Character count should have warning styling
      const charCount = screen.getByText(/5\//)
      expect(charCount).toHaveClass(/amber|yellow|warning/)
    })

    it('should show success color when valid length', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/descrição/i)
      await user.type(textarea, 'A'.repeat(50))
      
      const charCount = screen.getByText(/50\//)
      expect(charCount).toHaveClass(/green|success/)
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for all fields', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      expect(screen.getByLabelText(/data.*vivência/i)).toBeInTheDocument()
      expect(screen.getByRole('group', { name: /campos.*experiência/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/descrição.*vivência/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/observações/i)).toBeInTheDocument()
    })

    it('should indicate required fields', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      // Look for asterisks or required indicators
      const asterisks = screen.getAllByText('*')
      expect(asterisks.length).toBeGreaterThan(0)
    })

    it('should associate error messages with fields', async () => {
      const user = userEvent.setup()
      render(<VivenciaForm {...defaultProps} />)
      
      const dateInput = screen.getByLabelText(/data/i)
      await user.clear(dateInput)
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(dateInput).toHaveAccessibleDescription(/data.*obrigatória/i)
        expect(dateInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('should have semantic HTML structure', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      const form = screen.getByRole('form', { name: 'Registrar vivência de João Silva Santos' })
      expect(form).toBeInTheDocument()
      expect(form.tagName).toBe('FORM')
    })
  })

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <VivenciaForm {...defaultProps} className="custom-class" />
      )
      
      const form = container.querySelector('form')
      expect(form).toHaveClass('custom-class')
    })
  })

  describe('Student Info Display', () => {
    it('should display student name in info box', () => {
      render(<VivenciaForm {...defaultProps} studentName="Maria Santos" />)
      
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    })

    it('should show "Registrando vivência para" text', () => {
      render(<VivenciaForm {...defaultProps} />)
      
      expect(screen.getByText(/registrando.*vivência.*para/i)).toBeInTheDocument()
    })
  })
})
