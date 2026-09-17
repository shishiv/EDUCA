import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
  assembleContentReport,
  buildContentReportQuery,
  type ContentReportRow,
} from '@/lib/reports/content-report-data'
import type { Database } from '@/types/database'

const rows = [
  {
    id: 'content-2',
    sessao_id: 'session-2',
    tema: 'Formas',
    objetivo: 'Reconhecer formas',
    habilidades_bncc: ['EF01MA06', 'EI03EO01'],
    metodologia: 'Blocos',
    recursos: null,
    observacoes: null,
    created_at: '2026-03-01T12:00:00.000Z',
    sessoes_aula: {
      id: 'session-2',
      data_aula: '2026-03-01',
      inicio_aula: null,
      fim_aula: null,
      turma_id: 'class-1',
      professor_id: 'teacher-1',
      turmas: {
        id: 'class-1',
        nome: 'Pré II',
        serie: 'Infantil',
        escola_id: 'school-1',
        escolas: { id: 'school-1', nome: 'Escola Sintética' },
      },
      users: { id: 'teacher-1', nome: 'Professora Sintética' },
      disciplinas: { id: 'subject-1', codigo: 'MAT', nome: 'Matemática' },
    },
  },
  {
    id: 'content-1',
    sessao_id: 'session-1',
    tema: 'Adição',
    objetivo: 'Somar números',
    habilidades_bncc: ['EF01MA06'],
    metodologia: null,
    recursos: 'Material dourado',
    observacoes: 'Retomar na próxima aula',
    created_at: '2026-02-10T12:00:00.000Z',
    sessoes_aula: {
      id: 'session-1',
      data_aula: '2026-02-10',
      inicio_aula: null,
      fim_aula: null,
      turma_id: 'class-1',
      professor_id: 'teacher-1',
      turmas: {
        id: 'class-1',
        nome: 'Pré II',
        serie: 'Infantil',
        escola_id: 'school-1',
        escolas: { id: 'school-1', nome: 'Escola Sintética' },
      },
      users: { id: 'teacher-1', nome: 'Professora Sintética' },
      disciplinas: { id: 'subject-1', codigo: 'MAT', nome: 'Matemática' },
    },
  },
] satisfies ContentReportRow[]

describe('content report data', () => {
  it('assembles ordered lesson rows and BNCC facts without changing the report shape', () => {
    const report = assembleContentReport(
      rows,
      { startDate: '2026-02-01', endDate: '2026-07-31', turmaId: 'class-1' },
      '2026-08-01T00:00:00.000Z',
    )

    expect(report).toEqual({
      periodo: { inicio: '2026-02-01', fim: '2026-07-31' },
      turma: { id: 'class-1', nome: 'Pré II', serie: 'Infantil' },
      escola: { id: 'school-1', nome: 'Escola Sintética' },
      professor: { id: 'teacher-1', nome: 'Professora Sintética' },
      resumo: {
        totalAulas: 2,
        totalHabilidadesBncc: 3,
        habilidadesUnicas: 2,
        mediaHabilidadesPorAula: 1.5,
        disciplinasMaisTrabalhadas: [
          { disciplina: 'Matematica', quantidade: 2 },
          { disciplina: 'O eu, o outro e o nos', quantidade: 1 },
        ],
      },
      aulas: [
        {
          id: 'content-2',
          sessaoId: 'session-2',
          dataAula: '2026-03-01',
          tema: 'Formas',
          objetivo: 'Reconhecer formas',
          habilidadesBncc: ['EF01MA06', 'EI03EO01'],
          metodologia: 'Blocos',
          recursos: null,
          observacoes: null,
          turmaNome: 'Pré II',
          turmaSerie: 'Infantil',
          professorNome: 'Professora Sintética',
          escolaNome: 'Escola Sintética',
          disciplinaCodigo: 'MAT',
          disciplinaNome: 'Matemática',
          createdAt: '2026-03-01T12:00:00.000Z',
        },
        {
          id: 'content-1',
          sessaoId: 'session-1',
          dataAula: '2026-02-10',
          tema: 'Adição',
          objetivo: 'Somar números',
          habilidadesBncc: ['EF01MA06'],
          metodologia: null,
          recursos: 'Material dourado',
          observacoes: 'Retomar na próxima aula',
          turmaNome: 'Pré II',
          turmaSerie: 'Infantil',
          professorNome: 'Professora Sintética',
          escolaNome: 'Escola Sintética',
          disciplinaCodigo: 'MAT',
          disciplinaNome: 'Matemática',
          createdAt: '2026-02-10T12:00:00.000Z',
        },
      ],
      habilidadesBncc: [
        {
          codigo: 'EF01MA06',
          descricao: 'Matematica - EF01MA06',
          vezesTrabalhado: 2,
          datasTrabalho: ['2026-02-10', '2026-03-01'],
          nivel: 'fundamental',
        },
        {
          codigo: 'EI03EO01',
          descricao: 'O eu, o outro e o nos - EI03EO01',
          vezesTrabalhado: 1,
          datasTrabalho: ['2026-03-01'],
          nivel: 'infantil',
        },
      ],
      geradoEm: '2026-08-01T00:00:00.000Z',
    })
  })

  it('preserves the empty report state', () => {
    expect(assembleContentReport(
      [],
      { startDate: '2026-02-01', endDate: '2026-07-31', turmaId: 'class-1' },
      '2026-08-01T00:00:00.000Z',
    )).toEqual({
      periodo: { inicio: '2026-02-01', fim: '2026-07-31' },
      resumo: {
        totalAulas: 0,
        totalHabilidadesBncc: 0,
        habilidadesUnicas: 0,
        mediaHabilidadesPorAula: 0,
        disciplinasMaisTrabalhadas: [],
      },
      aulas: [],
      habilidadesBncc: [],
      geradoEm: '2026-08-01T00:00:00.000Z',
    })
  })

  it('builds the canonical filtered query with school scope and database ordering', async () => {
    const requests: URL[] = []
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new URL(new Request(input, init).url))
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } })
    })
    const client = createClient<Database>('http://127.0.0.1:54321', 'test-anon-key', {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch },
    })

    const result = await buildContentReportQuery(client, {
      startDate: '2026-02-01',
      endDate: '2026-07-31',
      turmaId: 'class-1',
      professorId: 'teacher-1',
      escolaId: 'school-1',
      disciplina: 'LP',
    })

    expect(result.error).toBeNull()
    expect(fetch).toHaveBeenCalledOnce()
    const request = requests[0]
    expect(request.pathname).toBe('/rest/v1/conteudo_aula')
    expect(request.searchParams.get('select')).toContain('disciplinas!inner')
    expect(request.searchParams.getAll('sessoes_aula.data_aula')).toEqual([
      'gte.2026-02-01',
      'lte.2026-07-31',
    ])
    expect(request.searchParams.get('sessoes_aula.turma_id')).toBe('eq.class-1')
    expect(request.searchParams.get('sessoes_aula.professor_id')).toBe('eq.teacher-1')
    expect(request.searchParams.get('sessoes_aula.turmas.escola_id')).toBe('eq.school-1')
    expect(request.searchParams.get('sessoes_aula.disciplinas.codigo')).toBe('in.(LP,POR,PORT)')
    expect(request.searchParams.get('order')).toBe('sessoes_aula(data_aula).desc')
  })
})
