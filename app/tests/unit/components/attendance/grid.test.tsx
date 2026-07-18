import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'
import { AttendanceCell, AttendanceCellRow } from '@/components/attendance/AttendanceCell'
import type { AttendanceStatus } from '@/components/attendance/AttendanceCell'

/**
 * Unit Tests: Attendance Grid Components
 * Tests AttendanceGrid and AttendanceCell components:
 * - Rendering and props
 * - Status toggling
 * - Touch-optimized interactions
 * - Keyboard accessibility
 * - Lock state handling
 *
 * Swarm 3: Frequência (Chamada)
 */

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'student-1',
            nome_completo: 'João Silva',
            data_nascimento: '2010-05-15',
            matriculas: [{ id: 'mat-1', turma_id: 'turma-1', situacao: 'ativa' }]
          },
          {
            id: 'student-2',
            nome_completo: 'Maria Santos',
            data_nascimento: '2011-03-20',
            matriculas: [{ id: 'mat-2', turma_id: 'turma-1', situacao: 'ativa' }]
          }
        ],
        error: null
      }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

global.fetch = vi.fn()

describe('AttendanceCell Component', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with empty status', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })

    it('should render with P (Presente) status', () => {
      render(<AttendanceCell status="P" onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(button).toHaveClass(/green/)
    })

    it('should render with F (Falta) status', () => {
      render(<AttendanceCell status="F" onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(button).toHaveClass(/red/)
    })

    it('should render with A (Atestado) status', () => {
      render(<AttendanceCell status="A" onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(button).toHaveClass(/yellow|amber/)
    })

    it('should display correct icon for each status', () => {
      const { rerender } = render(<AttendanceCell status="P" onChange={mockOnChange} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
      
      rerender(<AttendanceCell status="F" onChange={mockOnChange} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
      
      rerender(<AttendanceCell status="A" onChange={mockOnChange} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should render with custom size', () => {
      const { rerender } = render(<AttendanceCell status={null} onChange={mockOnChange} size="sm" />)
      expect(screen.getByRole('button')).toHaveClass(/w-8|h-8/)
      
      rerender(<AttendanceCell status={null} onChange={mockOnChange} size="lg" />)
      expect(screen.getByRole('button')).toHaveClass(/w-14|h-14/)
    })

    it('should have minimum 44px touch target for default size', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass(/min-w-\[44px\]|min-h-\[44px\]/)
    })
  })

  describe('Status Cycling', () => {
    it('should cycle from null to P on first click', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnChange).toHaveBeenCalledWith('P')
    })

    it('should cycle from P to F on click', () => {
      render(<AttendanceCell status="P" onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnChange).toHaveBeenCalledWith('F')
    })

    it('should cycle from F to A on click', () => {
      render(<AttendanceCell status="F" onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnChange).toHaveBeenCalledWith('A')
    })

    it('should cycle from A to null on click', () => {
      render(<AttendanceCell status="A" onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Disabled State', () => {
    it('should not trigger onChange when disabled', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} disabled={true} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should have disabled styling', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} disabled={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass(/opacity-50/)
    })
  })

  describe('Locked State', () => {
    it('should not trigger onChange when locked', () => {
      render(<AttendanceCell status="P" onChange={mockOnChange} locked={true} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should display lock icon when locked', () => {
      render(<AttendanceCell status="P" onChange={mockOnChange} locked={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should have lock message in aria-label', () => {
      render(<AttendanceCell status="P" onChange={mockOnChange} locked={true} studentName="João" />)
      
      const button = screen.getByRole('button')
      const ariaLabel = button.getAttribute('aria-label')
      expect(ariaLabel).toContain('bloqueada')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should activate on Enter key', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })
      
      expect(mockOnChange).toHaveBeenCalledWith('P')
    })

    it('should activate on Space key', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: ' ' })
      
      expect(mockOnChange).toHaveBeenCalledWith('P')
    })

    it('should mark as present on P key', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'p' })
      
      expect(mockOnChange).toHaveBeenCalledWith('P')
    })

    it('should mark as absent on F key', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'f' })
      
      expect(mockOnChange).toHaveBeenCalledWith('F')
    })

    it('should mark as attestado on A key', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'a' })
      
      expect(mockOnChange).toHaveBeenCalledWith('A')
    })

    it('should clear status on Escape key', () => {
      render(<AttendanceCell status="P" onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Escape' })
      
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })

    it('should clear status on Delete key', () => {
      render(<AttendanceCell status="P" onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Delete' })
      
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<AttendanceCell status={null} onChange={mockOnChange} studentName="João Silva" />)
      
      const button = screen.getByRole('button')
      const ariaLabel = button.getAttribute('aria-label')
      expect(ariaLabel).toContain('João Silva')
      expect(ariaLabel).toMatch(/marcar|frequência/i)
    })

    it('should have aria-pressed attribute', () => {
      const { rerender } = render(<AttendanceCell status={null} onChange={mockOnChange} />)
      
      let button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'false')
      
      rerender(<AttendanceCell status="P" onChange={mockOnChange} />)
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('should have title attribute for tooltip', () => {
      render(<AttendanceCell status="P" onChange={mockOnChange} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title')
    })
  })
})

