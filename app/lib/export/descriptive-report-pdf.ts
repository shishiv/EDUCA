import { readFile } from 'node:fs/promises'
import path from 'node:path'
import autoTable from 'jspdf-autotable'
import { formatDateBR, formatDateShortBR } from '@/lib/date-utils'
import { createPDFDocument } from '@/lib/export/pdf-utils'
import type { DescriptiveReportEmissionData } from '@/lib/reports/descriptive-report-emission'

const REPORT_MARGIN = {
  top: 16,
  right: 16,
  bottom: 18,
  left: 16,
} as const

type PdfRgbColor = [number, number, number]

const REPORT_COLORS: Record<'border' | 'green' | 'ink' | 'paper' | 'slate' | 'smoke', PdfRgbColor> = {
  border: [197, 224, 210],
  green: [5, 150, 105],
  ink: [11, 18, 32],
  paper: [244, 250, 247],
  slate: [51, 65, 85],
  smoke: [100, 116, 139],
}

const REPORT_ASSETS_ROOT = path.join(process.cwd(), 'public', 'relatorios-padrao')

interface DescriptiveReportPdfAssets {
  interBase64: string
  lexendBase64: string
  logoDataUri: string
}

/** Loads the PR14 print-model assets that make PDFs self-contained and portable. */
async function loadDescriptiveReportPdfAssets(): Promise<DescriptiveReportPdfAssets> {
  try {
    const [inter, lexend, logo] = await Promise.all([
      readFile(path.join(REPORT_ASSETS_ROOT, 'fonts', 'Inter.ttf')),
      readFile(path.join(REPORT_ASSETS_ROOT, 'fonts', 'Lexend.ttf')),
      readFile(path.join(REPORT_ASSETS_ROOT, 'assets', 'educa-logo.png')),
    ])

    return {
      interBase64: inter.toString('base64'),
      lexendBase64: lexend.toString('base64'),
      logoDataUri: `data:image/png;base64,${logo.toString('base64')}`,
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown asset read failure'
    throw new Error(`DESCRIPTIVE_REPORT_PDF_ASSET_MISSING: ${detail}`)
  }
}

function registerDescriptiveReportPdfFonts(
  doc: ReturnType<typeof createPDFDocument>,
  assets: DescriptiveReportPdfAssets
): void {
  doc.addFileToVFS('Inter.ttf', assets.interBase64)
  doc.addFont('Inter.ttf', 'Inter', 'normal')
  doc.addFont('Inter.ttf', 'Inter', 'bold')
  doc.addFileToVFS('Lexend.ttf', assets.lexendBase64)
  doc.addFont('Lexend.ttf', 'Lexend', 'normal')
  doc.addFont('Lexend.ttf', 'Lexend', 'bold')
}

function drawDescriptiveReportPageHeader(
  doc: ReturnType<typeof createPDFDocument>,
  assets: DescriptiveReportPdfAssets
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const logoPlaceholderWidth = 46
  const logoPlaceholderHeight = 28
  const wordmarkWidth = 52
  const wordmarkHeight = 15
  const headerY = REPORT_MARGIN.top

  doc.setDrawColor(...REPORT_COLORS.smoke)
  doc.setFillColor(248, 250, 252)
  doc.setLineDashPattern([1.5, 1.5], 0)
  doc.roundedRect(
    REPORT_MARGIN.left,
    headerY,
    logoPlaceholderWidth,
    logoPlaceholderHeight,
    2,
    2,
    'FD'
  )
  doc.setLineDashPattern([], 0)
  doc.setTextColor(...REPORT_COLORS.smoke)
  doc.setFont('Lexend', 'bold')
  doc.setFontSize(8.5)
  doc.text('LOGO DA ESCOLA', REPORT_MARGIN.left + logoPlaceholderWidth / 2, headerY + 11, {
    align: 'center',
  })
  doc.setFont('Inter', 'normal')
  doc.setFontSize(7)
  doc.text(['espaço reservado', 'cole aqui a logo oficial'], REPORT_MARGIN.left + logoPlaceholderWidth / 2, headerY + 16, {
    align: 'center',
  })

  doc.addImage(
    assets.logoDataUri,
    'PNG',
    pageWidth - REPORT_MARGIN.right - wordmarkWidth,
    headerY + 6,
    wordmarkWidth,
    wordmarkHeight
  )

  const ruleY = headerY + logoPlaceholderHeight + 4
  doc.setDrawColor(...REPORT_COLORS.green)
  doc.setLineWidth(0.88)
  doc.line(REPORT_MARGIN.left, ruleY, pageWidth - REPORT_MARGIN.right, ruleY)
  doc.setLineWidth(0.2)

  return ruleY + 7
}

function drawDescriptiveReportFooter(doc: ReturnType<typeof createPDFDocument>): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageCount = doc.getNumberOfPages()

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...REPORT_COLORS.border)
    doc.line(REPORT_MARGIN.left, pageHeight - REPORT_MARGIN.bottom, pageWidth - REPORT_MARGIN.right, pageHeight - REPORT_MARGIN.bottom)
    doc.setFont('Inter', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...REPORT_COLORS.smoke)
    doc.text(
      'EDUCA - Sistema de Gestão Escolar · documento gerado pela plataforma',
      REPORT_MARGIN.left,
      pageHeight - 12
    )
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - REPORT_MARGIN.right, pageHeight - 12, {
      align: 'right',
    })
  }
}

