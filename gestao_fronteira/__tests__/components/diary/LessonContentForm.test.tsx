/**
 * Unit tests for LessonContentForm Component
 * Task Group 2.2: Formulario de Conteudo Estruturado
 *
 * Test Coverage:
 * - Required fields rendering (tema, objetivo)
 * - Form validation with Zod schema
 * - Submit with correct data
 * - Ed. Infantil vs Fundamental differentiation
 * - BNCC skills input
 *
 * Uses React Hook Form + Zod validation
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonContentForm } from '@/components/diary/LessonContentForm'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}))

describe('LessonContentForm - Structured Content Form', () => {
  const defaultProps = {
    sessionId: 'session-001',
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // =========================================================================
  // Test 1: Required Fields Rendering
  // =========================================================================
  describe('Test 1: Required Fields Rendering', () => {
    it('should render all required fields for Ensino Fundamental', () => {
      render(<LessonContentForm {...defaultProps} educationLevel="fundamental" />)

      // Check required fields are rendered
      expect(screen.getByLabelText(/tema/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/objetivo/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/habilidades bncc/i)).toBeInTheDocument()

      // Check optional fields are also rendered
      expect(screen.getByLabelText(/metodologia/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/recursos/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/observa/i)).toBeInTheDocument()
    })

    it('should render Campos de Experiencia for Ed. Infantil', () => {
      render(<LessonContentForm {...defaultProps} educationLevel="infantil" />)

      // Check that experience fields are shown instead of disciplines
      expect(screen.getByText(/campo de experi/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tema/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/objetivo/i)).toBeInTheDocument()
    })

    it('should render submit and cancel buttons', () => {
      render(<LessonContentForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Test 2: Form Validation
  // =========================================================================
  describe('Test 2: Form Validation', () => {
    it('should show error when tema is empty on submit', async () => {
      const user = userEvent.setup()
      render(<LessonContentForm {...defaultProps} />)

      // Fill only objetivo, leave tema empty
      const objetivoInput = screen.getByLabelText(/objetivo/i)
      await user.type(objetivoInput, 'Objetivo valido com caracteres suficientes para o teste')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/tema.*obrigat/i)).toBeInTheDocument()
      })
    })

    it('should show error when objetivo is too short', async () => {
      const user = userEvent.setup()
      render(<LessonContentForm {...defaultProps} />)

      // Fill tema correctly
      const temaInput = screen.getByLabelText(/tema/i)
      await user.type(temaInput, 'Tema valido')

      // Fill objetivo with too few characters
      const objetivoInput = screen.getByLabelText(/objetivo/i)
      await user.type(objetivoInput, 'Curto')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // Check for error message in destructive style (error message)
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/objetivo.*10.*caracteres/i)
        // There should be at least one error message (the validation error)
        expect(errorMessages.length).toBeGreaterThan(0)
        // At least one should be styled as an error (destructive class)
        const hasErrorStyle = errorMessages.some(
          (el) => el.classList.contains('text-destructive')
        )
        expect(hasErrorStyle).toBe(true)
      })
    })

    it('should show error for invalid BNCC code format', async () => {
      const user = userEvent.setup()
      render(<LessonContentForm {...defaultProps} educationLevel="fundamental" />)

      // Fill required fields
      const temaInput = screen.getByLabelText(/tema/i)
      await user.type(temaInput, 'Matematica Basica')

      const objetivoInput = screen.getByLabelText(/objetivo/i)
      await user.type(objetivoInput, 'Aprender numeros naturais de 0 a 100')

      // Add invalid BNCC code
      const bnccInput = screen.getByLabelText(/habilidades bncc/i)
      await user.type(bnccInput, 'INVALID_CODE')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/bncc.*inv/i)).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // Test 3: Submit with Correct Data
  // =========================================================================
  describe('Test 3: Submit with Correct Data', () => {
    it('should call onSubmit with form data when valid', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()
      render(<LessonContentForm {...defaultProps} onSubmit={onSubmit} educationLevel="fundamental" />)

      // Fill all required fields
      const temaInput = screen.getByLabelText(/tema/i)
      await user.type(temaInput, 'Adicao e Subtracao')

      const objetivoInput = screen.getByLabelText(/objetivo/i)
      await user.type(objetivoInput, 'Compreender operacoes basicas de adicao e subtracao')

      const bnccInput = screen.getByLabelText(/habilidades bncc/i)
      await user.type(bnccInput, 'EF01MA06')

      // Fill optional fields
      const metodologiaInput = screen.getByLabelText(/metodologia/i)
      await user.type(metodologiaInput, 'Aula expositiva com material dourado')

      const recursosInput = screen.getByLabelText(/recursos/i)
      await user.type(recursosInput, 'Material dourado, quadro branco')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // Verify onSubmit was called with correct data
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            tema: 'Adicao e Subtracao',
            objetivo: 'Compreender operacoes basicas de adicao e subtracao',
            habilidades_bncc: expect.arrayContaining(['EF01MA06']),
            metodologia: 'Aula expositiva com material dourado',
            recursos: 'Material dourado, quadro branco',
          })
        )
      })
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = jest.fn()
      render(<LessonContentForm {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalled()
    })

    it('should accept multiple BNCC codes separated by comma', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()
      render(<LessonContentForm {...defaultProps} onSubmit={onSubmit} educationLevel="fundamental" />)

      // Fill required fields
      const temaInput = screen.getByLabelText(/tema/i)
      await user.type(temaInput, 'Matematica Avancada')

      const objetivoInput = screen.getByLabelText(/objetivo/i)
      await user.type(objetivoInput, 'Resolver problemas matematicos complexos')

      // Add multiple BNCC codes
      const bnccInput = screen.getByLabelText(/habilidades bncc/i)
      await user.type(bnccInput, 'EF01MA06, EF01MA08')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // Verify multiple codes are submitted
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            habilidades_bncc: expect.arrayContaining(['EF01MA06', 'EF01MA08']),
          })
        )
      })
    })
  })

  // =========================================================================
  // Test 4: Ed. Infantil vs Fundamental Differentiation
  // =========================================================================
  describe('Test 4: Ed. Infantil vs Fundamental Differentiation', () => {
    it('should show experience field selector for Ed. Infantil', () => {
      render(<LessonContentForm {...defaultProps} educationLevel="infantil" />)

      // Should show Campos de Experiencia options
      expect(screen.getByText(/eu.*outro.*n/i)).toBeInTheDocument()
    })

    it('should accept EI-prefixed BNCC codes for Ed. Infantil', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()
      render(<LessonContentForm {...defaultProps} onSubmit={onSubmit} educationLevel="infantil" />)

      // Fill required fields
      const temaInput = screen.getByLabelText(/tema/i)
      await user.type(temaInput, 'Brincadeiras e Interacoes')

      const objetivoInput = screen.getByLabelText(/objetivo/i)
      await user.type(objetivoInput, 'Desenvolver habilidades sociais atraves do brincar')

      // Add Ed. Infantil BNCC code
      const bnccInput = screen.getByLabelText(/habilidades bncc/i)
      await user.type(bnccInput, 'EI03EO01')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // Verify EI code is accepted
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            habilidades_bncc: expect.arrayContaining(['EI03EO01']),
          })
        )
      })
    })

    it('should default to fundamental education level', () => {
      render(<LessonContentForm {...defaultProps} />)

      // Should not show experience fields by default (fundamental)
      expect(screen.queryByText(/eu.*outro.*n/i)).not.toBeInTheDocument()
    })
  })

  // =========================================================================
  // Test 5: Loading and Disabled States
  // =========================================================================
  describe('Test 5: Loading and Disabled States', () => {
    it('should disable form inputs when loading', () => {
      render(<LessonContentForm {...defaultProps} isLoading={true} />)

      expect(screen.getByLabelText(/tema/i)).toBeDisabled()
      expect(screen.getByLabelText(/objetivo/i)).toBeDisabled()
      expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
    })

    it('should populate form with initial values when provided', () => {
      const initialValues = {
        tema: 'Tema inicial',
        objetivo: 'Objetivo inicial com caracteres suficientes',
        metodologia: 'Metodologia inicial',
      }

      render(<LessonContentForm {...defaultProps} initialValues={initialValues} />)

      expect(screen.getByLabelText(/tema/i)).toHaveValue('Tema inicial')
      expect(screen.getByLabelText(/objetivo/i)).toHaveValue('Objetivo inicial com caracteres suficientes')
      expect(screen.getByLabelText(/metodologia/i)).toHaveValue('Metodologia inicial')
    })
  })
})
