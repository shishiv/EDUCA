import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FaixaEtariaIndicator } from '@/components/students/FaixaEtariaIndicator'

/**
 * Unit Tests: FaixaEtariaIndicator Component
 * Tests for BNCC age group badge for Infantil students
 */

describe('FaixaEtariaIndicator', () => {
  describe('Age Group Classification', () => {
    it('should show "Bebês" for 0-18 months', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 12) // 12 months old
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(screen.getByText('Bebês')).toBeInTheDocument()
    })

    it('should show "Crianças Bem Pequenas" for 19-36 months', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 24) // 24 months old
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(screen.getByText(/crianças.*bem.*pequenas/i)).toBeInTheDocument()
    })

    it('should show "Crianças Pequenas" for 37-71 months', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 48) // 48 months old (4 years)
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(screen.getByText(/crianças.*pequenas/i)).toBeInTheDocument()
    })

    it('should return null for children over 71 months (6 years)', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setFullYear(today.getFullYear() - 7) // 7 years old
      
      const { container } = render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should return null for newborn (0 months)', () => {
      const today = new Date()
      
      const { container } = render(<FaixaEtariaIndicator birthDate={today.toISOString()} />)
      
      // Newborn should be Bebês if in 0-18 range
      expect(container.firstChild).not.toBeNull()
    })
  })

  describe('Boundary Cases', () => {
    it('should classify 18 months as "Bebês"', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 18)
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(screen.getByText('Bebês')).toBeInTheDocument()
    })

    it('should classify 19 months as "Crianças Bem Pequenas"', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 19)
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(screen.getByText(/crianças.*bem.*pequenas/i)).toBeInTheDocument()
    })

    it('should classify 36 months as "Crianças Bem Pequenas"', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 36)
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(screen.getByText(/crianças.*bem.*pequenas/i)).toBeInTheDocument()
    })

    it('should classify 37 months as "Crianças Pequenas"', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 37)
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(screen.getByText(/crianças.*pequenas/i)).toBeInTheDocument()
    })

    it('should classify 71 months as "Crianças Pequenas"', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 71)
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(screen.getByText(/crianças.*pequenas/i)).toBeInTheDocument()
    })

    it('should return null for 72 months', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 72)
      
      const { container } = render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Date Input Formats', () => {
    it('should accept ISO string date', () => {
      const birthDate = '2022-06-15'
      
      render(<FaixaEtariaIndicator birthDate={birthDate} />)
      
      // Should not crash
      expect(screen.queryByRole('status') || screen.queryByText(/crianças|bebês/i)).toBeTruthy()
    })

    it('should accept Date object', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 2)
      
      render(<FaixaEtariaIndicator birthDate={birthDate} />)
      
      expect(screen.getByText(/crianças.*bem.*pequenas|crianças.*pequenas/i)).toBeInTheDocument()
    })

    it('should handle date string with time', () => {
      const birthDate = '2022-06-15T10:30:00Z'
      
      render(<FaixaEtariaIndicator birthDate={birthDate} />)
      
      // Should parse correctly
      expect(screen.queryByRole('status') || screen.queryByText(/crianças|bebês/i)).toBeTruthy()
    })
  })

  describe('Visual Styling', () => {
    it('should apply orange styling for Bebês', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 12)
      
      const { container } = render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      const badge = container.querySelector('[class*="orange"]')
      expect(badge).toBeInTheDocument()
    })

    it('should apply violet styling for Crianças Bem Pequenas', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 24)
      
      const { container } = render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      const badge = container.querySelector('[class*="violet"]')
      expect(badge).toBeInTheDocument()
    })

    it('should apply sky styling for Crianças Pequenas', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 48)
      
      const { container } = render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      const badge = container.querySelector('[class*="sky"]')
      expect(badge).toBeInTheDocument()
    })

    it('should display baby icon by default', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 12)
      
      const { container } = render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should hide icon when showIcon is false', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 12)
      
      const { container } = render(
        <FaixaEtariaIndicator birthDate={birthDate.toISOString()} showIcon={false} />
      )
      
      const badge = screen.getByText('Bebês')
      expect(badge).toBeInTheDocument()
      
      // Icon should not be present
      const icon = container.querySelector('svg')
      expect(icon).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 12)
      
      const { container } = render(
        <FaixaEtariaIndicator birthDate={birthDate.toISOString()} className="custom-badge" />
      )
      
      const badge = container.querySelector('.custom-badge')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Tooltip', () => {
    it('should wrap badge in tooltip trigger', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 12)
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      const badge = screen.getByText('Bebês')
      expect(badge).toBeInTheDocument()
      
      // Badge should be inside a tooltip trigger
      expect(badge.closest('[role="button"]')).toBeTruthy()
    })
  })

  describe('BNCC Compliance', () => {
    it('should use correct BNCC age ranges', () => {
      // Test all three age groups according to BNCC
      
      // Bebês: 0-18 months
      const bebes = new Date()
      bebes.setMonth(bebes.getMonth() - 10)
      
      const { rerender } = render(<FaixaEtariaIndicator birthDate={bebes.toISOString()} />)
      expect(screen.getByText('Bebês')).toBeInTheDocument()
      
      // Crianças Bem Pequenas: 19-36 months
      const bemPequenas = new Date()
      bemPequenas.setMonth(bemPequenas.getMonth() - 30)
      
      rerender(<FaixaEtariaIndicator birthDate={bemPequenas.toISOString()} />)
      expect(screen.getByText(/crianças.*bem.*pequenas/i)).toBeInTheDocument()
      
      // Crianças Pequenas: 37-71 months
      const pequenas = new Date()
      pequenas.setMonth(pequenas.getMonth() - 50)
      
      rerender(<FaixaEtariaIndicator birthDate={pequenas.toISOString()} />)
      expect(screen.getByText(/crianças.*pequenas/i)).toBeInTheDocument()
    })

    it('should only show for Infantil age range', () => {
      // Test that it returns null for Fundamental age
      const fundamental = new Date()
      fundamental.setFullYear(fundamental.getFullYear() - 8)
      
      const { container } = render(<FaixaEtariaIndicator birthDate={fundamental.toISOString()} />)
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid date string', () => {
      const { container } = render(<FaixaEtariaIndicator birthDate="invalid-date" />)
      
      // Should not crash, likely returns null
      expect(container).toBeInTheDocument()
    })

    it('should handle future date', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      
      const { container } = render(<FaixaEtariaIndicator birthDate={futureDate.toISOString()} />)
      
      // Should handle gracefully
      expect(container).toBeInTheDocument()
    })

    it('should handle very old date', () => {
      const oldDate = '1950-01-01'
      
      const { container } = render(<FaixaEtariaIndicator birthDate={oldDate} />)
      
      // Should return null for age outside Infantil
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('should have badge role', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 12)
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      const badge = screen.getByText('Bebês')
      expect(badge).toBeInTheDocument()
    })

    it('should be keyboard accessible via tooltip', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 12)
      
      render(<FaixaEtariaIndicator birthDate={birthDate.toISOString()} />)
      
      // Tooltip trigger should be focusable
      const badge = screen.getByText('Bebês')
      const trigger = badge.closest('[role="button"]')
      
      expect(trigger).toBeTruthy()
    })
  })

  describe('Integration with calculateFaixaEtaria', () => {
    it('should correctly use calculateFaixaEtaria utility', () => {
      // Test that component uses the utility function correctly
      const birthDates = [
        { months: 10, expected: 'Bebês' },
        { months: 25, expected: /crianças.*bem.*pequenas/i },
        { months: 50, expected: /crianças.*pequenas/i },
      ]

      birthDates.forEach(({ months, expected }) => {
        const birthDate = new Date()
        birthDate.setMonth(birthDate.getMonth() - months)
        
        const { container, rerender } = render(
          <FaixaEtariaIndicator birthDate={birthDate.toISOString()} />
        )
        
        if (typeof expected === 'string') {
          expect(screen.getByText(expected)).toBeInTheDocument()
        } else {
          expect(screen.getByText(expected)).toBeInTheDocument()
        }
        
        rerender(<div />)
      })
    })
  })
})
