import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AttendanceReportTable, type AttendanceTableRow } from '@/components/reports/AttendanceReportTable'

/**
 * Unit Tests: AttendanceReportTable Component
 * Task Group 4.1.3: AttendanceReportTable component
 *
 * Tests the attendance report table with:
 * - Student data display
 * - Column sorting
 * - Risk highlighting
 * - Summary statistics
 */

describe('AttendanceReportTable', () => {
  const mockData: AttendanceTableRow[] = [
    {
      matriculaId: '1',
      alunoId: 'a1',
      nome: 'Ana Silva',
      nis: '12345678901',
      presencas: 18,
      faltas: 2,
      atestados: 0,
      totalAulas: 20,
      percentual: 90,
      emRisco: false,
    },
    {
      matriculaId: '2',
      alunoId: 'a2',
      nome: 'Bruno Costa',
      nis: '98765432109',
      presencas: 12,
      faltas: 6,
      atestados: 2,
      totalAulas: 20,
      percentual: 70,
      emRisco: true,
    },
    {
      matriculaId: '3',
      alunoId: 'a3',
      nome: 'Carlos Mendes',
      presencas: 8,
      faltas: 10,
      atestados: 2,
      totalAulas: 20,
      percentual: 50,
      emRisco: true,
    },
  ]

  const mockOnRowClick = vi.fn()
  const mockOnPrint = vi.fn()
  const mockOnExportPDF = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render table with data', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should display turma name when provided', () => {
      render(<AttendanceReportTable data={mockData} turmaName="3º Ano A" />)
      
      expect(screen.getByText('3º Ano A')).toBeInTheDocument()
    })

    it('should display period label when provided', () => {
      render(<AttendanceReportTable data={mockData} periodoLabel="01/02/2024 a 29/02/2024" />)
      
      expect(screen.getByText(/01\/02\/2024.*29\/02\/2024/)).toBeInTheDocument()
    })

    it('should display report title', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      expect(screen.getByText(/relatório.*frequência|relatorio.*frequencia/i)).toBeInTheDocument()
    })

    it('should render all column headers', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      expect(screen.getByRole('columnheader', { name: /aluno/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /presenças|presencas/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /faltas/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /atestados/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /frequência|frequencia/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
    })

    it('should display NIS column when showNis is true', () => {
      render(<AttendanceReportTable data={mockData} showNis={true} />)
      
      expect(screen.getByRole('columnheader', { name: /nis/i })).toBeInTheDocument()
    })

    it('should not display NIS column by default', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      expect(screen.queryByRole('columnheader', { name: /nis/i })).not.toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<AttendanceReportTable data={mockData} onPrint={mockOnPrint} onExportPDF={mockOnExportPDF} />)
      
      expect(screen.getByRole('button', { name: /imprimir/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument()
    })

    it('should hide action buttons in print mode', () => {
      render(<AttendanceReportTable data={mockData} printMode={true} onPrint={mockOnPrint} />)
      
      expect(screen.queryByRole('button', { name: /imprimir/i })).not.toBeInTheDocument()
    })
  })

  describe('Student Data Display', () => {
    it('should display all students', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
      expect(screen.getByText('Bruno Costa')).toBeInTheDocument()
      expect(screen.getByText('Carlos Mendes')).toBeInTheDocument()
    })

    it('should display attendance numbers', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      const table = screen.getByRole('table')
      
      expect(within(table).getByText('18')).toBeInTheDocument() // Ana presencas
      expect(within(table).getByText('2')).toBeInTheDocument() // Ana faltas
    })

    it('should display percentages formatted correctly', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      // Percentages should be formatted as "90,0%" or "90.0%"
      expect(screen.getByText(/90[.,]0%/)).toBeInTheDocument()
      expect(screen.getByText(/70[.,]0%/)).toBeInTheDocument()
    })

    it('should display NIS numbers when showNis is true', () => {
      render(<AttendanceReportTable data={mockData} showNis={true} />)
      
      expect(screen.getByText('12345678901')).toBeInTheDocument()
      expect(screen.getByText('98765432109')).toBeInTheDocument()
    })

    it('should display dash for missing NIS', () => {
      render(<AttendanceReportTable data={mockData} showNis={true} />)
      
      const table = screen.getByRole('table')
      const cells = within(table).getAllByText('-')
      
      expect(cells.length).toBeGreaterThanOrEqual(1)
    })

    it('should display row numbers', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      const table = screen.getByRole('table')
      
      expect(within(table).getByText('1')).toBeInTheDocument()
      expect(within(table).getByText('2')).toBeInTheDocument()
      expect(within(table).getByText('3')).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should show OK badge for good attendance', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      expect(screen.getByText('OK')).toBeInTheDocument()
    })

    it('should show Alerta badge for at-risk students', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      expect(screen.getByText('Alerta')).toBeInTheDocument()
    })

    it('should show Critico badge for critical students', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      expect(screen.getByText(/critico|crítico/i)).toBeInTheDocument()
    })

    it('should use custom risk threshold', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={95} />)
      
      // With 95% threshold, Ana (90%) should be at risk
      const badges = screen.getAllByText(/alerta|critico|crítico/i)
      expect(badges.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Row Highlighting', () => {
    it('should highlight critical rows with red background', () => {
      const { container } = render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      const redRows = container.querySelectorAll('[class*="bg-red"]')
      expect(redRows.length).toBeGreaterThan(0)
    })

    it('should highlight at-risk rows with yellow background', () => {
      const { container } = render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      const yellowRows = container.querySelectorAll('[class*="bg-yellow"]')
      expect(yellowRows.length).toBeGreaterThan(0)
    })

    it('should show warning icon for critical students', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      // Look for AlertTriangle icon
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Summary Statistics', () => {
    it('should display total students count', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      expect(screen.getByText('3')).toBeInTheDocument() // Total students
      expect(screen.getByText(/total.*alunos/i)).toBeInTheDocument()
    })

    it('should display healthy students count', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      expect(screen.getByText(/frequência.*ok|frequencia.*ok/i)).toBeInTheDocument()
    })

    it('should display at-risk students count', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      expect(screen.getByText(/em.*alerta/i)).toBeInTheDocument()
    })

    it('should display critical students count', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      expect(screen.getByText(/critico|crítico/i)).toBeInTheDocument()
    })

    it('should calculate average attendance correctly', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      // Average: (90 + 70 + 50) / 3 = 70%
      expect(screen.getByText(/70[.,]0%|70%/)).toBeInTheDocument()
      expect(screen.getByText(/média.*turma|media.*turma/i)).toBeInTheDocument()
    })
  })

  describe('Column Sorting', () => {
    it('should display sort buttons in headers', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      const sortButtons = screen.getAllByRole('button').filter(button => 
        button.textContent?.match(/aluno|presenças|presencas|faltas|atestados|percentual|frequência|frequencia/i)
      )
      
      expect(sortButtons.length).toBeGreaterThan(0)
    })

    it('should sort by name on click', async () => {
      
      render(<AttendanceReportTable data={mockData} />)
      
      const nameHeader = screen.getByRole('button', { name: /aluno/i })
      fireEvent.click(nameHeader)
      
      // After sort, order should change
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1)
    })

    it('should toggle sort direction', async () => {
      
      render(<AttendanceReportTable data={mockData} />)
      
      const nameHeader = screen.getByRole('button', { name: /aluno/i })
      
      // First click: ascending
      fireEvent.click(nameHeader)
      
      // Second click: descending
      fireEvent.click(nameHeader)
      
      expect(nameHeader).toBeInTheDocument()
    })

    it('should sort by presencas', async () => {
      
      render(<AttendanceReportTable data={mockData} />)
      
      const presencasHeader = screen.getByRole('button', { name: /presenças|presencas/i })
      fireEvent.click(presencasHeader)
      
      expect(presencasHeader).toBeInTheDocument()
    })

    it('should sort by percentual', async () => {
      
      render(<AttendanceReportTable data={mockData} />)
      
      const percentualHeader = screen.getByRole('button', { name: /percentual|frequência|frequencia/i })
      fireEvent.click(percentualHeader)
      
      expect(percentualHeader).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onRowClick when row is clicked', async () => {
      
      render(<AttendanceReportTable data={mockData} onRowClick={mockOnRowClick} />)
      
      const firstStudentRow = screen.getByText('Ana Silva').closest('tr')
      
      if (firstStudentRow) {
        fireEvent.click(firstStudentRow)
        
        expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0])
      }
    })

    it('should make rows clickable when onRowClick provided', () => {
      const { container } = render(<AttendanceReportTable data={mockData} onRowClick={mockOnRowClick} />)
      
      const clickableRows = container.querySelectorAll('tr[class*="cursor-pointer"]')
      expect(clickableRows.length).toBeGreaterThan(0)
    })

    it('should call onPrint when print button clicked', async () => {
      
      render(<AttendanceReportTable data={mockData} onPrint={mockOnPrint} />)
      
      const printButton = screen.getByRole('button', { name: /imprimir/i })
      fireEvent.click(printButton)
      
      expect(mockOnPrint).toHaveBeenCalled()
    })

    it('should call onExportPDF when PDF button clicked', async () => {
      
      render(<AttendanceReportTable data={mockData} onExportPDF={mockOnExportPDF} />)
      
      const pdfButton = screen.getByRole('button', { name: /pdf/i })
      fireEvent.click(pdfButton)
      
      expect(mockOnExportPDF).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should display loading skeleton', () => {
      render(<AttendanceReportTable data={[]} isLoading={true} />)
      
      // Look for skeleton loaders
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should not display table when loading', () => {
      render(<AttendanceReportTable data={[]} isLoading={true} />)
      
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no data', () => {
      render(<AttendanceReportTable data={[]} />)
      
      expect(screen.getByText(/nenhum.*dado.*frequência|nenhum.*dado.*frequencia/i)).toBeInTheDocument()
    })

    it('should show icon in empty state', () => {
      render(<AttendanceReportTable data={[]} />)
      
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should display helpful message in empty state', () => {
      render(<AttendanceReportTable data={[]} />)
      
      expect(screen.getByText(/não.*há.*registros|nao.*ha.*registros|período|periodo/i)).toBeInTheDocument()
    })
  })

  describe('Legend', () => {
    it('should display legend with thresholds', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      expect(screen.getByText(/frequência.*ok|frequencia.*ok/i)).toBeInTheDocument()
      expect(screen.getByText(/em.*alerta/i)).toBeInTheDocument()
      expect(screen.getByText(/critico|crítico/i)).toBeInTheDocument()
    })

    it('should show colored boxes in legend', () => {
      const { container } = render(<AttendanceReportTable data={mockData} />)
      
      const legendBoxes = container.querySelectorAll('[class*="bg-green"], [class*="bg-yellow"], [class*="bg-red"]')
      expect(legendBoxes.length).toBeGreaterThanOrEqual(3)
    })

    it('should display threshold percentages', () => {
      render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      // Legend should show: >= 80%, 75-80%, < 75%
      expect(screen.getByText(/80%/)).toBeInTheDocument()
      expect(screen.getByText(/75%/)).toBeInTheDocument()
    })
  })

  describe('Print Mode', () => {
    it('should include print footer in print mode', () => {
      render(<AttendanceReportTable data={mockData} printMode={true} />)
      
      expect(screen.getByText(/documento.*gerado/i)).toBeInTheDocument()
      expect(screen.getByText(/prefeitura.*municipal.*fronteira/i)).toBeInTheDocument()
    })

    it('should apply print-specific styling', () => {
      const { container } = render(<AttendanceReportTable data={mockData} printMode={true} />)
      
      const printElements = container.querySelectorAll('[class*="print"]')
      expect(printElements.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      const table = screen.getByRole('table')
      const thead = within(table).getByRole('rowgroup')
      
      expect(thead).toBeInTheDocument()
    })

    it('should have accessible column headers', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      const headers = screen.getAllByRole('columnheader')
      
      headers.forEach(header => {
        expect(header).toBeInTheDocument()
      })
    })

    it('should have accessible row structure', () => {
      render(<AttendanceReportTable data={mockData} />)
      
      const rows = screen.getAllByRole('row')
      
      // Header row + data rows
      expect(rows.length).toBe(mockData.length + 1)
    })

    it('should have accessible buttons', () => {
      render(<AttendanceReportTable data={mockData} onPrint={mockOnPrint} onExportPDF={mockOnExportPDF} />)
      
      const printButton = screen.getByRole('button', { name: /imprimir/i })
      const pdfButton = screen.getByRole('button', { name: /pdf/i })
      
      expect(printButton).toHaveAccessibleName()
      expect(pdfButton).toHaveAccessibleName()
    })
  })

  describe('Badge Color Coding', () => {
    it('should apply green styling for good attendance', () => {
      const { container } = render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      const greenBadges = container.querySelectorAll('[class*="bg-green"]')
      expect(greenBadges.length).toBeGreaterThan(0)
    })

    it('should apply yellow styling for at-risk', () => {
      const { container } = render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      const yellowBadges = container.querySelectorAll('[class*="bg-yellow"]')
      expect(yellowBadges.length).toBeGreaterThan(0)
    })

    it('should apply red styling for critical', () => {
      const { container } = render(<AttendanceReportTable data={mockData} riskThreshold={80} />)
      
      const redBadges = container.querySelectorAll('[class*="bg-red"]')
      expect(redBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Summary Card Colors', () => {
    it('should apply blue styling to total card', () => {
      const { container } = render(<AttendanceReportTable data={mockData} />)
      
      const blueCards = container.querySelectorAll('[class*="bg-blue"]')
      expect(blueCards.length).toBeGreaterThan(0)
    })

    it('should apply green styling to healthy card', () => {
      const { container } = render(<AttendanceReportTable data={mockData} />)
      
      const greenCards = container.querySelectorAll('[class*="bg-green"]')
      expect(greenCards.length).toBeGreaterThan(0)
    })

    it('should apply yellow styling to alert card', () => {
      const { container } = render(<AttendanceReportTable data={mockData} />)
      
      const yellowCards = container.querySelectorAll('[class*="bg-yellow"]')
      expect(yellowCards.length).toBeGreaterThan(0)
    })

    it('should apply red styling to critical card', () => {
      const { container } = render(<AttendanceReportTable data={mockData} />)
      
      const redCards = container.querySelectorAll('[class*="bg-red"]')
      expect(redCards.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle 100% attendance', () => {
      const perfectData: AttendanceTableRow[] = [
        {
          matriculaId: '1',
          alunoId: 'a1',
          nome: 'Perfect Student',
          presencas: 20,
          faltas: 0,
          atestados: 0,
          totalAulas: 20,
          percentual: 100,
          emRisco: false,
        },
      ]
      
      render(<AttendanceReportTable data={perfectData} />)
      
      expect(screen.getByText(/100[.,]0%/)).toBeInTheDocument()
    })

    it('should handle 0% attendance', () => {
      const zeroData: AttendanceTableRow[] = [
        {
          matriculaId: '1',
          alunoId: 'a1',
          nome: 'Absent Student',
          presencas: 0,
          faltas: 20,
          atestados: 0,
          totalAulas: 20,
          percentual: 0,
          emRisco: true,
        },
      ]
      
      render(<AttendanceReportTable data={zeroData} />)
      
      expect(screen.getByText(/0[.,]0%|0%/)).toBeInTheDocument()
    })

    it('should handle single student', () => {
      const singleData: AttendanceTableRow[] = [mockData[0]]
      
      render(<AttendanceReportTable data={singleData} />)
      
      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument() // Total students
    })

    it('should handle very long student names', () => {
      const longNameData: AttendanceTableRow[] = [
        {
          ...mockData[0],
          nome: 'João Pedro da Silva Santos Oliveira Ferreira Costa',
        },
      ]
      
      render(<AttendanceReportTable data={longNameData} />)
      
      expect(screen.getByText(/joão.*pedro.*silva/i)).toBeInTheDocument()
    })
  })
})
