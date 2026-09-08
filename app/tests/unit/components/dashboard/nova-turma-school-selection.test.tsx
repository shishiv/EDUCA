import { createClient } from '@supabase/supabase-js'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NovaTurmaPageContent } from '@/components/dashboard/nova-turma-page-content'
import type { Database } from '@/types/database'
import { renderWithMessages } from '../render-with-messages'

const schoolA = {
  id: '10000000-0000-0000-0000-000000000001',
  nome: 'Escola Sintética A',
  tipo: 'fundamental',
}

function delayedResponse() {
  let release: (response: Response) => void = () => {
    throw new Error('Delayed response released before initialization')
  }
  const response = new Promise<Response>(resolve => {
    release = resolve
  })
  return { response, release }
}

function createTransport() {
  const schools = delayedResponse()
  const requests: Request[] = []
  const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: crypto.randomUUID(),
    },
    global: {
      fetch: async (input, init) => {
        const request = new Request(input, init)
        const url = new URL(request.url)
        requests.push(request.clone())

        if (url.pathname === '/rest/v1/escolas') return schools.response
        if (url.pathname === '/rest/v1/users') return Response.json([])
        if (url.pathname === '/rest/v1/configs') {
          if (url.searchParams.get('escola_id') === `eq.${schoolA.id}`) {
            return Response.json([])
          }
          if (url.searchParams.get('escola_id') === 'is.null') {
            return Response.json([{ escola_id: null, valor: '25' }])
          }
        }

        throw new Error(`Unexpected synthetic request: ${request.method} ${url.pathname}${url.search}`)
      },
    },
  })

  return {
    client,
    requests,
    releaseSchools: () => schools.release(Response.json([schoolA])),
  }
}

function escolaContext(selectedEscolaId: string | null) {
  return {
    escolas: [],
    selectedEscolaId,
    selectedEscola: null,
    loading: false,
    selectEscola: vi.fn(),
    clearSelection: vi.fn(),
    shouldShowSelector: false,
  }
}

async function expectReadyClassForm() {
  await waitFor(() => {
    expect(screen.getByRole('combobox', { name: /^escola/i })).toHaveTextContent(schoolA.nome)
  })
  expect(screen.getByRole('combobox', { name: /série/i })).toBeEnabled()
  expect(screen.getByLabelText(/capacidade máxima/i)).toBeEnabled()
  expect(screen.getByLabelText(/capacidade máxima/i)).toHaveValue(25)
  expect(screen.getByRole('button', { name: /criar turma/i })).toBeEnabled()
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

describe('new class school selection synchronization', () => {
  it('keeps the initial school while the school options load asynchronously', async () => {
    const transport = createTransport()
    renderWithMessages(
      <NovaTurmaPageContent
        supabaseClient={transport.client}
        router={{ push: vi.fn() }}
        escolaContext={escolaContext(schoolA.id)}
      />,
    )

    expect(screen.getByRole('combobox', { name: /série/i })).toBeEnabled()
    await act(async () => {
      transport.releaseSchools()
    })

    await expectReadyClassForm()
  })

  it('accepts the selected school after the school options finish loading', async () => {
    const transport = createTransport()
    const view = renderWithMessages(
      <NovaTurmaPageContent
        supabaseClient={transport.client}
        router={{ push: vi.fn() }}
        escolaContext={escolaContext(null)}
      />,
    )

    expect(screen.getByRole('combobox', { name: /série/i })).toBeDisabled()
    await act(async () => {
      transport.releaseSchools()
    })
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /^escola/i })).toBeEnabled()
    })

    view.rerender(
      <NovaTurmaPageContent
        supabaseClient={transport.client}
        router={{ push: vi.fn() }}
        escolaContext={escolaContext(schoolA.id)}
      />,
    )

    await expectReadyClassForm()
  })

  it('keeps a school selected while the matching option is still loading', async () => {
    const transport = createTransport()
    const view = renderWithMessages(
      <NovaTurmaPageContent
        supabaseClient={transport.client}
        router={{ push: vi.fn() }}
        escolaContext={escolaContext(null)}
      />,
    )

    view.rerender(
      <NovaTurmaPageContent
        supabaseClient={transport.client}
        router={{ push: vi.fn() }}
        escolaContext={escolaContext(schoolA.id)}
      />,
    )
    await waitFor(() => {
      expect(transport.requests.some(request => {
        const url = new URL(request.url)
        return url.pathname === '/rest/v1/configs'
          && url.searchParams.get('escola_id') === `eq.${schoolA.id}`
      })).toBe(true)
    })

    await act(async () => {
      transport.releaseSchools()
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /^escola/i })).toBeEnabled()
    })
    expect({
      school: screen.getByRole('combobox', { name: /^escola/i }).textContent,
      seriesDisabled: screen.getByRole('combobox', { name: /série/i }).hasAttribute('disabled'),
      capacity: screen.getByLabelText(/capacidade máxima/i).getAttribute('value'),
      capacityDisabled: screen.getByLabelText(/capacidade máxima/i).hasAttribute('disabled'),
      submitDisabled: screen.getByRole('button', { name: /criar turma/i }).hasAttribute('disabled'),
    }).toEqual({
      school: schoolA.nome,
      seriesDisabled: false,
      capacity: '25',
      capacityDisabled: false,
      submitDisabled: false,
    })
  })
})
