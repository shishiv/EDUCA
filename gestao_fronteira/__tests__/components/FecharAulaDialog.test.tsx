/**
 * Unit tests for FecharAulaDialog component
 * Testing session closure with content summary and validation
 * Brazilian educational compliance implementation
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import userEvent from '@testing-library/user-event'
import { FecharAulaDialog } from '@/components/attendance/FecharAulaDialog'
import { toast } from 'sonner'

// Mock external dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  }
}))

// Mock date-fns for consistent testing
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '27/09/2025 15:30'),
  formatDistanceToNow: jest.fn(() => '2 horas'),
  differenceInMinutes: jest.fn(() => 120),
}))

// Test data for Brazilian educational context
const mockSession = {
  id: 'session-123',
  turma_id: 'turma-456',
  professor_id: 'prof-789',
  data_aula: '2025-09-27',
  status: 'ABERTA' as const,
  aberta_em: '2025-09-27T13:30:00Z',
  observacoes: 'Aula de matemática básica'
}

const mockAttendanceStats = {
  total: 25,
  presente: 20,
  falta: 3,
  justificada: 1,
  atestado: 1,
  percentualPresenca: 80
}

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  session: mockSession,
  attendanceStats: mockAttendanceStats,
  isLoading: false,
  className: 'test-fechar-dialog'
}

describe('FecharAulaDialog Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Dialog Rendering and Content', () => {
    it('should render dialog when open', () => {
      render(<FecharAulaDialog {...mockProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/fechar aula/i)).toBeInTheDocument()
    })

    it('should not render dialog when closed', () => {
      render(<FecharAulaDialog {...mockProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should display session information', () => {
      render(<FecharAulaDialog {...mockProps} />)

      expect(screen.getByText(/27\/09\/2025/)).toBeInTheDocument()
      expect(screen.getByText(/2 horas/)).toBeInTheDocument()
      expect(screen.getByText(/aula de matemática básica/i)).toBeInTheDocument()
    })

    it('should show comprehensive attendance summary', () => {
      render(<FecharAulaDialog {...mockProps} />)

      expect(screen.getByText('25')).toBeInTheDocument() // Total students
      expect(screen.getByText('20')).toBeInTheDocument() // Present
      expect(screen.getByText('3')).toBeInTheDocument() // Absent
      expect(screen.getByText('1')).toBeInTheDocument() // Justified
      expect(screen.getByText('1')).toBeInTheDocument() // Medical certificate
      expect(screen.getByText('80%')).toBeInTheDocument() // Attendance percentage
    })

    it('should display visual attendance chart', () => {
      render(<FecharAulaDialog {...mockProps} />)

      expect(screen.getByTestId('attendance-chart')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show color-coded segments
      expect(screen.getByTestId('present-segment')).toHaveStyle('width: 80%')
      expect(screen.getByTestId('absent-segment')).toHaveStyle('width: 12%')
    })
  })

  describe('Session Summary and Observations', () => {
    it('should allow adding final observations', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const observationsTextarea = screen.getByLabelText(/observações finais/i)

      await user.type(observationsTextarea, 'Excelente participação da turma. Todos os objetivos foram alcançados.')

      expect(observationsTextarea).toHaveValue('Excelente participação da turma. Todos os objetivos foram alcançados.')
    })

    it('should show character limit for observations', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const observationsTextarea = screen.getByLabelText(/observações finais/i)

      await user.type(observationsTextarea, 'Teste')

      expect(screen.getByText(/5\/500 caracteres/)).toBeInTheDocument()
    })

    it('should prevent exceeding character limit', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const longText = 'A'.repeat(501) // Exceed 500 character limit
      const observationsTextarea = screen.getByLabelText(/observações finais/i)

      await user.type(observationsTextarea, longText)

      expect(observationsTextarea.value.length).toBeLessThanOrEqual(500)
      expect(screen.getByText(/limite excedido/i)).toBeInTheDocument()
    })

    it('should display session duration and timing information', () => {
      render(<FecharAulaDialog {...mockProps} />)

      expect(screen.getByText(/duração da aula/i)).toBeInTheDocument()
      expect(screen.getByText(/2 horas/)).toBeInTheDocument()
      expect(screen.getByText(/13:30/)).toBeInTheDocument() // Start time
      expect(screen.getByText(/15:30/)).toBeInTheDocument() // Current time
    })

    it('should show content summary from lesson plan', () => {
      const sessionWithContent = {
        ...mockSession,
        conteudo_programatico: ['Números naturais', 'Operações básicas', 'Problemas simples'],
        objetivos_alcancados: ['Reconhecer números até 100', 'Realizar adições simples']
      }

      render(<FecharAulaDialog {...mockProps} session={sessionWithContent} />)

      expect(screen.getByText(/conteúdo trabalhado/i)).toBeInTheDocument()
      expect(screen.getByText('Números naturais')).toBeInTheDocument()
      expect(screen.getByText('Operações básicas')).toBeInTheDocument()

      expect(screen.getByText(/objetivos alcançados/i)).toBeInTheDocument()
      expect(screen.getByText('Reconhecer números até 100')).toBeInTheDocument()
    })
  })

  describe('Attendance Validation and Warnings', () => {
    it('should show warning for low attendance', () => {
      const lowAttendanceStats = {
        ...mockAttendanceStats,
        presente: 15,
        percentualPresenca: 60
      }

      render(<FecharAulaDialog {...mockProps} attendanceStats={lowAttendanceStats} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/frequência baixa/i)).toBeInTheDocument()
      expect(screen.getByText(/60%.*abaixo.*75%/i)).toBeInTheDocument()
    })

    it('should require confirmation for sessions with incomplete attendance', () => {
      const incompleteStats = {
        ...mockAttendanceStats,
        presente: 18,
        falta: 0,
        justificada: 0,
        atestado: 0, // Only 18 out of 25 marked
        percentualPresenca: 72
      }

      render(<FecharAulaDialog {...mockProps} attendanceStats={incompleteStats} />)

      expect(screen.getByText(/frequência incompleta/i)).toBeInTheDocument()
      expect(screen.getByText(/7 alunos não marcados/i)).toBeInTheDocument()

      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      expect(confirmButton).toBeDisabled()

      // Should require explicit confirmation
      const forceCloseCheckbox = screen.getByLabelText(/forçar fechamento/i)
      expect(forceCloseCheckbox).toBeInTheDocument()
    })

    it('should highlight problematic attendance patterns', () => {
      const problematicStats = {
        ...mockAttendanceStats,
        presente: 10,
        falta: 15, // High absenteeism
        percentualPresenca: 40
      }

      render(<FecharAulaDialog {...mockProps} attendanceStats={problematicStats} />)

      expect(screen.getByText(/padrão preocupante/i)).toBeInTheDocument()
      expect(screen.getByText(/alta taxa de faltas/i)).toBeInTheDocument()
      expect(screen.getByTestId('attendance-alert')).toHaveClass(/bg-red|text-red/)
    })

    it('should validate required attendance for government programs', () => {
      const bolsaFamiliaStudent = {
        ...mockAttendanceStats,
        bolsaFamiliaStudents: ['aluno-001', 'aluno-002'],
        bolsaFamiliaAttendance: {
          'aluno-001': { presente: true },
          'aluno-002': { presente: false } // Below required 85%
        }
      }

      render(<FecharAulaDialog {...mockProps} attendanceStats={bolsaFamiliaStudent} />)

      expect(screen.getByText(/bolsa família/i)).toBeInTheDocument()
      expect(screen.getByText(/aluno com frequência insuficiente/i)).toBeInTheDocument()
      expect(screen.getByText(/85%.*mínima/i)).toBeInTheDocument()
    })
  })

  describe('Session Closure Actions', () => {
    it('should close session successfully when confirmed', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const observationsTextarea = screen.getByLabelText(/observações finais/i)
      await user.type(observationsTextarea, 'Aula concluída com sucesso')

      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      await user.click(confirmButton)

      expect(mockProps.onConfirm).toHaveBeenCalledWith({
        observacoes_finais: 'Aula concluída com sucesso',
        fechada_em: expect.any(String),
        duracao_minutos: 120,
        attendance_summary: mockAttendanceStats
      })
    })

    it('should show loading state during closure', () => {
      render(<FecharAulaDialog {...mockProps} isLoading={true} />)

      const confirmButton = screen.getByRole('button', { name: /fechando aula/i })
      expect(confirmButton).toBeDisabled()
      expect(screen.getByText(/processando fechamento/i)).toBeInTheDocument()
    })

    it('should handle closure errors gracefully', async () => {
      const onConfirmWithError = jest.fn().mockRejectedValue(new Error('Closure failed'))

      render(<FecharAulaDialog {...mockProps} onConfirm={onConfirmWithError} />)

      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao fechar aula')
        )
      })
    })

    it('should cancel dialog without saving', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      await user.click(cancelButton)

      expect(mockProps.onClose).toHaveBeenCalled()
      expect(mockProps.onConfirm).not.toHaveBeenCalled()
    })

    it('should prevent accidental closure with confirmation', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      // Try to close with keyboard shortcut
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      // Should show confirmation dialog
      expect(screen.getByText(/tem certeza.*sair/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sair sem salvar/i })).toBeInTheDocument()
    })
  })

  describe('Auto-closure Compliance (18:00 Brazilian Law)', () => {
    it('should show auto-closure warning near 18:00', () => {
      // Mock current time as 17:50
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-27T17:50:00').getTime())

      render(<FecharAulaDialog {...mockProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/fechamento automático/i)).toBeInTheDocument()
      expect(screen.getByText(/10 minutos/i)).toBeInTheDocument()
      expect(screen.getByText(/18:00/)).toBeInTheDocument()
    })

    it('should force closure at exactly 18:00', () => {
      // Mock current time as 18:00
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-27T18:00:00').getTime())

      render(<FecharAulaDialog {...mockProps} />)

      expect(screen.getByText(/fechamento obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/legislação educacional brasileira/i)).toBeInTheDocument()

      const confirmButton = screen.getByRole('button')
      expect(confirmButton).toHaveTextContent(/fechar automaticamente/i)
    })

    it('should include auto-closure reason in session data', () => {
      // Mock auto-closure scenario
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-27T18:00:00').getTime())

      render(<FecharAulaDialog {...mockProps} />)

      // Should automatically trigger closure
      expect(mockProps.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          fechamento_automatico: true,
          motivo_fechamento: 'Auto-fechamento às 18:00 (legislação educacional brasileira)',
          fechada_em: expect.stringContaining('18:00')
        })
      )
    })
  })

  describe('Audit Trail and Compliance', () => {
    it('should generate comprehensive closure audit log', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      await user.click(confirmButton)

      expect(mockProps.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          audit_trail: expect.objectContaining({
            acao: 'fechamento_sessao',
            usuario_id: 'prof-789',
            timestamp: expect.any(String),
            dados_anteriores: expect.any(Object),
            dados_posteriores: expect.any(Object)
          })
        })
      )
    })

    it('should enforce "não existe o esquecer" principle', () => {
      render(<FecharAulaDialog {...mockProps} />)

      expect(screen.getByText(/não existe o esquecer/i)).toBeInTheDocument()
      expect(screen.getByText(/registro permanente/i)).toBeInTheDocument()
      expect(screen.getByText(/não poderá ser alterado/i)).toBeInTheDocument()
    })

    it('should include legal compliance information', () => {
      render(<FecharAulaDialog {...mockProps} />)

      expect(screen.getByText(/documento oficial/i)).toBeInTheDocument()
      expect(screen.getByText(/lei de diretrizes e bases/i)).toBeInTheDocument()
      expect(screen.getByText(/inep.*educacenso/i)).toBeInTheDocument()
    })

    it('should generate digital signature hash', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      await user.click(confirmButton)

      expect(mockProps.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          hash_verificacao: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA-256 hash
          timestamp_hash: expect.any(String),
          dados_hash: expect.any(String)
        })
      )
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<FecharAulaDialog {...mockProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')

      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      expect(confirmButton).toHaveAttribute('aria-describedby', expect.stringContaining('warning'))
    })

    it('should support keyboard navigation', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const observationsTextarea = screen.getByLabelText(/observações finais/i)
      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })

      // Tab navigation
      observationsTextarea.focus()
      expect(observationsTextarea).toHaveFocus()

      fireEvent.keyDown(observationsTextarea, { key: 'Tab' })
      expect(confirmButton).toHaveFocus()

      fireEvent.keyDown(confirmButton, { key: 'Tab' })
      expect(cancelButton).toHaveFocus()
    })

    it('should announce important changes to screen readers', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const observationsTextarea = screen.getByLabelText(/observações finais/i)
      await user.type(observationsTextarea, 'Teste')

      // Should have live region for character count
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent(/5\/500 caracteres/)
    })

    it('should have high contrast mode support', () => {
      render(<FecharAulaDialog {...mockProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass(/bg-white.*text-black|high-contrast/)

      const warningAlert = screen.getByRole('alert')
      expect(warningAlert).toHaveClass(/border.*contrast/)
    })
  })

  describe('Mobile and Touch Optimization', () => {
    it('should be responsive for tablet use', () => {
      render(<FecharAulaDialog {...mockProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass(/max-w-full.*sm:max-w/)

      const confirmButton = screen.getByRole('button', { name: /confirmar fechamento/i })
      const styles = getComputedStyle(confirmButton)
      expect(parseInt(styles.minHeight || '44')).toBeGreaterThanOrEqual(44)
    })

    it('should handle touch gestures', async () => {
      render(<FecharAulaDialog {...mockProps} />)

      const dialog = screen.getByRole('dialog')

      // Simulate swipe down to dismiss (should be prevented)
      fireEvent.touchStart(dialog, {
        touches: [{ clientX: 200, clientY: 100 }]
      })
      fireEvent.touchMove(dialog, {
        touches: [{ clientX: 200, clientY: 300 }]
      })
      fireEvent.touchEnd(dialog)

      // Should still be open (swipe dismiss disabled for critical dialog)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})