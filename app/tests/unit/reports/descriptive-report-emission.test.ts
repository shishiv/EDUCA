import { describe, expect, it } from 'vitest'
import { buildDescriptiveReportEmissionData, requireNarrativeSnapshot } from '@/lib/reports/descriptive-report-emission'
import { narrativeEmissionFixture } from '@/tests/fixtures/narrative-report'

describe('narrative report emission', () => {
  it('uses the captured period, complete sources and database fingerprint, not taught content', () => {
    const source = narrativeEmissionFixture()
    const result = buildDescriptiveReportEmissionData(source)
    expect(result.vivencias).toEqual(source.snapshot.fontes)
    expect(result.periodo).toEqual({ inicio: '2026-02-01', fim: '2026-07-31', label: 'Semestre sintético' })
    expect(result.provenance).toMatchObject({ canonicalSource: 'public.vivencias via relatorios_descritivos.fontes_snapshot (vivencias-v1)',
      fingerprintAlgorithm: 'SHA-256/postgresql-jsonb-v1', canonicalContentFingerprint: 'a'.repeat(64), snapshotVersion: 'vivencias-v1', canonicalRowCount: 1 })
    expect(result.report.observacoesGerais).toBe('Observação sintética')
    expect(result.report.fields).toHaveLength(5)
    expect(result.issuer.actorId).toBe(source.actor.id)
  })
  it('rejects a legacy report without inventing historical sources', () => {
    const { report } = narrativeEmissionFixture()
    expect(() => requireNarrativeSnapshot({ ...report, fontes_snapshot: null })).toThrow('DESCRIPTIVE_REPORT_SNAPSHOT_MISSING')
  })
  it('rejects draft, unknown version and empty capture', () => {
    const { report, snapshot } = narrativeEmissionFixture()
    expect(() => requireNarrativeSnapshot({ ...report, status: 'rascunho' })).toThrow('DESCRIPTIVE_REPORT_NOT_FINALIZED')
    expect(() => requireNarrativeSnapshot({ ...report, fontes_snapshot: { ...snapshot, versao: 'future' } })).toThrow('DESCRIPTIVE_REPORT_SNAPSHOT_INVALID')
    expect(() => requireNarrativeSnapshot({ ...report, fontes_snapshot: { ...snapshot, fontes: [] } })).toThrow('DESCRIPTIVE_REPORT_SNAPSHOT_INVALID')
    expect(requireNarrativeSnapshot(report)).toEqual(snapshot)
  })
})
