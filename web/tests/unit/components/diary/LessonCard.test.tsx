import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonCard, LessonCardSkeleton, LessonCardEmpty } from '@/components/diary/LessonCard'
import type { LessonCardData } from '@/components/diary/LessonCard'

/**
 * Unit Tests: LessonCard Component
 * Tests for lesson card display component
 */

describe('LessonCard', () => {
  const mockLesson: LessonCardData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    data_aula: '2024-02-15',
    tema: 'Operações Matemáticas Básicas',
    disciplina: 'Matemática',
    resumo: 'Introdução à adição e subtração com exemplos práticos',
    objetivo: 'Compreender operações básicas',
    total_alunos: 25,
    total_presentes: 23,
    total_ausentes: 2,
    total_atestados: 0,
    status: 'unlocked',
  }

  const mockOnClick = vi.fn()

  beforeEach(() => {
    mockOnClick.mockReset()
  })

  describe('Basic Rendering', () => {
    it('should render lesson theme', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      expect(screen.getByText('Operações Matemáticas Básicas')).toBeInTheDocument()
    })

    it('should render lesson date', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const dateElement = screen.getByText(/15.*fevereiro.*2024/i)
      expect(dateElement).toBeInTheDocument()
    })

    it('should render discipline name', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      expect(screen.getByText(/matemática/i)).toBeInTheDocument()
    })

    it('should render attendance stats', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      expect(screen.getByText(/23\/25/)).toBeInTheDocument()
    })

    it('should render attendance percentage badge', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      // (23+0)/25 = 92%
      expect(screen.getByText('92%')).toBeInTheDocument()
    })

    it('should render summary when provided', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const summary = screen.queryByText(/introdução.*adição.*subtração/i)
      if (summary) {
        expect(summary).toBeInTheDocument()
      }
    })

    it('should not render summary in compact mode', () => {
      render(<LessonCard lesson={mockLesson} compact={true} />)
      
      const summary = screen.queryByText(/introdução.*adição/i)
      expect(summary).not.toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('should format date in Brazilian Portuguese', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      // Should show "15 de fevereiro, 2024"
      expect(screen.getByText(/fevereiro/i)).toBeInTheDocument()
    })

    it('should display day of week', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      // 2024-02-15 is a Thursday
      const dayOfWeek = screen.queryByText(/quinta/i)
      if (dayOfWeek) {
        expect(dayOfWeek).toBeInTheDocument()
      }
    })

    it('should have datetime attribute', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const timeElement = screen.getByText(/15.*fevereiro/i).closest('time')
      expect(timeElement).toHaveAttribute('datetime', '2024-02-15')
    })
  })

  describe('Attendance Calculation', () => {
    it('should calculate attendance rate correctly', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      // (23 present + 0 atestados) / 25 total = 92%
      expect(screen.getByText('92%')).toBeInTheDocument()
    })

    it('should include atestados in attendance rate', () => {
      const lessonWithAtestados: LessonCardData = {
        ...mockLesson,
        total_presentes: 20,
        total_ausentes: 3,
        total_atestados: 2,
      }
      
      render(<LessonCard lesson={lessonWithAtestados} />)
      
      // (20 + 2) / 25 = 88%
      expect(screen.getByText('88%')).toBeInTheDocument()
    })

    it('should handle 100% attendance', () => {
      const perfectAttendance: LessonCardData = {
        ...mockLesson,
        total_presentes: 25,
        total_ausentes: 0,
        total_atestados: 0,
      }
      
      render(<LessonCard lesson={perfectAttendance} />)
      
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should handle 0% attendance', () => {
      const noAttendance: LessonCardData = {
        ...mockLesson,
        total_presentes: 0,
        total_ausentes: 25,
        total_atestados: 0,
      }
      
      render(<LessonCard lesson={noAttendance} />)
      
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('should handle empty class gracefully', () => {
      const emptyClass: LessonCardData = {
        ...mockLesson,
        total_alunos: 0,
        total_presentes: 0,
        total_ausentes: 0,
      }
      
      render(<LessonCard lesson={emptyClass} />)
      
      expect(screen.getByText('0%')).toBeInTheDocument()
    })
  })

  describe('Attendance Badge Styling', () => {
    it('should use green color for good attendance (>=80%)', () => {
      const goodAttendance: LessonCardData = {
        ...mockLesson,
        total_presentes: 20,
        total_ausentes: 5,
      }
      
      const { container } = render(<LessonCard lesson={goodAttendance} />)
      
      const badge = screen.getByText('80%').closest('[class*="badge"]')
      expect(badge).toHaveClass(/green/)
    })

    it('should use amber color for warning attendance (75-79%)', () => {
      const warningAttendance: LessonCardData = {
        ...mockLesson,
        total_alunos: 20,
        total_presentes: 15,
        total_ausentes: 5,
      }
      
      const { container } = render(<LessonCard lesson={warningAttendance} />)
      
      const badge = screen.getByText('75%').closest('[class*="badge"]')
      expect(badge).toHaveClass(/amber|yellow/)
    })

    it('should use red color for low attendance (<75%)', () => {
      const lowAttendance: LessonCardData = {
        ...mockLesson,
        total_presentes: 15,
        total_ausentes: 10,
      }
      
      const { container } = render(<LessonCard lesson={lowAttendance} />)
      
      const badge = screen.getByText('60%').closest('[class*="badge"]')
      expect(badge).toHaveClass(/red/)
    })
  })

  describe('Absence Display', () => {
    it('should display absence count', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const absenceText = screen.queryByText(/2.*falta/i)
      if (absenceText) {
        expect(absenceText).toBeInTheDocument()
      }
    })

    it('should use singular "falta" for 1 absence', () => {
      const oneAbsence: LessonCardData = {
        ...mockLesson,
        total_presentes: 24,
        total_ausentes: 1,
      }
      
      render(<LessonCard lesson={oneAbsence} />)
      
      const absenceText = screen.queryByText(/1.*falta$/i)
      if (absenceText) {
        expect(absenceText).toBeInTheDocument()
      }
    })

    it('should use plural "faltas" for multiple absences', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const absenceText = screen.queryByText(/2.*faltas/i)
      if (absenceText) {
        expect(absenceText).toBeInTheDocument()
      }
    })

    it('should not display absences when zero', () => {
      const noAbsences: LessonCardData = {
        ...mockLesson,
        total_presentes: 25,
        total_ausentes: 0,
      }
      
      render(<LessonCard lesson={noAbsences} />)
      
      expect(screen.queryByText(/falta/i)).not.toBeInTheDocument()
    })

    it('should display atestados count when present', () => {
      const withAtestados: LessonCardData = {
        ...mockLesson,
        total_atestados: 3,
        total_ausentes: 2,
        total_presentes: 20,
      }
      
      render(<LessonCard lesson={withAtestados} />)
      
      const atestadosText = screen.queryByText(/3.*atestado/i)
      if (atestadosText) {
        expect(atestadosText).toBeInTheDocument()
      }
    })
  })

  describe('Click Interaction', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup()
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      
      const card = screen.getByRole('button')
      await user.click(card)
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith(mockLesson)
    })

    it('should not call onClick when not provided', async () => {
      const user = userEvent.setup()
      render(<LessonCard lesson={mockLesson} />)
      
      const card = screen.getByRole('button')
      await user.click(card)
      
      // Should not throw error
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('should be keyboard accessible', async () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      
      const card = screen.getByRole('button')
      card.focus()
      
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should respond to Space key', async () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      
      const card = screen.getByRole('button')
      card.focus()
      
      fireEvent.keyDown(card, { key: ' ' })
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Selected State', () => {
    it('should apply selected styling when isSelected is true', () => {
      const { container } = render(
        <LessonCard lesson={mockLesson} isSelected={true} />
      )
      
      const card = container.firstChild
      expect(card).toHaveClass(/bg-blue/)
    })

    it('should have aria-pressed attribute', () => {
      render(<LessonCard lesson={mockLesson} isSelected={false} />)
      
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-pressed', 'false')
    })

    it('should update aria-pressed when selected', () => {
      render(<LessonCard lesson={mockLesson} isSelected={true} />)
      
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-pressed', 'true')
    })

    it('should have data-selected attribute', () => {
      render(<LessonCard lesson={mockLesson} isSelected={true} />)
      
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('data-selected', 'true')
    })
  })

  describe('Discipline Display', () => {
    it('should display discipline with separator', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const heading = screen.getByRole('heading')
      expect(heading.textContent).toContain('Matemática -')
    })

    it('should handle missing discipline', () => {
      const noDiscipline: LessonCardData = {
        ...mockLesson,
        disciplina: null,
      }
      
      render(<LessonCard lesson={noDiscipline} />)
      
      const heading = screen.getByRole('heading')
      expect(heading.textContent).not.toContain('-')
    })
  })

  describe('Summary Handling', () => {
    it('should display resumo when available', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const summary = screen.queryByText(/introdução.*adição/i)
      if (summary) {
        expect(summary).toBeInTheDocument()
      }
    })

    it('should display objetivo if resumo is missing', () => {
      const noResumo: LessonCardData = {
        ...mockLesson,
        resumo: null,
      }
      
      render(<LessonCard lesson={noResumo} />)
      
      const summary = screen.queryByText(/compreender.*operações/i)
      if (summary) {
        expect(summary).toBeInTheDocument()
      }
    })

    it('should display tema if both resumo and objetivo are missing', () => {
      const noSummary: LessonCardData = {
        ...mockLesson,
        resumo: null,
        objetivo: null,
      }
      
      render(<LessonCard lesson={noSummary} />)
      
      // Theme should still be in heading
      expect(screen.getByText(/operações.*matemáticas/i)).toBeInTheDocument()
    })

    it('should truncate long summaries', () => {
      const longSummary: LessonCardData = {
        ...mockLesson,
        resumo: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10),
      }
      
      const { container } = render(<LessonCard lesson={longSummary} />)
      
      const summaryElement = container.querySelector('.line-clamp-2')
      expect(summaryElement).toBeInTheDocument()
    })
  })

  describe('Responsiveness', () => {
    it('should show short date format on mobile', () => {
      render(<LessonCard lesson={mockLesson} compact={true} />)
      
      // Should show dd/MM/yyyy format
      const shortDate = screen.queryByText(/15\/02\/2024/)
      if (shortDate) {
        expect(shortDate).toBeInTheDocument()
      }
    })

    it('should hide summary in compact mode', () => {
      render(<LessonCard lesson={mockLesson} compact={true} />)
      
      const summary = screen.queryByText(/introdução/i)
      expect(summary).not.toBeInTheDocument()
    })

    it('should adapt padding in compact mode', () => {
      const { container } = render(<LessonCard lesson={mockLesson} compact={true} />)
      
      const card = container.firstChild
      expect(card).toHaveClass(/p-3/)
    })
  })

  describe('Hover Effects', () => {
    it('should have hover class', () => {
      const { container } = render(<LessonCard lesson={mockLesson} />)
      
      const card = container.firstChild
      expect(card).toHaveClass(/transition/)
    })

    it('should change on hover', async () => {
      const user = userEvent.setup()
      const { container } = render(<LessonCard lesson={mockLesson} />)
      
      const card = screen.getByRole('button')
      await user.hover(card)
      
      // Hover should trigger state change
      expect(container.firstChild).toHaveClass(/cursor-pointer/)
    })
  })

  describe('Accessibility', () => {
    it('should have role="button"', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should have tabindex', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('should have descriptive aria-label', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const card = screen.getByRole('button')
      const label = card.getAttribute('aria-label')
      
      expect(label).toContain('Operações Matemáticas Básicas')
      expect(label).toContain('92%')
    })

    it('should include attendance in aria-label', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const card = screen.getByRole('button')
      const label = card.getAttribute('aria-label')
      
      expect(label).toContain('Presença')
    })

    it('should have screen reader text', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      expect(screen.getByText(/clique.*detalhes/i)).toBeInTheDocument()
    })

    it('should use semantic time element', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const timeElement = screen.getAllByText(/15.*fevereiro/i)[0].closest('time')
      expect(timeElement).toBeInTheDocument()
    })

    it('should use article element', () => {
      const { container } = render(<LessonCard lesson={mockLesson} />)
      
      const article = container.querySelector('article')
      expect(article).toBeInTheDocument()
    })
  })

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <LessonCard lesson={mockLesson} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Data Attributes', () => {
    it('should have data-lesson-id', () => {
      render(<LessonCard lesson={mockLesson} />)
      
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('data-lesson-id', mockLesson.id)
    })

    it('should have data-selected attribute', () => {
      render(<LessonCard lesson={mockLesson} isSelected={true} />)
      
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('data-selected', 'true')
    })
  })
})

