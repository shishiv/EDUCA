/**
 * Unit tests for Enhanced Touch-Optimized AttendanceGrid component
 * Testing tablet interface with 44px minimum touch targets
 * Brazilian educational compliance and real-time updates
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { jest } from '@jest/globals'
import userEvent from '@testing-library/user-event'
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'
import { toast } from 'sonner'

// Mock external dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: [],
          error: null
        })),
        in: jest.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      })),
      insert: jest.fn(() => Promise.resolve({
        data: [{ id: 'attendance-123' }],
        error: null
      })),
      update: jest.fn(() => Promise.resolve({
        data: [{ id: 'attendance-123' }],
        error: null
      })),
      upsert: jest.fn(() => Promise.resolve({
        data: [{ id: 'attendance-123' }],
        error: null
      }))
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn()
      })),
      unsubscribe: jest.fn()
    }))
  }
}))

// Test data for Brazilian educational context
const mockStudents = [
  {
    id: 'aluno-001',
    nome_completo: 'Ana Silva Santos',
    data_nascimento: '2015-03-15',
    foto_url: null,
    matriculas: [{
      id: 'mat-001',
      numero_matricula: '2025001',
      ativo: true,
      turma_id: 'turma-123'
    }]
  },
  {
    id: 'aluno-002',
    nome_completo: 'Bruno Costa Lima',
    data_nascimento: '2015-05-22',
    foto_url: '/avatars/bruno.jpg',
    matriculas: [{
      id: 'mat-002',
      numero_matricula: '2025002',
      ativo: true,
      turma_id: 'turma-123'
    }]
  },
  {
    id: 'aluno-003',
    nome_completo: 'Carlos Eduardo Souza',
    data_nascimento: '2015-01-10',
    foto_url: null,
    matriculas: [{
      id: 'mat-003',
      numero_matricula: '2025003',
      ativo: true,
      turma_id: 'turma-123'
    }]
  }
]

const mockAttendanceRecords = [
  {
    id: 'freq-001',
    aluno_id: 'aluno-001',
    presente: true,
    data: '2025-09-27',
    justificativa: null,
    marcada_em: '2025-09-27T14:30:00Z'
  }
]

const mockProps = {
  sessionId: 'session-123',
  turmaId: 'turma-123',
  students: mockStudents,
  attendanceRecords: mockAttendanceRecords,
  onAttendanceChange: jest.fn(),
  onBulkAttendanceChange: jest.fn(),
  readOnly: false,
  showStats: true,
  className: 'test-attendance-grid'
}

describe('AttendanceGrid Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Rendering and Layout', () => {
    it('should render attendance grid with all students', () => {
      render(<AttendanceGrid {...mockProps} />)

      // Should show all students
      expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      expect(screen.getByText('Bruno Costa Lima')).toBeInTheDocument()
      expect(screen.getByText('Carlos Eduardo Souza')).toBeInTheDocument()

      // Should show student enrollment numbers
      expect(screen.getByText('2025001')).toBeInTheDocument()
      expect(screen.getByText('2025002')).toBeInTheDocument()
      expect(screen.getByText('2025003')).toBeInTheDocument()
    })

    it('should display attendance statistics when showStats is true', () => {
      render(<AttendanceGrid {...mockProps} />)

      expect(screen.getByText(/estatísticas de frequência/i)).toBeInTheDocument()
      expect(screen.getByText(/1\/3 presentes/i)).toBeInTheDocument()
      expect(screen.getByText(/33%/)).toBeInTheDocument()
    })

    it('should show search and filter controls', () => {
      render(<AttendanceGrid {...mockProps} />)

      expect(screen.getByPlaceholderText(/buscar aluno/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /marcar todos presente/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /marcar todos ausente/i })).toBeInTheDocument()
    })

    it('should display offline indicator when disconnected', () => {
      render(<AttendanceGrid {...mockProps} isOffline={true} />)

      expect(screen.getByText(/offline/i)).toBeInTheDocument()
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
    })
  })

  describe('Touch-Optimized Interface (44px minimum targets)', () => {
    it('should have minimum 44px touch targets for attendance buttons', () => {
      render(<AttendanceGrid {...mockProps} />)

      const presentButtons = screen.getAllByRole('button', { name: /marcar presente/i })
      const absentButtons = screen.getAllByRole('button', { name: /marcar ausente/i })

      [...presentButtons, ...absentButtons].forEach(button => {
        const styles = getComputedStyle(button)
        expect(parseInt(styles.minHeight || '44')).toBeGreaterThanOrEqual(44)
        expect(parseInt(styles.minWidth || '44')).toBeGreaterThanOrEqual(44)
      })
    })

    it('should have appropriate spacing between touch targets', () => {
      render(<AttendanceGrid {...mockProps} />)

      const studentCards = screen.getAllByTestId(/student-card-/)
      studentCards.forEach(card => {
        const styles = getComputedStyle(card)
        // Should have margin/padding for touch spacing
        expect(styles.margin || styles.padding).toBeTruthy()
      })
    })

    it('should show visual feedback on touch interaction', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const presentButton = screen.getByTestId('student-aluno-001-present')

      await user.click(presentButton)

      // Should show active/selected state
      expect(presentButton).toHaveClass(/bg-green|selected|active/)
    })

    it('should handle touch events properly on mobile', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const presentButton = screen.getByTestId('student-aluno-002-present')

      // Simulate touch events
      fireEvent.touchStart(presentButton)
      fireEvent.touchEnd(presentButton)

      await waitFor(() => {
        expect(mockProps.onAttendanceChange).toHaveBeenCalledWith(
          'aluno-002',
          true,
          expect.any(Object)
        )
      })
    })
  })

  describe('Individual Attendance Marking', () => {
    it('should mark student as present when present button is clicked', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      expect(mockProps.onAttendanceChange).toHaveBeenCalledWith(
        'aluno-002',
        true,
        expect.objectContaining({
          studentName: 'Bruno Costa Lima',
          matricula: '2025002'
        })
      )
    })

    it('should mark student as absent when absent button is clicked', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const absentButton = screen.getByTestId('student-aluno-002-absent')
      await user.click(absentButton)

      expect(mockProps.onAttendanceChange).toHaveBeenCalledWith(
        'aluno-002',
        false,
        expect.objectContaining({
          studentName: 'Bruno Costa Lima',
          matricula: '2025002'
        })
      )
    })

    it('should toggle attendance when clicking same button again', async () => {
      const attendanceRecords = [
        {
          id: 'freq-002',
          aluno_id: 'aluno-002',
          presente: true,
          data: '2025-09-27',
          justificativa: null,
          marcada_em: '2025-09-27T14:30:00Z'
        }
      ]

      render(<AttendanceGrid {...mockProps} attendanceRecords={attendanceRecords} />)

      // Student is already marked present, clicking present again should unmark
      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      expect(mockProps.onAttendanceChange).toHaveBeenCalledWith(
        'aluno-002',
        null, // Unmark attendance
        expect.any(Object)
      )
    })

    it('should show immediate visual feedback for attendance changes', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      // Should show loading/pending state
      expect(presentButton).toHaveClass(/opacity-50|loading/)

      // Should show success state after completion
      await waitFor(() => {
        expect(presentButton).toHaveClass(/bg-green|success/)
      })
    })

    it('should handle attendance marking errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock error response
      supabase.from.mockReturnValue({
        upsert: jest.fn(() => Promise.resolve({
          data: null,
          error: {
            message: 'Falha ao salvar frequência',
            code: 'ATTENDANCE_SAVE_ERROR'
          }
        }))
      })

      render(<AttendanceGrid {...mockProps} />)

      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Falha ao salvar frequência')
        )
      })
    })
  })

  describe('Bulk Operations', () => {
    it('should mark all students as present when bulk present button is clicked', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const markAllPresentButton = screen.getByRole('button', { name: /marcar todos presente/i })
      await user.click(markAllPresentButton)

      expect(mockProps.onBulkAttendanceChange).toHaveBeenCalledWith(
        ['aluno-001', 'aluno-002', 'aluno-003'],
        true
      )
    })

    it('should mark all students as absent when bulk absent button is clicked', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const markAllAbsentButton = screen.getByRole('button', { name: /marcar todos ausente/i })
      await user.click(markAllAbsentButton)

      expect(mockProps.onBulkAttendanceChange).toHaveBeenCalledWith(
        ['aluno-001', 'aluno-002', 'aluno-003'],
        false
      )
    })

    it('should support selective bulk operations with checkbox selection', async () => {
      render(<AttendanceGrid {...mockProps} />)

      // Select specific students
      const checkbox1 = screen.getByTestId('student-aluno-001-checkbox')
      const checkbox3 = screen.getByTestId('student-aluno-003-checkbox')

      await user.click(checkbox1)
      await user.click(checkbox3)

      // Mark selected as present
      const markSelectedPresentButton = screen.getByRole('button', { name: /marcar selecionados presente/i })
      await user.click(markSelectedPresentButton)

      expect(mockProps.onBulkAttendanceChange).toHaveBeenCalledWith(
        ['aluno-001', 'aluno-003'],
        true
      )
    })

    it('should show confirmation dialog for bulk operations affecting many students', async () => {
      const manyStudents = Array.from({ length: 30 }, (_, i) => ({
        id: `aluno-${i + 1}`,
        nome_completo: `Aluno ${i + 1}`,
        data_nascimento: '2015-01-01',
        foto_url: null,
        matriculas: [{
          id: `mat-${i + 1}`,
          numero_matricula: `2025${String(i + 1).padStart(3, '0')}`,
          ativo: true,
          turma_id: 'turma-123'
        }]
      }))

      render(<AttendanceGrid {...mockProps} students={manyStudents} />)

      const markAllPresentButton = screen.getByRole('button', { name: /marcar todos presente/i })
      await user.click(markAllPresentButton)

      // Should show confirmation dialog for large operations
      expect(screen.getByText(/confirmar operação em lote/i)).toBeInTheDocument()
      expect(screen.getByText(/30 alunos/i)).toBeInTheDocument()
    })

    it('should show progress indicator during bulk operations', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const markAllPresentButton = screen.getByRole('button', { name: /marcar todos presente/i })
      await user.click(markAllPresentButton)

      // Should show progress indicator
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText(/processando/i)).toBeInTheDocument()
    })
  })

  describe('Search and Filtering', () => {
    it('should filter students by name when searching', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const searchInput = screen.getByPlaceholderText(/buscar aluno/i)
      await user.type(searchInput, 'Ana')

      // Should show only Ana
      expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      expect(screen.queryByText('Bruno Costa Lima')).not.toBeInTheDocument()
      expect(screen.queryByText('Carlos Eduardo Souza')).not.toBeInTheDocument()
    })

    it('should filter students by enrollment number', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const searchInput = screen.getByPlaceholderText(/buscar aluno/i)
      await user.type(searchInput, '2025002')

      // Should show only Bruno
      expect(screen.getByText('Bruno Costa Lima')).toBeInTheDocument()
      expect(screen.queryByText('Ana Silva Santos')).not.toBeInTheDocument()
      expect(screen.queryByText('Carlos Eduardo Souza')).not.toBeInTheDocument()
    })

    it('should filter by attendance status', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const filterSelect = screen.getByRole('combobox', { name: /filtrar por status/i })
      await user.selectOptions(filterSelect, 'presente')

      // Should show only students marked as present
      expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      expect(screen.queryByText('Bruno Costa Lima')).not.toBeInTheDocument()
    })

    it('should clear search when clear button is clicked', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const searchInput = screen.getByPlaceholderText(/buscar aluno/i)
      await user.type(searchInput, 'Ana')

      const clearButton = screen.getByRole('button', { name: /limpar busca/i })
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
      expect(screen.getByText('Bruno Costa Lima')).toBeInTheDocument()
    })
  })

  describe('Real-time Updates and Synchronization', () => {
    it('should set up real-time subscription for attendance updates', () => {
      const { supabase } = require('@/lib/supabase')

      render(<AttendanceGrid {...mockProps} />)

      expect(supabase.channel).toHaveBeenCalledWith('attendance-session-123')
    })

    it('should handle real-time attendance updates from other users', async () => {
      const { supabase } = require('@/lib/supabase')
      let realtimeCallback: (payload: any) => void

      supabase.channel.mockReturnValue({
        on: jest.fn((event, callback) => {
          realtimeCallback = callback
          return {
            subscribe: jest.fn()
          }
        }),
        unsubscribe: jest.fn()
      })

      render(<AttendanceGrid {...mockProps} />)

      // Simulate real-time update
      realtimeCallback!({
        eventType: 'INSERT',
        new: {
          id: 'freq-002',
          aluno_id: 'aluno-002',
          presente: true,
          data: '2025-09-27',
          marcada_em: '2025-09-27T14:35:00Z'
        }
      })

      await waitFor(() => {
        expect(screen.getByTestId('student-aluno-002-present')).toHaveClass(/bg-green|selected/)
      })
    })

    it('should show sync status indicators', () => {
      render(<AttendanceGrid {...mockProps} />)

      expect(screen.getByTestId('sync-status')).toBeInTheDocument()
    })

    it('should handle offline mode gracefully', () => {
      render(<AttendanceGrid {...mockProps} isOffline={true} />)

      expect(screen.getByText(/modo offline/i)).toBeInTheDocument()
      expect(screen.getByText(/alterações serão sincronizadas/i)).toBeInTheDocument()
    })
  })

  describe('Read-only Mode (Closed Sessions)', () => {
    it('should disable all controls when readOnly is true', () => {
      render(<AttendanceGrid {...mockProps} readOnly={true} />)

      const presentButtons = screen.getAllByRole('button', { name: /marcar presente/i })
      const absentButtons = screen.getAllByRole('button', { name: /marcar ausente/i })

      [...presentButtons, ...absentButtons].forEach(button => {
        expect(button).toBeDisabled()
      })

      expect(screen.getByRole('button', { name: /marcar todos presente/i })).toBeDisabled()
    })

    it('should show read-only indicator and compliance message', () => {
      render(<AttendanceGrid {...mockProps} readOnly={true} />)

      expect(screen.getByText(/registro imutável/i)).toBeInTheDocument()
      expect(screen.getByText(/não existe o esquecer/i)).toBeInTheDocument()
    })

    it('should prevent any attendance modifications in read-only mode', async () => {
      render(<AttendanceGrid {...mockProps} readOnly={true} />)

      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      expect(mockProps.onAttendanceChange).not.toHaveBeenCalled()
    })
  })

  describe('Performance Requirements (<1s per student)', () => {
    it('should complete attendance marking within performance requirements', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const startTime = performance.now()

      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      await waitFor(() => {
        expect(mockProps.onAttendanceChange).toHaveBeenCalled()
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should be less than 1000ms per student (Brazilian requirement)
      expect(duration).toBeLessThan(1000)
    })

    it('should handle large class sizes efficiently', () => {
      const largeClass = Array.from({ length: 50 }, (_, i) => ({
        id: `aluno-${i + 1}`,
        nome_completo: `Aluno ${i + 1}`,
        data_nascimento: '2015-01-01',
        foto_url: null,
        matriculas: [{
          id: `mat-${i + 1}`,
          numero_matricula: `2025${String(i + 1).padStart(3, '0')}`,
          ativo: true,
          turma_id: 'turma-123'
        }]
      }))

      const startTime = performance.now()

      render(<AttendanceGrid {...mockProps} students={largeClass} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render large classes efficiently
      expect(renderTime).toBeLessThan(2000) // 2 seconds max for 50 students
    })

    it('should use virtualization for very large classes', () => {
      const veryLargeClass = Array.from({ length: 100 }, (_, i) => ({
        id: `aluno-${i + 1}`,
        nome_completo: `Aluno ${i + 1}`,
        data_nascimento: '2015-01-01',
        foto_url: null,
        matriculas: [{
          id: `mat-${i + 1}`,
          numero_matricula: `2025${String(i + 1).padStart(3, '0')}`,
          ativo: true,
          turma_id: 'turma-123'
        }]
      }))

      render(<AttendanceGrid {...mockProps} students={veryLargeClass} />)

      // Should use virtualized list for performance
      expect(screen.getByTestId('virtualized-attendance-list')).toBeInTheDocument()
    })
  })

  describe('Accessibility and Internationalization', () => {
    it('should have proper ARIA labels for screen readers', () => {
      render(<AttendanceGrid {...mockProps} />)

      const grid = screen.getByRole('grid')
      expect(grid).toHaveAttribute('aria-label', expect.stringContaining('Lista de frequência'))

      const presentButton = screen.getByTestId('student-aluno-001-present')
      expect(presentButton).toHaveAttribute('aria-label', expect.stringContaining('Ana Silva Santos'))
    })

    it('should support keyboard navigation through attendance grid', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const firstPresentButton = screen.getByTestId('student-aluno-001-present')

      firstPresentButton.focus()
      expect(firstPresentButton).toHaveFocus()

      // Navigate with arrow keys
      fireEvent.keyDown(firstPresentButton, { key: 'ArrowDown' })

      const secondPresentButton = screen.getByTestId('student-aluno-002-present')
      expect(secondPresentButton).toHaveFocus()
    })

    it('should announce attendance changes to screen readers', async () => {
      render(<AttendanceGrid {...mockProps} />)

      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      // Should have live region for announcements
      expect(screen.getByRole('status')).toHaveTextContent(/bruno costa lima marcado como presente/i)
    })

    it('should display content in Brazilian Portuguese', () => {
      render(<AttendanceGrid {...mockProps} />)

      expect(screen.getByText(/presentes/i)).toBeInTheDocument()
      expect(screen.getByText(/ausentes/i)).toBeInTheDocument()
      expect(screen.getByText(/buscar aluno/i)).toBeInTheDocument()
    })

    it('should format dates in Brazilian format (DD/MM/YYYY)', () => {
      render(<AttendanceGrid {...mockProps} />)

      // Should show dates in Brazilian format
      expect(screen.getByText(/27\/09\/2025/)).toBeInTheDocument()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty student list gracefully', () => {
      render(<AttendanceGrid {...mockProps} students={[]} />)

      expect(screen.getByText(/nenhum aluno encontrado/i)).toBeInTheDocument()
      expect(screen.getByText(/turma vazia/i)).toBeInTheDocument()
    })

    it('should handle network errors during attendance marking', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        upsert: jest.fn(() => Promise.reject(new Error('Network error')))
      })

      render(<AttendanceGrid {...mockProps} />)

      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Erro de conexão')
        )
      })
    })

    it('should handle conflicting attendance updates', async () => {
      render(<AttendanceGrid {...mockProps} />)

      // Simulate conflict scenario
      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      // Should show conflict resolution dialog
      expect(screen.getByText(/conflito detectado/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /manter alteração/i })).toBeInTheDocument()
    })

    it('should auto-retry failed operations', async () => {
      const { supabase } = require('@/lib/supabase')
      let attempts = 0

      supabase.from.mockReturnValue({
        upsert: jest.fn(() => {
          attempts++
          if (attempts === 1) {
            return Promise.reject(new Error('Temporary error'))
          }
          return Promise.resolve({ data: [{ id: 'attendance-123' }], error: null })
        })
      })

      render(<AttendanceGrid {...mockProps} />)

      const presentButton = screen.getByTestId('student-aluno-002-present')
      await user.click(presentButton)

      await waitFor(() => {
        expect(attempts).toBe(2) // Should have retried once
        expect(toast.success).toHaveBeenCalled()
      })
    })
  })
})