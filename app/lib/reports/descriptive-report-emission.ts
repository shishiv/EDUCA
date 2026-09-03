import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  PILOT_DESCRIPTIVE_SEED_MARKER,
  PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
  PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY,
  PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY,
  PILOT_DESCRIPTIVE_FINGERPRINT_ALGORITHM,
  PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
  PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY,
  requirePilotDescriptiveReleaseRevision,
  PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
} from '@/lib/pilot/descriptive-report-demo-contract'
import { fingerprintCanonicalContentRows } from '@/lib/pilot/descriptive-report-provenance'
import type { PilotActor } from '@/lib/pilot/pilot-server-auth'
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
  provenance: {
    releaseRevision: string
    environment: typeof PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT
    canonicalSource: typeof PILOT_DESCRIPTIVE_CANONICAL_SOURCE
    fingerprintAlgorithm: typeof PILOT_DESCRIPTIVE_FINGERPRINT_ALGORITHM
    canonicalRowCount: number
    canonicalContentFingerprint: string
  }
  issuer: {
    actorId: string
    actorName: string
    actorRole: PilotActor['role']
    actorEmail: string | null
    reportId: string
    reportProfessorId: string
  }
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

type EmissionReport = Pick<
  DescriptiveReportRow,
  'id' | 'ano_letivo' | 'semestre' | 'observacoes_gerais' | 'professor_id'
>
type EmissionStudent = Pick<
  Database['public']['Tables']['alunos']['Row'],
  'id' | 'nome_completo' | 'data_nascimento'
>
type EmissionClass = Pick<
  Database['public']['Tables']['turmas']['Row'],
  'id' | 'nome' | 'serie' | 'escola_id'
>
type EmissionSchool = Pick<
  Database['public']['Tables']['escolas']['Row'],
  'id' | 'nome' | 'codigo'
>
type EmissionTeacher = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'nome'>

export interface DescriptiveReportEmissionSource {
  report: EmissionReport
  fields: DescriptiveReportEmissionField[]
  student: EmissionStudent
  turma: Pick<EmissionClass, 'id' | 'nome' | 'serie'>
  escola: EmissionSchool
  professor: EmissionTeacher
  periodo: DescriptiveReportEmissionData['periodo']
  content: ContentReport
  releaseRevision: string
  actor: PilotActor
}

export function buildDescriptiveReportEmissionData(
  source: DescriptiveReportEmissionSource
): DescriptiveReportEmissionData {
  return {
    report: {
      id: source.report.id,
      anoLetivo: source.report.ano_letivo,
      semestre: source.report.semestre as SemestreType,
      observacoesGerais: source.report.observacoes_gerais?.trim() || null,
      fields: source.fields,
    },
    student: {
      id: source.student.id,
      nome: source.student.nome_completo,
      dataNascimento: source.student.data_nascimento,
    },
    turma: {
      id: source.turma.id,
      nome: source.turma.nome,
      serie: source.turma.serie,
    },
    escola: {
      id: source.escola.id,
      nome: source.escola.nome,
      codigo: source.escola.codigo,
    },
    professor: {
      id: source.professor.id,
      nome: source.professor.nome,
    },
    periodo: source.periodo,
    conteudoMinistrado: source.content,
    provenance: {
      releaseRevision: source.releaseRevision,
      environment: PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
      canonicalSource: PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
      fingerprintAlgorithm: PILOT_DESCRIPTIVE_FINGERPRINT_ALGORITHM,
      canonicalRowCount: source.content.aulas.length,
      canonicalContentFingerprint: fingerprintCanonicalContentRows(source.content.aulas),
    },
    issuer: {
      actorId: source.actor.id,
      actorName: source.actor.name,
      actorRole: source.actor.role,
      actorEmail: source.actor.email,
      reportId: source.report.id,
      reportProfessorId: source.report.professor_id,
    },
  }
}

