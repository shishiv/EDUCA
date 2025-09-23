/**
 * Comprehensive tests for SessionRealtimeManager
 * Task 5.1: Write tests for Supabase real-time subscriptions
 */

import { jest } from '@jest/globals'
import {
  SessionRealtimeManager,
  type SessionRealtimeData,
  type AttendanceRealtimeData,
  type SessionRealtimeCallbacks,
  type AttendanceStats
} from '@/lib/realtime/session-realtime'

// Mock Supabase
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn()
}

const mockSupabase = {
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(),
  realtime: {
    onOpen: jest.fn(),
    onClose: jest.fn(),
    onError: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({
          data: {
            total_alunos: 25,
            turmas: { matriculas: { count: 25 } }
          },
          error: null
        }))
      }))
    }))
  }))
}

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

describe('SessionRealtimeManager', () => {
  let manager: SessionRealtimeManager
  let callbacks: SessionRealtimeCallbacks

  beforeEach(() => {
    jest.clearAllMocks()
    callbacks = {
      onSessionUpdate: jest.fn(),
      onAttendanceUpdate: jest.fn(),
      onSessionLocked: jest.fn(),
      onAttendanceStats: jest.fn(),
      onError: jest.fn(),
      onConnectionStatus: jest.fn()
    }
    manager = new SessionRealtimeManager(callbacks)
  })

  afterEach(() => {
    manager.unsubscribeAll()
  })

  describe('Subscription Management', () => {
    it('should create session subscription with correct filter', () => {
      const filter = {
        professor_id: 'prof-123',
        turma_id: 'turma-456'
      }

      const channelName = manager.subscribeToSessions(filter)

      expect(channelName).toBe('session-updates-professor_id-prof-123_turma_id-turma-456')
      expect(mockSupabase.channel).toHaveBeenCalledWith(channelName)
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aula_sessions',
          filter: 'professor_id=eq.prof-123 and turma_id=eq.turma-456'
        },
        expect.any(Function)
      )
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should create attendance subscription for session IDs', () => {
      const sessionIds = ['session-1', 'session-2']

      const channelName = manager.subscribeToAttendance(sessionIds)

      expect(channelName).toBe('attendance-updates-session-1-session-2')
      expect(mockSupabase.channel).toHaveBeenCalledWith(channelName)
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'frequencia',
          filter: 'session_id=in.(session-1,session-2)'
        },
        expect.any(Function)
      )
    })

    it('should create dashboard subscription for school', () => {
      const escolaId = 'escola-123'

      const channelName = manager.subscribeToDashboard(escolaId)

      expect(channelName).toBe('dashboard-escola-123')
      expect(mockSupabase.channel).toHaveBeenCalledWith(channelName)
      expect(mockChannel.on).toHaveBeenCalledTimes(2) // Both sessions and attendance
    })

    it('should not create duplicate subscriptions', () => {
      const filter = { professor_id: 'prof-123' }

      // Subscribe twice
      const channelName1 = manager.subscribeToSessions(filter)
      const channelName2 = manager.subscribeToSessions(filter)

      expect(channelName1).toBe(channelName2)
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1)
    })

    it('should unsubscribe from specific channel', () => {
      const filter = { professor_id: 'prof-123' }
      const channelName = manager.subscribeToSessions(filter)

      manager.unsubscribe(channelName)

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })

    it('should unsubscribe from all channels', () => {
      const filter1 = { professor_id: 'prof-123' }
      const filter2 = { professor_id: 'prof-456' }

      manager.subscribeToSessions(filter1)
      manager.subscribeToSessions(filter2)

      manager.unsubscribeAll()

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2)
      expect(callbacks.onConnectionStatus).toHaveBeenCalledWith('disconnected')
    })
  })

  describe('Real-time Event Handling', () => {
    it('should handle session INSERT events', () => {
      const filter = { professor_id: 'prof-123' }
      manager.subscribeToSessions(filter)

      // Get the subscription handler
      const subscriptionHandler = mockChannel.on.mock.calls[0][2]

      const sessionData: SessionRealtimeData = {
        id: 'session-1',
        turma_id: 'turma-1',
        professor_id: 'prof-123',
        data_aula: '2025-09-22',
        fase: 'chamada',
        bloqueado: false,
        total_alunos: 25,
        total_presentes: 0,
        total_ausentes: 0,
        updated_at: new Date().toISOString()
      }

      subscriptionHandler({
        eventType: 'INSERT',
        new: sessionData,
        old: null
      })

      expect(callbacks.onSessionUpdate).toHaveBeenCalledWith(sessionData, 'INSERT')
    })

    it('should handle session UPDATE events with locking detection', () => {
      const filter = { professor_id: 'prof-123' }
      manager.subscribeToSessions(filter)

      const subscriptionHandler = mockChannel.on.mock.calls[0][2]

      const oldSession: SessionRealtimeData = {
        id: 'session-1',
        turma_id: 'turma-1',
        professor_id: 'prof-123',
        data_aula: '2025-09-22',
        fase: 'chamada',
        bloqueado: false,
        total_alunos: 25,
        total_presentes: 10,
        total_ausentes: 5,
        updated_at: new Date().toISOString()
      }

      const newSession: SessionRealtimeData = {
        ...oldSession,
        bloqueado: true,
        bloqueado_em: new Date().toISOString(),
        fase: 'bloqueada'
      }

      subscriptionHandler({
        eventType: 'UPDATE',
        new: newSession,
        old: oldSession
      })

      expect(callbacks.onSessionUpdate).toHaveBeenCalledWith(newSession, 'UPDATE')
      expect(callbacks.onSessionLocked).toHaveBeenCalledWith(
        newSession.id,
        newSession.bloqueado_em
      )
    })

    it('should handle session DELETE events', () => {
      const filter = { professor_id: 'prof-123' }
      manager.subscribeToSessions(filter)

      const subscriptionHandler = mockChannel.on.mock.calls[0][2]

      const sessionData: SessionRealtimeData = {
        id: 'session-1',
        turma_id: 'turma-1',
        professor_id: 'prof-123',
        data_aula: '2025-09-22',
        fase: 'chamada',
        bloqueado: false,
        total_alunos: 25,
        total_presentes: 10,
        total_ausentes: 5,
        updated_at: new Date().toISOString()
      }

      subscriptionHandler({
        eventType: 'DELETE',
        new: null,
        old: sessionData
      })

      expect(callbacks.onSessionUpdate).toHaveBeenCalledWith(sessionData, 'DELETE')
    })

    it('should handle attendance events and trigger stats update', async () => {
      const sessionIds = ['session-1']
      manager.subscribeToAttendance(sessionIds)

      const subscriptionHandler = mockChannel.on.mock.calls[0][2]

      const attendanceData: AttendanceRealtimeData = {
        id: 'att-1',
        session_id: 'session-1',
        aluno_id: 'aluno-1',
        presente: true,
        is_locked: false,
        updated_at: new Date().toISOString()
      }

      // Mock attendance data for stats calculation
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          { presente: true },
          { presente: true },
          { presente: false }
        ],
        error: null
      })

      subscriptionHandler({
        eventType: 'INSERT',
        new: attendanceData,
        old: null
      })

      expect(callbacks.onAttendanceUpdate).toHaveBeenCalledWith(attendanceData, 'INSERT')

      // Wait for async stats update
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(callbacks.onAttendanceStats).toHaveBeenCalledWith('session-1', {
        total_students: 25,
        present_count: 2,
        absent_count: 1,
        pending_count: 22,
        completion_percentage: 12
      })
    })

    it('should handle subscription errors gracefully', () => {
      const filter = { professor_id: 'prof-123' }
      manager.subscribeToSessions(filter)

      // Simulate subscription error
      const subscriptionCallback = mockChannel.subscribe.mock.calls[0][0]
      subscriptionCallback('CHANNEL_ERROR')

      expect(callbacks.onConnectionStatus).toHaveBeenCalledWith('error')
    })

    it('should handle subscription timeout gracefully', () => {
      const filter = { professor_id: 'prof-123' }
      manager.subscribeToSessions(filter)

      // Simulate subscription timeout
      const subscriptionCallback = mockChannel.subscribe.mock.calls[0][0]
      subscriptionCallback('TIMED_OUT')

      expect(callbacks.onConnectionStatus).toHaveBeenCalledWith('error')
    })
  })

  describe('Connection Management', () => {
    it('should handle successful subscription', () => {
      const filter = { professor_id: 'prof-123' }
      manager.subscribeToSessions(filter)

      // Simulate successful subscription
      const subscriptionCallback = mockChannel.subscribe.mock.calls[0][0]
      subscriptionCallback('SUBSCRIBED')

      expect(callbacks.onConnectionStatus).toHaveBeenCalledWith('connected')
    })

    it('should track connection status correctly', () => {
      expect(manager.getConnectionStatus()).toBe('disconnected')

      const filter = { professor_id: 'prof-123' }
      manager.subscribeToSessions(filter)

      // Simulate successful subscription
      const subscriptionCallback = mockChannel.subscribe.mock.calls[0][0]
      subscriptionCallback('SUBSCRIBED')

      expect(manager.getConnectionStatus()).toBe('connected')
    })

    it('should setup connection monitoring on initialization', () => {
      expect(mockSupabase.realtime.onOpen).toHaveBeenCalled()
      expect(mockSupabase.realtime.onClose).toHaveBeenCalled()
      expect(mockSupabase.realtime.onError).toHaveBeenCalled()
    })

    it('should handle realtime connection open', () => {
      const onOpenCallback = mockSupabase.realtime.onOpen.mock.calls[0][0]
      onOpenCallback()

      expect(callbacks.onConnectionStatus).toHaveBeenCalledWith('connected')
    })

    it('should handle realtime connection close', () => {
      const onCloseCallback = mockSupabase.realtime.onClose.mock.calls[0][0]
      onCloseCallback()

      expect(callbacks.onConnectionStatus).toHaveBeenCalledWith('disconnected')
    })

    it('should handle realtime connection errors', () => {
      const onErrorCallback = mockSupabase.realtime.onError.mock.calls[0][0]
      const error = new Error('Connection failed')
      onErrorCallback(error)

      expect(callbacks.onConnectionStatus).toHaveBeenCalledWith('error')
      expect(callbacks.onError).toHaveBeenCalledWith(new Error('Realtime connection error'))
    })

    it('should attempt reconnection on connection close', (done) => {
      jest.useFakeTimers()

      const onCloseCallback = mockSupabase.realtime.onClose.mock.calls[0][0]
      onCloseCallback()

      // Fast-forward timers to trigger reconnection
      setTimeout(() => {
        expect(callbacks.onConnectionStatus).toHaveBeenCalledWith('disconnected')
        done()
      }, 1000)

      jest.advanceTimersByTime(1000)
      jest.useRealTimers()
    })
  })

  describe('Broadcasting', () => {
    it('should broadcast session updates successfully', async () => {
      const mockBroadcastChannel = {
        send: jest.fn().mockResolvedValue(undefined)
      }
      mockSupabase.channel.mockReturnValue(mockBroadcastChannel)

      await manager.broadcastSessionUpdate('session-1', 'status_change', {
        status: 'fechada'
      })

      expect(mockSupabase.channel).toHaveBeenCalledWith('session-broadcast-session-1')
      expect(mockBroadcastChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'status_change',
        payload: {
          session_id: 'session-1',
          timestamp: expect.any(String),
          data: { status: 'fechada' }
        }
      })
    })

    it('should handle broadcast errors', async () => {
      const mockBroadcastChannel = {
        send: jest.fn().mockRejectedValue(new Error('Broadcast failed'))
      }
      mockSupabase.channel.mockReturnValue(mockBroadcastChannel)

      await manager.broadcastSessionUpdate('session-1', 'status_change')

      expect(callbacks.onError).toHaveBeenCalledWith(new Error('Broadcast failed'))
    })

    it('should subscribe to broadcast messages', () => {
      const onMessage = jest.fn()
      const mockBroadcastChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
      }
      mockSupabase.channel.mockReturnValue(mockBroadcastChannel)

      const channelName = manager.subscribeToBroadcast('session-1', onMessage)

      expect(channelName).toBe('broadcast-session-1')
      expect(mockBroadcastChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: '*' },
        expect.any(Function)
      )
      expect(mockBroadcastChannel.subscribe).toHaveBeenCalled()
    })
  })

  describe('Filter Generation', () => {
    it('should generate correct filter for complex session criteria', () => {
      const filter = {
        escola_id: 'escola-123',
        professor_id: 'prof-456',
        data_aula: '2025-09-22',
        fase: ['chamada', 'finalizada']
      }

      const channelName = manager.subscribeToSessions(filter)

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          filter: 'turma_id=in.(select id from turmas where escola_id=eq.escola-123) and professor_id=eq.prof-456 and data_aula=eq.2025-09-22 and fase=in.(chamada,finalizada)'
        }),
        expect.any(Function)
      )
    })

    it('should handle empty filters', () => {
      const filter = {}

      manager.subscribeToSessions(filter)

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          filter: ''
        }),
        expect.any(Function)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle errors in session change processing', () => {
      const filter = { professor_id: 'prof-123' }
      manager.subscribeToSessions(filter)

      const subscriptionHandler = mockChannel.on.mock.calls[0][2]

      // Cause error by calling callback with invalid data
      callbacks.onSessionUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })

      subscriptionHandler({
        eventType: 'INSERT',
        new: { id: 'session-1' }, // Invalid session data
        old: null
      })

      expect(callbacks.onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle errors in attendance stats calculation', async () => {
      const sessionIds = ['session-1']
      manager.subscribeToAttendance(sessionIds)

      const subscriptionHandler = mockChannel.on.mock.calls[0][2]

      // Mock database error
      mockSupabase.from().select().eq().mockRejectedValueOnce(new Error('Database error'))

      const attendanceData: AttendanceRealtimeData = {
        id: 'att-1',
        session_id: 'session-1',
        aluno_id: 'aluno-1',
        presente: true,
        is_locked: false,
        updated_at: new Date().toISOString()
      }

      subscriptionHandler({
        eventType: 'INSERT',
        new: attendanceData,
        old: null
      })

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 0))

      // Should not crash and should still call attendance update
      expect(callbacks.onAttendanceUpdate).toHaveBeenCalledWith(attendanceData, 'INSERT')
    })
  })

  describe('Memory Management', () => {
    it('should cleanup subscriptions properly', () => {
      const filter1 = { professor_id: 'prof-123' }
      const filter2 = { turma_id: 'turma-456' }

      manager.subscribeToSessions(filter1)
      manager.subscribeToAttendance(['session-1'])
      manager.subscribeToDashboard('escola-123')

      expect(mockSupabase.channel).toHaveBeenCalledTimes(3)

      manager.unsubscribeAll()

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(3)
    })

    it('should handle subscription cleanup on manager destruction', () => {
      const filter = { professor_id: 'prof-123' }
      manager.subscribeToSessions(filter)

      // Simulate manager cleanup
      manager.unsubscribeAll()

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })
  })
})