import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ResponsiveDataTable, StudentDataTable } from '@/components/ui/responsive-data-table'

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

  it('renders an empty cell for a nested path that does not resolve', () => {
    render(
      <ResponsiveDataTable
        data={[{ id: '1', profile: { name: 'Aluno Sintético' } }]}
        columns={[
          { key: 'profile.name', label: 'Aluno' },
          { key: 'profile.responsavel.nome', label: 'Responsável' },
        ]}
      />
    )

    const cells = screen.getAllByRole('cell')
    expect(cells).toHaveLength(2)
    expect(cells[1]).toBeEmptyDOMElement()
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

  it('applies per-column class and width to the desktop header', () => {
    render(
      <ResponsiveDataTable
        data={rows}
        columns={[
          { key: 'name', label: 'Nome', className: 'text-left', width: '240px' },
          { key: 'email', label: 'E-mail' },
        ]}
      />
    )

    const header = screen.getByRole('columnheader', { name: 'Nome' })
    expect(header).toHaveClass('text-left')
    expect(header).toHaveStyle({ width: '240px' })
  })

  it('keeps hideOnMobile columns on desktop only and uses mobileLabel on the card', () => {
    render(
      <ResponsiveDataTable
        data={rows}
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'email', label: 'E-mail', mobileLabel: 'Contato' },
          { key: 'id', label: 'Identificador', hideOnMobile: true },
        ]}
      />
    )

    expect(screen.getByRole('columnheader', { name: 'Identificador' })).toBeInTheDocument()
    expect(screen.getAllByText('João Silva')).toHaveLength(2)
    expect(screen.getAllByText('joao@example.com')).toHaveLength(2)
    expect(screen.getAllByText('Contato:')).toHaveLength(2)
    expect(screen.queryByText('E-mail:')).not.toBeInTheDocument()
  })

  it('shows at most two secondary columns on the mobile card', () => {
    render(
      <ResponsiveDataTable
        data={[{ id: '1', a: 'A', b: 'B', c: 'C', d: 'D' }]}
        columns={[
          { key: 'a', label: 'Coluna A' },
          { key: 'b', label: 'Coluna B' },
          { key: 'c', label: 'Coluna C' },
          { key: 'd', label: 'Coluna D' },
        ]}
      />
    )

    expect(screen.getByText('Coluna B:')).toBeInTheDocument()
    expect(screen.getByText('Coluna C:')).toBeInTheDocument()
    expect(screen.queryByText('Coluna D:')).not.toBeInTheDocument()
    expect(screen.getAllByText('D')).toHaveLength(1)
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

    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()
    const desktopActionButtons = screen.getAllByRole('button')
    fireEvent.click(desktopActionButtons[0])
    expect(onView).toHaveBeenCalledWith(rows[0])
  })

  it('hides an action on the rows its show() predicate rejects', () => {
    const onDelete = vi.fn()
    render(
      <ResponsiveDataTable
        data={rows}
        columns={columns}
        actions={[{ label: 'Excluir', onClick: onDelete, variant: 'destructive', show: item => item.id === '2' }]}
      />
    )

    // One desktop button for row 2 plus one mobile dropdown trigger for row 2.
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toHaveClass('text-red-600')

    fireEvent.click(buttons[0])
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(rows[1])
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

  it('passes the actions list to the custom mobile card template', () => {
    const template = vi.fn((item: TestRow) => <article>Cartão: {item.name}</article>)
    const actions = [{ label: 'Visualizar', onClick: vi.fn() }]
    render(<ResponsiveDataTable data={rows} columns={columns} actions={actions} mobileCardTemplate={template} />)

    expect(template).toHaveBeenCalledWith(rows[0], actions)
    expect(template).toHaveBeenCalledWith(rows[1], actions)
  })

  it('applies className and cardClassName to the wrapper and default cards', () => {
    const { container } = render(
      <ResponsiveDataTable data={rows} columns={columns} className="pilot-table" cardClassName="pilot-card" />
    )

    expect(container.firstChild).toHaveClass('pilot-table')
    expect(container.querySelectorAll('.pilot-card')).toHaveLength(2)
  })

  it('handles an empty columns contract without crashing', () => {
    render(<ResponsiveDataTable data={rows} columns={[]} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryAllByRole('cell')).toHaveLength(0)
    expect(screen.getAllByText('Sem colunas configuradas.')).toHaveLength(2)
  })
})

describe('StudentDataTable', () => {
  const students = [
    {
      id: '1',
      nome_completo: 'Ana Sintética Souza',
      sexo: 'F',
      data_nascimento: '2015-03-10',
      ativo: true,
      responsaveis: { nome: 'Responsável Sintético' },
      matriculas: [{ situacao: 'ativa', turmas: { nome: '3º Ano A', escolas: { nome: 'Escola Sintética' } } }],
    },
  ]

  it('keeps the guardian and status columns off the mobile card', () => {
    render(<StudentDataTable students={students} />)

    expect(screen.getByRole('columnheader', { name: 'Responsável' })).toBeInTheDocument()
    expect(screen.getAllByText('Ana Sintética Souza')).toHaveLength(2)
    expect(screen.getAllByText('Escola Sintética')).toHaveLength(2)
    expect(screen.getByText('Idade:')).toBeInTheDocument()
    expect(screen.getByText('Escola:')).toBeInTheDocument()

    // `hideOnMobile` drops Responsável, and only the first two secondary
    // columns reach the card, so Status stays desktop-only.
    expect(screen.getAllByText('Responsável Sintético')).toHaveLength(1)
    expect(screen.getAllByText('Ativo')).toHaveLength(1)
    expect(screen.queryByText('Responsável:')).not.toBeInTheDocument()
    expect(screen.queryByText('Status:')).not.toBeInTheDocument()
  })

  it('falls back when the student has no active enrollment or guardian', () => {
    render(<StudentDataTable students={[{ id: '2', nome_completo: 'Bruno Sintético', sexo: 'M', data_nascimento: '2016-05-02', ativo: false }]} />)

    expect(screen.getAllByText('Não matriculado')).toHaveLength(2)
    expect(screen.getAllByText('Não informado')).toHaveLength(1)
    expect(screen.getAllByText('Inativo')).toHaveLength(1)
  })

  it('only offers the handlers the caller supplied', () => {
    const onView = vi.fn()
    render(<StudentDataTable students={students} onView={onView} />)

    // One desktop action button plus the mobile dropdown trigger.
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)

    fireEvent.click(buttons[0])
    expect(onView).toHaveBeenCalledWith(students[0])
  })

  it('renders the pilot empty message and the loading skeleton', () => {
    const { container, rerender } = render(<StudentDataTable students={[]} />)
    expect(screen.getByText('Nenhum aluno encontrado com os filtros aplicados.')).toBeInTheDocument()

    rerender(<StudentDataTable students={students} loading />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
    expect(screen.queryByText('Ana Sintética Souza')).not.toBeInTheDocument()
  })
})
