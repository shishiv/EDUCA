import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TurmaCardView } from '@/components/turmas/TurmaCard'
import '@testing-library/jest-dom'

describe('TurmaCard', () => {
  const mockTurma = {
    id: '1',
    nome: '5º Ano A',
    serie: '5º Ano',
    turno: 'matutino' as const,
    escola: { nome: 'EMEF Professor João Silva' },
    alunos_matriculados: 25,
    capacidade: 30,
    professor: { nome: 'Maria Silva' },
    ativo: true,
  }

  it('should render turma name', () => {
    render(<TurmaCardView turma={mockTurma} />)
    expect(screen.getByText('5º Ano A')).toBeInTheDocument()
  })

  it('should render escola name', () => {
    render(<TurmaCardView turma={mockTurma} />)
    expect(screen.getByText('EMEF Professor João Silva')).toBeInTheDocument()
  })

  it('should render student count', () => {
    render(<TurmaCardView turma={mockTurma} />)
    expect(screen.getByText(/25\/30/)).toBeInTheDocument()
  })

  it('should render turno badge', () => {
    render(<TurmaCardView turma={mockTurma} />)
    expect(screen.getByText('Matutino')).toBeInTheDocument()
  })

  it('should render professor name', () => {
    render(<TurmaCardView turma={mockTurma} />)
    expect(screen.getByText(/Prof\. Maria Silva/)).toBeInTheDocument()
  })

  it('should render chamada button', () => {
    render(<TurmaCardView turma={mockTurma} />)
    expect(screen.getByRole('button', { name: /fazer chamada/i })).toBeInTheDocument()
  })

  it('should render diario button', () => {
    render(<TurmaCardView turma={mockTurma} />)
    expect(screen.getByRole('button', { name: /ver diario|ver diário/i })).toBeInTheDocument()
  })

  it('should show occupation percentage', () => {
    render(<TurmaCardView turma={mockTurma} />)
    // 25/30 = 83%
    expect(screen.getByText(/83%/)).toBeInTheDocument()
  })

  it('should render inactive badge when turma is inactive', () => {
    const inactiveTurma = { ...mockTurma, ativo: false }
    render(<TurmaCardView turma={inactiveTurma} />)
    expect(screen.getByText('Inativa')).toBeInTheDocument()
  })

  it('should not render professor section when professor is null', () => {
    const turmaWithoutProfessor = { ...mockTurma, professor: null }
    render(<TurmaCardView turma={turmaWithoutProfessor} />)
    expect(screen.queryByText(/Prof\./)).not.toBeInTheDocument()
  })

  it('should render turno vespertino correctly', () => {
    const vespertinoTurma = { ...mockTurma, turno: 'vespertino' as const }
    render(<TurmaCardView turma={vespertinoTurma} />)
    expect(screen.getByText('Vespertino')).toBeInTheDocument()
  })

  it('should render turno integral correctly', () => {
    const integralTurma = { ...mockTurma, turno: 'integral' as const }
    render(<TurmaCardView turma={integralTurma} />)
    expect(screen.getByText('Integral')).toBeInTheDocument()
  })

  it('should show high occupation in red (>= 90%)', () => {
    const fullTurma = {
      ...mockTurma,
      alunos_matriculados: 28,
      capacidade: 30,
    }
    const { container } = render(<TurmaCardView turma={fullTurma} />)
    // 28/30 = 93%
    expect(screen.getByText(/93%/)).toBeInTheDocument()
    
    // Check for red color class
    const percentageElement = container.querySelector('span.text-red-600')
    expect(percentageElement).toBeInTheDocument()
  })

  it('should show medium occupation in orange (>= 75%)', () => {
    const mediumTurma = {
      ...mockTurma,
      alunos_matriculados: 24,
      capacidade: 30,
    }
    const { container } = render(<TurmaCardView turma={mediumTurma} />)
    // 24/30 = 80%
    expect(screen.getByText(/80%/)).toBeInTheDocument()
    
    // Check for orange color class
    const percentageElement = container.querySelector('span.text-orange-600')
    expect(percentageElement).toBeInTheDocument()
  })

  it('should show low occupation in green (< 75%)', () => {
    const lowTurma = {
      ...mockTurma,
      alunos_matriculados: 15,
      capacidade: 30,
    }
    const { container } = render(<TurmaCardView turma={lowTurma} />)
    // 15/30 = 50%
    expect(screen.getByText(/50%/)).toBeInTheDocument()
    
    // Check for green color class
    const percentageElement = container.querySelector('span.text-green-600')
    expect(percentageElement).toBeInTheDocument()
  })

  it('should handle zero capacity gracefully', () => {
    const zeroCapacityTurma = {
      ...mockTurma,
      capacidade: 0,
    }
    render(<TurmaCardView turma={zeroCapacityTurma} />)
    expect(screen.getByText(/25\/0/)).toBeInTheDocument()
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  it('should apply correct gradient for serie', () => {
    const { container } = render(<TurmaCardView turma={mockTurma} />)
    
    // Should have a gradient color band
    const colorBand = container.querySelector('.h-2.bg-gradient-to-r')
    expect(colorBand).toBeInTheDocument()
  })

  it('should apply pink gradient for berçário', () => {
    const bercarioTurma = {
      ...mockTurma,
      nome: 'Berçário A',
      serie: 'Berçário',
    }
    const { container } = render(<TurmaCardView turma={bercarioTurma} />)
    
    const colorBand = container.querySelector('.from-pink-400')
    expect(colorBand).toBeInTheDocument()
  })

  it('should apply pink gradient for maternal', () => {
    const maternalTurma = {
      ...mockTurma,
      nome: 'Maternal B',
      serie: 'Maternal',
    }
    const { container } = render(<TurmaCardView turma={maternalTurma} />)
    
    const colorBand = container.querySelector('.from-pink-400')
    expect(colorBand).toBeInTheDocument()
  })

  it('should apply pink gradient for pré', () => {
    const preTurma = {
      ...mockTurma,
      nome: 'Pré I',
      serie: 'Pré I',
    }
    const { container } = render(<TurmaCardView turma={preTurma} />)
    
    const colorBand = container.querySelector('.from-pink-400')
    expect(colorBand).toBeInTheDocument()
  })

  it('should apply orange gradient for fundamental I (1-5 ano)', () => {
    const { container } = render(<TurmaCardView turma={mockTurma} />)
    
    // 5º Ano should get orange
    const colorBand = container.querySelector('.from-orange-400')
    expect(colorBand).toBeInTheDocument()
  })

  it('should apply violet gradient for fundamental II (6-9 ano)', () => {
    const fundIITurma = {
      ...mockTurma,
      nome: '9º Ano B',
      serie: '9º Ano',
    }
    const { container } = render(<TurmaCardView turma={fundIITurma} />)
    
    const colorBand = container.querySelector('.from-violet-400')
    expect(colorBand).toBeInTheDocument()
  })

  it('should apply gray gradient for unknown serie', () => {
    const unknownTurma = {
      ...mockTurma,
      serie: 'Unknown',
    }
    const { container } = render(<TurmaCardView turma={unknownTurma} />)
    
    const colorBand = container.querySelector('.from-gray-400')
    expect(colorBand).toBeInTheDocument()
  })

  it('should be wrapped in a link', () => {
    const { container } = render(<TurmaCardView turma={mockTurma} />)
    
    const link = container.querySelector('a[href="/dashboard/turmas/1"]')
    expect(link).toBeInTheDocument()
  })

  it('should have hover effects', () => {
    const { container } = render(<TurmaCardView turma={mockTurma} />)
    
    const card = container.querySelector('.hover\\:shadow-md')
    expect(card).toBeInTheDocument()
  })

  it('should apply opacity when inactive', () => {
    const inactiveTurma = { ...mockTurma, ativo: false }
    const { container } = render(<TurmaCardView turma={inactiveTurma} />)
    
    const card = container.querySelector('.opacity-60')
    expect(card).toBeInTheDocument()
  })

  it('should call onChamada when chamada button clicked', () => {
    const onChamada = vi.fn()
    render(<TurmaCardView turma={mockTurma} onChamada={onChamada} />)
    
    const chamadaButton = screen.getByRole('button', { name: /fazer chamada/i })
    chamadaButton.click()
    
    expect(onChamada).toHaveBeenCalledWith('1')
  })

  it('should call onDiario when diario button clicked', () => {
    const onDiario = vi.fn()
    render(<TurmaCardView turma={mockTurma} onDiario={onDiario} />)
    
    const diarioButton = screen.getByRole('button', { name: /ver diario|ver diário/i })
    diarioButton.click()
    
    expect(onDiario).toHaveBeenCalledWith('1')
  })

  it('should render with all required props', () => {
    const minimalTurma = {
      id: '2',
      nome: 'Test Turma',
      serie: 'Test',
      turno: 'matutino' as const,
      escola: { nome: 'Test Escola' },
      alunos_matriculados: 0,
      capacidade: 20,
      professor: null,
      ativo: true,
    }
    
    render(<TurmaCardView turma={minimalTurma} />)
    expect(screen.getByText('Test Turma')).toBeInTheDocument()
    expect(screen.getByText('Test Escola')).toBeInTheDocument()
  })

  it('should truncate long names', () => {
    const longNameTurma = {
      ...mockTurma,
      nome: 'This is a very long turma name that should be truncated',
    }
    const { container } = render(<TurmaCardView turma={longNameTurma} />)
    
    const titleElement = container.querySelector('.truncate')
    expect(titleElement).toBeInTheDocument()
  })

  it('should display users icon', () => {
    const { container } = render(<TurmaCardView turma={mockTurma} />)
    
    // Users icon should be present (from lucide-react)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should display clock icon for turno', () => {
    const { container } = render(<TurmaCardView turma={mockTurma} />)
    
    // Multiple icons should be present
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(1)
  })
})
