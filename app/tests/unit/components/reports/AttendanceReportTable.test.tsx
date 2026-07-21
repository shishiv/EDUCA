import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { AttendanceReportTable, type AttendanceTableRow } from '@/components/reports/AttendanceReportTable'

const rows: AttendanceTableRow[] = [
  { matriculaId: 'm1', alunoId: 'a1', nome: 'Ana', presencas: 18, faltas: 2, atestados: 0, totalAulas: 20, percentual: 90 },
  { matriculaId: 'm2', alunoId: 'a2', nome: 'Bruno', presencas: 14, faltas: 5, atestados: 1, totalAulas: 20, percentual: 75 },
  { matriculaId: 'm3', alunoId: 'a3', nome: 'Carlos', presencas: 10, faltas: 10, atestados: 0, totalAulas: 20, percentual: 50 },
]

describe('AttendanceReportTable', () => {
  it('renders heading, period and semantic table columns', () => {
    render(<AttendanceReportTable data={rows} turmaName="1º Ano A" periodoLabel="Julho" />)
    expect(screen.getByRole('heading', { name: /relatorio de frequencia/i })).toBeInTheDocument()
    expect(screen.getByText(/periodo: julho/i)).toBeInTheDocument()
    for (const name of ['Aluno', 'Presencas', 'Faltas', 'Atestados', 'Total', 'Frequencia', 'Status']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(name, 'i') })).toBeInTheDocument()
    }
  })

  it('renders student values and risk statuses', () => {
    render(<AttendanceReportTable data={rows} />)
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Bruno')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('90,0%')).toBeInTheDocument()
    expect(screen.getByText(/critico/i)).toBeInTheDocument()
    expect(screen.getByText(/alerta/i)).toBeInTheDocument()
  })

  it('shows summary counts and average', () => {
    render(<AttendanceReportTable data={rows} />)
    expect(screen.getByText('Total de Alunos').parentElement).toHaveTextContent('3')
    expect(screen.getByText('Frequencia OK').parentElement).toHaveTextContent('1')
    expect(screen.getByText('Em Alerta').parentElement).toHaveTextContent('1')
    expect(screen.getByText(/Critico/).parentElement).toHaveTextContent('1')
    expect(screen.getByText('Media da Turma').parentElement).toHaveTextContent('72,0%')
  })

  it('sorts by student name in both directions', () => {
    render(<AttendanceReportTable data={[rows[2], rows[0], rows[1]]} />)
    const table = screen.getByRole('table')
    const names = () => within(table).getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[1].textContent)
    expect(names()).toEqual(['Ana', 'Bruno', 'Carlos'])
    fireEvent.click(screen.getByRole('button', { name: 'Aluno', exact: true }))
    expect(names()).toEqual(['Carlos', 'Bruno', 'Ana'])
  })

  it('calls row and export actions', () => {
    const onRowClick = vi.fn()
    const onPrint = vi.fn()
    const onExportPDF = vi.fn()
    render(<AttendanceReportTable data={rows} onRowClick={onRowClick} onPrint={onPrint} onExportPDF={onExportPDF} />)
    fireEvent.click(screen.getByText('Ana'))
    fireEvent.click(screen.getByRole('button', { name: /imprimir/i }))
    fireEvent.click(screen.getByRole('button', { name: /pdf/i }))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
    expect(onPrint).toHaveBeenCalledOnce()
    expect(onExportPDF).toHaveBeenCalledOnce()
  })

  it('shows NIS when requested', () => {
    render(<AttendanceReportTable data={[{ ...rows[0], nis: '12345678901' }]} showNis />)
    expect(screen.getByRole('columnheader', { name: 'NIS' })).toBeInTheDocument()
    expect(screen.getByText('12345678901')).toBeInTheDocument()
  })

  it('renders loading and empty states', () => {
    const { rerender, container } = render(<AttendanceReportTable data={[]} isLoading />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    rerender(<AttendanceReportTable data={[]} />)
    expect(screen.getByText(/nenhum dado de frequencia/i)).toBeInTheDocument()
  })
})
