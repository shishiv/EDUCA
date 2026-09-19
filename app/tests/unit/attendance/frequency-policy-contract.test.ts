import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getFrequencyPolicyStatus,
  isAttendanceCompliant,
} from '@/lib/attendance/attendance-policy'
import { calculateFaltasParaCritico } from '@/lib/reports/bolsa-familia-reports'
import { validateMinimumAttendance } from '@/lib/validation/brazilian'
import { validateAttendancePercentage } from '@/lib/validation/brazilian-educational'

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
  it('preserves exact boundary meanings for the seeded policy without rounding into a higher band', () => {
    const bands = { reference: 80, attention: 85 }
    expect([79.99, 80, 84.99, 85].map(value => getFrequencyPolicyStatus(value, bands)))
      .toEqual(['CRITICO', 'ATENCAO', 'ATENCAO', 'CONFORME'])
    expect(isAttendanceCompliant(80, bands)).toBe(true)
    expect(isAttendanceCompliant(79.99, bands)).toBe(false)
    expect(calculateFaltasParaCritico(16, 4, 0, 80)).toBe(1)
    expect(calculateFaltasParaCritico(14, 6, 0, 80)).toBe(0)
  })

  it('does not change legacy benefit assertions when general bands move across the same attendance', () => {
    const legalMessage = 'Atenção preventiva municipal abaixo de 85%; condicionalidade Bolsa Família atendida a partir de 80%'
    for (const bands of [{ reference: 70, attention: 75 }, { reference: 90, attention: 95 }]) {
      expect(getFrequencyPolicyStatus(82, bands)).toBe(bands.reference === 70 ? 'CONFORME' : 'CRITICO')
      expect(validateMinimumAttendance(82)).toBe(true)
      expect(validateAttendancePercentage(82)).toEqual({ isValid: true, status: 'warning', message: legalMessage })
    }
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
