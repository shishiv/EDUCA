/**
 * End-to-End tests for complete Professor workflow
 * Task 4.7: Test professor workflow from login to attendance submission
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'

// Mock all required modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}))

// Mock authentication flow
let mockAuthState = {
  isAuthenticated: false,
  user: null,
  userProfile: null
}

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockAuthState
}))

// Mock Supabase
const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  },
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

// Mock API modules
jest.mock('@/lib/api/classes', () => ({
  classesApi: {
    getClassesByTeacher: jest.fn(),
  }
}))

// Import pages and components
import LoginPage from '@/app/(auth)/login/page'
import DashboardPage from '@/app/(dashboard)/dashboard/page'
import FrequenciaPage from '@/app/(dashboard)/dashboard/frequencia/page'

describe('Complete Professor Workflow - Login to Attendance Submission', () => {
  const mockProfessor = {
    id: 'professor-123',
    nome: 'João Silva',
    email: 'joao.silva@escola.gov.br',
    papel: 'professor',
    escola_id: 'escola-1',
    ativo: true
  }

  const mockClasses = [
    {
      id: 'turma-1',
      nome: '1º Ano A',
      serie: 'Fundamental I',
      turno: 'Manhã',
      escola: {
        id: 'escola-1',
        nome: 'Escola Municipal João da Silva'
      },
      _count: {
        students: 25
      }
    }
  ]

  const mockStudents = [
    {
      aluno_id: 'aluno-1',
      numero_chamada: 1,
      student: {
        id: 'aluno-1',
        nome_completo: 'Ana Clara Santos',
        numero_matricula: '2024001',
        data_nascimento: '2017-05-15'
      },
      attendance: null,
      marked: false,
      can_modify: true
    },
    {
      aluno_id: 'aluno-2',
      numero_chamada: 2,
      student: {
        id: 'aluno-2',
        nome_completo: 'Bruno Costa Lima',
        numero_matricula: '2024002',
        data_nascimento: '2017-08-22'
      },
      attendance: null,
      marked: false,
      can_modify: true
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset auth state
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      userProfile: null
    }

    // Setup API mocks
    const { classesApi } = require('@/lib/api/classes')
    classesApi.getClassesByTeacher.mockResolvedValue(mockClasses)

    // Mock successful responses
    global.fetch = jest.fn()
  })

  describe('Phase 1: Authentication Flow', () => {
    it('should complete login flow for professor', async () => {
      const user = userEvent.setup()

      // Mock successful login
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'professor-123', email: 'joao.silva@escola.gov.br' },
          session: { access_token: 'token123' }
        },
        error: null
      })

      render(<LoginPage />)

      // Fill login form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'joao.silva@escola.gov.br')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Verify authentication API call
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'joao.silva@escola.gov.br',
          password: 'password123'
        })
      })

      // Update auth state after successful login
      mockAuthState = {
        isAuthenticated: true,
        user: { id: 'professor-123', email: 'joao.silva@escola.gov.br' },
        userProfile: mockProfessor
      }
    })

    it('should handle login errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock login error
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'wrong@email.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument()
      })
    })
  })

  describe('Phase 2: Dashboard Navigation', () => {
    beforeEach(() => {
      // Simulate logged in state
      mockAuthState = {
        isAuthenticated: true,
        user: { id: 'professor-123' },
        userProfile: mockProfessor
      }
    })

    it('should display professor dashboard with assigned classes', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/bem-vindo, joão silva/i)).toBeInTheDocument()
        expect(screen.getByText('1º Ano A - Fundamental I')).toBeInTheDocument()
        expect(screen.getByText('Escola Municipal João da Silva')).toBeInTheDocument()
      })

      // Should show class statistics
      expect(screen.getByText('25 alunos')).toBeInTheDocument()
      expect(screen.getByText('Manhã')).toBeInTheDocument()
    })

    it('should navigate to attendance page', async () => {
      const user = userEvent.setup()

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('1º Ano A - Fundamental I')).toBeInTheDocument()
      })

      // Click on "Frequência" navigation or button
      const frequenciaButton = screen.getByRole('button', { name: /frequência/i })
      await user.click(frequenciaButton)

      // Should navigate to frequency page (mocked router)
      expect(screen.getByText(/controle de frequência/i)).toBeInTheDocument()
    })
  })

  describe('Phase 3: Aula Opening Workflow', () => {
    beforeEach(() => {
      mockAuthState = {
        isAuthenticated: true,
        user: { id: 'professor-123' },
        userProfile: mockProfessor
      }
    })

    it('should complete "Abrir Aula" workflow', async () => {
      const user = userEvent.setup()

      // Mock successful session creation
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: 'session-123',
              aula_id: 'aula-456',
              status: 'aberta',
              pode_marcar_frequencia: true,
              tempo_limite_minutos: 30,
              turma_id: 'turma-1'
            }
          })
        })

      render(<FrequenciaPage />)

      await waitFor(() => {
        expect(screen.getByText(/controle de frequência/i)).toBeInTheDocument()
        expect(screen.getByText('1º Ano A - Fundamental I')).toBeInTheDocument()
      })

      // Click "Abrir Aula" button
      const abrirAulaButton = screen.getByRole('button', { name: /abrir aula/i })
      await user.click(abrirAulaButton)

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/aulas/abrir', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            turma_id: 'turma-1',
            observacoes: 'Aula aberta via interface do professor'
          })
        })
      })

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/aula aberta com sucesso/i)).toBeInTheDocument()
      })
    })

    it('should display session timer after opening', async () => {
      // Mock active session
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'session-123',
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

      render(<FrequenciaPage />)

      await waitFor(() => {
        expect(screen.getByText(/tempo para marcação/i)).toBeInTheDocument()
        expect(screen.getByText(/30:/)).toBeInTheDocument() // Timer display
      })
    })
  })

  describe('Phase 4: Attendance Marking', () => {
    beforeEach(() => {
      mockAuthState = {
        isAuthenticated: true,
        user: { id: 'professor-123' },
        userProfile: mockProfessor
      }

      // Mock active session
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'session-123',
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

      // Mock student list
      global.fetch = jest.fn()
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockStudents
          })
        })
    })

    it('should mark student attendance', async () => {
      const user = userEvent.setup()

      render(<FrequenciaPage />)

      // Navigate to attendance marking
      await waitFor(() => {
        expect(screen.getByText(/marcar presença/i)).toBeInTheDocument()
      })

      // Should display student list
      await waitFor(() => {
        expect(screen.getByText('Ana Clara Santos')).toBeInTheDocument()
        expect(screen.getByText('Bruno Costa Lima')).toBeInTheDocument()
      })

      // Mark first student as present
      const presentButtons = screen.getAllByRole('button', { name: /presente/i })
      await user.click(presentButtons[0])

      // Mark second student as absent
      const absentButtons = screen.getAllByRole('button', { name: /falta/i })
      await user.click(absentButtons[1])

      // Should show updated attendance status
      expect(screen.getByText(/ana clara santos.*presente/i)).toBeInTheDocument()
      expect(screen.getByText(/bruno costa lima.*falta/i)).toBeInTheDocument()
    })

    it('should save attendance and lock session', async () => {
      const user = userEvent.setup()

      // Mock successful save
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockStudents
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Frequência salva com sucesso'
          })
        })

      render(<FrequenciaPage />)

      await waitFor(() => {
        expect(screen.getByText('Ana Clara Santos')).toBeInTheDocument()
      })

      // Mark all students
      const presentButtons = screen.getAllByRole('button', { name: /presente/i })
      await user.click(presentButtons[0])
      await user.click(presentButtons[1])

      // Save attendance
      const saveButton = screen.getByRole('button', { name: /salvar frequência/i })
      await user.click(saveButton)

      // Verify save API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/frequencia/submit', expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }))
      })

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/frequência salva com sucesso/i)).toBeInTheDocument()
      })
    })
  })

  describe('Phase 5: Session Completion and Verification', () => {
    it('should display completion confirmation', async () => {
      // Mock locked session
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'session-123',
                    status: 'travada',
                    aberta_em: new Date(Date.now() - 60000).toISOString(),
                    travada_em: new Date().toISOString(),
                    tempo_limite_minutos: 30
                  },
                  error: null
                }))
              }))
            }))
          }))
        }))
      })

      render(<FrequenciaPage />)

      await waitFor(() => {
        expect(screen.getByText(/frequência registrada com sucesso/i)).toBeInTheDocument()
        expect(screen.getByText(/documento legal/i)).toBeInTheDocument()
      })

      // Should show locked status
      expect(screen.getByText(/aula travada/i)).toBeInTheDocument()
      expect(screen.getByText(/registro imutável/i)).toBeInTheDocument()
    })

    it('should prevent modifications to locked session', async () => {
      const user = userEvent.setup()

      // Mock locked session
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'session-123',
                    status: 'travada',
                    aberta_em: new Date(Date.now() - 60000).toISOString(),
                    travada_em: new Date().toISOString(),
                    tempo_limite_minutos: 30
                  },
                  error: null
                }))
              }))
            }))
          }))
        }))
      })

      render(<FrequenciaPage />)

      await waitFor(() => {
        expect(screen.getByText(/aula travada/i)).toBeInTheDocument()
      })

      // Attendance controls should be disabled
      const attendanceButtons = screen.queryAllByRole('button', { name: /presente|falta/i })
      attendanceButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle session timeout gracefully', async () => {
      // Mock session about to expire
      const expiredStartTime = new Date(Date.now() - 31 * 60 * 1000).toISOString() // 31 minutes ago

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'session-123',
                    status: 'fechada',
                    aberta_em: expiredStartTime,
                    fechada_em: new Date(Date.now() - 1000).toISOString(),
                    tempo_limite_minutos: 30
                  },
                  error: null
                }))
              }))
            }))
          }))
        }))
      })

      render(<FrequenciaPage />)

      await waitFor(() => {
        expect(screen.getByText(/tempo esgotado/i)).toBeInTheDocument()
        expect(screen.getByText(/será bloqueada automaticamente/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors during attendance submission', async () => {
      const user = userEvent.setup()

      // Mock network error
      global.fetch = jest.fn()
        .mockRejectedValue(new Error('Network error'))

      render(<FrequenciaPage />)

      await waitFor(() => {
        expect(screen.getByText('Ana Clara Santos')).toBeInTheDocument()
      })

      // Try to save attendance
      const saveButton = screen.getByRole('button', { name: /salvar frequência/i })
      await user.click(saveButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/erro de conexão/i)).toBeInTheDocument()
      })
    })
  })
})