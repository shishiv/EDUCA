/**
 * @jest-environment jsdom
 * @description Tests for SessionControl component - Enhanced "Abrir aula" Workflow
 * Task 3: Frontend Components - SessionControl Tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'

// Mock the real-time library
jest.mock('@/lib/realtime/session-realtime', () => ({
  SessionRealtimeManager: jest.fn().mockImplementation(() => ({
    subscribeToSessions: jest.fn().mockReturnValue('test-channel'),
    subscribeToBroadcast: jest.fn().mockReturnValue('broadcast-channel'),
    unsubscribeAll: jest.fn(),
    broadcastSessionUpdate: jest.fn()
  })),
  createTeacherRealtimeManager: jest.fn()
}))

// Mock the session APIs
const mockSessionApi = {
  createSession: jest.fn(),
  updateSession: jest.fn(),
  getSessionStatus: jest.fn(),
  startSession: jest.fn(),
  completeSession: jest.fn(),
  lockSession: jest.fn()
}

jest.mock('@/lib/api/sessions', () => mockSessionApi)

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams()
}))

// Import component after mocks
import SessionControl from '@/components/attendance/session-control'

// Test data
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

const mockUser = {
  id: 'test-professor-id',
  tipo_usuario: 'professor',
  nome_completo: 'Professor Test',
  escola_id: 'test-escola-id'
}

describe('SessionControl Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionApi.getSessionStatus.mockResolvedValue({
      data: {
        session_id: mockSession.id,
        fase: mockSession.fase,
        bloqueado: mockSession.bloqueado,
        attendance: {
          expected_students: 25,
          marked_attendance: 0,
          present_count: 0,
          absent_count: 0,
          pending_count: 25,
          completion_percentage: 0
        },
        status: {
          phase: mockSession.fase,
          compliance_status: 'pending',
          can_modify: true,
          warnings: [],
          requires_attention: false
        },
        auto_lock: {
          time_until_lock_ms: 3600000,
          time_until_lock: '1h 0m',
          approaching_lock: false,
          should_lock: false
        }
      }
    })
  })

  describe('3.1 - Component Rendering', () => {
    test('should render session control with initial planning phase', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      expect(screen.getByText('Turma A - 1º Ano')).toBeInTheDocument()
      expect(screen.getByText('Planejamento')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /iniciar aula/i })).toBeInTheDocument()
    })

    test('should display session information correctly', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      expect(screen.getByText(mockSession.data_aula)).toBeInTheDocument()
      expect(screen.getByText('25 estudantes')).toBeInTheDocument()
      expect(screen.getByText('0% presença')).toBeInTheDocument()
    })

    test('should show compliance status indicator', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      const complianceIndicator = screen.getByTestId('compliance-status')
      expect(complianceIndicator).toHaveClass('status-pending')
    })
  })

  describe('3.2 - Phase Transitions', () => {
    test('should allow transition from planejamento to chamada', async () => {
      mockSessionApi.startSession.mockResolvedValue({
        data: { ...mockSession, fase: 'chamada' }
      })

      const onSessionUpdate = jest.fn()
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={onSessionUpdate}
        />
      )

      const startButton = screen.getByRole('button', { name: /iniciar aula/i })
      await user.click(startButton)

      await waitFor(() => {
        expect(mockSessionApi.startSession).toHaveBeenCalledWith(mockSession.id)
      })

      expect(onSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ fase: 'chamada' })
      )
    })

    test('should show chamada phase controls when session is active', async () => {
      const activeSession = { ...mockSession, fase: 'chamada' as const }

      render(
        <SessionControl
          session={activeSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      expect(screen.getByText('Chamada em Andamento')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /finalizar aula/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /marcar frequência/i })).toBeInTheDocument()
    })

    test('should allow transition from chamada to finalizada', async () => {
      const activeSession = { ...mockSession, fase: 'chamada' as const }
      mockSessionApi.completeSession.mockResolvedValue({
        data: { ...activeSession, fase: 'finalizada' }
      })

      const onSessionUpdate = jest.fn()
      render(
        <SessionControl
          session={activeSession}
          user={mockUser}
          onSessionUpdate={onSessionUpdate}
        />
      )

      const completeButton = screen.getByRole('button', { name: /finalizar aula/i })
      await user.click(completeButton)

      await waitFor(() => {
        expect(mockSessionApi.completeSession).toHaveBeenCalledWith(activeSession.id)
      })
    })

    test('should prevent invalid phase transitions', async () => {
      const completedSession = { ...mockSession, fase: 'finalizada' as const }

      render(
        <SessionControl
          session={completedSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      // Should not show transition buttons for completed session
      expect(screen.queryByRole('button', { name: /iniciar aula/i })).not.toBeInTheDocument()
      expect(screen.getByText('Finalizada')).toBeInTheDocument()
    })
  })

  describe('3.3 - Brazilian Compliance Features', () => {
    test('should show auto-lock countdown when approaching 18:00', async () => {
      mockSessionApi.getSessionStatus.mockResolvedValue({
        data: {
          ...mockSession,
          auto_lock: {
            time_until_lock_ms: 1800000, // 30 minutes
            time_until_lock: '30m',
            approaching_lock: true,
            should_lock: false
          },
          status: {
            warnings: ['Session will auto-lock in 30m']
          }
        }
      })

      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/será bloqueada em 30m/i)).toBeInTheDocument()
      })

      const warningIndicator = screen.getByTestId('auto-lock-warning')
      expect(warningIndicator).toHaveClass('warning-approaching')
    })

    test('should display locked session status', async () => {
      const lockedSession = {
        ...mockSession,
        fase: 'bloqueada' as const,
        bloqueado: true,
        bloqueado_em: new Date().toISOString(),
        can_modify: false
      }

      render(
        <SessionControl
          session={lockedSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      expect(screen.getByText('Bloqueada')).toBeInTheDocument()
      expect(screen.getByText(/não existe o esquecer/i)).toBeInTheDocument()
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument()

      // Should not show any action buttons
      expect(screen.queryByRole('button', { name: /iniciar/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /finalizar/i })).not.toBeInTheDocument()
    })

    test('should show compliance score and status', async () => {
      mockSessionApi.getSessionStatus.mockResolvedValue({
        data: {
          ...mockSession,
          status: {
            compliance_status: 'compliant',
            warnings: [],
            requires_attention: false
          }
        }
      })

      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      await waitFor(() => {
        const complianceScore = screen.getByTestId('compliance-score')
        expect(complianceScore).toHaveTextContent('Conforme')
        expect(complianceScore).toHaveClass('status-compliant')
      })
    })
  })

  describe('3.4 - Real-time Updates', () => {
    test('should update attendance statistics in real-time', async () => {
      const { rerender } = render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      expect(screen.getByText('0% presença')).toBeInTheDocument()

      // Simulate real-time update
      const updatedSession = {
        ...mockSession,
        total_presentes: 20,
        total_ausentes: 5
      }

      rerender(
        <SessionControl
          session={updatedSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      expect(screen.getByText('80% presença')).toBeInTheDocument()
      expect(screen.getByText('20 presentes')).toBeInTheDocument()
      expect(screen.getByText('5 ausentes')).toBeInTheDocument()
    })

    test('should show live connection status', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      const connectionStatus = screen.getByTestId('connection-status')
      expect(connectionStatus).toHaveClass('connected')
    })

    test('should handle connection errors gracefully', async () => {
      // Mock connection error
      const SessionRealtimeManager = require('@/lib/realtime/session-realtime').SessionRealtimeManager
      const mockManager = new SessionRealtimeManager({})
      mockManager.getConnectionStatus = jest.fn().mockReturnValue('error')

      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      // Should show offline indicator
      await waitFor(() => {
        const connectionStatus = screen.getByTestId('connection-status')
        expect(connectionStatus).toHaveClass('error')
      })
    })
  })

  describe('3.5 - Mobile Optimization', () => {
    test('should render mobile-optimized layout on small screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      })

      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
          isMobile={true}
        />
      )

      const mobileLayout = screen.getByTestId('session-control-mobile')
      expect(mobileLayout).toHaveClass('mobile-layout')

      // Should have larger touch targets
      const startButton = screen.getByRole('button', { name: /iniciar aula/i })
      expect(startButton).toHaveClass('touch-target-large')
    })

    test('should support swipe gestures for phase transitions', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
          isMobile={true}
        />
      )

      const swipeArea = screen.getByTestId('swipe-area')
      expect(swipeArea).toBeInTheDocument()

      // Simulate swipe right gesture
      fireEvent.touchStart(swipeArea, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      fireEvent.touchMove(swipeArea, {
        touches: [{ clientX: 200, clientY: 100 }]
      })
      fireEvent.touchEnd(swipeArea)

      // Should trigger phase transition
      await waitFor(() => {
        expect(mockSessionApi.startSession).toHaveBeenCalled()
      })
    })

    test('should show offline sync status for mobile devices', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
          isMobile={true}
        />
      )

      const offlineIndicator = screen.getByTestId('offline-sync-status')
      expect(offlineIndicator).toBeInTheDocument()
    })
  })

  describe('3.6 - Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockSessionApi.startSession.mockRejectedValue(new Error('Network error'))

      const onSessionUpdate = jest.fn()
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={onSessionUpdate}
        />
      )

      const startButton = screen.getByRole('button', { name: /iniciar aula/i })
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByText(/erro ao iniciar aula/i)).toBeInTheDocument()
      })

      // Should not update session on error
      expect(onSessionUpdate).not.toHaveBeenCalled()
    })

    test('should validate permissions before actions', async () => {
      const unauthorizedSession = { ...mockSession, can_modify: false }

      render(
        <SessionControl
          session={unauthorizedSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      // Should disable action buttons
      const startButton = screen.getByRole('button', { name: /iniciar aula/i })
      expect(startButton).toBeDisabled()
    })

    test('should show loading states during actions', async () => {
      // Mock delayed API response
      mockSessionApi.startSession.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockSession }), 1000))
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

      // Should show loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(startButton).toBeDisabled()
    })
  })

  describe('3.7 - Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      const sessionStatus = screen.getByRole('status', { name: /fase da aula/i })
      expect(sessionStatus).toBeInTheDocument()

      const phaseButton = screen.getByRole('button', { name: /iniciar aula/i })
      expect(phaseButton).toHaveAttribute('aria-describedby')
    })

    test('should support keyboard navigation', async () => {
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={jest.fn()}
        />
      )

      const startButton = screen.getByRole('button', { name: /iniciar aula/i })

      // Focus should be manageable via keyboard
      startButton.focus()
      expect(startButton).toHaveFocus()

      // Enter key should trigger action
      fireEvent.keyDown(startButton, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(mockSessionApi.startSession).toHaveBeenCalled()
      })
    })

    test('should announce phase changes to screen readers', async () => {
      const onSessionUpdate = jest.fn()
      render(
        <SessionControl
          session={mockSession}
          user={mockUser}
          onSessionUpdate={onSessionUpdate}
        />
      )

      // Should have live region for announcements
      const liveRegion = screen.getByRole('log', { name: /atualizações da aula/i })
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })
  })
})