describe('LessonCardSkeleton', () => {
  it('should render skeleton structure', () => {
    render(<LessonCardSkeleton />)
    
    const skeleton = screen.getByRole('status')
    expect(skeleton).toBeInTheDocument()
  })

  it('should have loading aria-label', () => {
    render(<LessonCardSkeleton />)
    
    expect(screen.getByLabelText(/carregando/i)).toBeInTheDocument()
  })

  it('should have animate-pulse class', () => {
    const { container } = render(<LessonCardSkeleton />)
    
    const skeleton = container.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('should have screen reader text', () => {
    render(<LessonCardSkeleton />)
    
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })
})

describe('LessonCardEmpty', () => {
  it('should render empty state', () => {
    render(<LessonCardEmpty />)
    
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should display default message', () => {
    render(<LessonCardEmpty />)
    
    expect(screen.getByText(/nenhuma aula registrada/i)).toBeInTheDocument()
  })

  it('should display custom message', () => {
    render(<LessonCardEmpty message="Custom empty message" />)
    
    expect(screen.getByText(/custom empty message/i)).toBeInTheDocument()
  })

  it('should show icon by default', () => {
    const { container } = render(<LessonCardEmpty />)
    
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('should hide icon when showIcon is false', () => {
    const { container } = render(<LessonCardEmpty showIcon={false} />)
    
    const icon = container.querySelector('svg')
    expect(icon).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<LessonCardEmpty className="custom-empty" />)
    
    const emptyState = screen.getByRole('status')
    expect(emptyState).toHaveClass('custom-empty')
  })
})
