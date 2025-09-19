import { renderHook, act } from '@testing-library/react'
import { useAulaRealtime } from '@/hooks/use-aula-realtime'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    maybeSingle: jest.fn()
                  }))
                }))
              }))
            }))
          }))
        }))
      }))
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn()
      }))
    })),
    removeChannel: jest.fn()
  }
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('useAulaRealtime', () => {
  const defaultProps = {
    turmaId: 'turma-1',
    professorId: 'prof-1'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Basic functionality', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      expect(result.current.loading).toBe(true)
      expect(result.current.status).toBe(null)
      expect(result.current.error).toBe(null)
    })

    it('should fetch aula status on mount', async () => {
      const mockData = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'aberta',
        aberta_em: new Date().toISOString(),
        tempo_limite_minutos: 240
      }

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.status).toEqual(mockData)
      expect(result.current.isOpen).toBe(true)
    })

    it('should handle no active session', async () => {
      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.status).toBe(null)
      expect(result.current.isOpen).toBe(false)
    })

    it('should handle API errors', async () => {
      const mockError = new Error('Database error')
      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Database error')
    })
  })

  describe('Real-time subscriptions', () => {
    it('should setup subscription when enableAutoRefresh is true', () => {
      const mockChannel = {
        on: jest.fn(() => ({
          subscribe: jest.fn()
        }))
      }
      mockSupabase.channel.mockReturnValue(mockChannel)

      renderHook(() => useAulaRealtime({ ...defaultProps, enableAutoRefresh: true }))

      expect(mockSupabase.channel).toHaveBeenCalledWith('aulas_abertas:turma_id=eq.turma-1')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'aulas_abertas',
          filter: 'turma_id=eq.turma-1'
        }),
        expect.any(Function)
      )
    })

    it('should not setup subscription when enableAutoRefresh is false', () => {
      renderHook(() => useAulaRealtime({ ...defaultProps, enableAutoRefresh: false }))

      expect(mockSupabase.channel).not.toHaveBeenCalled()
    })

    it('should cleanup subscription on unmount', () => {
      const mockChannel = { on: jest.fn(() => ({ subscribe: jest.fn() })) }
      mockSupabase.channel.mockReturnValue(mockChannel)

      const { unmount } = renderHook(() => useAulaRealtime(defaultProps))

      unmount()

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })
  })

  describe('Time calculations', () => {
    it('should calculate remaining time correctly for active session', async () => {
      const now = new Date()
      const abertaEm = new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
      const mockData = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'aberta',
        aberta_em: abertaEm.toISOString(),
        tempo_limite_minutos: 240 // 4 hours
      }

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.remainingTime).toBe(210) // 240 - 30 = 210 minutes
    })

    it('should return 0 for expired sessions', async () => {
      const now = new Date()
      const abertaEm = new Date(now.getTime() - 5 * 60 * 60 * 1000) // 5 hours ago
      const mockData = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'aberta',
        aberta_em: abertaEm.toISOString(),
        tempo_limite_minutos: 240 // 4 hours
      }

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.remainingTime).toBe(0)
    })

    it('should return null for non-active sessions', async () => {
      const mockData = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'fechada',
        aberta_em: new Date().toISOString(),
        tempo_limite_minutos: 240
      }

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.remainingTime).toBe(null)
    })
  })

  describe('Status helpers', () => {
    it('should provide correct status helpers for open session', async () => {
      const mockData = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'aberta',
        aberta_em: new Date().toISOString(),
        tempo_limite_minutos: 240
      }

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.isClosed).toBe(false)
      expect(result.current.isLocked).toBe(false)
    })

    it('should provide correct status helpers for closed session', async () => {
      const mockData = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'fechada',
        aberta_em: new Date().toISOString(),
        tempo_limite_minutos: 240
      }

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isOpen).toBe(false)
      expect(result.current.isClosed).toBe(true)
      expect(result.current.isLocked).toBe(false)
    })

    it('should provide correct status helpers for locked session', async () => {
      const mockData = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'travada',
        aberta_em: new Date().toISOString(),
        tempo_limite_minutos: 240
      }

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isOpen).toBe(false)
      expect(result.current.isClosed).toBe(false)
      expect(result.current.isLocked).toBe(true)
    })
  })

  describe('Callbacks', () => {
    it('should call onStatusChange when status updates', async () => {
      const onStatusChange = jest.fn()
      const mockData = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'aberta',
        aberta_em: new Date().toISOString(),
        tempo_limite_minutos: 240
      }

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: mockData, error: null })

      renderHook(() => useAulaRealtime({ ...defaultProps, onStatusChange }))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(onStatusChange).toHaveBeenCalledWith(mockData)
    })

    it('should call onError when error occurs', async () => {
      const onError = jest.fn()
      const mockError = new Error('Database error')

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockRejectedValueOnce(mockError)

      renderHook(() => useAulaRealtime({ ...defaultProps, onError }))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(onError).toHaveBeenCalledWith('Database error')
    })
  })

  describe('Refresh functionality', () => {
    it('should allow manual refresh', async () => {
      const mockData = {
        id: 'aula-1',
        turma_id: 'turma-1',
        professor_id: 'prof-1',
        status: 'aberta',
        aberta_em: new Date().toISOString(),
        tempo_limite_minutos: 240
      }

      mockSupabase.from().select().eq().eq().gte().lt().order().limit().maybeSingle
        .mockResolvedValueOnce({ data: mockData, error: null })
        .mockResolvedValueOnce({ data: { ...mockData, status: 'fechada' }, error: null })

      const { result } = renderHook(() => useAulaRealtime(defaultProps))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isOpen).toBe(true)

      await act(async () => {
        result.current.refreshStatus()
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isClosed).toBe(true)
    })
  })
})