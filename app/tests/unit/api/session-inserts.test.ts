import { describe, expect, it } from 'vitest'
import { buildChamadaSessionInsert } from '@/lib/api/attendance'
import { buildSessionInsert } from '@/lib/api/enhanced-attendance'

describe('buildChamadaSessionInsert', () => {
  it('builds a payload with all required sessoes_aula columns', () => {
    const payload = buildChamadaSessionInsert({
      turmaId: 'turma-1',
      dateStr: '2026-02-01',
      professorId: 'prof-1',
      escolaId: 'escola-1',
    })

    expect(payload).toEqual({
      turma_id: 'turma-1',
      data_aula: '2026-02-01',
      status: 'aberta',
      professor_id: 'prof-1',
      escola_id: 'escola-1',
      conteudo_programatico: 'Chamada',
    })
  })

  it('keeps the fixed status and content marker for a chamada', () => {
    const payload = buildChamadaSessionInsert({
      turmaId: 't',
      dateStr: '2026-02-01',
      professorId: 'p',
      escolaId: 'e',
    })
    expect(payload.status).toBe('aberta')
    expect(payload.conteudo_programatico).toBe('Chamada')
  })
})

describe('buildSessionInsert', () => {
  const baseSession = {
    turma_id: 'turma-1',
    professor_id: 'prof-1',
    data_aula: '2026-02-01',
    conteudo_programatico: 'Aula de matemática',
    duracao_minutos: 50,
    status: 'aberta' as const,
    inicio_aula: '2026-02-01T08:00:00.000Z',
    escola_id: 'escola-1',
  }

  it('resolves the teacher school into the required escola_id column', () => {
    const payload = buildSessionInsert(baseSession, 'escola-9')
    expect(payload.escola_id).toBe('escola-9')
  })

  it('omits falsy optional planning fields', () => {
    const payload = buildSessionInsert(
      { ...baseSession, metodologia: '', objetivos_aprendizagem: undefined, observacoes: '' },
      'escola-1'
    )
    expect(payload.metodologia).toBeUndefined()
    expect(payload.objetivos_aprendizagem).toBeUndefined()
    expect(payload.observacoes).toBeUndefined()
  })

  it('includes truthy optional planning fields', () => {
    const payload = buildSessionInsert(
      { ...baseSession, metodologia: 'Exposição dialogada', recursos_utilizados: 'Quadro', observacoes: 'ok' },
      'escola-1'
    )
    expect(payload.metodologia).toBe('Exposição dialogada')
    expect(payload.recursos_utilizados).toBe('Quadro')
    expect(payload.observacoes).toBe('ok')
  })

  it('always stamps the session as open with a fresh inicio_aula', () => {
    const payload = buildSessionInsert(baseSession, 'escola-1')
    expect(payload.status).toBe('aberta')
    expect(payload.inicio_aula?.length).toBeGreaterThan(0)
  })
})
