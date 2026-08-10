import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const appRoot = process.cwd()

function readAppFile(relativePath: string): string {
  return readFileSync(join(appRoot, relativePath), 'utf8')
}

describe('canonical attendance conditionality consumers', () => {
  const rpcConsumers = [
    'lib/reports/bolsa-familia-reports.ts',
    'hooks/use-compliance-warnings.ts',
    'app/api/dashboard/alerts/route.ts',
    'app/api/compliance/warnings/route.ts',
  ]

  it.each(rpcConsumers)('%s uses the canonical PostgreSQL read model', (relativePath) => {
    const source = readAppFile(relativePath)
    expect(source).toContain('getAttendanceConditionality')
    expect(source).not.toMatch(/\.from\(['"]frequencia['"]\)/)
    expect(source).not.toMatch(/\.from\(['"]frequencias['"]\)/)
  })

  it('exports consume resolved fields instead of universal municipality margins', () => {
    const exportSource = [
      readAppFile('lib/export/attendance-pdf.ts'),
      readAppFile('lib/export/attendance-excel.ts'),
      readAppFile('components/reports/BolsaFamiliaAlert.tsx'),
    ].join('\n')

    expect(exportSource).not.toContain('BOLSA_FAMILIA_THRESHOLD')
    expect(exportSource).not.toContain('BOLSA_FAMILIA_WARNING_THRESHOLD')
    expect(exportSource).toContain('margemMunicipal')
  })

  it('deliberate-break: bypassing the read model would make this contract red', () => {
    const reportSource = readAppFile('lib/reports/bolsa-familia-reports.ts')
    expect(reportSource).toContain('getAttendanceConditionality')
    expect(reportSource).not.toMatch(/\.from\(['"]frequencia['"]\)/)
  })
})
