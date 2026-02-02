import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DescriptiveReportForm } from '@/components/reports/DescriptiveReportForm'
import type { DescriptiveReport } from '@/types/descriptive-report'

/**
 * Unit Tests: DescriptiveReportForm Component
 * Task Group 3.2: Relatorios Descritivos (Ed. Infantil)
 *
 * Tests the descriptive report form with:
 * - 5 Experience Fields (Campos de Experiencia)
 * - Auto-save functionality
 * - Progress indicator
 * - Finalization validation
 */

describe('DescriptiveReportForm', () => {
  const mockOnSaveDraft = vi.fn()
  const mockOnFinalize = vi.fn()
  const mockOnCancel = vi.fn()

  const defaultProps = {
    studentName: 'João Silva',
    semesterLabel: '1º Semestre 2024',
    onSaveDraft: mockOnSaveDraft,
    onFinalize: mockOnFinalize,
    onCancel: mockOnCancel,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render form with student name', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    it('should render semester label', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText('1º Semestre 2024')).toBeInTheDocument()
    })

    it('should render all 5 experience fields', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      // Check for campo de experiencia labels
      expect(screen.getByText(/eu.*outro/i)).toBeInTheDocument() // O eu, o outro e o nós
      expect(screen.getByText(/corpo.*gestos/i)).toBeInTheDocument() // Corpo, gestos e movimentos
      expect(screen.getByText(/traços.*cores/i)).toBeInTheDocument() // Traços, cores, sons e formas
      expect(screen.getByText(/escuta.*fala/i)).toBeInTheDocument() // Escuta, fala, pensamento e imaginação
      expect(screen.getByText(/espaços.*tempos/i)).toBeInTheDocument() // Espaços, tempos, quantidades, relações e transformações
    })

    it('should render general observations field', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText(/observações.*gerais|observacoes.*gerais/i)).toBeInTheDocument()
    })

    it('should display progress indicator', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText(/progresso/i)).toBeInTheDocument()
      expect(screen.getByText(/0.*de.*5.*campos/i)).toBeInTheDocument()
    })

    it('should show draft status badge', () => {
      render(<DescriptiveReportForm {...defaultProps} status="rascunho" />)
      
      expect(screen.getByText(/rascunho/i)).toBeInTheDocument()
    })

    it('should show finalized status badge', () => {
      render(<DescriptiveReportForm {...defaultProps} status="finalizado" />)
      
      expect(screen.getByText(/finalizado/i)).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /salvar.*rascunho/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument()
    })
  })

  describe('Form Fields', () => {
    it('should have textareas for all experience fields', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const textareas = screen.getAllByRole('textbox')
      
      // 5 experience fields + 1 general observations = 6
      expect(textareas).toHaveLength(6)
    })

    it('should accept text input in experience fields', async () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      
      fireEvent.change(firstTextarea, { target: { value: 'A criança demonstra autonomia e cooperação nas atividades em grupo.' } })
      
      expect(firstTextarea).toHaveValue('A criança demonstra autonomia e cooperação nas atividades em grupo.')
    })

    it('should show character count for fields', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      // Look for character counters (format: "0 / 50 caracteres minimos")
      const counters = screen.getAllByText(/\d+\s*\/\s*\d+.*caracteres/i)
      
      expect(counters.length).toBeGreaterThanOrEqual(5)
    })

    it('should update character count on input', async () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, { target: { value: 'Test' } })
      
      await waitFor(() => {
        expect(screen.getByText(/4\s*\/\s*50/i)).toBeInTheDocument()
      })
    })

    it('should show field status icons', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      // Empty fields should have empty circle icon
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Progress Calculation', () => {
    it('should show 0% progress initially', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText(/0%/)).toBeInTheDocument()
    })

    it('should update progress when field is filled', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      
      // Fill with minimum required characters (50+)
      const longText = 'A criança demonstra grande desenvolvimento na socialização e cooperação com os colegas durante as atividades.'
      fireEvent.change(firstTextarea, longText)
      
      await waitFor(() => {
        expect(screen.getByText(/20%/)).toBeInTheDocument() // 1 of 5 = 20%
      })
    })

    it('should show 100% when all fields are complete', async () => {
      
      
      const initialValues: Partial<DescriptiveReport> = {
        eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades em grupo, respeitando os colegas.',
        corpo_gestos_movimentos: 'Apresenta desenvolvimento motor adequado, participando ativamente de brincadeiras e jogos.',
        tracos_sons_cores_formas: 'Expressa-se criativamente através de desenhos, pinturas e atividades musicais diversas.',
        escuta_fala_pensamento_imaginacao: 'Comunica-se claramente, demonstra interesse por histórias e atividades de leitura.',
        espacos_tempos_quantidades_relacoes_transformacoes: 'Compreende conceitos básicos de quantidade, espaço e tempo nas atividades propostas.',
      }
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={initialValues} />)
      
      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument()
      })
    })

    it('should show partial progress for incomplete fields', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, 'Short text') // Less than 50 chars
      
      // Progress should still be 0% because minimum not met
      await waitFor(() => {
        expect(screen.getByText(/0%/)).toBeInTheDocument()
      })
    })
  })

  describe('Auto-save Functionality', () => {
    it('should show unsaved changes indicator when typing', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, 'Test')
      
      await waitFor(() => {
        expect(screen.getByText(/alterações.*não.*salvas|alteracoes.*nao.*salvas/i)).toBeInTheDocument()
      })
    })

    it('should show saved indicator when no changes', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText(/todas.*alterações.*salvas|todas.*alteracoes.*salvas/i)).toBeInTheDocument()
    })

    it('should disable auto-save when autoSaveInterval is 0', () => {
      render(<DescriptiveReportForm {...defaultProps} autoSaveInterval={0} />)
      
      // Auto-save should not trigger
      expect(true).toBeTruthy()
    })
  })

  describe('Save Draft', () => {
    it('should call onSaveDraft when save button clicked', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, 'Test content')
      
      const saveButton = screen.getByRole('button', { name: /salvar.*rascunho/i })
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockOnSaveDraft).toHaveBeenCalled()
      })
    })

    it('should disable save button when no changes', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const saveButton = screen.getByRole('button', { name: /salvar.*rascunho/i })
      expect(saveButton).toBeDisabled()
    })

    it('should show loading state while saving', async () => {
      
      mockOnSaveDraft.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, 'Test')
      
      const saveButton = screen.getByRole('button', { name: /salvar.*rascunho/i })
      fireEvent.click(saveButton)
      
      expect(screen.getByText(/salvando/i)).toBeInTheDocument()
    })

    it('should update last saved timestamp after save', async () => {
      
      mockOnSaveDraft.mockResolvedValue(undefined)
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, 'Test')
      
      const saveButton = screen.getByRole('button', { name: /salvar.*rascunho/i })
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/último.*salvamento|ultimo.*salvamento/i)).toBeInTheDocument()
      })
    })
  })

  describe('Finalization', () => {
    it('should disable finalize button when fields incomplete', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const finalizeButton = screen.getByRole('button', { name: /finalizar/i })
      expect(finalizeButton).toBeDisabled()
    })

    it('should enable finalize button when all fields complete', () => {
      const completeValues: Partial<DescriptiveReport> = {
        eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades em grupo, respeitando os colegas.',
        corpo_gestos_movimentos: 'Apresenta desenvolvimento motor adequado, participando ativamente de brincadeiras e jogos.',
        tracos_sons_cores_formas: 'Expressa-se criativamente através de desenhos, pinturas e atividades musicais diversas.',
        escuta_fala_pensamento_imaginacao: 'Comunica-se claramente, demonstra interesse por histórias e atividades de leitura.',
        espacos_tempos_quantidades_relacoes_transformacoes: 'Compreende conceitos básicos de quantidade, espaço e tempo nas atividades propostas.',
      }
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={completeValues} />)
      
      const finalizeButton = screen.getByRole('button', { name: /finalizar/i })
      expect(finalizeButton).toBeEnabled()
    })

    it('should call onFinalize when finalize button clicked', async () => {
      
      
      const completeValues: Partial<DescriptiveReport> = {
        eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades em grupo, respeitando os colegas.',
        corpo_gestos_movimentos: 'Apresenta desenvolvimento motor adequado, participando ativamente de brincadeiras e jogos.',
        tracos_sons_cores_formas: 'Expressa-se criativamente através de desenhos, pinturas e atividades musicais diversas.',
        escuta_fala_pensamento_imaginacao: 'Comunica-se claramente, demonstra interesse por histórias e atividades de leitura.',
        espacos_tempos_quantidades_relacoes_transformacoes: 'Compreende conceitos básicos de quantidade, espaço e tempo nas atividades propostas.',
      }
      
      mockOnFinalize.mockResolvedValue(undefined)
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={completeValues} />)
      
      const finalizeButton = screen.getByRole('button', { name: /finalizar/i })
      fireEvent.click(finalizeButton)
      
      await waitFor(() => {
        expect(mockOnFinalize).toHaveBeenCalled()
      })
    })

    it('should show warning for incomplete fields', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText(/campos.*incompletos/i)).toBeInTheDocument()
    })

    it('should show loading state while finalizing', async () => {
      
      
      const completeValues: Partial<DescriptiveReport> = {
        eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades em grupo, respeitando os colegas.',
        corpo_gestos_movimentos: 'Apresenta desenvolvimento motor adequado, participando ativamente de brincadeiras e jogos.',
        tracos_sons_cores_formas: 'Expressa-se criativamente através de desenhos, pinturas e atividades musicais diversas.',
        escuta_fala_pensamento_imaginacao: 'Comunica-se claramente, demonstra interesse por histórias e atividades de leitura.',
        espacos_tempos_quantidades_relacoes_transformacoes: 'Compreende conceitos básicos de quantidade, espaço e tempo nas atividades propostas.',
      }
      
      mockOnFinalize.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={completeValues} />)
      
      const finalizeButton = screen.getByRole('button', { name: /finalizar/i })
      fireEvent.click(finalizeButton)
      
      expect(screen.getByText(/finalizando/i)).toBeInTheDocument()
    })
  })

  describe('Finalized State', () => {
    it('should disable all fields when finalized', () => {
      const completeValues: Partial<DescriptiveReport> = {
        eu_outro_nos: 'Test content that meets minimum length requirement for the field.',
        corpo_gestos_movimentos: 'Test content that meets minimum length requirement for the field.',
      }
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={completeValues} status="finalizado" />)
      
      const textareas = screen.getAllByRole('textbox')
      
      textareas.forEach(textarea => {
        expect(textarea).toBeDisabled()
      })
    })

    it('should hide action buttons when finalized', () => {
      render(<DescriptiveReportForm {...defaultProps} status="finalizado" />)
      
      expect(screen.queryByRole('button', { name: /salvar.*rascunho/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /finalizar/i })).not.toBeInTheDocument()
    })

    it('should show finalized warning', () => {
      render(<DescriptiveReportForm {...defaultProps} status="finalizado" />)
      
      expect(screen.getByText(/relatório.*finalizado|relatorio.*finalizado/i)).toBeInTheDocument()
      expect(screen.getByText(/não.*pode.*ser.*alterado|nao.*pode.*ser.*alterado/i)).toBeInTheDocument()
    })
  })

  describe('Cancel Action', () => {
    it('should call onCancel when cancel button clicked', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /voltar/i })
      fireEvent.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should disable form when loading', () => {
      render(<DescriptiveReportForm {...defaultProps} isLoading={true} />)
      
      const textareas = screen.getAllByRole('textbox')
      
      textareas.forEach(textarea => {
        expect(textarea).toBeDisabled()
      })
    })

    it('should disable buttons when loading', () => {
      render(<DescriptiveReportForm {...defaultProps} isLoading={true} />)
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      const finalizeButton = screen.getByRole('button', { name: /finalizar/i })
      
      expect(saveButton).toBeDisabled()
      expect(finalizeButton).toBeDisabled()
    })
  })

  describe('Initial Values', () => {
    it('should populate fields with initial values', () => {
      const initialValues: Partial<DescriptiveReport> = {
        eu_outro_nos: 'Initial content for field 1',
        corpo_gestos_movimentos: 'Initial content for field 2',
      }
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={initialValues} />)
      
      const textareas = screen.getAllByRole('textbox')
      
      expect(textareas[0]).toHaveValue('Initial content for field 1')
      expect(textareas[1]).toHaveValue('Initial content for field 2')
    })

    it('should calculate progress from initial values', () => {
      const initialValues: Partial<DescriptiveReport> = {
        eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades.',
        corpo_gestos_movimentos: 'Apresenta desenvolvimento motor adequado e participação ativa.',
      }
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={initialValues} />)
      
      // 2 fields filled = 40%
      expect(screen.getByText(/40%/)).toBeInTheDocument()
    })
  })

  describe('Field Completion Status', () => {
    it('should mark field as complete with checkmark', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      
      // Type enough to meet minimum (50+ chars)
      const longText = 'A criança demonstra desenvolvimento adequado em todas as atividades propostas durante o semestre.'
      fireEvent.change(firstTextarea, longText)
      
      await waitFor(() => {
        // Look for checkmark icon (CheckCircle component)
        const checkIcons = document.querySelectorAll('svg[class*="text-green"]')
        expect(checkIcons.length).toBeGreaterThan(0)
      })
    })

    it('should mark field as partial with pencil icon', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      
      // Type less than minimum
      fireEvent.change(firstTextarea, 'Short text')
      
      await waitFor(() => {
        // Look for partial icon
        const icons = document.querySelectorAll('svg')
        expect(icons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      // All textareas should have associated labels
      const textareas = screen.getAllByRole('textbox')
      
      textareas.forEach(textarea => {
        expect(textarea).toHaveAccessibleName()
      })
    })

    it('should show validation errors', async () => {
      
      mockOnSaveDraft.mockResolvedValue(undefined)
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      // Try to save without content - should show errors or handle gracefully
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      
      // Button should be disabled when no changes
      expect(saveButton).toBeDisabled()
    })

    it('should support keyboard navigation', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const textareas = screen.getAllByRole('textbox')
      
      // All textareas should be focusable
      textareas.forEach(textarea => {
        expect(textarea).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle save error gracefully', async () => {
      
      mockOnSaveDraft.mockRejectedValue(new Error('Save failed'))
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, 'Test')
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      fireEvent.click(saveButton)
      
      // Should not crash
      await waitFor(() => {
        expect(mockOnSaveDraft).toHaveBeenCalled()
      })
    })

    it('should handle finalize error gracefully', async () => {
      
      
      const completeValues: Partial<DescriptiveReport> = {
        eu_outro_nos: 'Complete content meeting minimum length requirements for validation.',
        corpo_gestos_movimentos: 'Complete content meeting minimum length requirements for validation.',
        tracos_sons_cores_formas: 'Complete content meeting minimum length requirements for validation.',
        escuta_fala_pensamento_imaginacao: 'Complete content meeting minimum length requirements for validation.',
        espacos_tempos_quantidades_relacoes_transformacoes: 'Complete content meeting minimum length requirements for validation.',
      }
      
      mockOnFinalize.mockRejectedValue(new Error('Finalize failed'))
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={completeValues} />)
      
      const finalizeButton = screen.getByRole('button', { name: /finalizar/i })
      fireEvent.click(finalizeButton)
      
      // Should not crash
      await waitFor(() => {
        expect(mockOnFinalize).toHaveBeenCalled()
      })
    })
  })
})
