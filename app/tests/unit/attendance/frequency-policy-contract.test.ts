import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ATENCAO,
  CONFORMIDADE,
  getFrequencyPolicyStatus,
  isAttendanceCompliant,
} from '@/lib/attendance/attendance-policy'
import { calculateFaltasParaCritico } from '@/lib/reports/bolsa-familia-reports'

const POLICY_SURFACES = [
  'lib/reports/bolsa-familia-reports.ts',
  'app/api/compliance/warnings/route.ts',
  'app/api/dashboard/alerts/route.ts',
  'lib/reports/attendance-reports.ts',
  'lib/export/attendance-excel.ts',
  'lib/export/attendance-pdf.ts',
  'components/reports/BolsaFamiliaAlert.tsx',
  'app/(dashboard)/relatorios/bolsa-familia/page.tsx',
  'components/reports/AttendanceReportTable.tsx',
  'app/(dashboard)/relatorios/frequencia/page.tsx',
  'components/diary/LessonCard.tsx',
  'components/diary/LessonDetailPanel.tsx',
  'components/diary/ClassDiaryDetail.tsx',
  'components/diary/ClassDiaryList.tsx',
  'components/diary/FrequencyControls.tsx',
  'components/attendance/AttendanceGridHeader.tsx',
  'components/attendance/ChamadaHeader.tsx',
  'components/students/StudentInfoGrid.tsx',
  'components/reports/StudentReport.tsx',
  'app/(dashboard)/dashboard/matriculas/[id]/page.tsx',
  'app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx',
  'app/(dashboard)/dashboard/page.tsx',
  'app/(dashboard)/dashboard/turmas/[id]/page.tsx',
]

function readSurface(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('canonical frequency policy contract', () => {
  it('keeps the captain thresholds and boundary meanings independent of consumers', () => {
    expect(CONFORMIDADE).toBe(80)
    expect(ATENCAO).toBe(85)

    expect(getFrequencyPolicyStatus(70)).toBe('CRITICO')
    expect(getFrequencyPolicyStatus(79)).toBe('CRITICO')
    expect(getFrequencyPolicyStatus(80)).toBe('ATENCAO')
    expect(getFrequencyPolicyStatus(84)).toBe('ATENCAO')
    expect(getFrequencyPolicyStatus(85)).toBe('CONFORME')
    expect(isAttendanceCompliant(80)).toBe(true)
    expect(isAttendanceCompliant(79)).toBe(false)
    expect(calculateFaltasParaCritico(16, 4, 0)).toBe(1)
    expect(calculateFaltasParaCritico(14, 6, 0)).toBe(0)
  })

  it('rejects legacy literals and direct attendance reads in alert surfaces', () => {
    for (const relativePath of POLICY_SURFACES) {
      const source = readSurface(relativePath)
      expect(source, `${relativePath} must not restore the legacy 75% band`).not.toMatch(/\b75\s*%|(?:<=|>=|<|>)\s*75\b/)
      expect(source, `${relativePath} must use the canonical attendance reader`).not.toMatch(
        /\.from\(\s*["']frequencia["']\s*\)/
      )
    }
  })

  it('keeps the frequency table query in one canonical reader', () => {
    const canonicalSource = readSurface('lib/api/canonical-attendance-facts.ts')
    expect(canonicalSource).toMatch(/\.from\(['"]frequencia['"]\)/)
    expect(canonicalSource).toContain(".not('sessao_id', 'is', null)")
    expect(canonicalSource).toContain("status_presenca === 'NAO_MARCADO'")
  })
})
