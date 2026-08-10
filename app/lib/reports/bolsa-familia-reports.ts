/**
 * Bolsa Família attendance report adapter.
 *
 * Attendance and threshold resolution come from the canonical PostgreSQL read
 * model. This module only formats those rows for the report and its exports.
 */

import { logger } from '@/lib/logger'
import { CONFORMIDADE, type FrequencyPolicyStatus } from '@/lib/attendance/attendance-policy'
import {
  filterBolsaFamiliaConditionality,
  getAttendanceConditionality,
  isLegalAttendanceRisk,
  isMunicipalAttendanceRisk,
  type AttendanceConditionalityFilters,
  type AttendanceConditionalityRow,
} from './attendance-conditionality'

// ============================================================================
// TYPES
// ============================================================================

export interface BolsaFamiliaFilters extends AttendanceConditionalityFilters {
  onlyAtRisk?: boolean
}

export type BolsaFamiliaStatus = FrequencyPolicyStatus

export interface BolsaFamiliaStudent {
  matriculaId: string
  alunoId: string
  nome: string
  nis: string
  bolsaFamilia: boolean
  idadeAnos: number
  educacaoBasicaConcluida: boolean
  condicionalidadeLegal: string | null
  pisoLegalPercent: number | null
  statusLegal: string
  margemMunicipalId: string | null
  margemMunicipalCriticaPercent: number | null
  margemMunicipalAlertaPercent: number | null
  margemMunicipalStatus: string
  margemMunicipalPrecedencia: number | null
  margemMunicipalOrigem: string | null
  margemMunicipalDefinidaPor: string | null
  margemMunicipalDefinidaEm: string | null
  margemMunicipalFallback: boolean
  margemMunicipalFallbackMotivo: string | null
  margemMunicipalVigenciaInicio: string | null
  margemMunicipalVigenciaFim: string | null
  turmaId: string
  turmaNome: string
  turmaSerie: string
  escolaId: string
  escolaNome: string
  presencas: number
  faltas: number
  atestados: number
  totalAulas: number
  percentual: number
  /** Display status for the municipality early-warning margin. */
  status: BolsaFamiliaStatus
  faltasParaCritico: number
}

export interface MunicipalMarginResolution {
  id: string | null
  municipalityId: string
  criticalPercent: number | null
  warningPercent: number | null
  precedence: number | null
  source: string | null
  definedBy: string | null
  definedAt: string | null
  fallback: boolean
  fallbackReason: string | null
  validFrom: string | null
  validUntil: string | null
}

export interface BolsaFamiliaReport {
  periodo: {
    inicio: string
    fim: string
  }
  resumo: {
    totalAlunosBolsaFamilia: number
    conformes: number
    emAtencaoPreventiva: number
    emRiscoCritico: number
    percentualConformidade: number
    condicionalidadesLegaisCriticas: number
    semCondicionalidadeLegal: number
  }
  resolucoesMargemMunicipal: MunicipalMarginResolution[]
  alunos: BolsaFamiliaStudent[]
  geradoEm: string
}

export interface BolsaFamiliaReportResult {
  data: BolsaFamiliaReport | null
  error: string | null
}

// ============================================================================
// PURE STATUS HELPERS
// ============================================================================

/** Resolves a display status from a municipality margin supplied by PostgreSQL. */
export function calculateBolsaFamiliaStatus(
  percentual: number,
  criticalPercent?: number,
  warningPercent?: number,
): BolsaFamiliaStatus {
  const legalCriticalPercent = criticalPercent ?? CONFORMIDADE
  if (percentual < legalCriticalPercent) return 'CRITICO'
  if (warningPercent !== undefined && percentual < warningPercent) return 'ATENCAO'
  return 'CONFORME'
}

/**
 * Calculates absences needed to cross a resolved municipal critical margin.
 * The threshold is a database value, never a universal application constant.
 */
export function calculateFaltasParaCritico(
  presencas: number,
  faltas: number,
  atestados: number,
  criticalPercent = CONFORMIDADE,
): number {
  const presentDays = presencas + atestados
  const total = presencas + faltas + atestados

  if (total === 0 || criticalPercent <= 0 || criticalPercent >= 100) return 0
  if ((presentDays / total) * 100 < criticalPercent) return 0

  return Math.max(
    0,
    Math.floor((presentDays * 100) / criticalPercent - total) + 1,
  )
}

