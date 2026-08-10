import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  PILOT_DESCRIPTIVE_SEED_MARKER,
  PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
} from '@/lib/pilot/descriptive-report-demo-contract'
import {
  EXPERIENCE_FIELDS_CONFIG,
  SEMESTER_CONFIG,
  formatSemester,
  type SemestreType,
} from '@/types/descriptive-report'
import {
  generateContentReport,
  type ContentReport,
} from '@/lib/reports/content-reports'

type DescriptiveReportRow = Database['public']['Tables']['relatorios_descritivos']['Row']

/** A stable, client-safe failure for bounded descriptive-report PDF emission. */
export class DescriptiveReportEmissionError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code)
    this.name = 'DescriptiveReportEmissionError'
  }
}

/** A finalized field that the PDF prints from the persisted descriptive report. */
export interface DescriptiveReportEmissionField {
  label: string
  value: string
}

/** The only data shape accepted by the descriptive-report PDF renderer. */
export interface DescriptiveReportEmissionData {
  report: {
    id: string
    anoLetivo: number
    semestre: SemestreType
    observacoesGerais: string | null
    fields: DescriptiveReportEmissionField[]
  }
  student: {
    id: string
    nome: string
    dataNascimento: string
  }
  turma: {
    id: string
    nome: string
    serie: string
  }
  escola: {
    id: string
    nome: string
    codigo: string | null
  }
  professor: {
    id: string
    nome: string
  }
  periodo: {
    inicio: string
    fim: string
    label: string
  }
  conteudoMinistrado: ContentReport
}

/** Calculates the canonical semester window used to query taught content. */
export function getDescriptiveReportContentPeriod(
  anoLetivo: number,
  semestre: string
): DescriptiveReportEmissionData['periodo'] {
  if (!Number.isInteger(anoLetivo) || anoLetivo < 1) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_PERIOD_INVALID', 422)
  }

  if (semestre !== 'primeiro' && semestre !== 'segundo') {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_PERIOD_INVALID', 422)
  }

  const semester = semestre as SemestreType
  const config = SEMESTER_CONFIG[semester]
  const lastDay = new Date(Date.UTC(anoLetivo, config.endMonth, 0))

  return {
    inicio: `${anoLetivo}-${String(config.startMonth).padStart(2, '0')}-01`,
    fim: lastDay.toISOString().slice(0, 10),
    label: formatSemester(semester, anoLetivo),
  }
}

function resolveFinalizedDescriptiveReportFields(
  report: DescriptiveReportRow
): DescriptiveReportEmissionField[] {
  return EXPERIENCE_FIELDS_CONFIG.map(field => {
    const value = report[field.key]
    if (!value || value.trim().length === 0) {
      throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_FIELDS_INCOMPLETE', 422)
    }

    return { label: field.fullName, value: value.trim() }
  })
}

/**
 * Loads one finalized report and its canonical conteudo_aula evidence through
 * the caller's real RLS-scoped Supabase client. It never derives content from
 * legacy session columns or synthetic fallback text.
 */
export async function loadDescriptiveReportEmissionData(
  supabase: SupabaseClient<Database>,
  reportId: string
): Promise<DescriptiveReportEmissionData> {
  const { data: syntheticMarker, error: markerError } = await supabase
    .from('configs')
    .select('valor')
    .eq('chave', PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY)
    .maybeSingle()

  if (markerError) throw markerError
  if (syntheticMarker?.valor !== PILOT_DESCRIPTIVE_SEED_MARKER) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_SYNTHETIC_SEED_REQUIRED', 403)
  }

  const { data: report, error: reportError } = await supabase
    .from('relatorios_descritivos')
    .select('*')
    .eq('id', reportId)
    .maybeSingle()

  if (reportError) throw reportError
  if (!report) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_NOT_FOUND', 404)
  if (report.status !== 'finalizado') {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_NOT_FINALIZED', 409)
  }

  const fields = resolveFinalizedDescriptiveReportFields(report)
  const periodo = getDescriptiveReportContentPeriod(report.ano_letivo, report.semestre)

  const { data: matricula, error: matriculaError } = await supabase
    .from('matriculas')
    .select('id,aluno_id,turma_id')
    .eq('id', report.matricula_id)
    .maybeSingle()

  if (matriculaError) throw matriculaError
  if (!matricula || matricula.turma_id !== report.turma_id) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CONTEXT_MISSING', 422)
  }

  const [studentResult, turmaResult, professorResult, contentResult] = await Promise.all([
    supabase
      .from('alunos')
      .select('id,nome_completo,data_nascimento')
      .eq('id', matricula.aluno_id)
      .maybeSingle(),
    supabase
      .from('turmas')
      .select('id,nome,serie,escola_id')
      .eq('id', report.turma_id)
      .maybeSingle(),
    supabase
      .from('users')
      .select('id,nome')
      .eq('id', report.professor_id)
      .maybeSingle(),
    generateContentReport(supabase, {
      startDate: periodo.inicio,
      endDate: periodo.fim,
      turmaId: report.turma_id,
    }),
  ])

  if (studentResult.error) throw studentResult.error
  if (turmaResult.error) throw turmaResult.error
  if (professorResult.error) throw professorResult.error
  if (!studentResult.data || !turmaResult.data || !professorResult.data) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CONTEXT_MISSING', 422)
  }
  if (contentResult.error || !contentResult.data) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CONTENT_QUERY_FAILED', 502)
  }
  if (contentResult.data.aulas.length === 0) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CONTENT_EMPTY', 422)
  }

  const { data: escola, error: escolaError } = await supabase
    .from('escolas')
    .select('id,nome,codigo')
    .eq('id', turmaResult.data.escola_id)
    .maybeSingle()

  if (escolaError) throw escolaError
  if (!escola) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CONTEXT_MISSING', 422)

  return {
    report: {
      id: report.id,
      anoLetivo: report.ano_letivo,
      semestre: report.semestre as SemestreType,
      observacoesGerais: report.observacoes_gerais?.trim() || null,
      fields,
    },
    student: {
      id: studentResult.data.id,
      nome: studentResult.data.nome_completo,
      dataNascimento: studentResult.data.data_nascimento,
    },
    turma: {
      id: turmaResult.data.id,
      nome: turmaResult.data.nome,
      serie: turmaResult.data.serie,
    },
    escola: {
      id: escola.id,
      nome: escola.nome,
      codigo: escola.codigo,
    },
    professor: {
      id: professorResult.data.id,
      nome: professorResult.data.nome,
    },
    periodo,
    conteudoMinistrado: contentResult.data,
  }
}
