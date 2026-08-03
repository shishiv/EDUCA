import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const { fromMock, routerPushMock, useEscolaMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  routerPushMock: vi.fn(),
  useEscolaMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}))

vi.mock('@/contexts/escola-context', () => ({
  useEscola: useEscolaMock,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}))

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
})

import NovaTurmaPage from '@/app/(dashboard)/dashboard/turmas/nova/page'
import MatriculasPage from '@/app/(dashboard)/dashboard/matriculas/page'
import { InlineFilters } from '@/components/filters/inline-filters'

type QueryResult<T> = {
  data: T
  error: null
}

function createQuery<T>(result: QueryResult<T>) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
  }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockResolvedValue(result)
  query.insert.mockResolvedValue(result)

  return query
}

describe('demo deploy package regressions', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    fromMock.mockReset()
    routerPushMock.mockReset()
    useEscolaMock.mockReturnValue({
      selectedEscolaId: null,
      shouldShowSelector: true,
    })
  })

  it('does not send turma observacoes in the turma INSERT payload', async () => {
    const escolasQuery = createQuery({
      data: [{ id: 'escola-d6', nome: 'Escola D6', tipo: 'fundamental' }],
      error: null,
    })
    const professoresQuery = createQuery({ data: [], error: null })
    const turmasQuery = createQuery({ data: null, error: null })

    fromMock.mockImplementation((table: string) => {
      if (table === 'escolas') return escolasQuery
      if (table === 'users') return professoresQuery
      if (table === 'turmas') return turmasQuery
      throw new Error(`Unexpected table in D6 regression test: ${table}`)
    })

    render(<NovaTurmaPage />)

    const nomeInput = screen.getByLabelText(/nome da turma/i)
    fireEvent.change(nomeInput, { target: { value: 'Turma D6' } })
    fireEvent.change(screen.getByLabelText(/observações/i), {
      target: { value: 'Texto que não pertence à tabela turmas' },
    })

    const escolaSelect = document.querySelector('#escola_id')
    expect(escolaSelect).not.toBeNull()
    await waitFor(() => expect(escolasQuery.order).toHaveBeenCalled())
    await waitFor(() => expect(escolaSelect).toBeEnabled())
    fireEvent.click(escolaSelect as HTMLElement)
    fireEvent.click(await screen.findByRole('option', { name: 'Escola D6' }))

    const serieSelect = document.querySelector('#serie')
    expect(serieSelect).not.toBeNull()
    await waitFor(() => expect(serieSelect).toBeEnabled())

    fireEvent.click(serieSelect as HTMLElement)
    fireEvent.click(await screen.findByRole('option', { name: '1º Ano' }))

    const turnoSelect = document.querySelector('#turno')
    expect(turnoSelect).not.toBeNull()
    fireEvent.click(turnoSelect as HTMLElement)
    fireEvent.click(await screen.findByRole('option', { name: 'Matutino' }))

    fireEvent.click(screen.getByRole('button', { name: /criar turma/i }))

    await waitFor(() => expect(turmasQuery.insert).toHaveBeenCalledTimes(1))
    expect(turmasQuery.insert).toHaveBeenCalledWith({
      nome: 'Turma D6',
      serie: '1º Ano',
      ano_letivo: new Date().getFullYear(),
      escola_id: 'escola-d6',
      professor_id: null,
      capacidade: 25,
      turno: 'matutino',
      ativo: true,
    })
  })

  it('keeps the enrollment edit action on the existing detail route', async () => {
    const matriculasQuery = createQuery({
      data: [{
        id: 'matricula-d3',
        aluno: {
          id: 'aluno-d3',
          nome_completo: 'Aluno D3',
          data_nascimento: '2015-01-01',
        },
        turma: {
          id: 'turma-d3',
          nome: 'Turma D3',
          serie: '5º Ano',
          escola: { id: 'escola-d3', nome: 'Escola D3' },
        },
        ano_letivo: 2026,
        data_matricula: '2026-01-01',
        situacao: 'ativa',
        created_at: '2026-01-01T00:00:00Z',
      }],
      error: null,
    })
    fromMock.mockReturnValue(matriculasQuery)

    render(<MatriculasPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Matrículas$/ })).toBeInTheDocument()
    })

    const detailLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href="/dashboard/matriculas/matricula-d3"]')
    )
    expect(detailLinks).toHaveLength(2)
    expect(detailLinks[1]).toHaveAttribute('href', '/dashboard/matriculas/matricula-d3')
    expect(document.querySelector('a[href="/dashboard/matriculas/matricula-d3/editar"]')).toBeNull()
  })

  it('gives each inline filter a stable accessible name and aria-label', () => {
    render(
      <InlineFilters
        filters={[
          {
            id: 'tipo',
            placeholder: 'Tipo',
            value: 'todos',
            options: [{ value: 'todos', label: 'Todos' }],
            onChange: vi.fn(),
          },
          {
            id: 'status',
            placeholder: 'Status',
            value: 'todos',
            options: [{ value: 'todos', label: 'Todos' }],
            onChange: vi.fn(),
          },
        ]}
      />
    )

    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveAttribute('aria-label', 'Tipo')
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveAttribute('aria-label', 'Status')
  })
})
