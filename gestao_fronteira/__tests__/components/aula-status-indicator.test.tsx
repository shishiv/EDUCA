/**
 * Unit tests for AulaStatusIndicator component
 * Testing real-time status updates and Brazilian educational compliance
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { AulaStatusIndicator } from '@/components/attendance/aula-status-indicator'

// Mock the Supabase real-time subscription
const mockSupabase = {
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn()
  })),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({
          data: null,
          error: null
        }))
      }))
    }))
  }))
}

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

describe('AulaStatusIndicator Component', () => {
  const defaultProps = {
    aulaId: 'aula-123',
    turmaId: 'turma-456',
    professorId: 'prof-789',
    className: 'test-class'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should render loading state initially', () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      expect(screen.getByText(/carregando status/i)).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      const container = screen.getByTestId('aula-status-indicator')
      expect(container).toHaveClass('test-class')
    })
  })

  describe('Status Display - Aula Não Aberta', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { code: 'PGRST116' } // Not found
            }))
          }))
        }))
      })
    })

    it('should show "Aula não aberta" when no session exists', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/aula não aberta/i)).toBeInTheDocument()
        expect(screen.getByText(/nenhuma sessão ativa/i)).toBeInTheDocument()
      })
    })

    it('should show appropriate icon for closed status', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        const lockIcon = document.querySelector('svg[data-testid="lock-icon"]')
        expect(lockIcon).toBeInTheDocument()
      })
    })

    it('should have gray styling for inactive status', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        const statusBadge = screen.getByTestId('status-badge')
        expect(statusBadge).toHaveClass('bg-gray-100')
      })
    })
  })

  describe('Status Display - Aula Aberta', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'aula-123',
                status: 'aberta',
                aberta_em: '2024-01-15T14:30:00Z',
                fechada_em: null,
                travada_em: null,
                tempo_limite_minutos: 30
              },
              error: null
            }))
          }))
        }))
      })
    })

    it('should show "Aula Aberta" when session is active', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/aula aberta/i)).toBeInTheDocument()
        expect(screen.getByText(/frequência liberada/i)).toBeInTheDocument()
      })
    })

    it('should show unlock icon for open status', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        const unlockIcon = document.querySelector('svg[data-testid="unlock-icon"]')
        expect(unlockIcon).toBeInTheDocument()
      })
    })

    it('should display opening time', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/aberta às 14:30/i)).toBeInTheDocument()
      })
    })

    it('should have green styling for active status', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        const statusBadge = screen.getByTestId('status-badge')
        expect(statusBadge).toHaveClass('bg-green-100')
      })
    })
  })

  describe('Status Display - Aula Fechada', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'aula-123',
                status: 'fechada',
                aberta_em: '2024-01-15T14:30:00Z',
                fechada_em: '2024-01-15T15:20:00Z',
                travada_em: null,
                tempo_limite_minutos: 30
              },
              error: null
            }))
          }))
        }))
      })
    })

    it('should show "Aula Fechada" when session is closed', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/aula fechada/i)).toBeInTheDocument()
        expect(screen.getByText(/aguardando travamento/i)).toBeInTheDocument()
      })
    })

    it('should display remaining time for modifications', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        // Time calculation will be based on fechada_em + tempo_limite_minutos
        expect(screen.getByText(/tempo para alterações/i)).toBeInTheDocument()
      })
    })

    it('should have yellow styling for pending lock status', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        const statusBadge = screen.getByTestId('status-badge')
        expect(statusBadge).toHaveClass('bg-yellow-100')
      })
    })
  })

  describe('Status Display - Aula Travada', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'aula-123',
                status: 'travada',
                aberta_em: '2024-01-15T14:30:00Z',
                fechada_em: '2024-01-15T15:20:00Z',
                travada_em: '2024-01-15T15:50:00Z',
                tempo_limite_minutos: 30
              },
              error: null
            }))
          }))
        }))
      })
    })

    it('should show "Aula Travada" when session is locked', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/aula travada/i)).toBeInTheDocument()
        expect(screen.getByText(/registro imutável/i)).toBeInTheDocument()
      })
    })

    it('should display lock time', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/travada às 15:50/i)).toBeInTheDocument()
      })
    })

    it('should have red styling for locked status', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        const statusBadge = screen.getByTestId('status-badge')
        expect(statusBadge).toHaveClass('bg-red-100')
      })
    })

    it('should show Brazilian compliance notice', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/documento oficial/i)).toBeInTheDocument()
        expect(screen.getByText(/legislação educacional brasileira/i)).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should set up Supabase channel subscription on mount', () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      expect(mockSupabase.channel).toHaveBeenCalledWith('aula-status-aula-123')
    })

    it('should listen for postgres changes on aulas_abertas table', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn()
      }

      mockSupabase.channel.mockReturnValue(mockChannel)

      render(<AulaStatusIndicator {...defaultProps} />)

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aulas_abertas',
          filter: 'id=eq.aula-123'
        },
        expect.any(Function)
      )
    })

    it('should unsubscribe from channel on unmount', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn()
      }

      mockSupabase.channel.mockReturnValue(mockChannel)

      const { unmount } = render(<AulaStatusIndicator {...defaultProps} />)

      unmount()

      expect(mockChannel.unsubscribe).toHaveBeenCalled()
    })

    it('should handle real-time status updates', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn()
      }

      let changeCallback: Function

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (event === 'postgres_changes') {
          changeCallback = callback
        }
        return mockChannel
      })

      mockSupabase.channel.mockReturnValue(mockChannel)

      render(<AulaStatusIndicator {...defaultProps} />)

      // Simulate real-time update
      if (changeCallback) {
        changeCallback({
          eventType: 'UPDATE',
          new: {
            id: 'aula-123',
            status: 'fechada',
            aberta_em: '2024-01-15T14:30:00Z',
            fechada_em: '2024-01-15T15:20:00Z'
          }
        })
      }

      await waitFor(() => {
        expect(screen.getByText(/aula fechada/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Network error' }
            }))
          }))
        }))
      })

      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar status/i)).toBeInTheDocument()
      })
    })

    it('should show retry option on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Network error' }
            }))
          }))
        }))
      })

      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        const indicator = screen.getByTestId('aula-status-indicator')
        expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('Status da aula'))
      })
    })

    it('should update screen reader text when status changes', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'aula-123',
                status: 'aberta',
                aberta_em: '2024-01-15T14:30:00Z'
              },
              error: null
            }))
          }))
        }))
      })

      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        const srText = screen.getByTestId('sr-status-text')
        expect(srText).toHaveTextContent(/aula aberta/i)
      })
    })
  })

  describe('Time Calculations', () => {
    it('should calculate remaining time correctly for closed sessions', async () => {
      // Mock current time to be before lock time
      const mockDate = new Date('2024-01-15T15:25:00Z') // 25 minutes after close
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'aula-123',
                status: 'fechada',
                fechada_em: '2024-01-15T15:20:00Z',
                tempo_limite_minutos: 30
              },
              error: null
            }))
          }))
        }))
      })

      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/5 minutos/i)).toBeInTheDocument()
      })

      jest.restoreAllMocks()
    })

    it('should show "tempo esgotado" when lock time has passed', async () => {
      // Mock current time to be after lock time
      const mockDate = new Date('2024-01-15T16:00:00Z') // 1 hour after close
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'aula-123',
                status: 'fechada',
                fechada_em: '2024-01-15T15:20:00Z',
                tempo_limite_minutos: 30
              },
              error: null
            }))
          }))
        }))
      })

      render(<AulaStatusIndicator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/tempo esgotado/i)).toBeInTheDocument()
      })

      jest.restoreAllMocks()
    })
  })
})