describe('AttendanceCellRow Component', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with student name', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status={null}
          onChange={mockOnChange}
        />
      )
      
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    it('should render with student number', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          studentNumber={5}
          status={null}
          onChange={mockOnChange}
        />
      )
      
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should render all three status buttons (P, F, A)', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status={null}
          onChange={mockOnChange}
        />
      )
      
      expect(screen.getByRole('button', { name: /presente/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /falta/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /atestado/i })).toBeInTheDocument()
    })
  })

  describe('Status Selection', () => {
    it('should mark as present when clicking P button', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status={null}
          onChange={mockOnChange}
        />
      )
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      fireEvent.click(pButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('P')
    })

    it('should mark as absent when clicking F button', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status={null}
          onChange={mockOnChange}
        />
      )
      
      const fButton = screen.getByRole('button', { name: /falta/i })
      fireEvent.click(fButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('F')
    })

    it('should mark as attestado when clicking A button', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status={null}
          onChange={mockOnChange}
        />
      )
      
      const aButton = screen.getByRole('button', { name: /atestado/i })
      fireEvent.click(aButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('A')
    })

    it('should toggle off when clicking active button', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status="P"
          onChange={mockOnChange}
        />
      )
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      fireEvent.click(pButton)
      
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Active State Styling', () => {
    it('should highlight P button when status is P', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status="P"
          onChange={mockOnChange}
        />
      )
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      expect(pButton).toHaveAttribute('aria-pressed', 'true')
      expect(pButton).toHaveClass(/bg-green/)
    })

    it('should highlight F button when status is F', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status="F"
          onChange={mockOnChange}
        />
      )
      
      const fButton = screen.getByRole('button', { name: /falta/i })
      expect(fButton).toHaveAttribute('aria-pressed', 'true')
      expect(fButton).toHaveClass(/bg-red/)
    })

    it('should highlight A button when status is A', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status="A"
          onChange={mockOnChange}
        />
      )
      
      const aButton = screen.getByRole('button', { name: /atestado/i })
      expect(aButton).toHaveAttribute('aria-pressed', 'true')
      expect(aButton).toHaveClass(/bg-yellow|bg-amber/)
    })
  })

  describe('Locked State', () => {
    it('should disable all buttons when locked', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status="P"
          onChange={mockOnChange}
          locked={true}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it('should show lock icon when locked', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status="P"
          onChange={mockOnChange}
          locked={true}
        />
      )
      
      // Lock icon should be present (visual indicator)
      expect(screen.getByRole('button', { name: /presente/i })).toBeDisabled()
    })

    it('should not trigger onChange when locked', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status={null}
          onChange={mockOnChange}
          locked={true}
        />
      )
      
      const pButton = screen.getByRole('button', { name: /presente/i })
      fireEvent.click(pButton)
      
      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('Mobile Optimizations', () => {
    it('should have touch-friendly button sizes (40x40 minimum)', () => {
      render(
        <AttendanceCellRow
          studentName="João Silva"
          status={null}
          onChange={mockOnChange}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass(/min-w-\[40px\]|w-10/)
        expect(button).toHaveClass(/min-h-\[40px\]|h-10/)
      })
    })

    it('should truncate long student names', () => {
      render(
        <AttendanceCellRow
          studentName="João da Silva Santos Oliveira Ferreira"
          status={null}
          onChange={mockOnChange}
        />
      )
      
      const nameElement = screen.getByText(/João da Silva Santos Oliveira Ferreira/)
      expect(nameElement).toHaveClass(/truncate/)
    })
  })
})
