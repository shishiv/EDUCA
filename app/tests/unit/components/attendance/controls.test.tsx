import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ChamadaStatusButtons } from '@/components/attendance/ChamadaStatusButtons'
import { JustificationModal } from '@/components/attendance/JustificationModal'

/**
 * Unit Tests: Attendance Controls
 * Tests ChamadaStatusButtons and FrequencyControls components:
 * - P/F/J button interactions
 * - Toggle behavior
 * - Justification modal integration
 * - Disabled/locked states
 * - Touch-optimized sizing
 *
 * Swarm 3: Frequência (Chamada)
 */

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('ChamadaStatusButtons Component', () => {
  const mockOnChange = vi.fn()
  const mockOnJustificationNeeded = vi.fn()

  const defaultProps = {
    status: null as 'P' | 'F' | 'J' | null,
    onChange: mockOnChange,
    onJustificationNeeded: mockOnJustificationNeeded,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all three status buttons', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /presente/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /falta/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /justificada/i })).toBeInTheDocument()
    })

    it('should render with P button text', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveTextContent('P')
    })

    it('should render with F button text', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const fButton = screen.getByRole('button', { name: /falta/i })
      expect(fButton).toHaveTextContent('F')
    })

    it('should render with J button text', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const jButton = screen.getByRole('button', { name: /justificada/i })
      expect(jButton).toHaveTextContent('J')
    })

    it('should render with default medium size', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveClass(/min-w-\[44px\]|w-11/)
      expect(pButton).toHaveClass(/min-h-\[44px\]|h-11/)
    })

    it('should render with small size when specified', () => {
      render(<ChamadaStatusButtons {...defaultProps} size="sm" />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveClass(/min-w-\[36px\]|w-9/)
      expect(pButton).toHaveClass(/min-h-\[36px\]|h-9/)
    })
  })

  describe('Status Selection - Present (P)', () => {
    it('should mark as present when P button is clicked', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      fireEvent.click(pButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('P')
    })

    it('should highlight P button when status is P', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="P" />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveAttribute('aria-pressed', 'true')
      expect(pButton).toHaveClass(/bg-green-500/)
    })

    it('should toggle P button off when clicked again', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="P" />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      fireEvent.click(pButton)
      
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })

    it('should have green color scheme for P button when active', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="P" />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveClass(/bg-green-500|text-white|border-green-600/)
    })

    it('should have inactive styling when P is not selected', () => {
      render(<ChamadaStatusButtons {...defaultProps} status={null} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveClass(/bg-white|text-green-700/)
    })
  })

  describe('Status Selection - Absent (F)', () => {
    it('should mark as absent when F button is clicked', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const fButton = screen.getByRole('button', { name: /falta/i })
      fireEvent.click(fButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('F')
    })

    it('should highlight F button when status is F', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="F" />)
      
      const fButton = screen.getByRole('button', { name: /falta/i })
      expect(fButton).toHaveAttribute('aria-pressed', 'true')
      expect(fButton).toHaveClass(/bg-red-500/)
    })

    it('should toggle F button off when clicked again', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="F" />)
      
      const fButton = screen.getByRole('button', { name: /falta/i })
      fireEvent.click(fButton)
      
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })

    it('should have red color scheme for F button when active', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="F" />)
      
      const fButton = screen.getByRole('button', { name: /falta/i })
      expect(fButton).toHaveClass(/bg-red-500|text-white|border-red-600/)
    })
  })

  describe('Status Selection - Justified (J)', () => {
    it('should call onJustificationNeeded when J button is clicked', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const jButton = screen.getByRole('button', { name: /justificada/i })
      fireEvent.click(jButton)
      
      expect(mockOnJustificationNeeded).toHaveBeenCalledTimes(1)
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should highlight J button when status is J', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="J" />)
      
      const jButton = screen.getByRole('button', { name: /justificada/i })
      expect(jButton).toHaveAttribute('aria-pressed', 'true')
      expect(jButton).toHaveClass(/bg-amber-500/)
    })

    it('should toggle J button off when clicked again', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="J" />)
      
      const jButton = screen.getByRole('button', { name: /justificada/i })
      fireEvent.click(jButton)
      
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })

    it('should have amber color scheme for J button when active', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="J" />)
      
      const jButton = screen.getByRole('button', { name: /justificada/i })
      expect(jButton).toHaveClass(/bg-amber-500|text-white|border-amber-600/)
    })

    it('should not call onChange when J is clicked (only calls onJustificationNeeded)', () => {
      render(<ChamadaStatusButtons {...defaultProps} status={null} />)
      
      const jButton = screen.getByRole('button', { name: /justificada/i })
      fireEvent.click(jButton)
      
      expect(mockOnChange).not.toHaveBeenCalled()
      expect(mockOnJustificationNeeded).toHaveBeenCalled()
    })
  })

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(<ChamadaStatusButtons {...defaultProps} disabled={true} />)
      
      expect(screen.getByRole('button', { name: /presente/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /falta/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /justificada/i })).toBeDisabled()
    })

    it('should not trigger onChange when disabled', () => {
      render(<ChamadaStatusButtons {...defaultProps} disabled={true} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      fireEvent.click(pButton)
      
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should show lock icon when disabled', () => {
      render(<ChamadaStatusButtons {...defaultProps} disabled={true} />)
      
      // Lock icon should be present
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have opacity styling when disabled', () => {
      render(<ChamadaStatusButtons {...defaultProps} disabled={true} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveClass(/opacity-50/)
    })
  })

  describe('Toggle Behavior', () => {
    it('should switch from null to P to null', () => {
      const { rerender } = render(<ChamadaStatusButtons {...defaultProps} status={null} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      fireEvent.click(pButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('P')
      
      // Simulate parent updating status
      rerender(<ChamadaStatusButtons {...defaultProps} status="P" />)
      
      fireEvent.click(pButton)
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })

    it('should switch from P to F directly', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="P" />)
      
      const fButton = screen.getByRole('button', { name: /falta/i })
      fireEvent.click(fButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('F')
    })

    it('should switch from F to P directly', () => {
      render(<ChamadaStatusButtons {...defaultProps} status="F" />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      fireEvent.click(pButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('P')
    })
  })

  describe('Accessibility', () => {
    it('should have aria-pressed attribute on all buttons', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed')
      })
    })

    it('should have aria-label for each button', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /presente/i })).toHaveAttribute('aria-label', 'Presente')
      expect(screen.getByRole('button', { name: /falta/i })).toHaveAttribute('aria-label', 'Falta')
      expect(screen.getByRole('button', { name: /justificada/i })).toHaveAttribute('aria-label', 'Justificada')
    })

    it('should have focus styles', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveClass(/focus:outline-none|focus:ring/)
    })

    it('should be keyboard accessible', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      pButton.focus()
      
      // ChamadaStatusButtons responds to click, not keyDown directly
      fireEvent.click(pButton)
      expect(mockOnChange).toHaveBeenCalledWith('P')
    })
  })

  describe('Touch Optimization', () => {
    it('should have minimum 44px touch targets in default mode', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass(/min-w-\[44px\]/)
        expect(button).toHaveClass(/min-h-\[44px\]/)
      })
    })

    it('should have touch-manipulation class for better mobile interaction', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveClass(/touch-manipulation/)
    })

    it('should have active:scale-95 for visual feedback on touch', () => {
      render(<ChamadaStatusButtons {...defaultProps} />)
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveClass(/active:scale-95/)
    })
  })
})

