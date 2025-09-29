import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the students API before importing anything else
const mockCreateStudent = jest.fn()
jest.mock('@/lib/api/students', () => ({
  studentsApi: {
    createStudent: mockCreateStudent
  }
}))

// Mock sonner toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn()
}
jest.mock('sonner', () => ({
  toast: mockToast
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn()
  })
}))

// Now import the component
import NovoAlunoPage from '@/app/(dashboard)/dashboard/alunos/novo/page'

describe('NovoAlunoPage - API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully create student with real API call', async () => {
    const mockStudent = {
      id: '1',
      nome_completo: 'João Silva',
      data_nascimento: '2010-05-15',
      sexo: 'M',
      cpf: '12345678901',
      telefone: '(34) 99999-9999',
      endereco: 'Rua A, 123',
      cidade: 'Fronteira',
      estado: 'MG',
      cep: '38290-000'
    }

    mockStudentsApi.createStudent.mockResolvedValue(mockStudent)

    render(<NovoAlunoPage />)

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'João Silva' }
    })
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
      target: { value: '2010-05-15' }
    })
    fireEvent.change(screen.getByLabelText(/cpf/i), {
      target: { value: '123.456.789-01' }
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /cadastrar aluno/i })
    fireEvent.click(submitButton)

    // Wait for API call and success feedback
    await waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalledWith({
        nome_completo: 'João Silva',
        data_nascimento: '2010-05-15',
        cpf: '12345678901',
        sexo: 'M',
        telefone: undefined,
        endereco: undefined,
        cidade: undefined,
        estado: undefined,
        cep: undefined,
        necessidades_especiais: false,
        observacoes: undefined,
        responsavel: undefined
      })
    })

    expect(mockToast.success).toHaveBeenCalledWith('Aluno cadastrado com sucesso!')
  })

  it('should handle API errors gracefully', async () => {
    const apiError = new Error('Erro ao criar aluno: CPF já existe')
    mockCreateStudent.mockRejectedValue(apiError)

    render(<NovoAlunoPage />)

    // Fill minimal form data
    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'João Silva' }
    })
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
      target: { value: '2010-05-15' }
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /cadastrar aluno/i })
    fireEvent.click(submitButton)

    // Wait for error handling
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Erro ao cadastrar aluno: CPF já existe')
    })
  })

  it('should show loading state during API call', async () => {
    // Mock a delayed API response
    mockCreateStudent.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        id: '1',
        nome_completo: 'João Silva',
        data_nascimento: '2010-05-15',
        sexo: 'M'
      }), 1000))
    )

    render(<NovoAlunoPage />)

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'João Silva' }
    })
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
      target: { value: '2010-05-15' }
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /cadastrar aluno/i })
    fireEvent.click(submitButton)

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText(/cadastrando/i)).toBeInTheDocument()
    })

    expect(submitButton).toBeDisabled()
  })

  it('should validate Brazilian CPF format', async () => {
    render(<NovoAlunoPage />)

    const cpfInput = screen.getByLabelText(/cpf/i)

    // Enter invalid CPF
    fireEvent.change(cpfInput, { target: { value: '123.456.789-00' } })
    fireEvent.blur(cpfInput)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument()
    })

    // Form should not submit with invalid CPF
    const submitButton = screen.getByRole('button', { name: /cadastrar aluno/i })
    fireEvent.click(submitButton)

    expect(mockCreateStudent).not.toHaveBeenCalled()
  })

  it('should handle guardian data integration', async () => {
    const mockStudentWithGuardian = {
      id: '1',
      nome_completo: 'João Silva',
      data_nascimento: '2010-05-15',
      sexo: 'M'
    }

    mockCreateStudent.mockResolvedValue(mockStudentWithGuardian)

    render(<NovoAlunoPage />)

    // Fill student data
    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'João Silva' }
    })
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
      target: { value: '2010-05-15' }
    })

    // Fill guardian data
    fireEvent.change(screen.getByLabelText(/nome do responsável/i), {
      target: { value: 'Maria Silva' }
    })
    fireEvent.change(screen.getByLabelText(/telefone do responsável/i), {
      target: { value: '(34) 99999-9999' }
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /cadastrar aluno/i })
    fireEvent.click(submitButton)

    // Wait for API call with guardian data
    await waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          responsavel: {
            nome: 'Maria Silva',
            telefone: '34999999999',
            grau_parentesco: 'Mãe'
          }
        })
      )
    })
  })
})