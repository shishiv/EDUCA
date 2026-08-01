/**
 * PDF Export Utilities - Regression Tests
 *
 * Guards the jsPDF 3.x -> 4.x migration (Plan 001, issue #35).
 * jsPDF 4.x changed the module format and dropped the bundled dompurify
 * dependency; these tests pin the API surface that lib/export/pdf-utils.ts
 * relies on so a future major bump cannot silently break exports.
 */
import { describe, it, expect } from 'vitest'
import {
  createPDFDocument,
  addPDFHeader,
  addPDFTable,
  addPDFSummary,
  addPDFText,
  addPDFFooter,
  getPDFBlob,
  getPDFBase64,
  formatDateBR,
  formatPeriodLabel,
} from '@/lib/export/pdf-utils'

describe('PDF export utilities (jsPDF 4.x)', () => {
  it('creates an A4 document with correct dimensions', () => {
    const doc = createPDFDocument('portrait')
    // jsPDF 4.x keeps internal.pageSize (mm units)
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(210, 1)
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(297, 1)
  })

  it('creates an A4 landscape document', () => {
    const doc = createPDFDocument('landscape')
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(297, 1)
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(210, 1)
  })

  it('adds a header and returns a cursor position below the title', () => {
    const doc = createPDFDocument()
    const startY = addPDFHeader(doc, {
      schoolName: 'EMEF Teste',
      title: 'Relatório de Frequência',
      subtitle: 'Ano Letivo 2026',
      period: { start: '2026-02-01', end: '2026-06-30' },
    })
    expect(startY).toBeGreaterThan(15)
    expect(doc.internal.pages.length).toBeGreaterThanOrEqual(1)
  })

  it('adds an autoTable and reports the final cursor position', () => {
    const doc = createPDFDocument()
    const startY = addPDFHeader(doc, { title: 'Boletim' })
    const finalY = addPDFTable(
      doc,
      {
        columns: [
          { header: 'Aluno', dataKey: 'aluno' },
          { header: 'Nota', dataKey: 'nota', halign: 'right' },
        ],
        rows: [
          { aluno: 'João da Silva', nota: 9.5 },
          { aluno: 'Maria Souza', nota: 8.0 },
        ],
        title: 'Notas Bimestrais',
        summary: 'Média: 8.75',
      },
      startY
    )
    // jspdf-autotable 5.x keeps doc.lastAutoTable.finalY on jsPDF 4.x
    const lastAutoTable = doc as unknown as {
      lastAutoTable?: { finalY: number }
    }
    expect(finalY).toBeGreaterThan(startY)
    expect(lastAutoTable.lastAutoTable?.finalY).toBeGreaterThan(0)
  })

  it('adds a summary with metric boxes', () => {
    const doc = createPDFDocument()
    const finalY = addPDFSummary(
      doc,
      'Resumo',
      [
        { label: 'Presentes', value: 120 },
        { label: 'Faltas', value: 8 },
      ],
      30
    )
    expect(finalY).toBeGreaterThan(30)
  })

  it('adds wrapped text and advances the cursor by line count', () => {
    const doc = createPDFDocument()
    const finalY = addPDFText(doc, 'linha única', 30)
    const multiY = addPDFText(doc, 'texto longo '.repeat(100), 40, { maxWidth: 50 })
    expect(finalY).toBe(35)
    expect(multiY).toBeGreaterThan(45)
  })

  it('adds page numbers and generation footer to all pages', () => {
    const doc = createPDFDocument()
    doc.addPage()
    doc.addPage()
    expect(() =>
      addPDFFooter(doc, { showPageNumbers: true, showGeneratedAt: false })
    ).not.toThrow()
    // jsPDF keeps an internal buffer page, so pages.length is content pages + 1
    expect(doc.internal.pages.length - 1).toBe(3)
  })

  it('exports the document as a Blob (getPDFBlob)', () => {
    const doc = createPDFDocument()
    addPDFHeader(doc, { title: 'Teste' })
    const blob = getPDFBlob(doc)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(100)
  })

  it('exports the document as a base64 data URI (getPDFBase64)', () => {
    const doc = createPDFDocument()
    addPDFHeader(doc, { title: 'Teste' })
    const dataUri = getPDFBase64(doc)
    expect(dataUri.startsWith('data:application/pdf')).toBe(true)
  })

  it('renders a document through every helper without throwing', () => {
    const doc = createPDFDocument()
    let y = addPDFHeader(doc, {
      schoolName: 'EMEF Teste',
      title: 'Relatório',
      subtitle: 'Sintético',
    })
    y = addPDFSummary(doc, 'Métricas', [{ label: 'Total', value: 10 }], y)
    y = addPDFTable(
      doc,
      {
        columns: [
          { header: 'Campo', dataKey: 'campo' },
          { header: 'Valor', dataKey: 'valor' },
        ],
        rows: [{ campo: 'Aulas', valor: '40' }],
      },
      y
    )
    addPDFText(doc, 'Observações finais do relatório.', y)
    addPDFFooter(doc)
    const blob = getPDFBlob(doc)
    expect(blob.size).toBeGreaterThan(100)
  })

  it('formats Brazilian dates and periods (unchanged helpers)', () => {
    // Local Date objects avoid UTC-to-local day shifts in any timezone
    expect(formatDateBR(new Date(2026, 1, 1))).toContain('fevereiro')
    expect(formatPeriodLabel('2026-02-01', '2026-06-30')).toBe(
      '01/02 - 30/06'
    )
  })
})