async function requireDescriptiveReportSeed(
  supabase: SupabaseClient<Database>,
  releaseRevision: string
): Promise<void> {
  const { data: seedConfigs, error } = await supabase
    .from('configs')
    .select('chave,valor')
    .in('chave', [
      PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
      PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY,
      PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY,
      PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY,
    ])

  if (error) throw error
  const configByKey = new Map((seedConfigs ?? []).map(config => [config.chave, config.valor]))
  if (configByKey.get(PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY) !== PILOT_DESCRIPTIVE_SEED_MARKER) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_SYNTHETIC_SEED_REQUIRED', 403)
  }
  if (configByKey.get(PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY) !== releaseRevision) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_RELEASE_REVISION_MISMATCH', 409)
  }
  if (configByKey.get(PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY) !== PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_ENVIRONMENT_INVALID', 403)
  }
  if (configByKey.get(PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY) !== PILOT_DESCRIPTIVE_CANONICAL_SOURCE) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CANONICAL_SOURCE_INVALID', 409)
  }
}

async function loadFinalizedDescriptiveReport(
  supabase: SupabaseClient<Database>,
  reportId: string
): Promise<DescriptiveReportRow> {
  const { data, error } = await supabase
    .from('relatorios_descritivos')
    .select('*')
    .eq('id', reportId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_NOT_FOUND', 404)
  if (data.status !== 'finalizado') {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_NOT_FINALIZED', 409)
  }
  return data
}

interface DescriptiveReportContext {
  student: EmissionStudent
  turma: EmissionClass
  escola: EmissionSchool
  professor: EmissionTeacher
  content: ContentReport
}

async function loadDescriptiveReportContext(
  supabase: SupabaseClient<Database>,
  report: DescriptiveReportRow,
  periodo: DescriptiveReportEmissionData['periodo']
): Promise<DescriptiveReportContext> {
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
    supabase.from('alunos').select('id,nome_completo,data_nascimento').eq('id', matricula.aluno_id).maybeSingle(),
    supabase.from('turmas').select('id,nome,serie,escola_id').eq('id', report.turma_id).maybeSingle(),
    supabase.from('users').select('id,nome').eq('id', report.professor_id).maybeSingle(),
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
  if (contentResult.data.turma?.id !== report.turma_id) {
    throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CONTENT_SCOPE_MISMATCH', 422)
  }

  const { data: escola, error: escolaError } = await supabase
    .from('escolas')
    .select('id,nome,codigo')
    .eq('id', turmaResult.data.escola_id)
    .maybeSingle()

  if (escolaError) throw escolaError
  if (!escola) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CONTEXT_MISSING', 422)
  return {
    student: studentResult.data,
    turma: turmaResult.data,
    professor: professorResult.data,
    escola,
    content: contentResult.data,
  }
}

/**
 * Loads one finalized report and its canonical conteudo_aula evidence through
 * the caller's real RLS-scoped Supabase client. It never derives content from
 * legacy session columns or synthetic fallback text.
 */
export async function loadDescriptiveReportEmissionData(
  supabase: SupabaseClient<Database>,
  reportId: string,
  actor: PilotActor
): Promise<DescriptiveReportEmissionData> {
  const releaseRevision = requirePilotDescriptiveReleaseRevision()
  await requireDescriptiveReportSeed(supabase, releaseRevision)
  const report = await loadFinalizedDescriptiveReport(supabase, reportId)
  const fields = resolveFinalizedDescriptiveReportFields(report)
  const periodo = getDescriptiveReportContentPeriod(report.ano_letivo, report.semestre)
  const context = await loadDescriptiveReportContext(supabase, report, periodo)
  return buildDescriptiveReportEmissionData({
    report,
    fields,
    student: context.student,
    turma: context.turma,
    escola: context.escola,
    professor: context.professor,
    periodo,
    content: context.content,
    releaseRevision,
    actor,
  })
}
