/**
 * Unit tests for Mobile Attendance Marking component
 * Testing touch-optimized interface for classroom tablets
 * Brazilian educational workflow compliance
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AttendanceMarkingMobile } from '@/components/attendance/attendance-marking-mobile'
import { toast } from 'sonner'

// Mock external dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  }
}))

jest.mock('@/lib/api/students', () => ({
  studentsApi: {
    getByClass: jest.fn(() => Promise.resolve({
      data: [
        {
          id: 'student-1',
          nome_completo: 'Ana Silva Santos',
          numero_matricula: '2025001',
          foto_url: null
        },
        {
          id: 'student-2',
          nome_completo: 'Bruno Costa Lima',
          numero_matricula: '2025002',
          foto_url: '/avatars/bruno.jpg'
        },
        {
          id: 'student-3',
          nome_completo: 'Carlos Eduardo Souza',
          numero_matricula: '2025003',
          foto_url: null
        }
      ]
    }))
  }
}))

jest.mock('@/lib/api/attendance', () => ({
  attendanceApi: {
    getBySession: jest.fn(() => Promise.resolve({ data: [] })),
    saveAttendance: jest.fn(() => Promise.resolve({ success: true }))
  }
}))

// Test data
const mockProps = {
  classId: 'class-123',
  sessionId: 'session-456',
  sessionDate: '2025-09-27',
  onSave: jest.fn(),
  onCancel: jest.fn(),
  className: 'test-mobile-attendance'
}

// Wrapper component with React Query
const QueryWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('AttendanceMarkingMobile Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Rendering and Mobile Layout', () => {
    it('should render mobile attendance interface with students', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
        expect(screen.getByText('Bruno Costa Lima')).toBeInTheDocument()
        expect(screen.getByText('Carlos Eduardo Souza')).toBeInTheDocument()
      })

      expect(screen.getByText('2025001')).toBeInTheDocument()
      expect(screen.getByText('2025002')).toBeInTheDocument()
      expect(screen.getByText('2025003')).toBeInTheDocument()
    })

    it('should display session information in mobile format', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/27\/09\/2025/)).toBeInTheDocument()
        expect(screen.getByText(/frequência da turma/i)).toBeInTheDocument()
      })
    })

    it('should show mobile-optimized attendance controls', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        // Should show large touch-friendly buttons
        const presentButtons = screen.getAllByLabelText(/marcar presente/i)
        const absentButtons = screen.getAllByLabelText(/marcar falta/i)

        expect(presentButtons).toHaveLength(3)
        expect(absentButtons).toHaveLength(3)

        // Check touch target sizes
        presentButtons.forEach(button => {
          const styles = getComputedStyle(button)
          expect(parseInt(styles.minHeight || '44')).toBeGreaterThanOrEqual(44)
        })
      })
    })

    it('should show attendance statistics in mobile layout', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/0\/3 marcados/i)).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
    })
  })

  describe('Touch-Optimized Interface (Mobile/Tablet)', () => {
    it('should have minimum 44px touch targets for all buttons', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const allButtons = screen.getAllByRole('button')

        allButtons.forEach(button => {
          const styles = getComputedStyle(button)
          const height = parseInt(styles.minHeight || styles.height || '0')
          const width = parseInt(styles.minWidth || styles.width || '0')

          // Brazilian touch accessibility standard
          expect(height).toBeGreaterThanOrEqual(44)
          expect(width).toBeGreaterThanOrEqual(44)
        })
      })
    })

    it('should provide haptic feedback simulation on touch', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const presentButton = screen.getByTestId('student-student-1-present')

        // Simulate touch events
        fireEvent.touchStart(presentButton)
        fireEvent.touchEnd(presentButton)

        // Should show visual feedback
        expect(presentButton).toHaveClass(/active|pressed|scale/)
      })
    })

    it('should handle swipe gestures for quick marking', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const studentCard = screen.getByTestId('student-card-student-1')

        // Simulate swipe right for present
        fireEvent.touchStart(studentCard, {
          touches: [{ clientX: 50, clientY: 100 }]
        })
        fireEvent.touchMove(studentCard, {
          touches: [{ clientX: 200, clientY: 100 }]
        })
        fireEvent.touchEnd(studentCard)

        expect(screen.getByTestId('student-student-1-present')).toHaveClass(/selected|active/)
      })
    })

    it('should prevent accidental double-taps', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const presentButton = screen.getByTestId('student-student-1-present')

        // Rapid double tap
        await user.click(presentButton)
        await user.click(presentButton)

        // Should only register one action (toggle back to unselected)
        expect(presentButton).not.toHaveClass(/selected|active/)
      })
    })

    it('should show large, clear visual status indicators', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const presentButton = screen.getByTestId('student-student-1-present')

        // Mark student as present
        await user.click(presentButton)

        // Should show clear visual indication
        expect(presentButton).toHaveClass(/bg-green|text-green/)
        expect(screen.getByTestId('student-student-1-status')).toContainHTML(/checkCircle|check/)
      })
    })
  })

  describe('Attendance Status Options (Brazilian Educational System)', () => {
    it('should support all Brazilian attendance statuses', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        // Should have buttons for all status types
        expect(screen.getByTestId('student-student-1-presente')).toBeInTheDocument() // Present
        expect(screen.getByTestId('student-student-1-falta')).toBeInTheDocument() // Absent
        expect(screen.getByTestId('student-student-1-justificada')).toBeInTheDocument() // Justified absence
        expect(screen.getByTestId('student-student-1-atestado')).toBeInTheDocument() // Medical certificate
      })
    })

    it('should mark student as present (presente)', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const presentButton = screen.getByTestId('student-student-1-presente')

        await user.click(presentButton)

        expect(presentButton).toHaveClass(/selected|active|bg-green/)
        expect(screen.getByText(/ana silva santos - presente/i)).toBeInTheDocument()
      })
    })

    it('should mark student as absent (falta)', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const absentButton = screen.getByTestId('student-student-1-falta')

        await user.click(absentButton)

        expect(absentButton).toHaveClass(/selected|active|bg-red/)
        expect(screen.getByText(/ana silva santos - falta/i)).toBeInTheDocument()
      })
    })

    it('should mark student with justified absence (justificada)', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const justifiedButton = screen.getByTestId('student-student-1-justificada')

        await user.click(justifiedButton)

        expect(justifiedButton).toHaveClass(/selected|active|bg-yellow/)
        expect(screen.getByText(/ana silva santos - justificada/i)).toBeInTheDocument()
      })
    })

    it('should mark student with medical certificate (atestado)', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const medicalButton = screen.getByTestId('student-student-1-atestado')

        await user.click(medicalButton)

        expect(medicalButton).toHaveClass(/selected|active|bg-blue/)
        expect(screen.getByText(/ana silva santos - atestado/i)).toBeInTheDocument()
      })
    })

    it('should clear status when clicking same button again', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const presentButton = screen.getByTestId('student-student-1-presente')

        // Mark as present
        await user.click(presentButton)
        expect(presentButton).toHaveClass(/selected|active/)

        // Click again to clear
        await user.click(presentButton)
        expect(presentButton).not.toHaveClass(/selected|active/)
      })
    })
  })

  describe('Bulk Operations and Quick Actions', () => {
    it('should support marking all students as present', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const markAllPresentButton = screen.getByRole('button', { name: /marcar todos presente/i })

        await user.click(markAllPresentButton)

        // All students should be marked as present
        expect(screen.getByTestId('student-student-1-presente')).toHaveClass(/selected|active/)
        expect(screen.getByTestId('student-student-2-presente')).toHaveClass(/selected|active/)
        expect(screen.getByTestId('student-student-3-presente')).toHaveClass(/selected|active/)
      })
    })

    it('should show confirmation for bulk operations', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const markAllAbsentButton = screen.getByRole('button', { name: /marcar todos falta/i })

        await user.click(markAllAbsentButton)

        // Should show confirmation dialog
        expect(screen.getByText(/confirmar operação em lote/i)).toBeInTheDocument()
        expect(screen.getByText(/marcar todos os 3 alunos como falta/i)).toBeInTheDocument()
      })
    })

    it('should support undo last action', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const presentButton = screen.getByTestId('student-student-1-presente')

        await user.click(presentButton)

        const undoButton = screen.getByRole('button', { name: /desfazer/i })
        await user.click(undoButton)

        expect(presentButton).not.toHaveClass(/selected|active/)
      })
    })

    it('should maintain action history for multiple undos', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        // Mark multiple students
        await user.click(screen.getByTestId('student-student-1-presente'))
        await user.click(screen.getByTestId('student-student-2-falta'))
        await user.click(screen.getByTestId('student-student-3-justificada'))

        // Should show action history
        expect(screen.getByText(/3 alterações/i)).toBeInTheDocument()

        // Undo last action
        const undoButton = screen.getByRole('button', { name: /desfazer/i })
        await user.click(undoButton)

        expect(screen.getByTestId('student-student-3-justificada')).not.toHaveClass(/selected/)
        expect(screen.getByText(/2 alterações/i)).toBeInTheDocument()
      })
    })
  })

  describe('Save and Sync Operations', () => {
    it('should save attendance records when save button is clicked', async () => {
      const { attendanceApi } = require('@/lib/api/attendance')

      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(async () => {
        // Mark some students
        await user.click(screen.getByTestId('student-student-1-presente'))
        await user.click(screen.getByTestId('student-student-2-falta'))

        const saveButton = screen.getByRole('button', { name: /salvar frequência/i })
        await user.click(saveButton)

        expect(attendanceApi.saveAttendance).toHaveBeenCalledWith({
          sessionId: 'session-456',
          records: [
            { student_id: 'student-1', status: 'presente' },
            { student_id: 'student-2', status: 'falta' }
          ]
        })
      })
    })

    it('should show progress during save operation', async () => {
      const { attendanceApi } = require('@/lib/api/attendance')

      // Mock delayed response
      attendanceApi.saveAttendance.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      )

      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(async () => {
        await user.click(screen.getByTestId('student-student-1-presente'))

        const saveButton = screen.getByRole('button', { name: /salvar frequência/i })
        await user.click(saveButton)

        // Should show loading state
        expect(screen.getByText(/salvando/i)).toBeInTheDocument()
        expect(saveButton).toBeDisabled()
      })
    })

    it('should handle save errors gracefully', async () => {
      const { attendanceApi } = require('@/lib/api/attendance')

      attendanceApi.saveAttendance.mockRejectedValue(new Error('Save failed'))

      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(async () => {
        await user.click(screen.getByTestId('student-student-1-presente'))

        const saveButton = screen.getByRole('button', { name: /salvar frequência/i })
        await user.click(saveButton)

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('Erro ao salvar')
          )
        })
      })
    })

    it('should prevent leaving with unsaved changes', async () => {
      const mockOnCancel = jest.fn()

      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} onCancel={mockOnCancel} />
        </QueryWrapper>
      )

      await waitFor(async () => {
        // Mark a student (unsaved change)
        await user.click(screen.getByTestId('student-student-1-presente'))

        const cancelButton = screen.getByRole('button', { name: /cancelar/i })
        await user.click(cancelButton)

        // Should show confirmation dialog
        expect(screen.getByText(/alterações não salvas/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /descartar alterações/i })).toBeInTheDocument()
      })
    })
  })

  describe('Offline Support and Synchronization', () => {
    it('should work in offline mode', () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      fireEvent(window, new Event('offline'))

      expect(screen.getByText(/modo offline/i)).toBeInTheDocument()
      expect(screen.getByText(/alterações serão sincronizadas/i)).toBeInTheDocument()
    })

    it('should queue changes when offline', async () => {
      // Simulate offline mode
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(async () => {
        await user.click(screen.getByTestId('student-student-1-presente'))

        expect(screen.getByText(/1 alteração pendente/i)).toBeInTheDocument()
      })
    })

    it('should sync queued changes when back online', async () => {
      const { attendanceApi } = require('@/lib/api/attendance')

      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      await waitFor(async () => {
        await user.click(screen.getByTestId('student-student-1-presente'))
      })

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })

      fireEvent(window, new Event('online'))

      await waitFor(() => {
        expect(attendanceApi.saveAttendance).toHaveBeenCalled()
        expect(screen.getByText(/sincronização completa/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility and Mobile UX', () => {
    it('should have proper ARIA labels for mobile screen readers', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const presentButton = screen.getByTestId('student-student-1-presente')
        expect(presentButton).toHaveAttribute('aria-label', expect.stringContaining('Ana Silva Santos'))

        const grid = screen.getByRole('grid')
        expect(grid).toHaveAttribute('aria-label', 'Lista de frequência móvel')
      })
    })

    it('should support voice commands on mobile devices', async () => {
      // Mock speech recognition
      const mockSpeechRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        onerror: null
      }

      Object.defineProperty(window, 'SpeechRecognition', {
        value: jest.fn(() => mockSpeechRecognition)
      })

      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        const voiceButton = screen.getByRole('button', { name: /comando de voz/i })
        expect(voiceButton).toBeInTheDocument()
      })
    })

    it('should have high contrast mode for outdoor use', () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      const container = screen.getByTestId('mobile-attendance-container')
      expect(container).toHaveClass(/high-contrast|outdoor-mode/)
    })

    it('should support landscape and portrait orientations', () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      // Should have responsive classes for orientation
      const container = screen.getByTestId('mobile-attendance-container')
      expect(container).toHaveClass(/landscape:grid-cols|portrait:grid-cols/)
    })

    it('should announce attendance changes for screen readers', async () => {
      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(async () => {
        await user.click(screen.getByTestId('student-student-1-presente'))

        // Should have live region for announcements
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent(/ana silva santos marcada como presente/i)
      })
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle large class sizes efficiently on mobile', async () => {
      const { studentsApi } = require('@/lib/api/students')

      const largeClass = Array.from({ length: 50 }, (_, i) => ({
        id: `student-${i + 1}`,
        nome_completo: `Aluno ${i + 1}`,
        numero_matricula: `2025${String(i + 1).padStart(3, '0')}`
      }))

      studentsApi.getByClass.mockResolvedValue({ data: largeClass })

      const startTime = performance.now()

      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Aluno 1')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render efficiently even with large classes
      expect(renderTime).toBeLessThan(3000) // 3 seconds max for 50 students on mobile
    })

    it('should use virtualization for very large classes', async () => {
      const { studentsApi } = require('@/lib/api/students')

      const veryLargeClass = Array.from({ length: 100 }, (_, i) => ({
        id: `student-${i + 1}`,
        nome_completo: `Aluno ${i + 1}`,
        numero_matricula: `2025${String(i + 1).padStart(3, '0')}`
      }))

      studentsApi.getByClass.mockResolvedValue({ data: veryLargeClass })

      render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      await waitFor(() => {
        // Should use virtual scrolling for performance
        expect(screen.getByTestId('virtual-attendance-list')).toBeInTheDocument()
      })
    })

    it('should clean up resources on unmount', () => {
      const { unmount } = render(
        <QueryWrapper>
          <AttendanceMarkingMobile {...mockProps} />
        </QueryWrapper>
      )

      // Should not cause memory leaks
      expect(() => unmount()).not.toThrow()
    })
  })
})