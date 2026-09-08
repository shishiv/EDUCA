/**
 * Bolsa Família attendance report adapter.
 *
 * Attendance and threshold resolution come from the canonical PostgreSQL read
 * model. This module only formats those rows for the report and its exports.
 */

import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { CONFORMIDADE } from '@/lib/attendance/attendance-policy'
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

export type BolsaFamiliaStatus = 'CONFORME' | 'ALERTA' | 'CRITICO'

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
    emAlerta: number
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
  criticalPercent: number,
  warningPercent: number,
): BolsaFamiliaStatus {
  if (percentual < criticalPercent) return 'CRITICO'
  if (percentual < warningPercent) return 'ALERTA'
  return 'CONFORME'
}

/**
 * Calculates absences needed to cross a resolved municipal critical margin.
 * The threshold is a database value, never a universal application constant.
 */
export function calculateFaltasParaCritico(
  presencasSemAtestados: number,
  faltas: number,
  atestados: number,
  criticalPercent: number = CONFORMIDADE,
): number {
  const presencasComAtestados = presencasSemAtestados + atestados
  const total = presencasComAtestados + faltas

  if (total === 0 || criticalPercent <= 0 || criticalPercent >= 100) return 0
  if ((presencasComAtestados / total) * 100 < criticalPercent) return 0

  return Math.max(
    0,
    Math.floor((presencasComAtestados * 100) / criticalPercent - total) + 1,
  )
}

/**
 * The SQL read model includes A in presencas and reports atestados separately.
 * Keep the auxiliary display buckets disjoint without altering SQL totals or
 * the legal and municipal statuses resolved by PostgreSQL.
 */
export function calculatePresencasSemAtestados(presencas: number, atestados: number): number {
  return Math.max(0, presencas - atestados)
}

function nullable<T>(value: T | null | undefined): T | null {
  return value ?? null
}

function stringOrEmpty(value: string | null): string {
  return value ?? ''
}

function resolveDisplayStatus(row: AttendanceConditionalityRow): BolsaFamiliaStatus {
  if (row.margem_municipal_status === 'CRITICO') return 'CRITICO'
  if (row.margem_municipal_status === 'CONFORME') return 'CONFORME'
  return 'ALERTA'
}

function toMunicipalMarginResolution(
  row: AttendanceConditionalityRow,
): MunicipalMarginResolution {
  return {
    id: nullable(row.margem_municipal_id),
    municipalityId: row.municipio_id,
    criticalPercent: nullable(row.margem_municipal_critica_percent),
    warningPercent: nullable(row.margem_municipal_alerta_percent),
    precedence: nullable(row.margem_municipal_precedencia),
    source: nullable(row.margem_municipal_origem),
    definedBy: nullable(row.margem_municipal_definida_por),
    definedAt: nullable(row.margem_municipal_definida_em),
    fallback: row.margem_municipal_fallback === true,
    fallbackReason: nullable(row.margem_municipal_fallback_motivo),
    validFrom: nullable(row.margem_municipal_vigencia_inicio),
    validUntil: nullable(row.margem_municipal_vigencia_fim),
  }
}

function toBolsaFamiliaStudent(row: AttendanceConditionalityRow): BolsaFamiliaStudent {
  const percentual = Math.round(Number(row.percentual_frequencia))
  const criticalPercent = nullable(row.margem_municipal_critica_percent)
  const status = resolveDisplayStatus(row)
  const presencasSemAtestados = calculatePresencasSemAtestados(row.presencas, row.atestados)

  return {
    matriculaId: row.matricula_id,
    alunoId: row.aluno_id,
    nome: row.aluno_nome,
    nis: stringOrEmpty(row.nis),
    bolsaFamilia: row.is_bolsa_familia,
    idadeAnos: row.idade_anos,
    educacaoBasicaConcluida: row.educacao_basica_concluida,
    condicionalidadeLegal: nullable(row.condicionalidade_legal),
    pisoLegalPercent: nullable(row.piso_legal_percent),
    statusLegal: row.condicionalidade_legal_status,
    margemMunicipalId: nullable(row.margem_municipal_id),
    margemMunicipalCriticaPercent: criticalPercent,
    margemMunicipalAlertaPercent: nullable(row.margem_municipal_alerta_percent),
    margemMunicipalStatus: row.margem_municipal_status,
    margemMunicipalPrecedencia: nullable(row.margem_municipal_precedencia),
    margemMunicipalOrigem: nullable(row.margem_municipal_origem),
    margemMunicipalDefinidaPor: nullable(row.margem_municipal_definida_por),
    margemMunicipalDefinidaEm: nullable(row.margem_municipal_definida_em),
    margemMunicipalFallback: row.margem_municipal_fallback === true,
    margemMunicipalFallbackMotivo: nullable(row.margem_municipal_fallback_motivo),
    margemMunicipalVigenciaInicio: nullable(row.margem_municipal_vigencia_inicio),
    margemMunicipalVigenciaFim: nullable(row.margem_municipal_vigencia_fim),
    turmaId: row.turma_id,
    turmaNome: row.turma_nome,
    turmaSerie: row.turma_serie,
    escolaId: row.escola_id,
    escolaNome: row.escola_nome,
    presencas: presencasSemAtestados,
    faltas: row.faltas,
    atestados: row.atestados,
    totalAulas: row.total_aulas,
    percentual,
    status,
    faltasParaCritico: criticalPercent
      ? calculateFaltasParaCritico(
        presencasSemAtestados,
        row.faltas,
        row.atestados,
        criticalPercent,
      )
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
  supabase: SupabaseClient<Database>,
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

    const conformes = students.filter((student) => student.status === 'CONFORME').length
    const emAlerta = students.filter((student) => student.status === 'ALERTA').length
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
        emAlerta,
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

    return { data: report, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error generating Bolsa Família report', error instanceof Error ? error : errorMessage)
    return { data: null, error: errorMessage }
  }
}

/** Gets only students with a legal or municipal conditionality risk. */
export async function getBolsaFamiliaStudentsAtRisk(
  supabase: SupabaseClient<Database>,
  filters: Omit<BolsaFamiliaFilters, 'onlyAtRisk'>,
): Promise<BolsaFamiliaReportResult> {
  return getBolsaFamiliaStudents(supabase, { ...filters, onlyAtRisk: true })
}

/** Generates school and overall summaries from the canonical report rows. */
export async function getBolsaFamiliaSummary(
  supabase: SupabaseClient<Database>,
  filters: BolsaFamiliaFilters,
): Promise<{
  data: {
    bySchool: Array<{
      escolaId: string
      escolaNome: string
      total: number
      conformes: number
      emAlerta: number
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
    emAlerta: number
    emRiscoCritico: number
  }>()

  for (const student of result.data.alunos) {
    const school = schoolMap.get(student.escolaId) ?? {
      escolaId: student.escolaId,
      escolaNome: student.escolaNome,
      total: 0,
      conformes: 0,
      emAlerta: 0,
      emRiscoCritico: 0,
    }

    school.total++
    if (student.status === 'CONFORME') school.conformes++
    else if (student.status === 'ALERTA') school.emAlerta++
    else school.emRiscoCritico++
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
