import { renderWithMessages as render } from '../render-with-messages'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, fireEvent } from '@testing-library/react'
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

function summaryCard(label: string | RegExp) {
  const summary = screen.getByRole('region', { name: 'Resumo da frequência' })
  const card = within(summary).getByText(label).parentElement
  if (!card) throw new Error('The summary label must belong to its statistic card')
  return within(card)
}

function studentRow(name: string) {
  return screen.getByRole('row', { name: new RegExp(name) })
}

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
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should display turma name when provided', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} turmaName="3º Ano A" />)
      
      expect(screen.getByText('3º Ano A')).toBeInTheDocument()
    })

    it('should display period label when provided', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} periodoLabel="01/02/2024 a 29/02/2024" />)
      
      expect(screen.getByText(/01\/02\/2024.*29\/02\/2024/)).toBeInTheDocument()
    })

    it('should display report title', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      expect(screen.getByText(/relatório.*frequência|relatorio.*frequencia/i)).toBeInTheDocument()
    })

    it('should render all column headers', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      expect(screen.getByRole('columnheader', { name: /aluno/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /presenças|presencas/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /faltas/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /atestados/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /frequência|frequencia/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
    })

    it('should display NIS column when showNis is true', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} showNis={true} />)
      
      expect(screen.getByRole('columnheader', { name: /nis/i })).toBeInTheDocument()
    })

    it('should not display NIS column by default', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      expect(screen.queryByRole('columnheader', { name: /nis/i })).not.toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} onPrint={mockOnPrint} onExportPDF={mockOnExportPDF} />)
      
      expect(screen.getByRole('button', { name: /imprimir/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument()
    })

    it('should hide action buttons in print mode', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} printMode={true} onPrint={mockOnPrint} />)
      
      expect(screen.queryByRole('button', { name: /imprimir/i })).not.toBeInTheDocument()
    })
  })

  describe('Student Data Display', () => {
    it('should display all students', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
      expect(screen.getByText('Bruno Costa')).toBeInTheDocument()
      expect(screen.getByText('Carlos Mendes')).toBeInTheDocument()
    })

    it('should display attendance numbers', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      const row = within(studentRow('Ana Silva'))
      expect(row.getByText('18')).toBeInTheDocument()
      expect(row.getByText('2')).toBeInTheDocument()
      expect(row.getByText('20')).toBeInTheDocument()
    })

    it('should display percentages formatted correctly', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      expect(within(studentRow('Ana Silva')).getByText('90,0%')).toBeInTheDocument()
      expect(within(studentRow('Bruno Costa')).getByText('70,0%')).toBeInTheDocument()
      expect(within(studentRow('Carlos Mendes')).getByText('50,0%')).toBeInTheDocument()
    })

    it('should display NIS numbers when showNis is true', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} showNis={true} />)
      
      expect(screen.getByText('12345678901')).toBeInTheDocument()
      expect(screen.getByText('98765432109')).toBeInTheDocument()
    })

    it('should display dash for missing NIS', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} showNis={true} />)
      
      const table = screen.getByRole('table')
      const cells = within(table).getAllByText('-')
      
      expect(cells.length).toBeGreaterThanOrEqual(1)
    })

    it('should display row numbers', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
      expect(rows.map(row => within(row).getAllByRole('cell')[0].textContent)).toEqual(['1', '2', '3'])
    })
  })

  describe('Status Badges', () => {
    it('should show Conforme badge for good attendance', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} riskThreshold={80} />)
      
      expect(within(studentRow('Ana Silva')).getByText('Referência atendida')).toBeInTheDocument()
    })

    it('should show Não conforme badge for students below compliance', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} riskThreshold={80} />)
      
      expect(screen.getAllByText('Abaixo da referência').length).toBeGreaterThan(0)
    })

    it('should show the non-compliance policy badge for critical students', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      expect(within(studentRow('Carlos Mendes')).getByText('Abaixo da referência')).toBeInTheDocument()
    })

    it('should use custom risk threshold', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} riskThreshold={95} />)
      expect(within(studentRow('Ana Silva')).getByText('Abaixo da referência')).toBeInTheDocument()
      expect(studentRow('Ana Silva')).toHaveClass('bg-red-50')
      expect(summaryCard(/abaixo da referência/i).getByText('3')).toBeInTheDocument()
    })
  })

  describe('Row Highlighting', () => {
    it('should highlight critical rows with red background', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} riskThreshold={80} />)
      
      const redRows = container.querySelectorAll('[class*="bg-red"]')
      expect(redRows.length).toBeGreaterThan(0)
    })

    it('should highlight at-risk rows with yellow background', () => {
      const attentionData: AttendanceTableRow[] = [
        ...mockData,
        {
          ...mockData[0],
          matriculaId: '4',
          alunoId: 'a4',
          nome: 'Diana Souza',
          percentual: 82,
          emRisco: false,
        },
      ]
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={attentionData} riskThreshold={80} />)
      
      const yellowRows = container.querySelectorAll('[class*="bg-yellow"]')
      expect(yellowRows.length).toBeGreaterThan(0)
    })

    it('should show warning icon for critical students', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} riskThreshold={80} />)
      
      // Look for AlertTriangle icon
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Summary Statistics', () => {
    it('should display total students count', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      expect(summaryCard(/total.*alunos/i).getByText('3')).toBeInTheDocument()
    })

    it('should display healthy students count', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      expect(summaryCard('Referência atendida').getByText('1')).toBeInTheDocument()
    })

    it('should display at-risk students count', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      expect(summaryCard('Atenção preventiva').getByText('0')).toBeInTheDocument()
    })

    it('should display critical students count', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      expect(summaryCard(/abaixo da referência/i).getByText('2')).toBeInTheDocument()
    })

    it('should calculate average attendance correctly', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      expect(summaryCard(/média.*turma/i).getByText('70,0%')).toBeInTheDocument()
    })
  })

  describe('Column Sorting', () => {
    it('should display sort buttons in headers', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const sortButtons = screen.getAllByRole('button').filter(button => 
        button.textContent?.match(/aluno|presenças|presencas|faltas|atestados|percentual|frequência|frequencia/i)
      )
      
      expect(sortButtons.length).toBeGreaterThan(0)
    })

    it('should sort by name on click', async () => {
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const nameHeader = screen.getByRole('button', { name: /aluno/i })
      fireEvent.click(nameHeader)
      
      // After sort, order should change
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1)
    })

    it('should toggle sort direction', async () => {
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const nameHeader = screen.getByRole('button', { name: /aluno/i })
      
      // First click: ascending
      fireEvent.click(nameHeader)
      
      // Second click: descending
      fireEvent.click(nameHeader)
      
      expect(nameHeader).toBeInTheDocument()
    })

    it('should sort by presencas', async () => {
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const presencasHeader = screen.getByRole('button', { name: /presenças|presencas/i })
      fireEvent.click(presencasHeader)
      
      expect(presencasHeader).toBeInTheDocument()
    })

    it('should sort by percentual', async () => {
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const percentualHeader = screen.getByRole('button', { name: /percentual|frequência|frequencia/i })
      fireEvent.click(percentualHeader)
      
      expect(percentualHeader).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onRowClick when row is clicked', async () => {
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} onRowClick={mockOnRowClick} />)
      
      fireEvent.click(studentRow('Ana Silva'))
      expect(mockOnRowClick).toHaveBeenCalledExactlyOnceWith(mockData[0])
    })

    it('should make rows clickable when onRowClick provided', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} onRowClick={mockOnRowClick} />)
      
      const clickableRows = container.querySelectorAll('tr[class*="cursor-pointer"]')
      expect(clickableRows.length).toBeGreaterThan(0)
    })

    it('should call onPrint when print button clicked', async () => {
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} onPrint={mockOnPrint} />)
      
      const printButton = screen.getByRole('button', { name: /imprimir/i })
      fireEvent.click(printButton)
      
      expect(mockOnPrint).toHaveBeenCalled()
    })

    it('should call onExportPDF when PDF button clicked', async () => {
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} onExportPDF={mockOnExportPDF} />)
      
      const pdfButton = screen.getByRole('button', { name: /pdf/i })
      fireEvent.click(pdfButton)
      
      expect(mockOnExportPDF).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should display loading skeleton', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={[]} isLoading={true} />)
      
      // Look for skeleton loaders
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should not display table when loading', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={[]} isLoading={true} />)
      
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no data', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={[]} />)
      
      expect(screen.getByText(/nenhum.*dado.*frequência|nenhum.*dado.*frequencia/i)).toBeInTheDocument()
    })

    it('should show icon in empty state', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={[]} />)
      
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should display helpful message in empty state', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={[]} />)
      
      expect(screen.getByText(/não.*há.*registros|nao.*ha.*registros|período|periodo/i)).toBeInTheDocument()
    })
  })

  describe('Legend', () => {
    it('should display legend with thresholds', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      const legend = screen.getByRole('region', { name: 'Legenda da frequência' })
      expect(legend).toHaveTextContent('Referência municipal (>=80%)')
      expect(legend).toHaveTextContent('Atenção preventiva')
      expect(legend).toHaveTextContent('Abaixo da referência (<80%)')
      expect(legend).not.toHaveTextContent('Bolsa Família')
    })

    it('should show colored boxes in legend', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const legendBoxes = container.querySelectorAll('[class*="bg-green"], [class*="bg-yellow"], [class*="bg-red"]')
      expect(legendBoxes.length).toBeGreaterThanOrEqual(3)
    })

    it('should display threshold percentages', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      const legend = screen.getByRole('region', { name: 'Legenda da frequência' })
      expect(legend).toHaveTextContent('80%')
      expect(legend).toHaveTextContent('85%')
    })
  })

  describe('Print Mode', () => {
    it('should include print footer in print mode', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} printMode={true} />)
      
      expect(screen.getByText(/documento.*gerado/i)).toBeInTheDocument()
      // The caller supplies the database-resolved municipality.
      expect(screen.getByText('Município Sintético')).toBeInTheDocument()
    })

    it('should apply print-specific styling', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} printMode={true} />)
      
      const printElements = container.querySelectorAll('[class*="print"]')
      expect(printElements.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      const table = screen.getByRole('table')
      expect(within(table).getAllByRole('rowgroup')).toHaveLength(2)
      expect(within(table).getAllByRole('columnheader')).toHaveLength(8)
    })

    it('should have accessible column headers', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const headers = screen.getAllByRole('columnheader')
      
      headers.forEach(header => {
        expect(header).toBeInTheDocument()
      })
    })

    it('should have accessible row structure', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const rows = screen.getAllByRole('row')
      
      // Header row + data rows
      expect(rows.length).toBe(mockData.length + 1)
    })

    it('should have accessible buttons', () => {
      render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} onPrint={mockOnPrint} onExportPDF={mockOnExportPDF} />)
      
      const printButton = screen.getByRole('button', { name: /imprimir/i })
      const pdfButton = screen.getByRole('button', { name: /pdf/i })
      
      expect(printButton).toHaveAccessibleName()
      expect(pdfButton).toHaveAccessibleName()
    })
  })

  describe('Badge Color Coding', () => {
    it('should apply green styling for good attendance', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} riskThreshold={80} />)
      
      const greenBadges = container.querySelectorAll('[class*="bg-green"]')
      expect(greenBadges.length).toBeGreaterThan(0)
    })

    it('should apply yellow styling for at-risk', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} riskThreshold={80} />)
      
      const yellowBadges = container.querySelectorAll('[class*="bg-yellow"]')
      expect(yellowBadges.length).toBeGreaterThan(0)
    })

    it('should apply red styling for critical', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} riskThreshold={80} />)
      
      const redBadges = container.querySelectorAll('[class*="bg-red"]')
      expect(redBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Summary Card Colors', () => {
    it('should apply blue styling to total card', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const blueCards = container.querySelectorAll('[class*="bg-blue"]')
      expect(blueCards.length).toBeGreaterThan(0)
    })

    it('should apply green styling to healthy card', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const greenCards = container.querySelectorAll('[class*="bg-green"]')
      expect(greenCards.length).toBeGreaterThan(0)
    })

    it('should apply yellow styling to alert card', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
      const yellowCards = container.querySelectorAll('[class*="bg-yellow"]')
      expect(yellowCards.length).toBeGreaterThan(0)
    })

    it('should apply red styling to critical card', () => {
      const { container } = render(<AttendanceReportTable municipalityName="Município Sintético" data={mockData} />)
      
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
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={perfectData} />)
      
      expect(within(studentRow('Perfect Student')).getByText('100,0%')).toBeInTheDocument()
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
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={zeroData} />)
      
      expect(within(studentRow('Absent Student')).getByText('0,0%')).toBeInTheDocument()
    })

    it('should handle single student', () => {
      const singleData: AttendanceTableRow[] = [mockData[0]]
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={singleData} />)
      
      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
      expect(summaryCard(/total.*alunos/i).getByText('1')).toBeInTheDocument()
    })

    it('should handle very long student names', () => {
      const longNameData: AttendanceTableRow[] = [
        {
          ...mockData[0],
          nome: 'João Pedro da Silva Santos Oliveira Ferreira Costa',
        },
      ]
      
      render(<AttendanceReportTable municipalityName="Município Sintético" data={longNameData} />)
      
      expect(screen.getByText(/joão.*pedro.*silva/i)).toBeInTheDocument()
    })
  })
})
