// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderDescriptiveReportPdf } from '@/lib/export/descriptive-report-pdf'
import type { DescriptiveReportEmissionData } from '@/lib/reports/descriptive-report-emission'

function createDescriptiveReportEmissionFixture(): DescriptiveReportEmissionData {
  return {
    report: {
      id: '28000000-0000-0000-0000-000000000001',
      anoLetivo: 2026,
      semestre: 'primeiro',
      observacoesGerais: 'Observação sintética para validar a renderização portátil do documento em formato PDF.',
      fields: [
        { label: 'O eu, o outro e o nós', value: 'Registro sintético do desenvolvimento em interações, autonomia e convivência durante atividades coletivas.' },
        { label: 'Corpo, gestos e movimentos', value: 'Registro sintético de movimentos, trajetos e exploração corporal em brincadeiras orientadas.' },
        { label: 'Traços, sons, cores e formas', value: 'Registro sintético de produção visual, sons e experimentação de materiais expressivos.' },
        { label: 'Escuta, fala, pensamento e imaginação', value: 'Registro sintético de escuta, relato, imaginação e participação em rodas de conversa.' },
        { label: 'Espaços, tempos, quantidades, relações e transformações', value: 'Registro sintético de investigações sobre tempo, espaço, quantidades e transformações.' },
      ],
    },
    student: {
      id: '23000000-0000-0000-0000-000000000001',
      nome: 'Criança Descritiva Sintética',
      dataNascimento: '2021-03-21',
    },
    turma: {
      id: '22000000-0000-0000-0000-000000000001',
      nome: 'Pré II Sintético',
      serie: 'Pré II',
    },
    escola: {
      id: '21000000-0000-0000-0000-000000000001',
      nome: 'Escola Descritiva Sintética',
      codigo: 'PILOT-DESC',
    },
    professor: {
      id: '20000000-0000-0000-0000-000000000001',
      nome: 'Professora Descritiva Sintética',
    },
    periodo: {
      inicio: '2026-02-01',
      fim: '2026-07-31',
      label: '1 Semestre de 2026',
    },
    conteudoMinistrado: {
      periodo: { inicio: '2026-02-01', fim: '2026-07-31' },
      turma: { id: '22000000-0000-0000-0000-000000000001', nome: 'Pré II Sintético', serie: 'Pré II' },
      escola: { id: '21000000-0000-0000-0000-000000000001', nome: 'Escola Descritiva Sintética' },
      professor: { id: '20000000-0000-0000-0000-000000000001', nome: 'Professora Descritiva Sintética' },
      resumo: {
        totalAulas: 1,
        totalHabilidadesBncc: 1,
        habilidadesUnicas: 1,
        mediaHabilidadesPorAula: 1,
        disciplinasMaisTrabalhadas: [],
      },
      aulas: [{
        id: '27000000-0000-0000-0000-000000000001',
        sessaoId: '26000000-0000-0000-0000-000000000001',
        dataAula: '2026-03-10',
        tema: 'Círculo de conversa e escuta coletiva',
        objetivo: 'Ampliar a escuta e a participação em grupo',
        habilidadesBncc: ['EI03EO04'],
        metodologia: 'Roda de conversa mediada',
        recursos: 'Cartões de fala e tapete',
        observacoes: 'Registro sintético de conteúdo ministrado',
        turmaNome: 'Pré II Sintético',
        turmaSerie: 'Pré II',
        professorNome: 'Professora Descritiva Sintética',
        escolaNome: 'Escola Descritiva Sintética',
        disciplinaCodigo: 'INF',
        disciplinaNome: 'Educação Infantil',
        createdAt: '2026-08-10T12:00:00.000Z',
      }],
      habilidadesBncc: [],
      geradoEm: '2026-08-10T12:00:00.000Z',
    },
  }
}

describe('descriptive report PDF renderer', () => {
  it('renders a portable A4 PDF from finalized fields and canonical content', async () => {
    const pdf = await renderDescriptiveReportPdf(createDescriptiveReportEmissionFixture())

    expect(Buffer.from(pdf).subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(pdf.byteLength).toBeGreaterThan(0)
  })

  it('rejects a PDF render without canonical taught content', async () => {
    const fixture = createDescriptiveReportEmissionFixture()
    fixture.conteudoMinistrado.aulas = []

    await expect(renderDescriptiveReportPdf(fixture)).rejects.toThrow(
      /DESCRIPTIVE_REPORT_PDF_CONTENT_EMPTY/
    )
  })
})
