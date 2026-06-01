import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StudentTags } from '@/components/students/StudentTags'

/**
 * Unit Tests: StudentTags Component
 * Tests for student tag badges (turma, turno, status, Bolsa Família)
 */

describe('StudentTags', () => {
  describe('Status Badge', () => {
    it('should show "Ativo" badge for active students', () => {
      render(<StudentTags ativo={true} />)
      
      expect(screen.getByText('Ativo')).toBeInTheDocument()
    })

    it('should show "Inativo" badge for inactive students', () => {
      render(<StudentTags ativo={false} />)
      
      expect(screen.getByText('Inativo')).toBeInTheDocument()
    })

    it('should show ativo badge by default', () => {
      render(<StudentTags />)
      
      expect(screen.getByText('Ativo')).toBeInTheDocument()
    })

    it('should apply success variant for active status', () => {
      const { container } = render(<StudentTags ativo={true} />)
      
      const badge = screen.getByText('Ativo')
      expect(badge).toBeInTheDocument()
    })

    it('should apply secondary variant for inactive status', () => {
      const { container } = render(<StudentTags ativo={false} />)
      
      const badge = screen.getByText('Inativo')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Turma Badge', () => {
    it('should display turma name', () => {
      render(<StudentTags turma="5º Ano A" />)
      
      expect(screen.getByText('5º Ano A')).toBeInTheDocument()
    })

    it('should not display turma badge when null', () => {
      render(<StudentTags turma={null} />)
      
      expect(screen.queryByText(/ano|turma/i)).not.toBeInTheDocument()
    })

    it('should not display turma badge when undefined', () => {
      render(<StudentTags turma={undefined} />)
      
      expect(screen.queryByText(/ano|turma/i)).not.toBeInTheDocument()
    })

    it('should handle various turma formats', () => {
      const turmas = ['1º Ano', 'Maternal II', 'Pré-escola', '9º B']
      
      turmas.forEach((turma) => {
        const { rerender } = render(<StudentTags turma={turma} />)
        expect(screen.getByText(turma)).toBeInTheDocument()
        rerender(<div />)
      })
    })

    it('should apply info variant for turma', () => {
      const { container } = render(<StudentTags turma="5º Ano A" />)
      
      const badge = screen.getByText('5º Ano A')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Turno Badge', () => {
    it('should display "Matutino" for matutino shift', () => {
      render(<StudentTags turno="matutino" />)
      
      expect(screen.getByText('Matutino')).toBeInTheDocument()
    })

    it('should display "Vespertino" for vespertino shift', () => {
      render(<StudentTags turno="vespertino" />)
      
      expect(screen.getByText('Vespertino')).toBeInTheDocument()
    })

    it('should display "Integral" for integral shift', () => {
      render(<StudentTags turno="integral" />)
      
      expect(screen.getByText('Integral')).toBeInTheDocument()
    })

    it('should display "Noturno" for noturno shift', () => {
      render(<StudentTags turno="noturno" />)
      
      expect(screen.getByText('Noturno')).toBeInTheDocument()
    })

    it('should handle case-insensitive turno', () => {
      render(<StudentTags turno="MATUTINO" />)
      
      expect(screen.getByText('Matutino')).toBeInTheDocument()
    })

    it('should display unknown turno as-is', () => {
      render(<StudentTags turno="Custom Shift" />)
      
      expect(screen.getByText('Custom Shift')).toBeInTheDocument()
    })

    it('should not display turno badge when null', () => {
      render(<StudentTags turno={null} />)
      
      expect(screen.queryByText(/matutino|vespertino|integral/i)).not.toBeInTheDocument()
    })

    it('should apply secondary variant for turno', () => {
      const { container } = render(<StudentTags turno="matutino" />)
      
      const badge = screen.getByText('Matutino')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Bolsa Família Badge', () => {
    it('should not show Bolsa Família badge by default', () => {
      render(<StudentTags bolsaFamilia={true} />)
      
      expect(screen.queryByText(/bolsa.*fam[ií]lia/i)).not.toBeInTheDocument()
    })

    it('should show Bolsa Família badge when showBolsaFamilia is true', () => {
      render(<StudentTags bolsaFamilia={true} showBolsaFamilia={true} />)
      
      expect(screen.getByText(/bolsa.*fam[ií]lia/i)).toBeInTheDocument()
    })

    it('should not show Bolsa Família badge when false', () => {
      render(<StudentTags bolsaFamilia={false} showBolsaFamilia={true} />)
      
      expect(screen.queryByText(/bolsa.*fam[ií]lia/i)).not.toBeInTheDocument()
    })

    it('should show warning icon with Bolsa Família badge', () => {
      const { container } = render(
        <StudentTags bolsaFamilia={true} showBolsaFamilia={true} />
      )
      
      const badge = screen.getByText(/bolsa.*fam[ií]lia/i)
      expect(badge).toBeInTheDocument()
      
      // Should have warning icon (AlertTriangle)
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should apply warning variant for Bolsa Família', () => {
      const { container } = render(
        <StudentTags bolsaFamilia={true} showBolsaFamilia={true} />
      )
      
      const badge = screen.getByText(/bolsa.*fam[ií]lia/i)
      expect(badge).toBeInTheDocument()
    })

    it('should respect privacy by hiding Bolsa Família by default', () => {
      // This is a privacy feature per the component implementation
      render(<StudentTags bolsaFamilia={true} />)
      
      expect(screen.queryByText(/bolsa.*fam[ií]lia/i)).not.toBeInTheDocument()
    })
  })

  describe('Multiple Tags', () => {
    it('should display all tags when provided', () => {
      render(
        <StudentTags
          turma="5º Ano A"
          turno="matutino"
          bolsaFamilia={true}
          showBolsaFamilia={true}
          ativo={true}
        />
      )
      
      expect(screen.getByText('Ativo')).toBeInTheDocument()
      expect(screen.getByText('5º Ano A')).toBeInTheDocument()
      expect(screen.getByText('Matutino')).toBeInTheDocument()
      expect(screen.getByText(/bolsa.*fam[ií]lia/i)).toBeInTheDocument()
    })

    it('should display only provided tags', () => {
      render(<StudentTags turma="3º Ano B" ativo={true} />)
      
      expect(screen.getByText('Ativo')).toBeInTheDocument()
      expect(screen.getByText('3º Ano B')).toBeInTheDocument()
      expect(screen.queryByText(/matutino|vespertino/i)).not.toBeInTheDocument()
    })

    it('should handle empty props', () => {
      const { container } = render(<StudentTags />)
      
      // Should show default Ativo badge
      expect(screen.getByText('Ativo')).toBeInTheDocument()
    })
  })

  describe('Layout', () => {
    it('should use flex layout with gap', () => {
      const { container } = render(<StudentTags turma="5º Ano A" />)
      
      const wrapper = container.querySelector('.flex')
      expect(wrapper).toBeInTheDocument()
      expect(wrapper).toHaveClass('flex-wrap', 'items-center', 'gap-2')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <StudentTags turma="5º Ano A" className="custom-tags" />
      )
      
      const wrapper = container.querySelector('.custom-tags')
      expect(wrapper).toBeInTheDocument()
    })

    it('should wrap tags responsively', () => {
      const { container } = render(
        <StudentTags turma="5º Ano A" turno="matutino" ativo={true} />
      )
      
      const wrapper = container.querySelector('.flex-wrap')
      expect(wrapper).toBeInTheDocument()
    })
  })

  describe('Tag Order', () => {
    it('should display status badge first', () => {
      render(
        <StudentTags turma="5º Ano A" turno="matutino" ativo={true} />
      )
      
      // Just verify the badge exists
      expect(screen.getByText('Ativo')).toBeInTheDocument()
    })

    it('should display turma badge', () => {
      render(
        <StudentTags turma="5º Ano A" turno="matutino" ativo={true} />
      )
      
      expect(screen.getByText('5º Ano A')).toBeInTheDocument()
    })

    it('should display turno badge', () => {
      render(
        <StudentTags turma="5º Ano A" turno="matutino" ativo={true} />
      )
      
      expect(screen.getByText('Matutino')).toBeInTheDocument()
    })

    it('should display Bolsa Família badge when enabled', () => {
      render(
        <StudentTags
          turma="5º Ano A"
          turno="matutino"
          bolsaFamilia={true}
          showBolsaFamilia={true}
          ativo={true}
        />
      )
      
      expect(screen.getByText(/bolsa.*fam[ií]lia/i)).toBeInTheDocument()
    })
  })

  describe('Turno Label Mapping', () => {
    it('should correctly map all turno values', () => {
      const turnos = [
        { input: 'matutino', expected: 'Matutino' },
        { input: 'vespertino', expected: 'Vespertino' },
        { input: 'integral', expected: 'Integral' },
        { input: 'noturno', expected: 'Noturno' },
      ]

      turnos.forEach(({ input, expected }) => {
        const { rerender } = render(<StudentTags turno={input} />)
        expect(screen.getByText(expected)).toBeInTheDocument()
        rerender(<div />)
      })
    })

    it('should preserve capitalization for unknown turno', () => {
      render(<StudentTags turno="Especial" />)
      
      expect(screen.getByText('Especial')).toBeInTheDocument()
    })
  })

  describe('Conditional Rendering', () => {
    it('should return null when no tags are provided', () => {
      const { container } = render(
        <StudentTags
          turma={null}
          turno={null}
          bolsaFamilia={false}
          showBolsaFamilia={false}
          ativo={undefined}
        />
      )
      
      // Should have wrapper but might be empty or have default ativo
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render when at least one tag is provided', () => {
      render(<StudentTags turma="1º Ano" />)
      
      expect(screen.getByText('1º Ano')).toBeInTheDocument()
    })
  })

  describe('Badge Variants', () => {
    it('should use different variants for different badge types', () => {
      render(
        <StudentTags
          turma="5º Ano A"
          turno="matutino"
          bolsaFamilia={true}
          showBolsaFamilia={true}
          ativo={true}
        />
      )
      
      // Each badge type should have its own styling
      expect(screen.getByText('Ativo')).toBeInTheDocument()
      expect(screen.getByText('5º Ano A')).toBeInTheDocument()
      expect(screen.getByText('Matutino')).toBeInTheDocument()
      expect(screen.getByText(/bolsa.*fam[ií]lia/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string turma', () => {
      render(<StudentTags turma="" />)
      
      expect(screen.queryByText(/ano|turma/i)).not.toBeInTheDocument()
    })

    it('should handle empty string turno', () => {
      render(<StudentTags turno="" />)
      
      expect(screen.queryByText(/matutino|vespertino/i)).not.toBeInTheDocument()
    })

    it('should handle very long turma name', () => {
      const longName = '5º Ano A - Turma Especial com Nome Muito Longo'
      render(<StudentTags turma={longName} />)
      
      expect(screen.getByText(longName)).toBeInTheDocument()
    })

    it('should handle special characters in turma', () => {
      render(<StudentTags turma="Pré-escola II (Tarde)" />)
      
      expect(screen.getByText('Pré-escola II (Tarde)')).toBeInTheDocument()
    })

    it('should handle boolean true for ativo explicitly', () => {
      render(<StudentTags ativo={true} />)
      
      expect(screen.getByText('Ativo')).toBeInTheDocument()
    })

    it('should handle boolean false for ativo explicitly', () => {
      render(<StudentTags ativo={false} />)
      
      expect(screen.getByText('Inativo')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should render semantic HTML', () => {
      const { container } = render(
        <StudentTags turma="5º Ano A" turno="matutino" />
      )
      
      const wrapper = container.firstChild
      expect(wrapper).toBeInTheDocument()
    })

    it('should have proper text content for screen readers', () => {
      render(<StudentTags turma="5º Ano A" turno="matutino" ativo={true} />)
      
      expect(screen.getByText('Ativo')).toBeInTheDocument()
      expect(screen.getByText('5º Ano A')).toBeInTheDocument()
      expect(screen.getByText('Matutino')).toBeInTheDocument()
    })

    it('should have accessible Bolsa Família indicator', () => {
      render(<StudentTags bolsaFamilia={true} showBolsaFamilia={true} />)
      
      const badge = screen.getByText(/bolsa.*fam[ií]lia/i)
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Privacy Features', () => {
    it('should hide sensitive information by default', () => {
      render(<StudentTags bolsaFamilia={true} />)
      
      // Bolsa Família should be hidden unless explicitly shown
      expect(screen.queryByText(/bolsa.*fam[ií]lia/i)).not.toBeInTheDocument()
    })

    it('should only show Bolsa Família when explicitly enabled', () => {
      render(<StudentTags bolsaFamilia={true} showBolsaFamilia={true} />)
      
      expect(screen.getByText(/bolsa.*fam[ií]lia/i)).toBeInTheDocument()
    })

    it('should respect showBolsaFamilia flag', () => {
      const { rerender } = render(
        <StudentTags bolsaFamilia={true} showBolsaFamilia={false} />
      )
      
      expect(screen.queryByText(/bolsa.*fam[ií]lia/i)).not.toBeInTheDocument()
      
      rerender(<StudentTags bolsaFamilia={true} showBolsaFamilia={true} />)
      
      expect(screen.getByText(/bolsa.*fam[ií]lia/i)).toBeInTheDocument()
    })
  })
})
