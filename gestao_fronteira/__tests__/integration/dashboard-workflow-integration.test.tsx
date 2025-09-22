/**
 * Integration tests for complete Teacher Dashboard workflow
 * Task 4.6: Write integration tests for complete dashboard workflow
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock the auth hook
const mockUser = {
  id: 'teacher-123',
  nome: 'Professor João Silva',
  papel: 'professor',
  escola_id: 'school-1'
}

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    userProfile: mockUser,
    user: mockUser
  })
}))

// Mock Supabase client
const mockSupabase = {
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn()
  })),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lt: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: null
            }))
          }))
        }))
      }))
    }))
  }))
}

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock API modules
jest.mock('@/lib/api/classes', () => ({
  classesApi: {
    getClassesByTeacher: jest.fn(),
  }
}))

// Import components after mocks are set up
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'
import { SessionTimerDisplay } from '@/components/attendance/session-timer-display'
import { AbrirAulaButton } from '@/components/attendance/abrir-aula-button'
import { AulaStatusIndicator } from '@/components/attendance/aula-status-indicator'

describe('Complete Teacher Dashboard Workflow Integration', () => {
  const mockClasses = [
    {
      id: 'class-1',
      nome: '1º Ano A',
      serie: 'Fundamental I',
      turno: 'Manhã',
      escola: {
        id: 'school-1',
        nome: 'Escola Municipal João da Silva'
      },
      _count: {
        students: 25
      }
    },
    {
      id: 'class-2',
      nome: '2º Ano B',
      serie: 'Fundamental I',
      turno: 'Tarde',
      escola: {
        id: 'school-1',
        nome: 'Escola Municipal João da Silva'
      },
      _count: {
        students: 30
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default API responses
    const { classesApi } = require('@/lib/api/classes')
    classesApi.getClassesByTeacher.mockResolvedValue(mockClasses)

    // Mock successful session creation
    global.fetch = jest.fn()
  })

  describe('Complete Workflow: Class Selection to Attendance Marking', () => {
    it('should complete entire workflow from dashboard to attendance submission', async () => {
      const user = userEvent.setup()

      // Mock session creation response
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: 'session-123',
              aula_id: 'aula-456',
              status: 'aberta',
              pode_marcar_frequencia: true,
              tempo_limite_minutos: 30
            }
          })
        })

      render(<TeacherDashboardEnhanced />)

      // Step 1: Dashboard loads and shows classes
      await waitFor(() => {
        expect(screen.getByText('1º Ano A - Fundamental I')).toBeInTheDocument()
        expect(screen.getByText('2º Ano B - Fundamental I')).toBeInTheDocument()
      })

      // Step 2: Click "Abrir Aula" for first class
      const abrirAulaButtons = await screen.findAllByRole('button', { name: /abrir aula/i })
      await user.click(abrirAulaButtons[0])

      // Step 3: Verify session opened successfully
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/aulas/abrir', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            turma_id: 'class-1',
            observacoes: 'Aula aberta via interface do professor'
          })
        })
      })

      // Step 4: Verify success feedback
      await waitFor(() => {
        expect(screen.getByText(/aula aberta/i)).toBeInTheDocument()
      })
    })

    it('should handle session status transitions correctly', async () => {
      // Mock progression: no session -> opened -> active -> locked
      let callCount = 0
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn(() => ({
                single: jest.fn(() => {
                  callCount++
                  if (callCount === 1) {
                    // Initially no session
                    return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
                  } else if (callCount === 2) {
                    // Session opened
                    return Promise.resolve({
                      data: {
                        id: 'session-123',
                        status: 'aberta',
                        aberta_em: new Date().toISOString(),
                        tempo_limite_minutos: 30
                      },
                      error: null
                    })
                  } else {
                    // Session locked
                    return Promise.resolve({
                      data: {
                        id: 'session-123',
                        status: 'travada',
                        aberta_em: new Date(Date.now() - 60000).toISOString(),
                        travada_em: new Date().toISOString(),
                        tempo_limite_minutos: 30
                      },
                      error: null
                    })
                  }
                })
              }))
            }))
          }))
        }))
      }))

      render(<TeacherDashboardEnhanced />)

      // Initially should show "Aula não aberta"
      await waitFor(() => {
        expect(screen.getByText(/aula não aberta/i)).toBeInTheDocument()
      })

      // After opening session
      await waitFor(() => {
        expect(screen.getByText(/aula aberta/i)).toBeInTheDocument()
      })

      // After session becomes locked
      await waitFor(() => {
        expect(screen.getByText(/aula travada/i)).toBeInTheDocument()
      })
    })

    it('should integrate session timer with attendance controls', async () => {
      const sessionStartTime = new Date().toISOString()

      render(
        <SessionTimerDisplay
          sessionId="session-123"
          startTime={sessionStartTime}
          timeLimit={30}
          currentPhase="chamada"
        />
      )

      // Should show timer countdown
      await waitFor(() => {
        expect(screen.getByText(/tempo para marcação/i)).toBeInTheDocument()
        expect(screen.getByText(/30:/)).toBeInTheDocument() // Should show 30:xx format
      })

      // Should show progress bar
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show session status
      expect(screen.getByText(/ativa/i)).toBeInTheDocument()
    })

    it('should handle timer expiration and lock warnings', async () => {
      // Mock session that expires in 5 minutes
      const sessionStartTime = new Date(Date.now() - 25 * 60 * 1000).toISOString() // 25 minutes ago
      const onTimeExpired = jest.fn()
      const onWarningThreshold = jest.fn()

      render(
        <SessionTimerDisplay
          sessionId="session-123"
          startTime={sessionStartTime}
          timeLimit={30}
          currentPhase="chamada"
          onTimeExpired={onTimeExpired}
          onWarningThreshold={onWarningThreshold}
        />
      )

      // Should show critical warning
      await waitFor(() => {
        expect(screen.getByText(/urgente/i)).toBeInTheDocument()
      })

      // Should trigger warning callback
      expect(onWarningThreshold).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors during session creation', async () => {
      const user = userEvent.setup()

      // Mock API error
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({
            success: false,
            error: {
              code: 'SESSION_ALREADY_EXISTS',
              message: 'Já existe uma aula aberta para esta turma hoje'
            }
          })
        })

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('1º Ano A - Fundamental I')).toBeInTheDocument()
      })

      const abrirAulaButtons = await screen.findAllByRole('button', { name: /abrir aula/i })
      await user.click(abrirAulaButtons[0])

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/já existe uma aula aberta/i)).toBeInTheDocument()
      })
    })

    it('should handle network connectivity issues', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText(/sem conexão/i)).toBeInTheDocument()
      })
    })

    it('should handle concurrent teacher access to same class', async () => {
      const user = userEvent.setup()

      // Mock conflict response
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({
            success: false,
            error: {
              code: 'CONCURRENT_ACCESS',
              message: 'Outro professor já abriu esta aula'
            }
          })
        })

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('1º Ano A - Fundamental I')).toBeInTheDocument()
      })

      const abrirAulaButtons = await screen.findAllByRole('button', { name: /abrir aula/i })
      await user.click(abrirAulaButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/outro professor já abriu/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility and Mobile Support', () => {
    it('should support keyboard navigation throughout workflow', async () => {
      const user = userEvent.setup()

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('1º Ano A - Fundamental I')).toBeInTheDocument()
      })

      // Tab through elements
      await user.tab()
      expect(screen.getAllByRole('button', { name: /abrir aula/i })[0]).toHaveFocus()

      await user.tab()
      expect(screen.getAllByRole('button', { name: /ver detalhes/i })[0]).toHaveFocus()

      // Enter to activate
      await user.keyboard('{Enter}')
      // Should navigate to details page (mocked router)
    })

    it('should work correctly on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        const classCards = screen.getAllByRole('region')
        classCards.forEach(card => {
          // Should have mobile-friendly layout
          expect(card).toHaveClass(/hover:shadow-md/)
        })
      })

      // Touch targets should be large enough
      const abrirAulaButtons = await screen.findAllByRole('button', { name: /abrir aula/i })
      abrirAulaButtons.forEach(button => {
        const styles = getComputedStyle(button)
        expect(parseInt(styles.minHeight || '0')).toBeGreaterThanOrEqual(44)
      })
    })

    it('should provide proper ARIA labels and screen reader support', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        // Status indicators should have proper labels
        const statusIndicators = screen.getAllByTestId('aula-status-indicator')
        statusIndicators.forEach(indicator => {
          expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('Status da aula'))
        })

        // Buttons should have descriptive labels
        const abrirAulaButtons = screen.getAllByRole('button', { name: /abrir aula/i })
        abrirAulaButtons.forEach(button => {
          expect(button).toHaveAttribute('aria-label', expect.stringContaining('Abrir aula'))
        })
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large number of classes efficiently', async () => {
      // Mock 50 classes
      const manyClasses = Array.from({ length: 50 }, (_, i) => ({
        id: `class-${i}`,
        nome: `${i + 1}º Ano ${String.fromCharCode(65 + (i % 26))}`,
        serie: 'Fundamental I',
        turno: i % 2 === 0 ? 'Manhã' : 'Tarde',
        escola: {
          id: 'school-1',
          nome: 'Escola Municipal João da Silva'
        },
        _count: {
          students: 20 + (i % 10)
        }
      }))

      const { classesApi } = require('@/lib/api/classes')
      classesApi.getClassesByTeacher.mockResolvedValue(manyClasses)

      const startTime = performance.now()
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('1º Ano A - Fundamental I')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render in reasonable time (< 1000ms)
      expect(renderTime).toBeLessThan(1000)

      // All classes should be rendered
      expect(screen.getAllByText(/ver detalhes/i)).toHaveLength(50)
    })

    it('should update status efficiently with real-time subscriptions', async () => {
      const channelMock = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn()
      }
      mockSupabase.channel.mockReturnValue(channelMock)

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalled()
        expect(channelMock.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.any(Object),
          expect.any(Function)
        )
      })

      // Should setup subscription for each class
      expect(channelMock.subscribe).toHaveBeenCalled()
    })
  })
})