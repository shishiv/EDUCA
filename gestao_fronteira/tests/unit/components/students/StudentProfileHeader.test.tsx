import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StudentProfileHeader } from '@/components/students/StudentProfileHeader'

/**
 * Unit Tests: StudentProfileHeader Component
 * Tests for large avatar header with student info and stats
 */

describe('StudentProfileHeader', () => {
  const mockStudent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nome_completo: 'João Silva Santos',
    data_nascimento: '2015-03-15',
    foto_url: null,
  }

  describe('Basic Rendering', () => {
    it('should render student name', () => {
      render(<StudentProfileHeader student={mockStudent} />)
      
      expect(screen.getByText('João Silva Santos')).toBeInTheDocument()
    })

    it('should render student avatar with initials', () => {
      render(<StudentProfileHeader student={mockStudent} />)
      
      // Should show initials "JS" for João Silva
      expect(screen.getByText('JS')).toBeInTheDocument()
    })

    it('should calculate and display age correctly', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 8) // 8 years ago
      
      const student = {
        ...mockStudent,
        data_nascimento: birthDate.toISOString().split('T')[0],
      }
      
      render(<StudentProfileHeader student={student} />)
      
      expect(screen.getByText(/8 anos/i)).toBeInTheDocument()
    })

    it('should display singular "ano" for 1 year old', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 1) // 1 year ago
      
      const student = {
        ...mockStudent,
        data_nascimento: birthDate.toISOString().split('T')[0],
      }
      
      render(<StudentProfileHeader student={student} />)
      
      expect(screen.getByText(/1 ano/i)).toBeInTheDocument()
    })

    it('should display birth date in Brazilian format', () => {
      render(<StudentProfileHeader student={mockStudent} />)
      
      // March 15, 2015 should display as 15/03/2015
      expect(screen.getByText('15/03/2015')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <StudentProfileHeader student={mockStudent} className="custom-class" />
      )
      
      const element = container.querySelector('.custom-class')
      expect(element).toBeInTheDocument()
    })
  })

  describe('Avatar', () => {
    it('should show avatar image when foto_url is provided', () => {
      const studentWithPhoto = {
        ...mockStudent,
        foto_url: 'https://example.com/photo.jpg',
      }
      
      render(<StudentProfileHeader student={studentWithPhoto} />)
      
      const img = screen.getByRole('img', { name: mockStudent.nome_completo })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src')
    })

    it('should show initials fallback when no photo', () => {
      render(<StudentProfileHeader student={mockStudent} />)
      
      expect(screen.getByText('JS')).toBeInTheDocument()
    })

    it('should generate correct initials for single name', () => {
      const student = {
        ...mockStudent,
        nome_completo: 'Maria',
      }
      
      render(<StudentProfileHeader student={student} />)
      
      expect(screen.getByText('MA')).toBeInTheDocument()
    })

    it('should generate correct initials for multiple names', () => {
      const student = {
        ...mockStudent,
        nome_completo: 'Ana Paula Costa Lima',
      }
      
      render(<StudentProfileHeader student={student} />)
      
      // Should take first 2 letters: AP
      expect(screen.getByText('AP')).toBeInTheDocument()
    })

    it('should uppercase initials', () => {
      const student = {
        ...mockStudent,
        nome_completo: 'joão silva',
      }
      
      render(<StudentProfileHeader student={student} />)
      
      expect(screen.getByText('JS')).toBeInTheDocument()
    })
  })

  describe('Age Calculation', () => {
    it('should calculate age correctly before birthday', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setFullYear(today.getFullYear() - 10)
      birthDate.setMonth(today.getMonth() + 1) // Birthday next month
      
      const student = {
        ...mockStudent,
        data_nascimento: birthDate.toISOString().split('T')[0],
      }
      
      render(<StudentProfileHeader student={student} />)
      
      // Should be 9 years old (birthday hasn't happened yet)
      expect(screen.getByText(/9 anos/i)).toBeInTheDocument()
    })

    it('should calculate age correctly after birthday', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setFullYear(today.getFullYear() - 10)
      birthDate.setMonth(today.getMonth() - 1) // Birthday last month
      
      const student = {
        ...mockStudent,
        data_nascimento: birthDate.toISOString().split('T')[0],
      }
      
      render(<StudentProfileHeader student={student} />)
      
      // Should be 10 years old
      expect(screen.getByText(/10 anos/i)).toBeInTheDocument()
    })

    it('should handle birthday on same day', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setFullYear(today.getFullYear() - 7)
      
      const student = {
        ...mockStudent,
        data_nascimento: birthDate.toISOString().split('T')[0],
      }
      
      render(<StudentProfileHeader student={student} />)
      
      expect(screen.getByText(/7 anos/i)).toBeInTheDocument()
    })

    it('should handle newborn (0 years)', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setMonth(today.getMonth() - 6) // 6 months ago
      
      const student = {
        ...mockStudent,
        data_nascimento: birthDate.toISOString().split('T')[0],
      }
      
      render(<StudentProfileHeader student={student} />)
      
      expect(screen.getByText(/0 anos/i)).toBeInTheDocument()
    })
  })

  describe('Stats Display', () => {
    it('should not render stats section when not provided', () => {
      render(<StudentProfileHeader student={mockStudent} />)
      
      expect(screen.queryByText(/vivencia/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/frequencia/i)).not.toBeInTheDocument()
    })

    it('should render vivencias count', () => {
      const stats = { vivencias: 12 }
      
      render(<StudentProfileHeader student={mockStudent} stats={stats} />)
      
      expect(screen.getByText('12 vivencias')).toBeInTheDocument()
    })

    it('should render singular vivencia for 1', () => {
      const stats = { vivencias: 1 }
      
      render(<StudentProfileHeader student={mockStudent} stats={stats} />)
      
      expect(screen.getByText('1 vivencia')).toBeInTheDocument()
    })

    it('should render frequencia percentage', () => {
      const stats = { frequencia: 87 }
      
      render(<StudentProfileHeader student={mockStudent} stats={stats} />)
      
      expect(screen.getByText('87% frequencia')).toBeInTheDocument()
    })

    it('should render both stats when provided', () => {
      const stats = { vivencias: 15, frequencia: 92 }
      
      render(<StudentProfileHeader student={mockStudent} stats={stats} />)
      
      expect(screen.getByText('15 vivencias')).toBeInTheDocument()
      expect(screen.getByText('92% frequencia')).toBeInTheDocument()
    })

    it('should handle 0 vivencias', () => {
      const stats = { vivencias: 0 }
      
      render(<StudentProfileHeader student={mockStudent} stats={stats} />)
      
      expect(screen.getByText('0 vivencias')).toBeInTheDocument()
    })

    it('should handle 100% frequencia', () => {
      const stats = { frequencia: 100 }
      
      render(<StudentProfileHeader student={mockStudent} stats={stats} />)
      
      expect(screen.getByText('100% frequencia')).toBeInTheDocument()
    })
  })

  describe('Responsive Layout', () => {
    it('should have flex layout classes', () => {
      const { container } = render(<StudentProfileHeader student={mockStudent} />)
      
      const wrapper = container.querySelector('.flex')
      expect(wrapper).toBeInTheDocument()
      expect(wrapper).toHaveClass('items-start', 'gap-6')
    })

    it('should have responsive avatar sizes', () => {
      const { container } = render(<StudentProfileHeader student={mockStudent} />)
      
      const avatar = container.querySelector('[class*="h-24"]')
      expect(avatar).toHaveClass('lg:h-[120px]', 'lg:w-[120px]')
    })

    it('should have responsive text sizes', () => {
      render(<StudentProfileHeader student={mockStudent} />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-2xl', 'lg:text-3xl')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty name gracefully', () => {
      const student = {
        ...mockStudent,
        nome_completo: '',
      }
      
      render(<StudentProfileHeader student={student} />)
      
      // Should render empty string without crashing
      expect(screen.queryByRole('heading')).toBeInTheDocument()
    })

    it('should handle very long name', () => {
      const student = {
        ...mockStudent,
        nome_completo: 'Nome Muito Longo Com Muitas Palavras Para Testar Truncamento Do Texto',
      }
      
      render(<StudentProfileHeader student={student} />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('truncate')
    })

    it('should handle invalid date gracefully', () => {
      const student = {
        ...mockStudent,
        data_nascimento: 'invalid-date',
      }
      
      render(<StudentProfileHeader student={student} />)
      
      // Should render without crashing
      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('should handle very old student', () => {
      const student = {
        ...mockStudent,
        data_nascimento: '1990-01-01',
      }
      
      render(<StudentProfileHeader student={student} />)
      
      // Should calculate age correctly even for old dates
      const ageText = screen.getByText(/\d+ anos/i)
      expect(ageText).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<StudentProfileHeader student={mockStudent} />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('João Silva Santos')
    })

    it('should have alt text for avatar image', () => {
      const studentWithPhoto = {
        ...mockStudent,
        foto_url: 'https://example.com/photo.jpg',
      }
      
      render(<StudentProfileHeader student={studentWithPhoto} />)
      
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('alt', mockStudent.nome_completo)
    })

    it('should have appropriate color contrast for text', () => {
      render(<StudentProfileHeader student={mockStudent} />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-gray-900')
    })
  })
})