function resolveDisplayStatus(row: AttendanceConditionalityRow): BolsaFamiliaStatus {
  if (row.condicionalidade_legal_status === 'CRITICO') return 'CRITICO'
  if (row.margem_municipal_status === 'CRITICO') return 'CRITICO'
  if (row.margem_municipal_status === 'CONFORME') return 'CONFORME'
  return 'ATENCAO'
}

function toMunicipalMarginResolution(
  row: AttendanceConditionalityRow,
): MunicipalMarginResolution {
  return {
    id: row.margem_municipal_id ?? null,
    municipalityId: row.municipio_id,
    criticalPercent: row.margem_municipal_critica_percent ?? null,
    warningPercent: row.margem_municipal_alerta_percent ?? null,
    precedence: row.margem_municipal_precedencia ?? null,
    source: row.margem_municipal_origem ?? null,
    definedBy: row.margem_municipal_definida_por ?? null,
    definedAt: row.margem_municipal_definida_em ?? null,
    fallback: row.margem_municipal_fallback ?? false,
    fallbackReason: row.margem_municipal_fallback_motivo ?? null,
    validFrom: row.margem_municipal_vigencia_inicio ?? null,
    validUntil: row.margem_municipal_vigencia_fim ?? null,
  }
}

function toBolsaFamiliaStudent(row: AttendanceConditionalityRow): BolsaFamiliaStudent {
  const percentual = Math.round(Number(row.percentual_frequencia))
  const criticalPercent = row.margem_municipal_critica_percent ?? null
  const status = resolveDisplayStatus(row)

  return {
    matriculaId: row.matricula_id,
    alunoId: row.aluno_id,
    nome: row.aluno_nome,
    nis: row.nis ?? '',
    bolsaFamilia: row.is_bolsa_familia,
    idadeAnos: row.idade_anos,
    educacaoBasicaConcluida: row.educacao_basica_concluida,
    condicionalidadeLegal: row.condicionalidade_legal ?? null,
    pisoLegalPercent: row.piso_legal_percent ?? null,
    statusLegal: row.condicionalidade_legal_status,
    margemMunicipalId: row.margem_municipal_id ?? null,
    margemMunicipalCriticaPercent: criticalPercent,
    margemMunicipalAlertaPercent: row.margem_municipal_alerta_percent ?? null,
    margemMunicipalStatus: row.margem_municipal_status,
    margemMunicipalPrecedencia: row.margem_municipal_precedencia ?? null,
    margemMunicipalOrigem: row.margem_municipal_origem ?? null,
    margemMunicipalDefinidaPor: row.margem_municipal_definida_por ?? null,
    margemMunicipalDefinidaEm: row.margem_municipal_definida_em ?? null,
    margemMunicipalFallback: row.margem_municipal_fallback ?? false,
    margemMunicipalFallbackMotivo: row.margem_municipal_fallback_motivo ?? null,
    margemMunicipalVigenciaInicio: row.margem_municipal_vigencia_inicio ?? null,
    margemMunicipalVigenciaFim: row.margem_municipal_vigencia_fim ?? null,
    turmaId: row.turma_id,
    turmaNome: row.turma_nome,
    turmaSerie: row.turma_serie,
    escolaId: row.escola_id,
    escolaNome: row.escola_nome,
    presencas: row.presencas,
    faltas: row.faltas,
    atestados: row.atestados,
    totalAulas: row.total_aulas,
    percentual,
    status,
    faltasParaCritico: criticalPercent
      ? calculateFaltasParaCritico(row.presencas, row.faltas, row.atestados, criticalPercent)
      : 0,
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Reads the canonical conditionality model and builds a Bolsa Família report.
 * Legal status and municipality early-warning status remain separate fields.
 */
export async function getBolsaFamiliaStudents(
  supabase: unknown,
  filters: BolsaFamiliaFilters,
): Promise<BolsaFamiliaReportResult> {
  try {
    const result = await getAttendanceConditionality(
      supabase,
      filters,
    )

    if (result.error) {
      return { data: null, error: result.error }
    }

    const rows = filterBolsaFamiliaConditionality(result.data)
    const students = rows.map(toBolsaFamiliaStudent)
    const rowByMatricula = new Map(rows.map((row) => [row.matricula_id, row]))
    const studentsToShow = filters.onlyAtRisk
      ? students.filter((student) => {
        const row = rowByMatricula.get(student.matriculaId)
        return row !== undefined
          && (isMunicipalAttendanceRisk(row) || isLegalAttendanceRisk(row))
      })
      : students

    const resolutions = Array.from(
      new Map(
        rows.map((row) => {
          const resolution = toMunicipalMarginResolution(row)
          return [`${resolution.municipalityId}:${resolution.id ?? 'none'}`, resolution]
        }),
      ).values(),
    )

    const conformes = students.filter((student) => (
      student.statusLegal !== 'CRITICO'
      && student.statusLegal !== 'SEM_DADOS'
    )).length
    const emAtencaoPreventiva = students.filter((student) => student.status === 'ATENCAO').length
    const emRiscoCritico = students.filter((student) => student.status === 'CRITICO').length
    const condicionalidadesLegaisCriticas = students.filter(
      (student) => student.statusLegal === 'CRITICO',
    ).length
    const semCondicionalidadeLegal = students.filter(
      (student) => student.statusLegal === 'NAO_APLICAVEL',
    ).length

    const report: BolsaFamiliaReport = {
      periodo: {
        inicio: filters.startDate,
        fim: filters.endDate,
      },
      resumo: {
        totalAlunosBolsaFamilia: students.length,
        conformes,
        emAtencaoPreventiva,
        emRiscoCritico,
        percentualConformidade: students.length > 0
          ? Math.round((conformes / students.length) * 100)
          : 100,
        condicionalidadesLegaisCriticas,
        semCondicionalidadeLegal,
      },
      resolucoesMargemMunicipal: resolutions,
      alunos: studentsToShow.sort((a, b) => a.percentual - b.percentual),
      geradoEm: new Date().toISOString(),
    }

    logger.info('Bolsa Família report generated from canonical attendance model', {
      feature: 'bolsa-familia-reports',
      action: 'report_generated',
      metadata: {
        total: students.length,
        conformes,
        emAtencaoPreventiva,
        emRiscoCritico,
        condicionalidadesLegaisCriticas,
      },
    })

    return { data: report, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error generating Bolsa Família report', error instanceof Error ? error : errorMessage)
    return { data: null, error: errorMessage }
  }
}

/** Gets only students with a legal or municipal conditionality risk. */
export async function getBolsaFamiliaStudentsAtRisk(
  supabase: unknown,
  filters: Omit<BolsaFamiliaFilters, 'onlyAtRisk'>,
): Promise<BolsaFamiliaReportResult> {
  return getBolsaFamiliaStudents(supabase, { ...filters, onlyAtRisk: true })
}

/** Generates school and overall summaries from the canonical report rows. */
export async function getBolsaFamiliaSummary(
  supabase: unknown,
  filters: BolsaFamiliaFilters,
): Promise<{
  data: {
    bySchool: Array<{
      escolaId: string
      escolaNome: string
      total: number
      conformes: number
      emAtencaoPreventiva: number
      emRiscoCritico: number
      percentualConformidade: number
    }>
    overall: BolsaFamiliaReport['resumo']
  } | null
  error: string | null
}> {
  const result = await getBolsaFamiliaStudents(supabase, filters)

  if (result.error || !result.data) {
    return { data: null, error: result.error }
  }

  const schoolMap = new Map<string, {
    escolaId: string
    escolaNome: string
    total: number
    conformes: number
    emAtencaoPreventiva: number
    emRiscoCritico: number
  }>()

  for (const student of result.data.alunos) {
    const school = schoolMap.get(student.escolaId) ?? {
      escolaId: student.escolaId,
      escolaNome: student.escolaNome,
      total: 0,
      conformes: 0,
      emAtencaoPreventiva: 0,
      emRiscoCritico: 0,
    }

    school.total++
    if (student.statusLegal !== 'CRITICO' && student.statusLegal !== 'SEM_DADOS') school.conformes++
    if (student.status === 'ATENCAO') school.emAtencaoPreventiva++
    if (student.status === 'CRITICO') school.emRiscoCritico++
    schoolMap.set(student.escolaId, school)
  }

  const bySchool = Array.from(schoolMap.values())
    .map((school) => ({
      ...school,
      percentualConformidade: school.total > 0
        ? Math.round((school.conformes / school.total) * 100)
        : 100,
    }))
    .sort((a, b) => a.percentualConformidade - b.percentualConformidade)

  return {
    data: {
      bySchool,
      overall: result.data.resumo,
    },
    error: null,
  }
}
