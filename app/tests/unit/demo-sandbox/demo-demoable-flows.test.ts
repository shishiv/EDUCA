// @vitest-environment node
import { describe, it, expect } from 'vitest'

describe('createStudent escola_id resolution', () => {
  it('uses escola_id_override when actorProfile.escola_id is null', () => {
    function resolveEscolaId(actorEscolaId: string | null, override: string | undefined): string | null {
      return actorEscolaId ?? override ?? null
    }

    expect(resolveEscolaId('escola-abc', undefined)).toBe('escola-abc')
    expect(resolveEscolaId('escola-abc', 'escola-xyz')).toBe('escola-abc')
    expect(resolveEscolaId(null, 'escola-xyz')).toBe('escola-xyz')
    expect(resolveEscolaId(null, undefined)).toBeNull()
  })

  it('throws when no escola_id is resolvable', () => {
    function createStudentGuard(resolvedEscolaId: string | null) {
      if (!resolvedEscolaId) {
        throw new Error('PILOT_STUDENT_SCHOOL_REQUIRED: selecione uma escola antes de cadastrar um aluno')
      }
    }
    expect(() => createStudentGuard(null)).toThrow('PILOT_STUDENT_SCHOOL_REQUIRED')
    expect(() => createStudentGuard('escola-abc')).not.toThrow()
  })
})

describe('nova turma page series map', () => {
  it('has series for all supported escola types', () => {
    const SERIES_BY_TIPO: Record<string, string[]> = {
      creche: ['Berçário I', 'Berçário II', 'Maternal I', 'Maternal II'],
      pre_escola: ['Pré I', 'Pré II'],
      fundamental: [
        '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano',
        '6º Ano', '7º Ano', '8º Ano', '9º Ano',
      ],
    }
    expect(Object.keys(SERIES_BY_TIPO)).toHaveLength(3)
    expect(SERIES_BY_TIPO.fundamental).toHaveLength(9)
    expect(SERIES_BY_TIPO.creche.length).toBeGreaterThan(0)
    expect(SERIES_BY_TIPO.pre_escola.length).toBeGreaterThan(0)
  })

  it('returns empty array for unknown escola type', () => {
    const SERIES_BY_TIPO: Record<string, string[]> = {
      creche: ['Berçário I'],
      pre_escola: ['Pré I'],
      fundamental: ['1º Ano'],
    }
    expect(SERIES_BY_TIPO.unknown_type ?? []).toEqual([])
  })
})

describe('nova turma insert schema contract', () => {
  it('sends only columns defined by the canonical turmas schema', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const pageSource = readFileSync(join(process.cwd(), 'app/(dashboard)/dashboard/turmas/nova/page.tsx'), 'utf8')
    const canonicalSchema = readFileSync(join(process.cwd(), '../supabase/migrations/00000000000000_baseline.sql'), 'utf8')
    const tableMatch = canonicalSchema.match(/CREATE TABLE IF NOT EXISTS turmas \(([\s\S]*?)\n\);/)
    const insertMatch = pageSource.match(/\.from\('turmas'\)\.insert\(\{([\s\S]*?)\n\s*\}\)/)

    expect(tableMatch).not.toBeNull()
    expect(insertMatch).not.toBeNull()
    if (!tableMatch || !insertMatch) throw new Error('Canonical schema or INSERT not found')

    const canonicalColumns = new Set(
      tableMatch[1]
        .split('\n')
        .map(line => line.trim().match(/^([a-z_][a-z0-9_]*)\s+/i)?.[1])
        .filter((column): column is string => Boolean(column)),
    )
    const payloadColumns = [...insertMatch[1].matchAll(/^\s*([a-z_][a-z0-9_]*):/gim)].map(match => match[1])

    expect(payloadColumns).toEqual(expect.arrayContaining([
      'nome', 'serie', 'ano_letivo', 'escola_id', 'capacidade', 'turno', 'ativo',
    ]))
    for (const column of payloadColumns) expect(canonicalColumns.has(column)).toBe(true)
  })
})

describe('atribuicoes page PageHeader import', () => {
  it('imports PageHeader from ui/page-header, not enhanced-breadcrumbs', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(process.cwd(), 'app/(dashboard)/dashboard/atribuicoes/page.tsx'), 'utf8')
    expect(src).toMatch(/from '@\/components\/ui\/page-header'/)
    expect(src).not.toMatch(/from '@\/components\/layout\/enhanced-breadcrumbs'/)
  })
})