function drawDescriptiveReportTitle(
  doc: ReturnType<typeof createPDFDocument>,
  startY: number,
  data: DescriptiveReportEmissionData
): number {
  doc.setFont('Lexend', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...REPORT_COLORS.ink)
  doc.text('Relatório Descritivo', REPORT_MARGIN.left, startY)
  doc.setFont('Inter', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...REPORT_COLORS.smoke)
  doc.text(
    'Educação Infantil · documento gerado pela plataforma EDUCA',
    REPORT_MARGIN.left,
    startY + 5
  )

  const metadataRows = [
    ['Escola', data.escola.nome, 'Código da escola', data.escola.codigo ?? 'Não cadastrado'],
    ['Turma', `${data.turma.nome} · ${data.turma.serie}`, 'Ano letivo / período', data.periodo.label],
    ['Aluno(a)', data.student.nome, 'Nascimento', formatDateBR(data.student.dataNascimento)],
    ['Professor(a)', data.professor.nome, 'Registros de conteúdo', String(data.conteudoMinistrado.aulas.length)],
  ]

  autoTable(doc, {
    startY: startY + 10,
    body: metadataRows.map(row => [
      { content: row[0].toUpperCase(), styles: { fontStyle: 'bold', textColor: REPORT_COLORS.smoke } },
      { content: row[1], styles: { textColor: REPORT_COLORS.ink } },
      { content: row[2].toUpperCase(), styles: { fontStyle: 'bold', textColor: REPORT_COLORS.smoke } },
      { content: row[3], styles: { textColor: REPORT_COLORS.ink } },
    ]),
    theme: 'plain',
    styles: {
      font: 'Inter',
      fontSize: 8.5,
      cellPadding: { top: 1.2, right: 2, bottom: 1.2, left: 0 },
      lineColor: REPORT_COLORS.border,
    },
    columnStyles: {
      0: { cellWidth: 29, fontSize: 7 },
      1: { cellWidth: 61 },
      2: { cellWidth: 29, fontSize: 7 },
      3: { cellWidth: 'auto' },
    },
    margin: { left: REPORT_MARGIN.left, right: REPORT_MARGIN.right },
  })

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

function drawDescriptiveReportSectionTitle(
  doc: ReturnType<typeof createPDFDocument>,
  label: string,
  startY: number
): number {
  doc.setDrawColor(...REPORT_COLORS.green)
  doc.setLineWidth(1.06)
  doc.line(REPORT_MARGIN.left, startY - 3.5, REPORT_MARGIN.left, startY + 2.5)
  doc.setLineWidth(0.2)
  doc.setFont('Lexend', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...REPORT_COLORS.ink)
  doc.text(label, REPORT_MARGIN.left + 3.5, startY)
  return startY + 4
}

function drawDescriptiveReportSignatures(
  doc: ReturnType<typeof createPDFDocument>,
  data: DescriptiveReportEmissionData,
  startY: number,
  assets: DescriptiveReportPdfAssets
): void {
  const pageHeight = doc.internal.pageSize.getHeight()
  const signatureY = startY + 14
  if (signatureY > pageHeight - REPORT_MARGIN.bottom - 16) {
    doc.addPage()
    startY = drawDescriptiveReportPageHeader(doc, assets)
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const gap = 14
  const signatureWidth = (pageWidth - REPORT_MARGIN.left - REPORT_MARGIN.right - gap) / 2
  const lineY = startY + 13

  doc.setDrawColor(...REPORT_COLORS.ink)
  doc.line(REPORT_MARGIN.left, lineY, REPORT_MARGIN.left + signatureWidth, lineY)
  doc.line(pageWidth - REPORT_MARGIN.right - signatureWidth, lineY, pageWidth - REPORT_MARGIN.right, lineY)
  doc.setFont('Inter', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...REPORT_COLORS.slate)
  doc.text(data.professor.nome, REPORT_MARGIN.left + signatureWidth / 2, lineY + 4, { align: 'center' })
  doc.text('Professor(a)', REPORT_MARGIN.left + signatureWidth / 2, lineY + 8, { align: 'center' })
  doc.text('Coordenação Pedagógica', pageWidth - REPORT_MARGIN.right - signatureWidth / 2, lineY + 8, { align: 'center' })
}

/**
 * Renders the bounded descriptive report as a portable A4 PDF. The visual
 * structure follows the PR14 printable-report wireframe and content evidence
 * comes only from the supplied canonical conteudo_aula report.
 */
export async function renderDescriptiveReportPdf(
  data: DescriptiveReportEmissionData
): Promise<ArrayBuffer> {
  if (data.conteudoMinistrado.aulas.length === 0) {
    throw new Error('DESCRIPTIVE_REPORT_PDF_CONTENT_EMPTY: canonical content is required')
  }

  const assets = await loadDescriptiveReportPdfAssets()
  const doc = createPDFDocument('portrait')
  registerDescriptiveReportPdfFonts(doc, assets)

  let currentY = drawDescriptiveReportPageHeader(doc, assets)
  currentY = drawDescriptiveReportTitle(doc, currentY, data)
  currentY = drawDescriptiveReportSectionTitle(doc, 'Desenvolvimento da criança', currentY + 8)

  autoTable(doc, {
    startY: currentY,
    head: [['Campo de experiência', 'Registro descritivo']],
    body: data.report.fields.map(field => [field.label, field.value]),
    theme: 'grid',
    styles: {
      font: 'Inter',
      fontSize: 9,
      textColor: REPORT_COLORS.slate,
      cellPadding: 2,
      lineColor: REPORT_COLORS.border,
      lineWidth: 0.18,
      valign: 'top',
    },
    headStyles: {
      fillColor: REPORT_COLORS.paper,
      font: 'Inter',
      fontStyle: 'bold',
      fontSize: 7.5,
      textColor: REPORT_COLORS.smoke,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', textColor: REPORT_COLORS.ink },
      1: { cellWidth: 'auto' },
    },
    margin: {
      top: 58,
      right: REPORT_MARGIN.right,
      bottom: 27,
      left: REPORT_MARGIN.left,
    },
    willDrawPage: () => {
      if (doc.getCurrentPageInfo().pageNumber > 1) {
        drawDescriptiveReportPageHeader(doc, assets)
      }
    },
  })

  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  if (data.report.observacoesGerais) {
    currentY = drawDescriptiveReportSectionTitle(doc, 'Observações gerais', currentY + 8)
    autoTable(doc, {
      startY: currentY,
      body: [[data.report.observacoesGerais]],
      theme: 'plain',
      styles: {
        font: 'Inter',
        fontSize: 9,
        textColor: REPORT_COLORS.slate,
        cellPadding: 2,
      },
      margin: {
        top: 58,
        right: REPORT_MARGIN.right,
        bottom: 27,
        left: REPORT_MARGIN.left,
      },
      willDrawPage: () => {
        if (doc.getCurrentPageInfo().pageNumber > 1) {
          drawDescriptiveReportPageHeader(doc, assets)
        }
      },
    })
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  }

  const pageHeight = doc.internal.pageSize.getHeight()
  if (currentY > pageHeight - REPORT_MARGIN.bottom - 42) {
    doc.addPage()
    currentY = drawDescriptiveReportPageHeader(doc, assets)
  }

  currentY = drawDescriptiveReportSectionTitle(doc, 'Conteúdo ministrado no período', currentY + 8)
  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Conteúdo ministrado', 'Objetivo', 'Habilidades BNCC']],
    body: data.conteudoMinistrado.aulas.map(aula => [
      formatDateShortBR(aula.dataAula),
      aula.tema,
      aula.objetivo,
      aula.habilidadesBncc.join(', ') || 'Não registrado',
    ]),
    theme: 'grid',
    styles: {
      font: 'Inter',
      fontSize: 8,
      textColor: REPORT_COLORS.slate,
      cellPadding: 1.7,
      lineColor: REPORT_COLORS.border,
      lineWidth: 0.18,
      valign: 'top',
    },
    headStyles: {
      fillColor: REPORT_COLORS.paper,
      font: 'Inter',
      fontStyle: 'bold',
      fontSize: 7.5,
      textColor: REPORT_COLORS.smoke,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 42 },
      2: { cellWidth: 64 },
      3: { cellWidth: 'auto' },
    },
    margin: {
      top: 58,
      right: REPORT_MARGIN.right,
      bottom: 27,
      left: REPORT_MARGIN.left,
    },
    willDrawPage: () => {
      if (doc.getCurrentPageInfo().pageNumber > 1) {
        drawDescriptiveReportPageHeader(doc, assets)
      }
    },
  })

  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  drawDescriptiveReportSignatures(doc, data, currentY, assets)
  drawDescriptiveReportFooter(doc)

  return doc.output('arraybuffer') as ArrayBuffer
}
