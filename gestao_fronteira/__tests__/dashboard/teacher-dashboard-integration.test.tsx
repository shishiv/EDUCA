/**
 * Integration tests for Teacher Dashboard with Aula Status Display
 * Task 4.1: Write tests for turma selection with aula status display
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'

// Mock the API modules
jest.mock('@/lib/api/classes', () => ({
  classesApi: {
    getClassesByTeacher: jest.fn(),
  }
}))

// Mock the auth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'teacher-123',
      nome: 'Professor João',
      papel: 'professor'
    }
  })
}))

// Mock the Supabase client
const mockSupabase = {
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn()
  })),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lt: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: null
            }))
          }))
        }))
      }))
    }))
  }))
}

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('Teacher Dashboard Integration - Turma Selection with Aula Status', () => {
  const mockClasses = [
    {
      id: 'class-1',
      nome: '1º Ano A',
      serie: 'Fundamental I',
      turno: 'Manhã',
      escola: {
        id: 'school-1',
        nome: 'Escola Municipal João da Silva'
      },
      _count: {
        students: 25
      }
    },
    {
      id: 'class-2',
      nome: '2º Ano B',
      serie: 'Fundamental I',
      turno: 'Tarde',
      escola: {
        id: 'school-1',
        nome: 'Escola Municipal João da Silva'
      },
      _count: {
        students: 30
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default API response
    const { classesApi } = require('@/lib/api/classes')
    classesApi.getClassesByTeacher.mockResolvedValue(mockClasses)
  })

  describe('Turma Selection Display', () => {
    it('should display all assigned classes for the teacher', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('1º Ano A - Fundamental I')).toBeInTheDocument()
        expect(screen.getByText('2º Ano B - Fundamental I')).toBeInTheDocument()
      })

      // Verify school names are displayed
      expect(screen.getAllByText('Escola Municipal João da Silva')).toHaveLength(2)

      // Verify student counts
      expect(screen.getByText('25 alunos')).toBeInTheDocument()
      expect(screen.getByText('30 alunos')).toBeInTheDocument()
    })

    it('should display class periods (turno) as badges', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText('Manhã')).toBeInTheDocument()
        expect(screen.getByText('Tarde')).toBeInTheDocument()
      })
    })

    it('should show "Ver Detalhes" button for each class', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        const detailButtons = screen.getAllByText('Ver Detalhes')
        expect(detailButtons).toHaveLength(2)
      })
    })

    it('should handle empty class list gracefully', async () => {
      const { classesApi } = require('@/lib/api/classes')
      classesApi.getClassesByTeacher.mockResolvedValue([])

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText(/nenhuma turma encontrada/i)).toBeInTheDocument()
      })
    })
  })

  describe('Aula Status Integration', () => {
    it('should display AulaStatusIndicator for each class', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        // Should have status indicators for both classes
        const statusIndicators = screen.getAllByTestId('aula-status-indicator')
        expect(statusIndicators).toHaveLength(2)
      })
    })

    it('should display AbrirAulaButton for each class', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        // Should have "Abrir Aula" buttons for both classes
        const abrirAulaButtons = screen.getAllByRole('button', { name: /abrir aula/i })
        expect(abrirAulaButtons).toHaveLength(2)
      })
    })

    it('should update status when aula is opened successfully', async () => {
      const onSessionOpened = jest.fn()

      render(<TeacherDashboardEnhanced onSessionOpened={onSessionOpened} />)

      await waitFor(() => {
        const abrirAulaButton = screen.getAllByRole('button', { name: /abrir aula/i })[0]
        fireEvent.click(abrirAulaButton)
      })

      // Mock successful API response
      await waitFor(() => {
        expect(onSessionOpened).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            id: 'class-1',
            nome: '1º Ano A'
          })
        )
      })
    })

    it('should show real-time status updates for active sessions', async () => {
      // Mock an active session
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'session-1',
                    status: 'aberta',
                    aberta_em: new Date().toISOString(),
                    tempo_limite_minutos: 30
                  },
                  error: null
                }))
              }))
            }))
          }))
        }))
      })

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText(/aula aberta/i)).toBeInTheDocument()
        expect(screen.getByText(/frequência liberada/i)).toBeInTheDocument()
      })
    })
  })

  describe('Teacher Statistics Display', () => {
    it('should display teacher statistics summary', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        // Should show stats cards
        expect(screen.getByText(/suas turmas/i)).toBeInTheDocument()
        expect(screen.getByText(/2/)).toBeInTheDocument() // Total classes
      })
    })

    it('should show active sessions count', async () => {
      // Mock one active session
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'session-1',
                    status: 'aberta'
                  },
                  error: null
                }))
              }))
            }))
          }))
        }))
      })

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText(/sessões ativas hoje/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility and Mobile Support', () => {
    it('should have proper ARIA labels for class cards', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        const classCards = screen.getAllByRole('button', { name: /ver detalhes/i })
        expect(classCards).toHaveLength(2)
      })
    })

    it('should be responsive with proper mobile layout', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        const classCards = screen.getAllByRole('region')
        classCards.forEach(card => {
          expect(card).toHaveClass(/hover:shadow-md/)
        })
      })
    })

    it('should handle keyboard navigation properly', async () => {
      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        const abrirAulaButton = screen.getAllByRole('button', { name: /abrir aula/i })[0]
        abrirAulaButton.focus()
        expect(abrirAulaButton).toHaveFocus()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { classesApi } = require('@/lib/api/classes')
      classesApi.getClassesByTeacher.mockRejectedValue(new Error('Network error'))

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument()
      })
    })

    it('should show loading state while fetching classes', () => {
      render(<TeacherDashboardEnhanced />)

      // Should show loading skeleton initially
      expect(screen.getByText(/carregando/i)).toBeInTheDocument()
    })

    it('should handle session opening errors', async () => {
      // Mock API error response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            error: { message: 'Sessão já existe para esta turma hoje' }
          })
        })
      )

      render(<TeacherDashboardEnhanced />)

      await waitFor(() => {
        const abrirAulaButton = screen.getAllByRole('button', { name: /abrir aula/i })[0]
        fireEvent.click(abrirAulaButton)
      })

      const { toast } = require('sonner')
      expect(toast.error).toHaveBeenCalledWith('Erro ao abrir aula. Tente novamente.')
    })
  })
})