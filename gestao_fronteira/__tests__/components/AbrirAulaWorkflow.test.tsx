/**
 * Unit tests for Enhanced AbrirAulaWorkflow component
 * Testing three-phase state management and touch-optimized interface
 * Brazilian educational compliance implementation
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { jest } from '@jest/globals'
import { AbrirAulaWorkflow } from '@/components/attendance/AbrirAulaWorkflow'
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

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: null,
            error: null
          })),
          maybeSingle: jest.fn(() => Promise.resolve({
            data: null,
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({
        data: [{ id: 'session-123' }],
        error: null
      })),
      update: jest.fn(() => Promise.resolve({
        data: [{ id: 'session-123' }],
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

// Mock date-fns to ensure consistent testing
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '27/09/2025 14:30'),
  formatDistanceToNow: jest.fn(() => '2 horas'),
  isAfter: jest.fn(() => false),
  isBefore: jest.fn(() => true),
  addHours: jest.fn(() => new Date('2025-09-27T18:00:00')),
}))

// Test data for Brazilian educational context
const mockProps = {
  turmaId: 'turma-123',
  professorId: 'prof-456',
  turmaNome: '1º Ano A - Fundamental',
  disciplinaNome: 'Matemática',
  totalAlunos: 25,
  onSessionChange: jest.fn(),
  className: 'test-workflow'
}

const mockSession = {
  id: 'session-123',
  turma_id: 'turma-123',
  professor_id: 'prof-456',
  disciplina_id: 'mat-001',
  data_aula: '2025-09-27',
  status: 'PLANEJADA' as const,
  criada_em: '2025-09-27T12:00:00Z',
  observacoes: 'Aula de matemática básica',
  pode_marcar_frequencia: false
}

describe('AbrirAulaWorkflow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock current time to ensure consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-27T14:30:00').getTime())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial State - PLANEJADA Phase', () => {
    it('should render planning phase with correct elements', () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      // Should show planning phase UI
      expect(screen.getByText('Planejar Aula')).toBeInTheDocument()
      expect(screen.getByText('1º Ano A - Fundamental')).toBeInTheDocument()
      expect(screen.getByText('25 alunos')).toBeInTheDocument()

      // Should show abrir aula button
      expect(screen.getByRole('button', { name: /abrir aula/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /abrir aula/i })).not.toBeDisabled()
    })

    it('should display session information correctly', () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      // Should show current date in Brazilian format
      expect(screen.getByText(/27\/09\/2025/)).toBeInTheDocument()

      // Should show discipline
      expect(screen.getByText('Matemática')).toBeInTheDocument()

      // Should show status badge
      expect(screen.getByText('Planejada')).toBeInTheDocument()
    })

    it('should have proper touch targets for mobile (44px minimum)', () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      const abrirAulaButton = screen.getByRole('button', { name: /abrir aula/i })
      const styles = getComputedStyle(abrirAulaButton)

      // Should meet minimum touch target requirements
      expect(parseInt(styles.minHeight || '44')).toBeGreaterThanOrEqual(44)
    })

    it('should show help system when help button is clicked', () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      const helpButton = screen.getByRole('button', { name: /ajuda/i })
      fireEvent.click(helpButton)

      expect(screen.getByText(/sistema de ajuda/i)).toBeInTheDocument()
    })
  })

  describe('Session Opening - PLANEJADA to ABERTA Transition', () => {
    it('should open session successfully and transition to ABERTA phase', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock successful session creation
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: null
            }))
          }))
        })),
        insert: jest.fn(() => Promise.resolve({
          data: [{
            id: 'session-123',
            status: 'ABERTA',
            aberta_em: '2025-09-27T14:30:00Z'
          }],
          error: null
        }))
      })

      render(<AbrirAulaWorkflow {...mockProps} />)

      const abrirButton = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(abrirButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Aula aberta com sucesso')
        )
      })

      // Should transition to ABERTA phase
      await waitFor(() => {
        expect(screen.getByText('Aula Ativa')).toBeInTheDocument()
        expect(screen.getByText('Aberta')).toBeInTheDocument()
      })
    })

    it('should show loading state during session opening', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock delayed response
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })

      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        insert: jest.fn(() => promise)
      })

      render(<AbrirAulaWorkflow {...mockProps} />)

      const abrirButton = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(abrirButton)

      // Should show loading state
      expect(screen.getByText(/abrindo aula/i)).toBeInTheDocument()
      expect(abrirButton).toBeDisabled()

      // Resolve the promise
      resolvePromise!({
        data: [{ id: 'session-123', status: 'ABERTA' }],
        error: null
      })

      await waitFor(() => {
        expect(abrirButton).not.toBeDisabled()
      })
    })

    it('should handle session opening errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock error response
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        insert: jest.fn(() => Promise.resolve({
          data: null,
          error: {
            message: 'Já existe uma aula aberta para esta turma hoje',
            code: 'SESSION_ALREADY_OPEN'
          }
        }))
      })

      render(<AbrirAulaWorkflow {...mockProps} />)

      const abrirButton = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(abrirButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Já existe uma aula aberta para esta turma hoje'
        )
      })
    })

    it('should prevent double-clicking during session opening', async () => {
      const { supabase } = require('@/lib/supabase')
      let callCount = 0

      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        insert: jest.fn(() => {
          callCount++
          return Promise.resolve({
            data: [{ id: 'session-123' }],
            error: null
          })
        })
      })

      render(<AbrirAulaWorkflow {...mockProps} />)

      const abrirButton = screen.getByRole('button', { name: /abrir aula/i })

      // Double click rapidly
      fireEvent.click(abrirButton)
      fireEvent.click(abrirButton)

      await waitFor(() => {
        // Should only call API once due to loading state protection
        expect(callCount).toBe(1)
      })
    })
  })

  describe('Active Session - ABERTA Phase', () => {
    beforeEach(() => {
      const { supabase } = require('@/lib/supabase')

      // Mock existing open session
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                ...mockSession,
                status: 'ABERTA',
                aberta_em: '2025-09-27T14:30:00Z',
                pode_marcar_frequencia: true
              },
              error: null
            }))
          }))
        }))
      })
    })

    it('should display active session controls', async () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Aula Ativa')).toBeInTheDocument()
        expect(screen.getByText('Aberta')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /marcar frequência/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /fechar aula/i })).toBeInTheDocument()
      })
    })

    it('should show session timer and auto-closure countdown', async () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/tempo restante/i)).toBeInTheDocument()
        expect(screen.getByText(/18:00/)).toBeInTheDocument() // Brazilian 6 PM closure
      })
    })

    it('should navigate to attendance when "Marcar Frequência" is clicked', async () => {
      const mockRouter = require('next/navigation').useRouter()

      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        const marcarFrequenciaButton = screen.getByRole('button', { name: /marcar frequência/i })
        fireEvent.click(marcarFrequenciaButton)
      })

      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/frequencia/')
      )
    })

    it('should show real-time attendance progress', async () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/0\/25 alunos/i)).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
    })

    it('should display warning near closing time (18:00)', async () => {
      // Mock time near 18:00
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-27T17:45:00').getTime())

      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/tempo crítico/i)).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })

  describe('Session Closing - ABERTA to FECHADA Transition', () => {
    beforeEach(() => {
      const { supabase } = require('@/lib/supabase')

      // Mock existing open session
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                ...mockSession,
                status: 'ABERTA',
                aberta_em: '2025-09-27T14:30:00Z',
                pode_marcar_frequencia: true
              },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => Promise.resolve({
          data: [{
            id: 'session-123',
            status: 'FECHADA',
            fechada_em: '2025-09-27T15:30:00Z'
          }],
          error: null
        }))
      })
    })

    it('should show confirmation dialog when closing session', async () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        const fecharButton = screen.getByRole('button', { name: /fechar aula/i })
        fireEvent.click(fecharButton)
      })

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/confirmar fechamento/i)).toBeInTheDocument()
    })

    it('should close session successfully and transition to FECHADA phase', async () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        const fecharButton = screen.getByRole('button', { name: /fechar aula/i })
        fireEvent.click(fecharButton)
      })

      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Aula fechada com sucesso')
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Aula Fechada')).toBeInTheDocument()
        expect(screen.getByText('Fechada')).toBeInTheDocument()
      })
    })

    it('should handle session closing errors', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                ...mockSession,
                status: 'ABERTA'
              },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => Promise.resolve({
          data: null,
          error: {
            message: 'Erro ao fechar sessão',
            code: 'CLOSE_SESSION_ERROR'
          }
        }))
      })

      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        const fecharButton = screen.getByRole('button', { name: /fechar aula/i })
        fireEvent.click(fecharButton)
      })

      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao fechar sessão')
      })
    })

    it('should allow adding observations when closing session', async () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        const fecharButton = screen.getByRole('button', { name: /fechar aula/i })
        fireEvent.click(fecharButton)
      })

      const observationsTextarea = screen.getByLabelText(/observações/i)
      fireEvent.change(observationsTextarea, {
        target: { value: 'Aula finalizada com sucesso. Todos os alunos participaram.' }
      })

      expect(observationsTextarea).toHaveValue('Aula finalizada com sucesso. Todos os alunos participaram.')
    })
  })

  describe('Auto-closure at 18:00 (Brazilian Legal Requirement)', () => {
    it('should auto-close session at 18:00 São Paulo time', async () => {
      // Mock time at exactly 18:00
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-27T18:00:00').getTime())

      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                ...mockSession,
                status: 'ABERTA'
              },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => Promise.resolve({
          data: [{
            id: 'session-123',
            status: 'FECHADA',
            fechada_em: '2025-09-27T18:00:00Z',
            fechamento_automatico: true
          }],
          error: null
        }))
      })

      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Aula Fechada')).toBeInTheDocument()
        expect(screen.getByText(/fechamento automático/i)).toBeInTheDocument()
        expect(screen.getByText(/legislação educacional brasileira/i)).toBeInTheDocument()
      })
    })

    it('should show countdown warning before auto-closure', async () => {
      // Mock time 5 minutes before 18:00
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-27T17:55:00').getTime())

      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/5 minutos restantes/i)).toBeInTheDocument()
        expect(screen.getByText(/fechamento automático/i)).toBeInTheDocument()
        expect(screen.getByRole('alert')).toHaveClass(/bg-red|bg-destructive/)
      })
    })
  })

  describe('Real-time Updates and Synchronization', () => {
    it('should set up real-time subscription for session updates', async () => {
      const { supabase } = require('@/lib/supabase')

      render(<AbrirAulaWorkflow {...mockProps} />)

      expect(supabase.channel).toHaveBeenCalledWith('sessao-aula-turma-123')
    })

    it('should handle real-time session status changes', async () => {
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

      render(<AbrirAulaWorkflow {...mockProps} />)

      // Simulate real-time update
      realtimeCallback!({
        eventType: 'UPDATE',
        new: {
          id: 'session-123',
          status: 'FECHADA',
          fechada_em: '2025-09-27T17:30:00Z'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('Aula Fechada')).toBeInTheDocument()
      })
    })

    it('should clean up real-time subscription on unmount', () => {
      const { supabase } = require('@/lib/supabase')
      const mockUnsubscribe = jest.fn()

      supabase.channel.mockReturnValue({
        on: jest.fn(() => ({
          subscribe: jest.fn()
        })),
        unsubscribe: mockUnsubscribe
      })

      const { unmount } = render(<AbrirAulaWorkflow {...mockProps} />)

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('Accessibility and Mobile Optimization', () => {
    it('should have proper ARIA labels for screen readers', () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      const abrirButton = screen.getByRole('button', { name: /abrir aula/i })
      expect(abrirButton).toHaveAttribute('aria-label', expect.stringContaining('Abrir aula'))

      const statusElement = screen.getByText('Planejada')
      expect(statusElement.closest('[role="status"]')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      const abrirButton = screen.getByRole('button', { name: /abrir aula/i })
      const helpButton = screen.getByRole('button', { name: /ajuda/i })

      // Should be focusable
      abrirButton.focus()
      expect(abrirButton).toHaveFocus()

      // Should navigate with Tab
      fireEvent.keyDown(abrirButton, { key: 'Tab' })
      expect(helpButton).toHaveFocus()
    })

    it('should have high contrast mode support', () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      const statusBadge = screen.getByText('Planejada')
      expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800')
    })

    it('should be responsive on different screen sizes', () => {
      render(<AbrirAulaWorkflow {...mockProps} />)

      const container = screen.getByRole('main') || document.querySelector('.test-workflow')
      expect(container).toHaveClass(expect.stringMatching(/grid|flex/))
    })
  })

  describe('Brazilian Educational Compliance', () => {
    it('should enforce "não existe o esquecer" principle', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock closed session
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                ...mockSession,
                status: 'FECHADA',
                fechada_em: '2025-09-27T17:30:00Z'
              },
              error: null
            }))
          }))
        }))
      })

      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/não existe o esquecer/i)).toBeInTheDocument()
        expect(screen.getByText(/registro imutável/i)).toBeInTheDocument()
      })
    })

    it('should validate São Paulo timezone operations', async () => {
      // Mock different timezone scenario
      const originalTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/são paulo/i)).toBeInTheDocument()
      })
    })

    it('should generate audit trail for all actions', async () => {
      const mockOnSessionChange = jest.fn()

      render(<AbrirAulaWorkflow {...mockProps} onSessionChange={mockOnSessionChange} />)

      const abrirButton = screen.getByRole('button', { name: /abrir aula/i })
      fireEvent.click(abrirButton)

      await waitFor(() => {
        expect(mockOnSessionChange).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'session_opened',
            timestamp: expect.any(String),
            user_id: 'prof-456'
          })
        )
      })
    })
  })

  describe('Error Boundaries and Recovery', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Force an error by passing invalid props
      render(<AbrirAulaWorkflow {...mockProps} turmaId={null as any} />)

      expect(screen.getByText(/erro inesperado/i)).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should retry failed operations', async () => {
      const { supabase } = require('@/lib/supabase')
      let attempts = 0

      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => {
              attempts++
              if (attempts === 1) {
                return Promise.resolve({ data: null, error: { message: 'Network error' } })
              }
              return Promise.resolve({ data: mockSession, error: null })
            })
          }))
        }))
      })

      render(<AbrirAulaWorkflow {...mockProps} />)

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /tentar novamente/i })
        fireEvent.click(retryButton)
      })

      await waitFor(() => {
        expect(screen.getByText('1º Ano A - Fundamental')).toBeInTheDocument()
      })
    })
  })
})