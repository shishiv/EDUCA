import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { NextIntlClientProvider } from 'next-intl'
import { getMessagesForLocale } from '@/i18n/messages'

import { createClient } from '@supabase/supabase-js'
import { MatriculasPageContent } from '@/components/dashboard/matriculas-page-content'
import { InlineFilters } from '@/components/filters/inline-filters'
import type { Database } from '@/types/database'

describe('demo deploy package regressions', () => {
  afterEach(() => {
    cleanup()
  })

  it('keeps the enrollment edit action on the existing detail route', async () => {
    const enrollmentRows = [{
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
    }]
    const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: crypto.randomUUID() },
      global: {
        fetch: async (input, init) => {
          const request = new Request(input, init)
          const url = new URL(request.url)
          if (request.method === 'GET' && url.pathname === '/rest/v1/matriculas') {
            return Response.json(enrollmentRows)
          }
          throw new Error(`Unexpected synthetic request: ${request.method} ${url.pathname}`)
        },
      },
    })

    render(
      <NextIntlClientProvider locale="pt-BR" messages={getMessagesForLocale('pt-BR')}>
        <MatriculasPageContent supabaseClient={client} />
      </NextIntlClientProvider>,
    )

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
