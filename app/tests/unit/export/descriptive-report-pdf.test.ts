// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderDescriptiveReportPdf } from '@/lib/export/descriptive-report-pdf'
import { buildDescriptiveReportEmissionData } from '@/lib/reports/descriptive-report-emission'
import { narrativeEmissionFixture } from '@/tests/fixtures/narrative-report'

describe('descriptive report PDF renderer', () => {
  it('renders a portable A4 PDF from finalized fields and captured Vivências', async () => {
    const pdf = await renderDescriptiveReportPdf(buildDescriptiveReportEmissionData(narrativeEmissionFixture()))
    expect(Buffer.from(pdf).subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(pdf.byteLength).toBeGreaterThan(0)
  })
  it('rejects a render without captured narrative sources', async () => {
    const data = buildDescriptiveReportEmissionData(narrativeEmissionFixture())
    data.vivencias = []
    await expect(renderDescriptiveReportPdf(data)).rejects.toThrow('DESCRIPTIVE_REPORT_PDF_SOURCES_EMPTY')
  })
})
