import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'

type TestRow = {
  id: string
  name: string
  email: string
}

const rows: TestRow[] = [
  { id: '1', name: 'João Silva', email: 'joao@example.com' },
  { id: '2', name: 'Maria Santos', email: 'maria@example.com' },
]

const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
]

describe('ResponsiveDataTable', () => {
  it('renders desktop headers, rows, and mobile cards from the same data', () => {
    render(<ResponsiveDataTable data={rows} columns={columns} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
    expect(screen.getAllByText('João Silva')).toHaveLength(2)
    expect(screen.getAllByText('maria@example.com')).toHaveLength(2)
  })

  it('supports nested values and custom cell rendering', () => {
    const nestedRows = [{ id: '1', profile: { name: 'Aluno Sintético' }, active: true }]
    render(
      <ResponsiveDataTable
        data={nestedRows}
        columns={[
          { key: 'profile.name', label: 'Aluno' },
          { key: 'active', label: 'Status', render: item => item.active ? 'Ativo' : 'Inativo' },
        ]}
      />
    )

    expect(screen.getAllByText('Aluno Sintético')).toHaveLength(2)
    expect(screen.getAllByText('Ativo')).toHaveLength(2)
  })

  it('renders a deterministic loading skeleton without row data', () => {
    const { container } = render(<ResponsiveDataTable data={rows} columns={columns} loading />)

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
  })

  it('renders default and custom empty messages', () => {
    const { rerender } = render(<ResponsiveDataTable<TestRow> data={[]} columns={columns} />)
    expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument()

    rerender(<ResponsiveDataTable<TestRow> data={[]} columns={columns} emptyMessage="Nenhum aluno encontrado." />)
    expect(screen.getByText('Nenhum aluno encontrado.')).toBeInTheDocument()
  })

  it('runs visible row actions', () => {
    const onView = vi.fn()
    render(
      <ResponsiveDataTable
        data={rows}
        columns={columns}
        actions={[{ label: 'Visualizar', onClick: onView }]}
      />
    )

    const desktopActionButtons = screen.getAllByRole('button')
    fireEvent.click(desktopActionButtons[0])
    expect(onView).toHaveBeenCalledWith(rows[0])
  })

  it('uses a custom mobile card template when supplied', () => {
    render(
      <ResponsiveDataTable
        data={rows}
        columns={columns}
        mobileCardTemplate={item => <article>Cartão: {item.name}</article>}
      />
    )

    expect(screen.getByText('Cartão: João Silva')).toBeInTheDocument()
    expect(screen.getByText('Cartão: Maria Santos')).toBeInTheDocument()
  })

  it('handles an empty columns contract without crashing', () => {
    render(<ResponsiveDataTable data={rows} columns={[]} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