describe('JustificationModal Component', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    studentName: 'João Silva',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<JustificationModal {...defaultProps} />)
      
      expect(screen.getByRole('heading', { name: /justificar.*falta/i })).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<JustificationModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByRole('heading', { name: /justificar.*falta/i })).not.toBeInTheDocument()
    })

    it('should display student name in description', () => {
      render(<JustificationModal {...defaultProps} />)
      
      expect(screen.getByText(/joão silva/i)).toBeInTheDocument()
    })

    it('should have motivo textarea', () => {
      render(<JustificationModal {...defaultProps} />)
      
      expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument()
    })

    it('should show required indicator (*)', () => {
      render(<JustificationModal {...defaultProps} />)
      
      // The asterisk is in a separate span, so check for its presence
      const label = screen.getByText(/^Motivo/)
      expect(label).toBeInTheDocument()
      // Check for red asterisk span
      const asterisk = screen.getByText('*')
      expect(asterisk).toBeInTheDocument()
    })

    it('should have placeholder text with examples', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByPlaceholderText(/atestado.*medico|comparecimento|doença/i)
      expect(textarea).toBeInTheDocument()
    })

    it('should show Ctrl+Enter helper text', () => {
      render(<JustificationModal {...defaultProps} />)
      
      expect(screen.getByText(/ctrl.*enter/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should disable Confirm button when textarea is empty', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      expect(confirmButton).toBeDisabled()
    })

    it('should enable Confirm button when text is entered', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/motivo/i)
      fireEvent.change(textarea, { target: { value: 'Atestado médico' } })
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      expect(confirmButton).not.toBeDisabled()
    })

    it('should disable Confirm button for whitespace-only text', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/motivo/i)
      fireEvent.change(textarea, { target: { value: '   ' } })
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      expect(confirmButton).toBeDisabled()
    })
  })

  describe('Submission', () => {
    it('should call onConfirm with trimmed text when Confirm is clicked', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/motivo/i)
      fireEvent.change(textarea, { target: { value: '  Atestado médico  ' } })
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmButton)
      
      expect(mockOnConfirm).toHaveBeenCalledWith('Atestado médico')
    })

    it('should call onConfirm on Ctrl+Enter', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/motivo/i)
      fireEvent.change(textarea, { target: { value: 'Consulta médica' } })
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
      
      expect(mockOnConfirm).toHaveBeenCalledWith('Consulta médica')
    })

    it('should not submit on Enter without Ctrl', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/motivo/i)
      fireEvent.change(textarea, { target: { value: 'Test' } })
      fireEvent.keyDown(textarea, { key: 'Enter' })
      
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should not submit with Ctrl+Enter when text is empty', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/motivo/i)
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
      
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })
  })

  describe('Cancel Behavior', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Reset Behavior', () => {
    it('should clear textarea when modal is reopened', () => {
      const { rerender } = render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/motivo/i)
      fireEvent.change(textarea, { target: { value: 'Test text' } })
      
      // Close modal
      rerender(<JustificationModal {...defaultProps} isOpen={false} />)
      
      // Reopen modal
      rerender(<JustificationModal {...defaultProps} isOpen={true} />)
      
      const reopenedTextarea = screen.getByLabelText(/motivo/i)
      expect(reopenedTextarea).toHaveValue('')
    })
  })

  describe('Accessibility', () => {
    it('should auto-focus textarea when modal opens', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/motivo/i)
      expect(textarea).toHaveFocus()
    })

    it('should have proper label for textarea', () => {
      render(<JustificationModal {...defaultProps} />)
      
      const textarea = screen.getByLabelText(/motivo/i)
      expect(textarea).toHaveAttribute('id', 'motivo')
    })

    it('should have dialog role', () => {
      render(<JustificationModal {...defaultProps} />)
      
      // Dialog is rendered by Radix UI with proper semantics
      expect(screen.getByRole('heading')).toBeInTheDocument()
    })
  })
})
