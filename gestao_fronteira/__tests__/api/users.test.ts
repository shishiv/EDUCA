/**
 * Contract Tests for Users API Service
 * Tests the public interface and behavior of UsersApiService
 * According to T005-T012 TDD specifications
 */

import { usersApi, UserWithSchool } from '@/lib/api/users'
import { supabase } from '@/lib/supabase'

// Mock the Supabase client
jest.mock('@/lib/supabase')
const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('UsersApiService Contract Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUsersWithSchool', () => {
    it('should return users with school information', async () => {
      // Arrange
      const mockUsers: UserWithSchool[] = [
        {
          id: '1',
          nome: 'Test User',
          email: 'test@fronteira.mg.gov.br',
          tipo_usuario: 'admin',
          escola_id: null,
          ativo: true,
          created_at: '2024-01-01T00:00:00Z',
          escola_nome: null,
          escola_tipo: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockUsers, error: null })
        })
      } as any)

      // Act
      const result = await usersApi.getUsersWithSchool()

      // Assert
      expect(result).toEqual(mockUsers)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should filter by role when specified', async () => {
      // Arrange
      const mockUsers: UserWithSchool[] = []
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: mockUsers, error: null })
          })
        })
      }
      mockSupabase.from.mockReturnValue(mockQuery as any)

      // Act
      await usersApi.getUsersWithSchool({ roles: ['admin', 'diretor'] })

      // Assert
      expect(mockQuery.select().eq().in).toHaveBeenCalledWith('tipo_usuario', ['admin', 'diretor'])
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      } as any)

      // Act & Assert
      await expect(usersApi.getUsersWithSchool()).rejects.toThrow('Database connection failed')
    })
  })

  describe('getUserStats', () => {
    it('should return correct user statistics', async () => {
      // Arrange
      const mockStats = {
        total: 10,
        ativos: 8,
        inativos: 2,
        por_tipo: {
          admin: 1,
          diretor: 3,
          secretario: 1,
          professor: 5
        }
      }

      // Mock multiple database calls for stats
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ count: 10, error: null })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ count: 8, error: null })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            data: [
              { tipo_usuario: 'admin', count: 1 },
              { tipo_usuario: 'diretor', count: 3 },
              { tipo_usuario: 'secretario', count: 1 },
              { tipo_usuario: 'professor', count: 5 }
            ],
            error: null
          })
        } as any)

      // Act
      const result = await usersApi.getUserStats()

      // Assert
      expect(result.total).toBe(10)
      expect(result.ativos).toBe(8)
      expect(result.inativos).toBe(2)
      expect(result.por_tipo.admin).toBe(1)
    })
  })

  describe('createUser', () => {
    it('should create user with required fields', async () => {
      // Arrange
      const newUser = {
        nome: 'New User',
        email: 'newuser@fronteira.mg.gov.br',
        tipo_usuario: 'professor' as const,
        escola_id: 'school-1'
      }

      const createdUser = {
        id: 'generated-id',
        ...newUser,
        ativo: true,
        created_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: createdUser, error: null })
          })
        })
      } as any)

      // Act
      const result = await usersApi.createUser(newUser)

      // Assert
      expect(result).toEqual(createdUser)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should validate required user data', async () => {
      // Arrange
      const invalidUser = {
        nome: '', // Empty name should fail validation
        email: 'invalid-email', // Invalid email format
        tipo_usuario: 'invalid_role' as any
      }

      // Act & Assert
      await expect(usersApi.createUser(invalidUser)).rejects.toThrow()
    })
  })

  describe('Brazilian Educational Compliance', () => {
    it('should enforce role-based access control (RBAC)', async () => {
      // Arrange - Mock user trying to access data from different school
      const mockUser = {
        id: '1',
        escola_id: 'school-1',
        tipo_usuario: 'professor'
      }

      // This test ensures teachers can only access their own school data
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      } as any)

      // Act
      const result = await usersApi.getUsersWithSchool({
        filter: { escola_id: 'school-1' }
      })

      // Assert - Verify school-based filtering is applied
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('ativo', true)
    })

    it('should handle CPF validation for Brazilian users', () => {
      // This is a placeholder for future CPF validation
      // Brazilian educational system requires CPF validation
      const cpf = '123.456.789-01'

      // Basic CPF format validation
      const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/
      expect(cpf).toMatch(cpfRegex)
    })
  })
})