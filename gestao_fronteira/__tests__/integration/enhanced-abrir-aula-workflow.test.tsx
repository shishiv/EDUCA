/**
 * @jest-environment jsdom
 * @description Integration Tests for Enhanced "Abrir aula" Workflow
 * Task 3: Frontend Components - Full Integration Verification
 * Tests the complete three-phase workflow with Brazilian compliance
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'

// Mock environment for integration tests
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockSession }),
          limit: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: [mockSession] })
          }))
        })),
        insert: jest.fn().mockResolvedValue({ data: mockSession }),
        update: jest.fn().mockResolvedValue({ data: mockSession }),
        upsert: jest.fn().mockResolvedValue({ data: mockSession })
      }))
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } })
    },
    realtime: {
      channel: jest.fn(() => ({
        on: jest.fn(() => ({ subscribe: jest.fn() })),
        subscribe: jest.fn(),
        send: jest.fn()
      })),
      onOpen: jest.fn(),
      onClose: jest.fn(),
      onError: jest.fn()
    }
  }
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/frequencia'
}))

// Mock real-time context
const mockRealtimeContext = {
  connectionStatus: 'connected' as const,
  isOnline: true,
  pendingSync: 0,
  currentSession: null,
  activeSessions: [],
  attendanceStats: new Map(),
  subscribeToSession: jest.fn(),
  unsubscribeFromSession: jest.fn(),
  subscribeToTeacherSessions: jest.fn(),
  subscribeToSchoolSessions: jest.fn(),
  broadcastSessionUpdate: jest.fn(),
  forceReconnect: jest.fn(),
  notifications: [],
  clearNotification: jest.fn(),
  clearAllNotifications: jest.fn()
}

jest.mock('@/contexts/session-realtime-context', () => ({
  useSessionRealtime: () => mockRealtimeContext,
  SessionRealtimeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock auth hook
const mockAuthContext = {
  userProfile: {
    id: 'test-professor-id',
    nome: 'Professor Test',
    tipo_usuario: 'professor',
    escola_id: 'test-escola-id'
  },
  signOut: jest.fn()
}

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockAuthContext
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Import components after mocks
import SessionControl from '@/components/attendance/session-control'
import EnhancedAttendanceGrid from '@/components/attendance/enhanced-attendance-grid'
import SessionDashboard from '@/components/attendance/session-dashboard'
import ComplianceIndicators from '@/components/compliance/compliance-indicators'
import ComplianceWarningBanner from '@/components/compliance/compliance-warning-banner'

// Test data
const mockUser = {
  id: 'test-professor-id',
  tipo_usuario: 'professor',
  nome_completo: 'Professor Test',
  escola_id: 'test-escola-id'
}

const mockSession = {
  id: 'test-session-id',
  turma_id: 'test-turma-id',
  professor_id: 'test-professor-id',
  data_aula: new Date().toISOString().split('T')[0],
  fase: 'planejamento' as const,
  bloqueado: false,
  total_alunos: 25,
  total_presentes: 0,
  total_ausentes: 0,
  turmas: {
    nome: 'Turma A - 1º Ano',
    ano_letivo: 2025
  },
  compliance_status: 'pending',
  can_modify: true
}

const mockStudents = [
  {
    id: 'student-1',
    nome: 'João Silva',
    cpf: '123.456.789-01',
    presente: null,
    observacoes: null
  },
  {
    id: 'student-2',
    nome: 'Maria Santos',
    cpf: '987.654.321-02',
    presente: null,
    observacoes: null
  }
]

describe('Enhanced "Abrir aula" Workflow - Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful API responses
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url: string) => {
      if (url.includes('/api/sessions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            session: mockSession,
            message: 'Success'
          })
        } as Response)
      }

      if (url.includes('/api/students')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            students: mockStudents
          })
        } as Response)
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)
    })
  })

  describe('Complete Three-Phase Workflow', () => {
    test('should complete full workflow: planejamento → chamada → finalizada → bloqueada', async () => {
      const onSessionUpdate = jest.fn()

      // 1. Start with planning phase
      const { rerender } = render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={onSessionUpdate}
        />
      )

      expect(screen.getByText('Planejamento')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /iniciar aula/i })).toBeInTheDocument()

      // 2. Transition to chamada phase
      const startButton = screen.getByRole('button', { name: /iniciar aula/i })
      await user.click(startButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/sessions'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('start_session')
          })
        )
      })

      // 3. Simulate session update to chamada phase
      const updatedSessionChamada = { ...mockSession, fase: 'chamada' as const }
      rerender(
        <SessionControl
          session={updatedSessionChamada}
          user={mockUser}
          onSessionUpdate={onSessionUpdate}
        />
      )

      expect(screen.getByText('Chamada em Andamento')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /finalizar aula/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /marcar frequência/i })).toBeInTheDocument()

      // 4. Transition to finalizada phase
      const completeButton = screen.getByRole('button', { name: /finalizar aula/i })
      await user.click(completeButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/sessions'),
          expect.objectContaining({
            body: expect.stringContaining('complete_session')
          })
        )
      })

      // 5. Simulate final state - finalizada
      const updatedSessionFinalizada = { ...mockSession, fase: 'finalizada' as const }
      rerender(
        <SessionControl
          session={updatedSessionFinalizada}
          user={mockUser}
          onSessionUpdate={onSessionUpdate}
        />
      )

      expect(screen.getByText('Finalizada')).toBeInTheDocument()
      expect(screen.getByText(/aguardando bloqueio automático/i)).toBeInTheDocument()

      // 6. Simulate automatic lock at 18:00
      const blockedSession = {
        ...mockSession,
        fase: 'bloqueada' as const,
        bloqueado: true,
        can_modify: false
      }
      rerender(
        <SessionControl
          session={blockedSession}
          user={mockUser}
          onSessionUpdate={onSessionUpdate}
        />
      )

      expect(screen.getByText('Bloqueada')).toBeInTheDocument()
      expect(screen.getByText(/não existe o esquecer/i)).toBeInTheDocument()
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument()
    })
  })

  describe('Attendance Integration', () => {
    test('should integrate session control with attendance grid', async () => {
      const chamadaSession = { ...mockSession, fase: 'chamada' as const }

      render(
        <div>
          <SessionControl
            session={chamadaSession}
            user={mockUser}
            onSessionUpdate={jest.fn()}
            onAttendanceClick={() => {}}
          />
          <EnhancedAttendanceGrid
            sessionId={chamadaSession.id}
            students={mockStudents}
            onAttendanceUpdate={jest.fn()}
            isMobile={false}
          />
        </div>
      )

      // Should show active session in attendance grid
      expect(screen.getByText('Chamada em Andamento')).toBeInTheDocument()

      // Should show students in attendance grid
      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()

      // Should allow attendance marking during chamada phase
      const presentButton = screen.getAllByRole('button', { name: /presente/i })[0]
      await user.click(presentButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/attendance'),
          expect.objectContaining({
            method: 'POST'
          })
        )
      })
    })
  })

  describe('Real-time Integration', () => {
    test('should handle real-time updates across components', async () => {
      const onSessionUpdate = jest.fn()

      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={onSessionUpdate}
        />
      )

      // Should subscribe to real-time updates
      expect(mockRealtimeContext.subscribeToTeacherSessions).toHaveBeenCalledWith(
        mockUser.id
      )

      // Should show connection status
      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      expect(screen.getByText('Online')).toBeInTheDocument()

      // Should handle connection changes
      mockRealtimeContext.connectionStatus = 'disconnected'
      mockRealtimeContext.isOnline = false

      // Simulate connection error
      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
    })
  })

  describe('Mobile Optimization', () => {
    test('should provide mobile-optimized interfaces', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
          isMobile={true}
        />
      )

      // Should show mobile layout
      expect(screen.getByTestId('session-control-mobile')).toBeInTheDocument()

      // Should have touch-friendly buttons
      const startButton = screen.getByRole('button', { name: /iniciar aula/i })
      expect(startButton).toHaveClass('touch-target-large')

      // Should support swipe gestures
      const swipeArea = screen.getByTestId('swipe-area')
      expect(swipeArea).toBeInTheDocument()

      // Simulate swipe gesture
      fireEvent.touchStart(swipeArea, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      fireEvent.touchEnd(swipeArea, {
        changedTouches: [{ clientX: 200, clientY: 100 }]
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/sessions'),
          expect.objectContaining({
            body: expect.stringContaining('start_session')
          })
        )
      })
    })
  })

  describe('Brazilian Compliance Integration', () => {
    test('should show compliance indicators and warnings', async () => {
      render(
        <div>
          <ComplianceWarningBanner />
          <ComplianceIndicators
            view="session"
            sessionId={mockSession.id}
            showActions={true}
          />
        </div>
      )

      // Should show compliance warnings
      expect(screen.getByTestId('compliance-warning-banner')).toBeInTheDocument()
      expect(screen.getByText(/bloqueio automático/i)).toBeInTheDocument()

      // Should show compliance indicators
      expect(screen.getByTestId('compliance-indicators-full')).toBeInTheDocument()
      expect(screen.getByText(/conformidade brasileira/i)).toBeInTheDocument()

      // Should show INEP compliance
      expect(screen.getByText(/inep/i)).toBeInTheDocument()
      expect(screen.getByText(/educacenso/i)).toBeInTheDocument()
      expect(screen.getByText(/lgpd/i)).toBeInTheDocument()
    })

    test('should enforce "Não existe o esquecer" principle', async () => {
      const blockedSession = {
        ...mockSession,
        fase: 'bloqueada' as const,
        bloqueado: true,
        can_modify: false
      }

      render(
        <div>
          <SessionControl
            session={blockedSession}
            user={mockUser}
            onSessionUpdate={jest.fn()}
          />
          <EnhancedAttendanceGrid
            sessionId={blockedSession.id}
            students={mockStudents}
            onAttendanceUpdate={jest.fn()}
            readonly={true}
          />
        </div>
      )

      // Should show blocked session
      expect(screen.getByText('Bloqueada')).toBeInTheDocument()
      expect(screen.getByText(/não existe o esquecer/i)).toBeInTheDocument()

      // Should not allow any modifications
      expect(screen.queryByRole('button', { name: /iniciar aula/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /finalizar aula/i })).not.toBeInTheDocument()

      // Attendance should be readonly
      const attendanceButtons = screen.queryAllByRole('button', { name: /presente|ausente/i })
      attendanceButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Administrative Dashboard Integration', () => {
    test('should provide comprehensive session monitoring', async () => {
      const mockSessions = [mockSession]

      render(
        <SessionDashboard
          sessions={mockSessions}
          user={{ ...mockUser, tipo_usuario: 'diretor' }}
          onSessionSelect={jest.fn()}
          refreshInterval={30000}
        />
      )

      // Should show session dashboard
      expect(screen.getByText(/monitoramento de sessões/i)).toBeInTheDocument()

      // Should show session statistics
      expect(screen.getByText('25')).toBeInTheDocument() // total students
      expect(screen.getByText('0%')).toBeInTheDocument() // attendance percentage

      // Should show compliance status
      expect(screen.getByText(/conformidade/i)).toBeInTheDocument()

      // Should allow session filtering
      const filterButton = screen.getByRole('button', { name: /filtros/i })
      await user.click(filterButton)

      expect(screen.getByText(/fase da aula/i)).toBeInTheDocument()
      expect(screen.getByText(/status de conformidade/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling and Resilience', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API error
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      const startButton = screen.getByRole('button', { name: /iniciar aula/i })
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByText(/erro/i)).toBeInTheDocument()
      })
    })

    test('should handle offline scenarios', async () => {
      // Simulate offline mode
      mockRealtimeContext.connectionStatus = 'disconnected'
      mockRealtimeContext.isOnline = false
      mockRealtimeContext.pendingSync = 3

      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
          isMobile={true}
        />
      )

      // Should show offline status
      expect(screen.getByText('Offline')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // pending sync count

      // Should show offline alert
      expect(screen.getByTestId('offline-alert')).toBeInTheDocument()
      expect(screen.getByText(/modo offline/i)).toBeInTheDocument()
    })
  })

  describe('Performance and Accessibility', () => {
    test('should meet accessibility standards', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      // Should have proper ARIA labels
      const sessionStatus = screen.getByRole('status', { name: /fase da aula/i })
      expect(sessionStatus).toBeInTheDocument()

      // Should have live region for announcements
      const liveRegion = screen.getByRole('log', { name: /atualizações da aula/i })
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')

      // Should support keyboard navigation
      const startButton = screen.getByRole('button', { name: /iniciar aula/i })
      startButton.focus()
      expect(startButton).toHaveFocus()
    })

    test('should optimize for classroom tablet use', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
          isMobile={true}
        />
      )

      // Should have large touch targets
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        if (button.classList.contains('touch-target-large')) {
          const styles = window.getComputedStyle(button)
          expect(parseFloat(styles.minHeight)).toBeGreaterThanOrEqual(44)
          expect(parseFloat(styles.minWidth)).toBeGreaterThanOrEqual(44)
        }
      })
    })
  })
})

describe('Full Application Integration', () => {
  test('should work together as complete educational management system', async () => {
    const user = userEvent.setup()

    // Render complete application flow
    render(
      <div>
        <ComplianceWarningBanner maxVisible={1} />
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
          onAttendanceClick={() => {}}
        />
        <EnhancedAttendanceGrid
          sessionId={mockSession.id}
          students={mockStudents}
          onAttendanceUpdate={jest.fn()}
        />
        <ComplianceIndicators
          view="session"
          sessionId={mockSession.id}
        />
      </div>
    )

    // Should show all components integrated
    expect(screen.getByTestId('compliance-warning-banner')).toBeInTheDocument()
    expect(screen.getByText('Planejamento')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText(/conformidade brasileira/i)).toBeInTheDocument()

    // Should work as integrated system
    const startButton = screen.getByRole('button', { name: /iniciar aula/i })
    await user.click(startButton)

    // Should trigger API calls for session management
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions'),
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    // All components should be functioning together
    expect(screen.getByTestId('compliance-warning-banner')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /iniciar aula/i })).toBeInTheDocument()
  })
})