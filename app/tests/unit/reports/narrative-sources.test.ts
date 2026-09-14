import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { loadNarrativePreview } from '@/lib/reports/narrative-sources'
import { narrativeSnapshotFixture } from '@/tests/fixtures/narrative-report'
import { reportPeriodDates } from '@/lib/reports/report-period-dates'
import { loadSchoolPeriods } from '@/lib/services/school-periods'

function setup() {
  const transport = vi.fn<typeof fetch>()
  const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
  })
  return { client, transport }
}

describe('complete narrative preview', () => {
  it('transports the scoped period request and preserves more than 50 sources', async () => {
    const { client, transport } = setup()
    const snapshot = narrativeSnapshotFixture()
    const preview = { periodo: snapshot.periodo, fontes: Array.from({ length: 61 }, () => snapshot.fontes[0]) }
    transport.mockResolvedValue(Response.json(preview))
    expect(await loadNarrativePreview(client, snapshot.fontes[0].matricula_id, 2026, 'primeiro')).toEqual(preview)
    expect(transport).toHaveBeenCalledOnce()
    const [input, init] = transport.mock.calls[0]
    const request = new Request(input, init)
    expect(new URL(request.url).pathname).toBe('/rest/v1/rpc/preview_descriptive_report_sources')
    expect(await request.json()).toEqual({ p_matricula_id: snapshot.fontes[0].matricula_id, p_ano: 2026, p_semestre: 'primeiro' })
  })
  it('distinguishes missing configuration from failure instead of inventing sources', async () => {
    const { client, transport } = setup()
    transport.mockResolvedValueOnce(Response.json({ periodo: null, fontes: [] }))
    expect(await loadNarrativePreview(client, 'enrollment', 2026, 'primeiro')).toEqual({ periodo: null, fontes: [] })
    transport.mockResolvedValueOnce(Response.json({ message: 'denied' }, { status: 403 }))
    await expect(loadNarrativePreview(client, 'enrollment', 2026, 'primeiro')).rejects.toMatchObject({ message: 'denied' })
  })
})

describe('school periods without calendar', () => {
  it('has no pedagogical dates when periods are absent, but keeps civil months', () => {
    expect(reportPeriodDates('bimestre_1', [])).toBeNull()
    expect(reportPeriodDates('primeiro', [])).toBeNull()
    const dates = reportPeriodDates('current_month', [], new Date(2026, 0, 15))
    expect(dates?.from.getDate()).toBe(1)
    expect(dates?.to.getDate()).toBe(31)
    expect(dates?.from.getMonth()).toBe(0)
  })
  it('uses persisted exact boundaries rather than the former fixed ranges', () => {
    const period = { chave: 'bimestre_1', nome: 'Ciclo sintético', data_inicio: '2026-01-20', data_fim: '2026-03-19' } satisfies Parameters<typeof reportPeriodDates>[1][number]
    const dates = reportPeriodDates('bimestre_1', [period])
    expect(dates?.from.getDate()).toBe(20)
    expect(dates?.to.getDate()).toBe(19)
  })
  it('keeps read failures distinct from a persisted empty period list', async () => {
    const { client, transport } = setup()
    transport.mockResolvedValueOnce(Response.json([{ periodos: [] }]))
    expect(await loadSchoolPeriods(client, 'school', 2026)).toEqual([])
    transport.mockResolvedValueOnce(Response.json({ message: 'denied' }, { status: 403 }))
    await expect(loadSchoolPeriods(client, 'school', 2026)).rejects.toMatchObject({ message: 'denied' })
  })
})
