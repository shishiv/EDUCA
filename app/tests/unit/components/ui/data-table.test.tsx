import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'

type Row = { id: string; name: string; email: string; profile: { age: number } }
const data: Row[] = [
  { id: '1', name: 'João Silva', email: 'joao@example.com', profile: { age: 25 } },
  { id: '2', name: 'Maria Santos', email: 'maria@example.com', profile: { age: 30 } },
]
const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'profile.age', label: 'Idade' },
]

describe('ResponsiveDataTable', () => {
  it('renders semantic desktop table headers and rows', () => {
    render(<ResponsiveDataTable data={data} columns={columns} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
    expect(screen.getAllByText('João Silva').length).toBeGreaterThan(0)
    expect(screen.getAllByText('25').length).toBeGreaterThan(0)
  })

  it('renders a mobile card copy for every row', () => {
    const { container } = render(<ResponsiveDataTable data={data} columns={columns} />)
    expect(container.querySelector('.md\\:hidden')).toBeInTheDocument()
    expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0)
  })

  it('uses a caller-provided mobile template', () => {
    render(
      <ResponsiveDataTable
        data={data}
        columns={columns}
        mobileCardTemplate={row => <article>Mobile {row.name}</article>}
      />
    )
    expect(screen.getByText('Mobile João Silva')).toBeInTheDocument()
  })

  it('supports custom cell renderers and nested keys', () => {
    render(
      <ResponsiveDataTable
        data={data}
        columns={[...columns, { key: 'status', label: 'Status', render: row => `Aluno ${row.id}` }]}
      />
    )
    expect(screen.getAllByText('Aluno 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('30').length).toBeGreaterThan(0)
  })

  it('exposes accessible row actions', () => {
    const onView = vi.fn()
    render(
      <ResponsiveDataTable
        data={data}
        columns={columns}
        actions={[{ label: 'Visualizar', onClick: onView }]}
      />
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Visualizar' })[0])
    expect(onView).toHaveBeenCalledWith(data[0])
  })

  it('renders a loading skeleton instead of data', () => {
    const { container } = render(<ResponsiveDataTable data={data} columns={columns} loading />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders the configured empty state', () => {
    render(<ResponsiveDataTable data={[]} columns={columns} emptyMessage="Sem registros" />)
    expect(screen.getByText('Sem registros')).toBeInTheDocument()
  })

  it('applies the outer class name', () => {
    const { container } = render(<ResponsiveDataTable data={data} columns={columns} className="fixture-table" />)
    expect(container.querySelector('.fixture-table')).toBeInTheDocument()
  })
})
