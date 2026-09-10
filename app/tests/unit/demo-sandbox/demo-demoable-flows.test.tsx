import { createClient } from '@supabase/supabase-js'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NovaTurmaPageContent } from '@/components/dashboard/nova-turma-page-content'
import { getMessagesForLocale } from '@/i18n/messages'
import type { Database } from '@/types/database'

const schools = [
  { id: 'school-a', nome: 'Escola sintética A', tipo: 'fundamental' },
  { id: 'school-b', nome: 'Escola sintética B', tipo: 'pre_escola' },
  { id: 'school-unknown', nome: 'Escola com tipo não cadastrado', tipo: 'unknown_type' },
]

// jsdom has no layout; Radix calls this browser primitive on keyboard focus.
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => undefined,
})

function createSchoolTransport(rejectInsert = false) {
  const requests: Request[] = []
  const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: crypto.randomUUID() },
    global: {
      fetch: async (input, init) => {
        const request = new Request(input, init)
        const url = new URL(request.url)
        requests.push(request.clone())
        if (url.pathname === '/rest/v1/escolas') return Response.json(schools)
        if (url.pathname === '/rest/v1/users') {
          return Response.json([{ id: 'teacher-a', nome: 'Professor sintético A' }])
        }
        if (url.pathname === '/rest/v1/configs') {
          if (url.searchParams.get('escola_id') === 'eq.school-a') return Response.json([])
          return Response.json(
            url.searchParams.get('escola_id') === 'eq.school-b'
              ? [{ escola_id: 'school-b', valor: '18' }]
              : [{ escola_id: null, valor: '25' }],
          )
        }
        if (url.pathname === '/rest/v1/rpc/write_governed_turma' && request.method === 'POST') {
          return rejectInsert
            ? Response.json({ code: '42501', message: 'permission denied' }, { status: 403 })
            : Response.json([{ turma_id: 'class-a', escola_id: 'school-a', audit_id: 'class-created-receipt' }])
        }
        throw new Error(`Unexpected synthetic request: ${request.method} ${url.pathname}`)
      },
    },
  })
  return { client, requests }
}

function renderNewClass(selectedEscolaId: string | null = 'school-a', rejectInsert = false) {
  const transport = createSchoolTransport(rejectInsert)
  const push = vi.fn()
  render(
    <NextIntlClientProvider locale="pt-BR" messages={getMessagesForLocale('pt-BR')}>
      <NovaTurmaPageContent
        supabaseClient={transport.client}
        router={{ push }}
        escolaContext={{
          escolas: [], selectedEscolaId, selectedEscola: null, loading: false,
          selectEscola: vi.fn(), clearSelection: vi.fn(), shouldShowSelector: true,
        }}
      />
    </NextIntlClientProvider>,
  )
  return { ...transport, push }
}

async function selectOption(label: RegExp, option: string) {
  const control = screen.getByRole('combobox', { name: label })
  await waitFor(() => expect(control).toBeEnabled())
  fireEvent.click(control)
  fireEvent.click(await screen.findByRole('option', { name: option }))
}

async function fillRequiredFields() {
  await waitFor(() => expect(screen.getByLabelText(/capacidade máxima/i)).toHaveValue(25))
  fireEvent.change(screen.getByLabelText(/nome da turma/i), { target: { value: '  Turma sintética  ' } })
  await selectOption(/série/i, '1º Ano')
  await selectOption(/turno/i, 'Matutino')
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('synthetic class creation', () => {
  it('sends the selected school and canonical class fields through the real Supabase request builder', async () => {
    const { requests, push } = renderNewClass()
    await fillRequiredFields()
    fireEvent.change(screen.getByLabelText(/ano letivo/i), { target: { value: '2027' } })
    fireEvent.change(screen.getByLabelText(/capacidade máxima/i), { target: { value: '19' } })
    await selectOption(/professor responsável/i, 'Professor sintético A')
    expect(screen.queryByLabelText(/observações/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /criar turma/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/turmas'))
    const inserts = requests.filter(request => request.method === 'POST')
    expect(inserts).toHaveLength(1)
    expect(new URL(inserts[0].url).pathname).toBe('/rest/v1/rpc/write_governed_turma')
    expect(await inserts[0].json()).toEqual({
      p_changes: {
        nome: 'Turma sintética', serie: '1º Ano', ano_letivo: 2027,
        escola_id: 'school-a', professor_id: 'teacher-a', capacidade: 19,
        turno: 'matutino', ativo: true,
      },
    })
    const teacherRead = requests.find(request => new URL(request.url).pathname === '/rest/v1/users')
    if (!teacherRead) throw new Error('Expected the school-scoped teacher read')
    expect(new URL(teacherRead.url).searchParams.get('escola_id')).toBe('eq.school-a')
  })

  it('requires a school selection and clears class and teacher selections when the school changes', async () => {
    const { requests } = renderNewClass(null)
    expect(screen.getByRole('alert')).toHaveTextContent(/selecione a escola/i)
    expect(screen.getByRole('combobox', { name: /série/i })).toBeDisabled()
    await selectOption(/^escola/i, 'Escola sintética A')
    await fillRequiredFields()
    await selectOption(/professor responsável/i, 'Professor sintético A')
    await selectOption(/^escola/i, 'Escola sintética B')

    expect(screen.getByRole('combobox', { name: /série/i })).toHaveTextContent('Selecione a série')
    expect(screen.getByRole('combobox', { name: /professor responsável/i })).toHaveTextContent('Selecione o professor')
    await selectOption(/série/i, 'Pré I')
    expect(requests.filter(request => request.method === 'POST')).toHaveLength(0)
    await waitFor(() => expect(requests.some(request => new URL(request.url).searchParams.get('escola_id') === 'eq.school-b')).toBe(true))
    await waitFor(() => expect(screen.getByLabelText(/capacidade máxima/i)).toHaveValue(18))
  })

  it('offers no invented series for an unsupported school type', async () => {
    const { requests } = renderNewClass('school-unknown')
    const series = screen.getByRole('combobox', { name: /série/i })
    await waitFor(() => expect(series).toBeEnabled())
    fireEvent.click(series)

    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(requests.filter(request => request.method === 'POST')).toHaveLength(0)
  })

  it('keeps the form available and does not navigate after a rejected database write', async () => {
    const { requests, push } = renderNewClass('school-a', true)
    await fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /criar turma/i }))

    await waitFor(() => expect(requests.filter(request => request.method === 'POST')).toHaveLength(1))
    await waitFor(() => expect(screen.getByRole('button', { name: /criar turma/i })).toBeEnabled())
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/nome da turma/i)).toHaveValue('  Turma sintética  ')
  })
})
