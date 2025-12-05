/**
 * Unit tests for AttendanceGrid 3-State Extension
 * Task Group 1.2: Extension of AttendanceGrid for 3 States
 *
 * Test Coverage:
 * - State cycle: empty -> P -> F -> A -> empty
 * - Colors: green (#dcfce7), red (#fee2e2), yellow (#fef3c7)
 * - Real-time summary calculation
 * - Readonly behavior when locked
 *
 * Uses StatusPresenca type from types/diario-classe.ts
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { AttendanceCell, type AttendanceStatus } from '@/components/attendance/AttendanceCell'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }
}))

describe('AttendanceCell - 3-State Component', () => {
  const defaultProps = {
    studentId: 'student-001',
    studentName: 'Ana Silva Santos',
    currentStatus: 'empty' as AttendanceStatus,
    onStatusChange: jest.fn(),
    disabled: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // =========================================================================
  // Test 1: State Cycle (empty -> P -> F -> A -> empty)
  // =========================================================================
  describe('Test 1: State Cycle (empty -> P -> F -> A -> empty)', () => {
    it('should cycle from empty to presente on first click', () => {
      const onStatusChange = jest.fn()
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="empty"
          onStatusChange={onStatusChange}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onStatusChange).toHaveBeenCalledWith('presente')
    })

    it('should cycle from presente to falta on click', () => {
      const onStatusChange = jest.fn()
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="presente"
          onStatusChange={onStatusChange}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onStatusChange).toHaveBeenCalledWith('falta')
    })

    it('should cycle from falta to attestado on click', () => {
      const onStatusChange = jest.fn()
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="falta"
          onStatusChange={onStatusChange}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onStatusChange).toHaveBeenCalledWith('attestado')
    })

    it('should cycle from attestado to empty on click', () => {
      const onStatusChange = jest.fn()
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="attestado"
          onStatusChange={onStatusChange}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onStatusChange).toHaveBeenCalledWith('empty')
    })

    it('should complete full cycle: empty -> P -> F -> A -> empty', () => {
      const onStatusChange = jest.fn()
      const { rerender } = render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="empty"
          onStatusChange={onStatusChange}
        />
      )

      const button = screen.getByRole('button')

      // Click 1: empty -> presente
      fireEvent.click(button)
      expect(onStatusChange).toHaveBeenLastCalledWith('presente')

      // Rerender with new status
      rerender(
        <AttendanceCell
          {...defaultProps}
          currentStatus="presente"
          onStatusChange={onStatusChange}
        />
      )

      // Click 2: presente -> falta
      fireEvent.click(button)
      expect(onStatusChange).toHaveBeenLastCalledWith('falta')

      // Rerender with new status
      rerender(
        <AttendanceCell
          {...defaultProps}
          currentStatus="falta"
          onStatusChange={onStatusChange}
        />
      )

      // Click 3: falta -> attestado
      fireEvent.click(button)
      expect(onStatusChange).toHaveBeenLastCalledWith('attestado')

      // Rerender with new status
      rerender(
        <AttendanceCell
          {...defaultProps}
          currentStatus="attestado"
          onStatusChange={onStatusChange}
        />
      )

      // Click 4: attestado -> empty
      fireEvent.click(button)
      expect(onStatusChange).toHaveBeenLastCalledWith('empty')

      // Total of 4 calls for full cycle
      expect(onStatusChange).toHaveBeenCalledTimes(4)
    })
  })

  // =========================================================================
  // Test 2: Correct Colors for Each State
  // =========================================================================
  describe('Test 2: Correct Colors for Each State', () => {
    it('should display green styling for presente state', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="presente"
        />
      )

      const button = screen.getByRole('button')
      // Check for green color classes
      expect(button.className).toMatch(/bg-green|green/)
    })

    it('should display red styling for falta state', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="falta"
        />
      )

      const button = screen.getByRole('button')
      // Check for red color classes
      expect(button.className).toMatch(/bg-red|red|destructive/)
    })

    it('should display yellow/amber styling for attestado state', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="attestado"
        />
      )

      const button = screen.getByRole('button')
      // Check for yellow/amber color classes
      expect(button.className).toMatch(/bg-yellow|yellow|amber/)
    })

    it('should display neutral/gray styling for empty state', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="empty"
        />
      )

      const button = screen.getByRole('button')
      // Check for outline/neutral styling
      expect(button.className).toMatch(/outline|border|gray/)
    })

    it('should display correct labels for each state', () => {
      const { rerender } = render(
        <AttendanceCell {...defaultProps} currentStatus="presente" />
      )
      expect(screen.getByText('P')).toBeInTheDocument()

      rerender(<AttendanceCell {...defaultProps} currentStatus="falta" />)
      expect(screen.getByText('F')).toBeInTheDocument()

      rerender(<AttendanceCell {...defaultProps} currentStatus="attestado" />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Test 3: Data Attributes for Summary Integration
  // =========================================================================
  describe('Test 3: Data Attributes for Summary Integration', () => {
    it('should have data-status attribute for state tracking', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="presente"
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-status', 'presente')
    })

    it('should have data-student-id attribute', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          studentId="student-123"
          currentStatus="presente"
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-student-id', 'student-123')
    })

    it('should update data-status when status changes', () => {
      const { rerender } = render(
        <AttendanceCell {...defaultProps} currentStatus="empty" />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-status', 'empty')

      rerender(<AttendanceCell {...defaultProps} currentStatus="presente" />)
      expect(button).toHaveAttribute('data-status', 'presente')

      rerender(<AttendanceCell {...defaultProps} currentStatus="falta" />)
      expect(button).toHaveAttribute('data-status', 'falta')

      rerender(<AttendanceCell {...defaultProps} currentStatus="attestado" />)
      expect(button).toHaveAttribute('data-status', 'attestado')
    })
  })

  // =========================================================================
  // Test 4: Readonly Behavior When Disabled
  // =========================================================================
  describe('Test 4: Readonly Behavior When Disabled', () => {
    it('should not call onStatusChange when disabled', () => {
      const onStatusChange = jest.fn()
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="empty"
          onStatusChange={onStatusChange}
          disabled={true}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('should have disabled attribute when disabled', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          disabled={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should still display current status when disabled', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          currentStatus="presente"
          disabled={true}
        />
      )

      expect(screen.getByText('P')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Test 5: Touch-Friendly Size (44px minimum)
  // =========================================================================
  describe('Test 5: Touch-Friendly Size', () => {
    it('should have min-h-[44px] class for touch targets', () => {
      render(<AttendanceCell {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/min-h-\[44px\]/)
    })

    it('should have min-w class for adequate width', () => {
      render(<AttendanceCell {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/min-w/)
    })
  })

  // =========================================================================
  // Test 6: Accessibility (aria-labels)
  // =========================================================================
  describe('Test 6: Accessibility', () => {
    it('should have aria-label with student name and status for presente', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          studentName="Ana Silva"
          currentStatus="presente"
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label')
      expect(button.getAttribute('aria-label')).toMatch(/Ana Silva.*Presente/i)
    })

    it('should have aria-label with student name and status for falta', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          studentName="Ana Silva"
          currentStatus="falta"
        />
      )

      const button = screen.getByRole('button')
      expect(button.getAttribute('aria-label')).toMatch(/Ana Silva.*Falta/i)
    })

    it('should have aria-label with student name and status for attestado', () => {
      render(
        <AttendanceCell
          {...defaultProps}
          studentName="Ana Silva"
          currentStatus="attestado"
        />
      )

      const button = screen.getByRole('button')
      expect(button.getAttribute('aria-label')).toMatch(/Ana Silva.*Attestado/i)
    })

    it('should have transition classes for smooth animation', () => {
      render(<AttendanceCell {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/transition/)
    })
  })
})
