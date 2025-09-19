import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AulaStatusIndicatorEnhanced } from '@/components/attendance/aula-status-indicator-enhanced'
import { useAulaRealtime } from '@/hooks/use-aula-realtime'

// Mock the hook
jest.mock('@/hooks/use-aula-realtime')
const mockUseAulaRealtime = useAulaRealtime as jest.MockedFunction<typeof useAulaRealtime>

describe('AulaStatusIndicatorEnhanced', () => {
  const defaultProps = {
    turmaId: 'turma-1',
    professorId: 'prof-1'
  }

  const mockHookReturn = {
    status: null,
    loading: false,
    error: null,
    remainingTime: null,
    refreshStatus: jest.fn(),
    isOpen: false,
    isClosed: false,
    isLocked: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAulaRealtime.mockReturnValue(mockHookReturn)
  })

  describe('Loading state', () => {
    it('should show loading indicator when loading', () => {
      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        loading: true
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText('Carregando...')).toBeInTheDocument()
      expect(screen.getByText('Verificando status da aula...')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })

  describe('No active session', () => {
    it('should show inactive state when no session exists', () => {
      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText('Inativa')).toBeInTheDocument()
      expect(screen.getByText('Nenhuma aula ativa hoje. Abra uma aula para marcar presença.')).toBeInTheDocument()
    })
  })

  describe('Active session (aberta)', () => {
    const mockActiveStatus = {
      id: 'aula-1',
      turma_id: 'turma-1',
      professor_id: 'prof-1',
      status: 'aberta' as const,
      aberta_em: '2024-01-15T09:00:00Z',
      tempo_limite_minutos: 240,
      observacoes: 'Aula de matemática',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T09:00:00Z'
    }

    it('should show active session with remaining time', () => {
      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: mockActiveStatus,
        isOpen: true,
        remainingTime: 180 // 3 hours
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText('Aberta')).toBeInTheDocument()
      expect(screen.getByText('3h 0min')).toBeInTheDocument()
      expect(screen.getByText(/Aula aberta às 06:00 - Frequência disponível/)).toBeInTheDocument()
      expect(screen.getByText(/Tempo limite: 240 minutos • Aula de matemática/)).toBeInTheDocument()
    })

    it('should show warning when time is running out', () => {
      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: mockActiveStatus,
        isOpen: true,
        remainingTime: 10 // 10 minutes left
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText('Atenção:')).toBeInTheDocument()
      expect(screen.getByText(/A aula será travada automaticamente em 10min/)).toBeInTheDocument()
    })

    it('should show time expired when remaining time is 0', () => {
      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: mockActiveStatus,
        isOpen: true,
        remainingTime: 0
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText('Tempo esgotado')).toBeInTheDocument()
    })
  })

  describe('Closed session (fechada)', () => {
    const mockClosedStatus = {
      id: 'aula-1',
      turma_id: 'turma-1',
      professor_id: 'prof-1',
      status: 'fechada' as const,
      aberta_em: '2024-01-15T09:00:00Z',
      fechada_em: '2024-01-15T11:30:00Z',
      tempo_limite_minutos: 240,
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T11:30:00Z'
    }

    it('should show closed session info', () => {
      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: mockClosedStatus,
        isClosed: true
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText('Fechada')).toBeInTheDocument()
      expect(screen.getByText(/Aula fechada às 08:30/)).toBeInTheDocument()
    })
  })

  describe('Locked session (travada)', () => {
    const mockLockedStatus = {
      id: 'aula-1',
      turma_id: 'turma-1',
      professor_id: 'prof-1',
      status: 'travada' as const,
      aberta_em: '2024-01-15T09:00:00Z',
      travada_em: '2024-01-15T13:00:00Z',
      travada_automaticamente: true,
      tempo_limite_minutos: 240,
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T13:00:00Z'
    }

    it('should show locked session with compliance notice', () => {
      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: mockLockedStatus,
        isLocked: true
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText('Travada')).toBeInTheDocument()
      expect(screen.getByText('Aula travada automaticamente por tempo excedido')).toBeInTheDocument()
      expect(screen.getByText('Documento Legal:')).toBeInTheDocument()
      expect(screen.getByText(/Esta frequência está travada e não pode mais ser alterada/)).toBeInTheDocument()
    })

    it('should distinguish between automatic and manual lock', () => {
      const manualLockStatus = { ...mockLockedStatus, travada_automaticamente: false }

      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: manualLockStatus,
        isLocked: true
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText('Aula travada manualmente')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('should show error message when error occurs', () => {
      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        error: 'Database connection failed'
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText('Erro')).toBeInTheDocument()
      expect(screen.getByText('Erro ao verificar status')).toBeInTheDocument()
      expect(screen.getByText('Erro: Database connection failed')).toBeInTheDocument()
    })
  })

  describe('Refresh functionality', () => {
    it('should call refreshStatus when refresh button is clicked', async () => {
      const mockRefreshStatus = jest.fn()
      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        refreshStatus: mockRefreshStatus
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      const refreshButton = screen.getByTitle('Atualizar status')
      fireEvent.click(refreshButton)

      expect(mockRefreshStatus).toHaveBeenCalledTimes(1)
    })
  })

  describe('Status change callback', () => {
    it('should call onStatusChange when provided', () => {
      const onStatusChange = jest.fn()
      const mockStatus = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'aberta' as const,
        aberta_em: '2024-01-15T09:00:00Z',
        tempo_limite_minutos: 240,
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T09:00:00Z'
      }

      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: mockStatus,
        isOpen: true
      })

      render(
        <AulaStatusIndicatorEnhanced
          {...defaultProps}
          onStatusChange={onStatusChange}
        />
      )

      // Verify the hook was called with the callback
      expect(mockUseAulaRealtime).toHaveBeenCalledWith(
        expect.objectContaining({
          onStatusChange,
          onError: expect.any(Function)
        })
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      const mockActiveStatus = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'aberta' as const,
        aberta_em: '2024-01-15T09:00:00Z',
        tempo_limite_minutos: 240,
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T09:00:00Z'
      }

      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: mockActiveStatus,
        isOpen: true,
        remainingTime: 180
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      // Check for refresh button accessibility
      const refreshButton = screen.getByTitle('Atualizar status')
      expect(refreshButton).toBeInTheDocument()
      expect(refreshButton).toHaveAttribute('title', 'Atualizar status')
    })

    it('should use semantic colors for different states', () => {
      const { rerender } = render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      // Test loading state colors
      mockUseAulaRealtime.mockReturnValue({ ...mockHookReturn, loading: true })
      rerender(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      const loadingContainer = screen.getByText('Carregando...').closest('div')
      expect(loadingContainer).toHaveClass('bg-gray-50')

      // Test error state colors
      mockUseAulaRealtime.mockReturnValue({ ...mockHookReturn, error: 'Error' })
      rerender(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      const errorContainer = screen.getByText('Erro').closest('div')?.parentElement
      expect(errorContainer).toHaveClass('bg-red-50')
    })
  })

  describe('Brazilian compliance features', () => {
    it('should show legal compliance notice for locked sessions', () => {
      const mockLockedStatus = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'travada' as const,
        aberta_em: '2024-01-15T09:00:00Z',
        tempo_limite_minutos: 240,
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T09:00:00Z'
      }

      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: mockLockedStatus,
        isLocked: true
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      expect(screen.getByText(/legislação educacional brasileira/)).toBeInTheDocument()
    })

    it('should use Brazilian Portuguese time format', () => {
      const mockStatus = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'aberta' as const,
        aberta_em: '2024-01-15T14:30:00Z', // 2:30 PM UTC
        tempo_limite_minutos: 240,
        created_at: '2024-01-15T14:30:00Z',
        updated_at: '2024-01-15T14:30:00Z'
      }

      mockUseAulaRealtime.mockReturnValue({
        ...mockHookReturn,
        status: mockStatus,
        isOpen: true
      })

      render(<AulaStatusIndicatorEnhanced {...defaultProps} />)

      // Should display time in Brazilian format (24-hour)
      expect(screen.getByText(/às 11:30/)).toBeInTheDocument()
    })
  })
})