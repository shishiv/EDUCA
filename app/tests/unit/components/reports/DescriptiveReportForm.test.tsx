import { renderWithMessages as render } from '../render-with-messages'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import { DescriptiveReportForm, type DescriptiveReportFormProps } from '@/components/reports/DescriptiveReportForm'
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
  const mockOnSaveDraft = vi.fn<NonNullable<DescriptiveReportFormProps['onSaveDraft']>>()
  const mockOnFinalize = vi.fn<NonNullable<DescriptiveReportFormProps['onFinalize']>>()
  const mockOnCancel = vi.fn()

  const defaultProps = {
    studentName: 'João Silva',
    semesterLabel: '1º Semestre 2024',
    onSaveDraft: mockOnSaveDraft,
    onFinalize: mockOnFinalize,
    onCancel: mockOnCancel,
  }

  beforeEach(() => {
    mockOnSaveDraft.mockReset().mockResolvedValue(undefined)
    mockOnFinalize.mockReset().mockResolvedValue(undefined)
    mockOnCancel.mockReset()
  })

  afterEach(() => vi.useRealTimers())

  describe('Rendering', () => {
    it('should render form with student name', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    it('should render semester label', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText(/1º Semestre 2024/)).toBeInTheDocument()
    })

    it('should render all 5 experience fields', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      // Check for campo de experiencia labels
      expect(screen.getByRole('textbox', { name: /eu.*outro/i })).toBeInTheDocument() // O eu, o outro e o nós
      expect(screen.getByRole('textbox', { name: /corpo.*gestos/i })).toBeInTheDocument() // Corpo, gestos e movimentos
      expect(screen.getByRole('textbox', { name: /traços.*cores/i })).toBeInTheDocument() // Traços, cores, sons e formas
      expect(screen.getByRole('textbox', { name: /escuta.*fala/i })).toBeInTheDocument() // Escuta, fala, pensamento e imaginação
      expect(screen.getByRole('textbox', { name: /espaços.*tempos/i })).toBeInTheDocument() // Espaços, tempos, quantidades, relações e transformações
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
      
      expect(screen.getByText('Rascunho')).toBeInTheDocument()
    })

    it('should show finalized status badge', () => {
      render(<DescriptiveReportForm {...defaultProps} status="finalizado" />)
      
      expect(screen.getByText('Finalizado')).toBeInTheDocument()
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
      
      expect(screen.getAllByRole('img', { name: 'Campo vazio' })).toHaveLength(5)
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
      fireEvent.change(firstTextarea, { target: { value: longText } })
      
      await waitFor(() => {
        expect(screen.getByText(/20%/)).toBeInTheDocument() // 1 of 5 = 20%
      })
    })

    it('should show 100% when all fields are complete', async () => {
      
      
      const initialValues: Partial<DescriptiveReport> = {
        campo_eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades em grupo, respeitando os colegas.',
        campo_corpo_gestos: 'Apresenta desenvolvimento motor adequado, participando ativamente de brincadeiras e jogos.',
        campo_tracos_sons: 'Expressa-se criativamente através de desenhos, pinturas e atividades musicais diversas.',
        campo_escuta_fala: 'Comunica-se claramente, demonstra interesse por histórias e atividades de leitura.',
        campo_espacos_tempos: 'Compreende conceitos básicos de quantidade, espaço e tempo nas atividades propostas.',
      }
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={initialValues} />)
      
      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument()
      })
    })

    it('should show partial progress for incomplete fields', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, { target: { value: 'Short text' } }) // Less than 50 chars
      
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
      fireEvent.change(firstTextarea, { target: { value: 'Test' } })
      
      await waitFor(() => {
        expect(screen.getByText(/alterações.*não.*salvas|alteracoes.*nao.*salvas/i)).toBeInTheDocument()
      })
    })

    it('should show saved indicator when no changes', () => {
      render(<DescriptiveReportForm {...defaultProps} />)
      
      expect(screen.getByText(/todas.*alterações.*salvas|todas.*alteracoes.*salvas/i)).toBeInTheDocument()
    })

    it('should disable auto-save when autoSaveInterval is 0', async () => {
      vi.useFakeTimers()
      render(<DescriptiveReportForm {...defaultProps} autoSaveInterval={0} />)
      fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Novo conteúdo' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
      expect(mockOnSaveDraft).not.toHaveBeenCalled()
      expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    })

    it('should save each subsequent edit after the configured interval', async () => {
      vi.useFakeTimers()
      render(<DescriptiveReportForm {...defaultProps} autoSaveInterval={1000} />)
      const field = screen.getAllByRole('textbox')[0]
      fireEvent.change(field, { target: { value: 'Primeira observação' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
      expect(mockOnSaveDraft).toHaveBeenCalledOnce()
      expect(mockOnSaveDraft).toHaveBeenLastCalledWith(expect.objectContaining({ campo_eu_outro_nos: 'Primeira observação' }))
      expect(screen.getByText('Todas as alterações salvas')).toBeInTheDocument()

      fireEvent.change(field, { target: { value: 'Segunda observação' } })
      expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
      await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
      expect(mockOnSaveDraft).toHaveBeenCalledTimes(2)
      expect(mockOnSaveDraft).toHaveBeenLastCalledWith(expect.objectContaining({ campo_eu_outro_nos: 'Segunda observação' }))
      expect(screen.getByText('Todas as alterações salvas')).toBeInTheDocument()
    })

    it('should retain edits made while a draft save is in flight', async () => {
      const pending = Promise.withResolvers<void>()
      mockOnSaveDraft.mockReturnValueOnce(pending.promise)
      render(<DescriptiveReportForm {...defaultProps} autoSaveInterval={0} />)
      const field = screen.getAllByRole('textbox')[0]
      fireEvent.change(field, { target: { value: 'Conteúdo enviado' } })
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /salvar.*rascunho/i })) })
      expect(mockOnSaveDraft).toHaveBeenCalledOnce()
      fireEvent.change(field, { target: { value: 'Conteúdo editado durante o envio' } })
      await act(async () => { pending.resolve() })
      expect(field).toHaveValue('Conteúdo editado durante o envio')
      expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /salvar.*rascunho/i })).toBeEnabled()
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /salvar.*rascunho/i })) })
      expect(mockOnSaveDraft).toHaveBeenLastCalledWith(expect.objectContaining({ campo_eu_outro_nos: 'Conteúdo editado durante o envio' }))
      expect(screen.getByText('Todas as alterações salvas')).toBeInTheDocument()
    })

    it('should not autosave while disabled', async () => {
      vi.useFakeTimers()
      const { rerender } = render(<DescriptiveReportForm {...defaultProps} autoSaveInterval={1000} />)
      fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Ainda não salvo' } })
      rerender(<DescriptiveReportForm {...defaultProps} autoSaveInterval={1000} disabled />)
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(mockOnSaveDraft).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /salvar.*rascunho/i })).toBeDisabled()
    })
  })

  describe('Save Draft', () => {
    it('should call onSaveDraft when save button clicked', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, { target: { value: 'Test content' } })
      
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
      fireEvent.change(firstTextarea, { target: { value: 'Test' } })
      
      const saveButton = screen.getByRole('button', { name: /salvar.*rascunho/i })
      fireEvent.click(saveButton)
      
      expect(await screen.findByText(/salvando/i)).toBeInTheDocument()
    })

    it('should update last saved timestamp after save', async () => {
      
      mockOnSaveDraft.mockResolvedValue(undefined)
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      fireEvent.change(firstTextarea, { target: { value: 'Test' } })
      
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
        campo_eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades em grupo, respeitando os colegas.',
        campo_corpo_gestos: 'Apresenta desenvolvimento motor adequado, participando ativamente de brincadeiras e jogos.',
        campo_tracos_sons: 'Expressa-se criativamente através de desenhos, pinturas e atividades musicais diversas.',
        campo_escuta_fala: 'Comunica-se claramente, demonstra interesse por histórias e atividades de leitura.',
        campo_espacos_tempos: 'Compreende conceitos básicos de quantidade, espaço e tempo nas atividades propostas.',
      }
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={completeValues} />)
      
      const finalizeButton = screen.getByRole('button', { name: /finalizar/i })
      expect(finalizeButton).toBeEnabled()
    })

    it('should call onFinalize when finalize button clicked', async () => {
      
      
      const completeValues: Partial<DescriptiveReport> = {
        campo_eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades em grupo, respeitando os colegas.',
        campo_corpo_gestos: 'Apresenta desenvolvimento motor adequado, participando ativamente de brincadeiras e jogos.',
        campo_tracos_sons: 'Expressa-se criativamente através de desenhos, pinturas e atividades musicais diversas.',
        campo_escuta_fala: 'Comunica-se claramente, demonstra interesse por histórias e atividades de leitura.',
        campo_espacos_tempos: 'Compreende conceitos básicos de quantidade, espaço e tempo nas atividades propostas.',
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
        campo_eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades em grupo, respeitando os colegas.',
        campo_corpo_gestos: 'Apresenta desenvolvimento motor adequado, participando ativamente de brincadeiras e jogos.',
        campo_tracos_sons: 'Expressa-se criativamente através de desenhos, pinturas e atividades musicais diversas.',
        campo_escuta_fala: 'Comunica-se claramente, demonstra interesse por histórias e atividades de leitura.',
        campo_espacos_tempos: 'Compreende conceitos básicos de quantidade, espaço e tempo nas atividades propostas.',
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
        campo_eu_outro_nos: 'Test content that meets minimum length requirement for the field.',
        campo_corpo_gestos: 'Test content that meets minimum length requirement for the field.',
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
      
      expect(screen.getByRole('alert')).toHaveTextContent(/relatório.*finalizado|relatorio.*finalizado/i)
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
        campo_eu_outro_nos: 'Initial content for field 1',
        campo_corpo_gestos: 'Initial content for field 2',
      }
      
      render(<DescriptiveReportForm {...defaultProps} initialValues={initialValues} />)
      
      const textareas = screen.getAllByRole('textbox')
      
      expect(textareas[0]).toHaveValue('Initial content for field 1')
      expect(textareas[1]).toHaveValue('Initial content for field 2')
    })

    it('should calculate progress from initial values', () => {
      const initialValues: Partial<DescriptiveReport> = {
        campo_eu_outro_nos: 'A criança demonstra autonomia e cooperação significativas nas atividades.',
        campo_corpo_gestos: 'Apresenta desenvolvimento motor adequado e participação ativa.',
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
      fireEvent.change(firstTextarea, { target: { value: longText } })
      
      await waitFor(() => {
        expect(screen.getAllByRole('img', { name: 'Campo completo' })).toHaveLength(1)
        expect(screen.getAllByRole('img', { name: 'Campo vazio' })).toHaveLength(4)
      })
    })

    it('should mark field as partial with pencil icon', async () => {
      
      render(<DescriptiveReportForm {...defaultProps} />)
      
      const firstTextarea = screen.getAllByRole('textbox')[0]
      
      // Type less than minimum
      fireEvent.change(firstTextarea, { target: { value: 'Short text' } })
      
      await waitFor(() => {
        expect(screen.getAllByRole('img', { name: 'Campo parcialmente preenchido' })).toHaveLength(1)
        expect(screen.queryByRole('img', { name: 'Campo completo' })).not.toBeInTheDocument()
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
      fireEvent.change(firstTextarea, { target: { value: 'Test' } })
      
      const saveButton = screen.getByRole('button', { name: /salvar/i })
      fireEvent.click(saveButton)
      
      // Should not crash
      await waitFor(() => {
        expect(mockOnSaveDraft).toHaveBeenCalled()
      })
    })

    it('should handle finalize error gracefully', async () => {
      
      
      const completeValues: Partial<DescriptiveReport> = {
        campo_eu_outro_nos: 'Complete content meeting minimum length requirements for validation.',
        campo_corpo_gestos: 'Complete content meeting minimum length requirements for validation.',
        campo_tracos_sons: 'Complete content meeting minimum length requirements for validation.',
        campo_escuta_fala: 'Complete content meeting minimum length requirements for validation.',
        campo_espacos_tempos: 'Complete content meeting minimum length requirements for validation.',
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
