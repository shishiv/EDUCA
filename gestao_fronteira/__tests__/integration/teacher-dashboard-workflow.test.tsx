import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'
import { classesApi } from '@/lib/api/classes'
import { useAuth } from '@/hooks/use-auth'
import { useAulaRealtime } from '@/hooks/use-aula-realtime'

// Mock dependencies
jest.mock('@/lib/api/classes')
jest.mock('@/hooks/use-auth')
jest.mock('@/hooks/use-aula-realtime')

const mockClassesApi = classesApi as jest.Mocked<typeof classesApi>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseAulaRealtime = useAulaRealtime as jest.MockedFunction<typeof useAulaRealtime>

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn()
  })
}))

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('Teacher Dashboard Workflow Integration', () => {
  const mockUser = {
    id: 'teacher-1',
    email: 'professor@escola.com'
  }

  const mockUserProfile = {
    id: 'teacher-1',
    nome: 'Maria Silva',
    email: 'professor@escola.com',
    tipo_usuario: 'professor' as const,
    escola_id: 'escola-1',
    ativo: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockClasses = [
    {
      id: 'turma-1',
      nome: '5º Ano A',
      serie: '5º Ano',
      turno: 'matutino',
      capacidade: 30,
      ativo: true,
      escola_id: 'escola-1',
      professor_id: 'teacher-1',
      ano_letivo: 2024,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      escola: {
        id: 'escola-1',
        nome: 'Escola Municipal João Silva',
        codigo: 'EM001',
        tipo: 'municipal'
      },
      professor: {
        id: 'teacher-1',
        nome: 'Maria Silva',
        email: 'professor@escola.com'
      },
      _count: {
        students: 25,
        matriculas: 25
      }
    },
    {
      id: 'turma-2',
      nome: '4º Ano B',
      serie: '4º Ano',
      turno: 'vespertino',
      capacidade: 28,
      ativo: true,
      escola_id: 'escola-1',
      professor_id: 'teacher-1',
      ano_letivo: 2024,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      escola: {
        id: 'escola-1',
        nome: 'Escola Municipal João Silva',
        codigo: 'EM001',
        tipo: 'municipal'
      },
      professor: {
        id: 'teacher-1',
        nome: 'Maria Silva',
        email: 'professor@escola.com'
      },
      _count: {
        students: 22,
        matriculas: 22
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authentication
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn()
    })

    // Mock classes API
    mockClassesApi.getClassesByTeacher.mockResolvedValue(mockClasses)

    // Mock real-time hook
    mockUseAulaRealtime.mockReturnValue({
      status: null,
      loading: false,
      error: null,
      remainingTime: null,
      refreshStatus: jest.fn(),
      isOpen: false,
      isClosed: false,
      isLocked: false
    })
  })

  describe('Dashboard Loading and Display', () => {
    it('should load teacher dashboard with classes', async () => {
      render(<TeacherDashboardEnhanced />)

      // Check loading state initially
      expect(screen.getByText(/carregando/i)).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Bom dia, Prof. Maria!')).toBeInTheDocument()
      })

      // Check statistics
      expect(screen.getByText('2')).toBeInTheDocument() // Total turmas
      expect(screen.getByText('47')).toBeInTheDocument() // Total alunos (25 + 22)

      // Check classes are displayed
      expect(screen.getByText('5º Ano A - 5º Ano')).toBeInTheDocument()
      expect(screen.getByText('4º Ano B - 4º Ano')).toBeInTheDocument()
      expect(screen.getByText('Escola Municipal João Silva')).toBeInTheDocument()
    })

    it('should handle loading state gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: true,
        signIn: jest.fn(),
        signOut: jest.fn()
      })

      render(<TeacherDashboardEnhanced />)

      expect(screen.getByText(/carregando/i)).toBeInTheDocument()
    })

    it('should handle empty classes list', async () => {
      mockClassesApi.getClassesByTeacher.mockResolvedValue([])

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('Nenhuma turma atribuída')).toBeInTheDocument()
      })

      expect(screen.getByText('Entre em contato com a coordenação para atribuição de turmas')).toBeInTheDocument()
    })
  })

  describe('Greeting and Time Display', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should show correct greeting based on time of day', async () => {
      // Mock morning time (9 AM)
      jest.setSystemTime(new Date('2024-01-15T09:00:00Z'))

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('Bom dia, Prof. Maria!')).toBeInTheDocument()
      })
    })

    it('should show afternoon greeting', async () => {
      // Mock afternoon time (2 PM)
      jest.setSystemTime(new Date('2024-01-15T14:00:00Z'))

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('Boa tarde, Prof. Maria!')).toBeInTheDocument()
      })
    })

    it('should show evening greeting', async () => {
      // Mock evening time (8 PM)
      jest.setSystemTime(new Date('2024-01-15T20:00:00Z'))

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('Boa noite, Prof. Maria!')).toBeInTheDocument()
      })
    })
  })

  describe('Class Management Workflow', () => {
    it('should display all assigned classes with correct information', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        // Check first class
        expect(screen.getByText('5º Ano A - 5º Ano')).toBeInTheDocument()
        expect(screen.getByText('25 alunos')).toBeInTheDocument()
        expect(screen.getByText('matutino')).toBeInTheDocument()

        // Check second class
        expect(screen.getByText('4º Ano B - 4º Ano')).toBeInTheDocument()
        expect(screen.getByText('22 alunos')).toBeInTheDocument()
        expect(screen.getByText('vespertino')).toBeInTheDocument()
      })
    })

    it('should show aula status for each class', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        // Each class should have a status indicator
        const statusIndicators = screen.getAllByText('Inativa')
        expect(statusIndicators).toHaveLength(2)
      })
    })

    it('should handle session opening workflow', async () => {
      const onNavigateToAttendance = jest.fn()

      render(<TeacherDashboardEnhanced onNavigateToAttendance={onNavigateToAttendance} />)

      await waitFor(() => {
        // Find and click an "Abrir Aula" button
        const abrirAulaButtons = screen.getAllByText('Abrir Aula')
        expect(abrirAulaButtons.length).toBeGreaterThan(0)
      })

      // Note: Detailed button interaction would require mocking the AbrirAulaButton component
      // This test verifies the buttons are present and the callback is provided
      expect(onNavigateToAttendance).toBeDefined()
    })
  })

  describe('Real-time Updates', () => {
    it('should update when aula status changes', async () => {
      const { rerender } = render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getAllByText('Inativa')).toHaveLength(2)
      })

      // Mock status change to open
      mockUseAulaRealtime.mockReturnValue({
        status: {
          id: 'aula-1',
          turma_id: 'turma-1',
          professor_id: 'teacher-1',
          status: 'aberta',
          aberta_em: new Date().toISOString(),
          tempo_limite_minutos: 240,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        loading: false,
        error: null,
        remainingTime: 240,
        refreshStatus: jest.fn(),
        isOpen: true,
        isClosed: false,
        isLocked: false
      })

      rerender(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('Aberta')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation and Quick Actions', () => {
    it('should provide quick action links', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('Frequência Geral')).toBeInTheDocument()
        expect(screen.getByText('Relatórios')).toBeInTheDocument()
        expect(screen.getByText('Histórico de Aulas')).toBeInTheDocument()
        expect(screen.getByText('Suporte')).toBeInTheDocument()
      })

      // Check links have proper hrefs
      const frequenciaLink = screen.getByText('Frequência Geral').closest('a')
      const relatoriosLink = screen.getByText('Relatórios').closest('a')

      expect(frequenciaLink).toHaveAttribute('href', '/dashboard/frequencia')
      expect(relatoriosLink).toHaveAttribute('href', '/dashboard/relatorios')
    })

    it('should provide class detail navigation', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        const detailButtons = screen.getAllByText('Ver Detalhes')
        expect(detailButtons).toHaveLength(2)

        // Check they are properly linked
        detailButtons.forEach((button) => {
          const link = button.closest('a')
          expect(link).toHaveAttribute('href', expect.stringMatching(/\/dashboard\/turmas\/turma-[12]$/))
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockClassesApi.getClassesByTeacher.mockRejectedValue(new Error('API Error'))

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Should show 0 classes
      })

      // Should still show the interface without crashing
      expect(screen.getByText('Suas Turmas')).toBeInTheDocument()
    })

    it('should handle missing user data', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn()
      })

      render(<TeacherDashboardEnhanced />)

      // Should handle gracefully without crashing
      expect(screen.getByText(/Usuário!/)).toBeInTheDocument()
    })
  })

  describe('Brazilian Educational Compliance', () => {
    it('should display information in Portuguese', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('Suas Turmas')).toBeInTheDocument()
        expect(screen.getByText('Gerencie suas turmas e controle a frequência dos alunos')).toBeInTheDocument()
        expect(screen.getByText('Ações Rápidas')).toBeInTheDocument()
      })
    })

    it('should show Brazilian date format', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        // Should show Brazilian date format
        expect(screen.getByText(/segunda-feira.*15.*janeiro.*2024/i)).toBeInTheDocument()
      })

      jest.useRealTimers()
    })

    it('should respect Brazilian educational hierarchy', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        // Teacher should see their specific classes and controls
        expect(screen.getByText('Minhas Turmas')).toBeInTheDocument()
        expect(screen.getByText('sob sua responsabilidade')).toBeInTheDocument()
      })

      // Should not show admin-level controls
      expect(screen.queryByText('Gerenciar Sistema')).not.toBeInTheDocument()
      expect(screen.queryByText('Todas as Escolas')).not.toBeInTheDocument()
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should load efficiently with multiple classes', async () => {
      const startTime = performance.now()

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('Suas Turmas')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Should load within reasonable time (generous limit for testing)
      expect(loadTime).toBeLessThan(1000)
    })

    it('should handle many classes without performance degradation', async () => {
      // Create a large number of classes
      const manyClasses = Array.from({ length: 50 }, (_, i) => ({
        ...mockClasses[0],
        id: `turma-${i + 1}`,
        nome: `Turma ${i + 1}`,
        _count: { students: 20 + i, matriculas: 20 + i }
      }))

      mockClassesApi.getClassesByTeacher.mockResolvedValue(manyClasses)

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('50 turmas')).toBeInTheDocument()
      })

      // Should still be responsive
      expect(screen.getByText('Suas Turmas')).toBeInTheDocument()
    })
  })
})