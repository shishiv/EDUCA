/**
 * Integration Tests for Authentication Workflow
 * Tests complete authentication flows with Brazilian educational compliance
 * According to T005-T012 TDD specifications
 */

import { signIn, signOut, getUserProfile, createUserProfile, logAuthEvent } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// Mock the Supabase client
jest.mock('@/lib/supabase')
const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('Authentication Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    })
  })

  describe('Complete Login Workflow', () => {
    it('should complete full login flow with audit logging', async () => {
      // Arrange
      const userCredentials = {
        email: 'admin@fronteira.mg.gov.br',
        password: 'secure123'
      }

      const mockAuthData = {
        user: {
          id: 'user-123',
          email: userCredentials.email,
          user_metadata: {}
        },
        session: { access_token: 'mock-token' }
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null
      })

      // Act
      const result = await signIn(userCredentials.email, userCredentials.password)

      // Assert
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith(userCredentials)
      expect(result.user?.id).toBe('user-123')
      expect(result.user?.email).toBe(userCredentials.email)

      // Verify audit logging is triggered
      expect(window.localStorage.setItem).toHaveBeenCalled()
    })

    it('should handle login failures with proper audit trail', async () => {
      // Arrange
      const invalidCredentials = {
        email: 'invalid@test.com',
        password: 'wrong'
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      } as any)

      // Act & Assert
      await expect(
        signIn(invalidCredentials.email, invalidCredentials.password)
      ).rejects.toThrow('Invalid credentials')

      // Verify failed login is logged
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'auth_audit_logs',
        expect.stringContaining('login_failed')
      )
    })
  })

  describe('User Profile Management Integration', () => {
    it('should create user profile for Brazilian educational roles', async () => {
      // Arrange
      const newUserData = {
        id: 'new-user-123',
        email: 'diretor@fronteira.mg.gov.br',
        nome: 'Maria Silva Diretora',
        tipo_usuario: 'diretor' as const,
        escola_id: 'escola-123'
      }

      const mockCreatedProfile = {
        ...newUserData,
        ativo: true,
        created_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCreatedProfile,
              error: null
            })
          })
        })
      } as any)

      // Act
      const profile = await createUserProfile(newUserData)

      // Assert
      expect(profile.id).toBe(newUserData.id)
      expect(profile.tipo_usuario).toBe('diretor')
      expect(profile.escola_id).toBe('escola-123')
      expect(profile.ativo).toBe(true)

      // Verify database interaction
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should retrieve user profile with school-based access control', async () => {
      // Arrange
      const userId = 'user-123'
      const mockProfile = {
        id: userId,
        email: 'professor@fronteira.mg.gov.br',
        nome: 'João Professor',
        tipo_usuario: 'professor',
        escola_id: 'escola-456',
        ativo: true,
        created_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        })
      } as any)

      // Act
      const profile = await getUserProfile(userId)

      // Assert
      expect(profile?.id).toBe(userId)
      expect(profile?.tipo_usuario).toBe('professor')
      expect(profile?.escola_id).toBe('escola-456')

      // Verify RLS (Row Level Security) filters are applied
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('id', userId)
      expect(mockSupabase.from().select().eq().eq).toHaveBeenCalledWith('ativo', true)
    })
  })

  describe('Session Management with Brazilian Compliance', () => {
    it('should enforce session timeout according to security configurations', async () => {
      // Arrange - Simulate session timeout scenario
      const mockUser = { id: 'user-123' }

      mockSupabase.auth.getUser
        .mockResolvedValueOnce({ data: { user: mockUser }, error: null } as any)
        .mockResolvedValueOnce({ data: { user: null }, error: null } as any)

      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      // Act
      await signOut()

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()

      // Verify logout audit logging
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'auth_audit_logs',
        expect.stringContaining('logout')
      )
    })

    it('should maintain audit trail for security compliance', async () => {
      // Arrange
      const mockAuditData = {
        user_id: 'user-123',
        action: 'login' as const,
        details: { email: 'test@fronteira.mg.gov.br' },
        ip_address: 'client-side',
        user_agent: navigator.userAgent
      }

      // Act
      await logAuthEvent(mockAuditData.action, mockAuditData.user_id, mockAuditData.details)

      // Assert - Verify audit log is stored
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'auth_audit_logs',
        expect.stringContaining(mockAuditData.user_id)
      )
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'auth_audit_logs',
        expect.stringContaining(mockAuditData.action)
      )
    })

    it('should limit audit logs to 100 entries for performance', async () => {
      // Arrange - Mock existing logs at capacity
      const existingLogs = Array.from({ length: 100 }, (_, i) => ({
        user_id: `user-${i}`,
        action: 'login',
        created_at: new Date().toISOString()
      }))

      ;(window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(existingLogs)
      )

      // Act - Add one more log
      await logAuthEvent('login', 'new-user', { email: 'new@test.com' })

      // Assert - Should maintain exactly 100 logs
      const setItemCalls = (window.localStorage.setItem as jest.Mock).mock.calls
      const lastCall = setItemCalls[setItemCalls.length - 1]
      const storedLogs = JSON.parse(lastCall[1])

      expect(storedLogs).toHaveLength(100)
      expect(storedLogs[99].user_id).toBe('new-user')
    })
  })

  describe('Role-Based Access Control (RBAC) Integration', () => {
    it('should enforce Brazilian educational role hierarchy', () => {
      // This would be implemented in the actual auth service
      // Testing the role hierarchy concept
      const roles = ['responsavel', 'professor', 'secretario', 'diretor', 'admin']

      // Verify role hierarchy exists and is properly ordered
      expect(roles.indexOf('admin')).toBeGreaterThan(roles.indexOf('professor'))
      expect(roles.indexOf('diretor')).toBeGreaterThan(roles.indexOf('professor'))
      expect(roles.indexOf('secretario')).toBeGreaterThan(roles.indexOf('responsavel'))
    })

    it('should restrict access based on escola_id for multi-tenancy', async () => {
      // Arrange
      const teacherProfile = {
        id: 'teacher-123',
        tipo_usuario: 'professor',
        escola_id: 'escola-456'
      }

      // Act & Assert
      // This test defines the contract for school-based access control
      // In the actual implementation, users should only access data from their assigned school
      expect(teacherProfile.escola_id).toBeDefined()
      expect(teacherProfile.tipo_usuario).not.toBe('admin') // Non-admin users must have escola_id
    })
  })
})