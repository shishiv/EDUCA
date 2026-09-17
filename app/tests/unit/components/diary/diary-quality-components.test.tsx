import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClassDiaryList } from '@/components/diary/ClassDiaryList'
import {
  DevelopmentReportWriter,
  type ReportFormValues,
} from '@/components/diary/DevelopmentReportWriter'
import type { ClassDiaryEntry } from '@/lib/api/class-diary'
import { renderWithMessages as render } from '../render-with-messages'

const diaryEntry = {
  id: 'session-1',
  data_aula: '2026-09-08',
  turma_id: 'class-1',
  turma_nome: 'Turma 1',
  turma_ano: 2026,
  turma_serie: '1º Ano',
  escola_id: 'school-1',
  escola_nome: 'Escola 1',
  professor_id: 'teacher-1',
  professor_nome: 'Professora 1',
  disciplina: null,
  status: 'ABERTA',
  fase: 'chamada',
  observacoes_abertura: null,
  observacoes_fechamento: null,
  total_alunos: 20,
  total_presentes: 16,
  total_ausentes: 4,
  aberta_em: '2026-09-08T08:00:00.000Z',
  fechada_em: null,
  travada_em: null,
  bloqueado: false,
} satisfies ClassDiaryEntry

const completeReport = {
  campo_eu: 'a'.repeat(50),
  campo_corpo: 'b'.repeat(50),
  campo_tracos: 'c'.repeat(50),
  campo_escuta: 'd'.repeat(50),
  campo_espacos: 'e'.repeat(50),
  observacoes_gerais: 'Síntese descritiva.',
} satisfies ReportFormValues

describe('diary quality refactors', () => {
  it('keeps preventive attendance styling and database-driven pagination controls', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    render(
      <ClassDiaryList
        entries={[diaryEntry]}
        onEntryClick={vi.fn()}
        onPageChange={onPageChange}
        currentPage={1}
        totalPages={2}
      />,
    )

    for (const percentage of screen.getAllByText(/80%/)) {
      expect(percentage).toHaveClass('text-amber-600')
    }

    await user.click(screen.getByRole('button', { name: /próxima/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('keeps descriptive finalization enabled only when every campo is complete', async () => {
    const user = userEvent.setup()
    const onFinalize = vi.fn<() => Promise<void>>().mockResolvedValue()

    render(
      <DevelopmentReportWriter
        studentName="Aluna Sintética"
        semesterLabel="2º semestre de 2026"
        initialValues={completeReport}
        onFinalize={onFinalize}
      />,
    )

    const finalize = screen.getByRole('button', { name: /finalizar/i })
    expect(finalize).toBeEnabled()
    await user.click(finalize)

    await waitFor(() => {
      expect(onFinalize).toHaveBeenCalledWith(completeReport)
    })
  })
})
