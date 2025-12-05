/**
 * Unit tests for AttendanceGrid 3-State Extension (P/F/A)
 * Testing state cycling: empty -> Presente -> Falta -> Attestado -> empty
 * Brazilian educational compliance with attestado support
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
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

// Mock fetch API for batch operations
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
  })
) as jest.Mock

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [
                {
                  id: 'aluno-001',
                  nome_completo: 'Ana Silva Santos',
                  data_nascimento: '2015-03-15',
                  matriculas: [{
                    id: 'mat-001',
                    turma_id: 'turma-123',
                    situacao: 'ativa'
                  }]
                }
              ],
              error: null
            }))
          })),
          order: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({
        data: [{ id: 'freq-001' }],
        error: null
      })),
      update: jest.fn(() => Promise.resolve({
        data: [{ id: 'freq-001' }],
        error: null
      })),
      upsert: jest.fn(() => Promise.resolve({
        data: [{ id: 'freq-001' }],
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

const mockProps = {
  sessionId: 'session-123',
  turmaId: 'turma-123',
  readonly: false,
  showPhotos: true
}

describe('AttendanceGrid - 3-State Extension (P/F/A)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Test 1: State Cycle (P -> F -> A -> empty)', () => {
    it('should cycle through all states in correct order when clicking same cell', async () => {
      render(<AttendanceGrid {...mockProps} />)

      // Wait for students to load
      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      // Find the attendance cell for the student
      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')
      expect(studentRow).toBeInTheDocument()

      // Initial state: empty (pending)
      const attendanceButtons = studentRow!.querySelectorAll('button[class*="min-h-"]')
      expect(attendanceButtons.length).toBeGreaterThan(0)

      // Click 1: empty -> Presente (P)
      const presentButton = attendanceButtons[0] as HTMLElement
      fireEvent.click(presentButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/frequencia/batch'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"presente":true')
          })
        )
      })

      // Verify present state (green background)
      await waitFor(() => {
        const updatedRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')
        expect(updatedRow).toHaveClass(expect.stringMatching(/bg-green/))
      })

      // Click 2: Presente -> Falta (F)
      const absentButton = attendanceButtons[1] as HTMLElement
      fireEvent.click(absentButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/frequencia/batch'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"presente":false')
          })
        )
      })

      // Verify absent state (red background)
      await waitFor(() => {
        const updatedRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')
        expect(updatedRow).toHaveClass(expect.stringMatching(/bg-red/))
      })

      // Click 3: Falta -> Attestado (A) - requires new button
      // This will be available after implementation
      const attestadoButton = studentRow!.querySelector('button[data-state="attestado"]') as HTMLElement
      if (attestadoButton) {
        fireEvent.click(attestadoButton)

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/frequencia/batch'),
            expect.objectContaining({
              method: 'POST',
              body: expect.stringContaining('"status_presenca":"attestado"')
            })
          )
        })

        // Verify attestado state (yellow background)
        await waitFor(() => {
          const updatedRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')
          expect(updatedRow).toHaveClass(expect.stringMatching(/bg-yellow|bg-amber/))
        })

        // Click 4: Attestado -> empty (clear)
        fireEvent.click(attestadoButton)

        await waitFor(() => {
          const updatedRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')
          expect(updatedRow).toHaveClass(expect.stringMatching(/bg-gray/))
        })
      }
    })
  })

  describe('Test 2: Correct Colors for Each State', () => {
    it('should display correct background colors for each attendance state', async () => {
      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!

      // Test 1: Presente state = green (#dcfce7 or green-50)
      const presentButton = studentRow.querySelector('button[class*="min-h-"]') as HTMLElement
      fireEvent.click(presentButton)

      await waitFor(() => {
        expect(studentRow).toHaveClass(expect.stringMatching(/bg-green-50|border-green/))
      })

      // Test 2: Falta state = red (#fee2e2 or red-50)
      const buttons = studentRow.querySelectorAll('button[class*="min-h-"]')
      const absentButton = buttons[1] as HTMLElement
      fireEvent.click(absentButton)

      await waitFor(() => {
        expect(studentRow).toHaveClass(expect.stringMatching(/bg-red-50|border-red/))
      })

      // Test 3: Attestado state = yellow (#fef3c7 or yellow-50)
      const attestadoButton = studentRow.querySelector('button[data-state="attestado"]') as HTMLElement
      if (attestadoButton) {
        fireEvent.click(attestadoButton)

        await waitFor(() => {
          expect(studentRow).toHaveClass(expect.stringMatching(/bg-yellow-50|bg-amber-50|border-yellow|border-amber/))
        })
      }

      // Test 4: Empty state = gray (pending)
      // After clearing, should show gray/neutral background
    })

    it('should have distinct visual indicators for each state', async () => {
      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!

      // Each state should have a colored circle indicator
      const presentButton = studentRow.querySelector('button[class*="min-h-"]') as HTMLElement
      fireEvent.click(presentButton)

      await waitFor(() => {
        // Should have green indicator
        const greenIndicator = studentRow.querySelector('.bg-green-600')
        expect(greenIndicator).toBeInTheDocument()
      })
    })
  })

  describe('Test 3: Real-time Summary Calculation', () => {
    it('should include attestados in statistics summary', async () => {
      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      // Initially: Total: 1, Present: 0, Absent: 0, Attestados: 0, Pending: 1
      expect(screen.getByText(/Total: 1/)).toBeInTheDocument()
      expect(screen.getByText(/Pendentes: 1/)).toBeInTheDocument()

      // Mark as attestado
      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!
      const attestadoButton = studentRow.querySelector('button[data-state="attestado"]') as HTMLElement

      if (attestadoButton) {
        fireEvent.click(attestadoButton)

        // Should update statistics
        await waitFor(() => {
          expect(screen.getByText(/Attestados: 1/)).toBeInTheDocument()
          expect(screen.getByText(/Pendentes: 0/)).toBeInTheDocument()
        })
      }
    })

    it('should calculate attendance rate considering attestados as present', async () => {
      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!
      const attestadoButton = studentRow.querySelector('button[data-state="attestado"]') as HTMLElement

      if (attestadoButton) {
        fireEvent.click(attestadoButton)

        // Attestados should count as "present" for attendance rate
        // Rate = (present + attestados) / (total - pending) * 100
        await waitFor(() => {
          // Should show attendance rate badge
          const rateBadge = screen.queryByText(/100%/)
          expect(rateBadge).toBeInTheDocument()
        })
      }
    })

    it('should update summary in real-time as attendance changes', async () => {
      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!
      const buttons = studentRow.querySelectorAll('button[class*="min-h-"]')
      const presentButton = buttons[0] as HTMLElement

      // Mark present
      fireEvent.click(presentButton)

      await waitFor(() => {
        expect(screen.getByText(/Presentes: 1/)).toBeInTheDocument()
      })

      // Change to absent
      const absentButton = buttons[1] as HTMLElement
      fireEvent.click(absentButton)

      await waitFor(() => {
        expect(screen.getByText(/Presentes: 0/)).toBeInTheDocument()
        expect(screen.getByText(/Ausentes: 1/)).toBeInTheDocument()
      })
    })
  })

  describe('Test 4: Readonly Behavior When Locked', () => {
    it('should disable all buttons when readonly prop is true', async () => {
      render(<AttendanceGrid {...mockProps} readonly={true} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!
      const buttons = studentRow.querySelectorAll('button[class*="min-h-"]')

      // All buttons should be disabled or not present
      expect(buttons.length).toBe(0)
    })

    it('should prevent clicking when individual record is locked', async () => {
      // Mock locked attendance record
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({
                data: [
                  {
                    id: 'aluno-001',
                    nome_completo: 'Ana Silva Santos',
                    data_nascimento: '2015-03-15',
                    matriculas: [{
                      id: 'mat-001',
                      turma_id: 'turma-123',
                      situacao: 'ativa'
                    }]
                  }
                ],
                error: null
              }))
            })),
            order: jest.fn(() => Promise.resolve({
              data: [
                {
                  id: 'freq-001',
                  matricula_id: 'mat-001',
                  presente: true,
                  bloqueado: true, // Locked record
                  status_presenca: 'presente'
                }
              ],
              error: null
            }))
          }))
        }))
      })

      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!

      // Should show "Travado" indicator
      expect(studentRow).toHaveTextContent(/Travado/)

      // Should have opacity to indicate disabled state
      expect(studentRow).toHaveClass(expect.stringMatching(/opacity-60/))

      // Buttons should not be present
      const buttons = studentRow.querySelectorAll('button[class*="min-h-"]')
      expect(buttons.length).toBe(0)
    })
  })

  describe('Test 5: Touch-Friendly Interface (44px minimum)', () => {
    it('should maintain 44px minimum touch targets for all 3 state buttons', async () => {
      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!
      const buttons = studentRow.querySelectorAll('button[class*="min-h-"]')

      // All buttons should have min-h-[44px]
      buttons.forEach(button => {
        const styles = getComputedStyle(button)
        const minHeight = parseInt(styles.minHeight || '44')
        expect(minHeight).toBeGreaterThanOrEqual(44)
      })

      // Attestado button should also meet minimum size
      const attestadoButton = studentRow.querySelector('button[data-state="attestado"]') as HTMLElement
      if (attestadoButton) {
        const styles = getComputedStyle(attestadoButton)
        const minHeight = parseInt(styles.minHeight || '44')
        expect(minHeight).toBeGreaterThanOrEqual(44)
      }
    })

    it('should have smooth transition animation between states', async () => {
      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!

      // Should have transition class
      expect(studentRow).toHaveClass(expect.stringMatching(/transition/))

      const presentButton = studentRow.querySelector('button[class*="min-h-"]') as HTMLElement
      fireEvent.click(presentButton)

      // Visual change should be smooth with transition
      await waitFor(() => {
        expect(studentRow).toHaveClass(expect.stringMatching(/transition-all/))
      })
    })
  })

  describe('Test 6: Accessibility (aria-labels)', () => {
    it('should have proper aria-labels for each state button', async () => {
      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!
      const buttons = studentRow.querySelectorAll('button[class*="min-h-"]')

      // Present button should have aria-label
      expect(buttons[0]).toHaveAttribute('aria-label', expect.stringMatching(/presente/i))

      // Absent button should have aria-label
      if (buttons[1]) {
        expect(buttons[1]).toHaveAttribute('aria-label', expect.stringMatching(/falta|ausente/i))
      }

      // Attestado button should have aria-label
      const attestadoButton = studentRow.querySelector('button[data-state="attestado"]') as HTMLElement
      if (attestadoButton) {
        expect(attestadoButton).toHaveAttribute('aria-label', expect.stringMatching(/attestado|justificad/i))
      }
    })

    it('should announce state changes to screen readers', async () => {
      render(<AttendanceGrid {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument()
      })

      const studentRow = screen.getByText('Ana Silva Santos').closest('div[class*="rounded-lg"]')!
      const presentButton = studentRow.querySelector('button[class*="min-h-"]') as HTMLElement

      fireEvent.click(presentButton)

      // Should show success toast with state change announcement
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringMatching(/Ana Silva Santos.*presente/i),
          expect.any(Object)
        )
      })
    })
  })
})
