/**
 * Bolsa Familia API Layer
 * Task Group 4.2: Alerta Bolsa Familia
 *
 * API functions for querying Bolsa Familia beneficiaries
 * and their school attendance compliance.
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import {
  type BolsaFamiliaStudent,
  type BolsaFamiliaFilters,
  type BolsaFamiliaReport,
  type BolsaFamiliaResponse,
  type BolsaFamiliaReportResponse,
  type BolsaFamiliaReportSummary,
  getBolsaFamiliaStatus,
  isStudentAtRisk,
  calculateBolsaFamiliaSummary,
  BOLSA_FAMILIA_THRESHOLDS,
} from '@/types/bolsa-familia'

// Re-export types for convenience
export type {
  BolsaFamiliaStudent,
  BolsaFamiliaFilters,
  BolsaFamiliaReport,
  BolsaFamiliaResponse,
  BolsaFamiliaReportResponse,
}

// ============================================================================
// MAIN API FUNCTIONS
// ============================================================================

/**
 * Get all Bolsa Familia students (students with NIS)
 *
 * Retrieves attendance data for students with NIS registration.
 * Calculates frequency considering Atestado (A) as presence.
 *
 * @param supabase - Supabase client instance
 * @param filters - Optional filters (escola, turma, dates)
 * @returns BolsaFamiliaResponse with students or error
 */
export async function getBolsaFamiliaStudents(
  supabase: SupabaseClient<Database>,
  filters: BolsaFamiliaFilters = {}
): Promise<BolsaFamiliaResponse> {
  try {
    // Build query using the view
    let query = supabase
      .from('vw_bolsa_familia_frequencia')
      .select('*')

    // Apply filters
    if (filters.escola_id) {
      query = query.eq('escola_id', filters.escola_id)
    }

    if (filters.turma_id) {
      query = query.eq('turma_id', filters.turma_id)
    }

    if (filters.only_at_risk) {
      query = query.eq('em_risco', true)
    }

    // Order by frequency (lowest first for at-risk view)
    query = query.order('frequencia_percentual', { ascending: true })

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching Bolsa Familia students', error, {
        feature: 'bolsa-familia',
        action: 'get_students_failed',
        metadata: { filters },
      })
      return {
        data: null,
        error: 'Erro ao buscar alunos do Bolsa Familia',
      }
    }

    // Transform data to match interface
    const students: BolsaFamiliaStudent[] = (data || []).map((row: any) => ({
      aluno_id: row.aluno_id,
      aluno_nome: row.aluno_nome,
      nis: row.nis,
      data_nascimento: row.data_nascimento,
      turma_id: row.turma_id,
      turma_nome: row.turma_nome,
      serie: row.serie,
      escola_id: row.escola_id,
      escola_nome: row.escola_nome,
      matricula_id: row.matricula_id,
      ano_letivo: row.ano_letivo,
      turno: row.turno,
      total_aulas: row.total_aulas || 0,
      total_presencas: row.total_presencas || 0,
      total_faltas: row.total_faltas || 0,
      total_atestados: row.total_atestados || 0,
      frequencia_percentual: parseFloat(row.frequencia_percentual) || 0,
      status_bolsa_familia: row.status_bolsa_familia,
      em_risco: row.em_risco,
    }))

    logger.info('Bolsa Familia students fetched', {
      feature: 'bolsa-familia',
      action: 'get_students_success',
      metadata: {
        count: students.length,
        filters,
      },
    })

    return {
      data: students,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getBolsaFamiliaStudents', error as Error, {
      feature: 'bolsa-familia',
      action: 'get_students_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao buscar alunos',
    }
  }
}

/**
 * Get students at risk using database function
 *
 * Uses the optimized database function for better performance.
 *
 * @param supabase - Supabase client instance
 * @param filters - Optional filters (escola, turma, dates, threshold)
 * @returns BolsaFamiliaResponse with at-risk students or error
 */
export async function getBolsaFamiliaStudentsAtRisk(
  supabase: SupabaseClient<Database>,
  filters: BolsaFamiliaFilters = {}
): Promise<BolsaFamiliaResponse> {
  try {
    const { data, error } = await supabase.rpc('get_bolsa_familia_students_at_risk', {
      p_escola_id: filters.escola_id || null,
      p_turma_id: filters.turma_id || null,
      p_data_inicio: filters.data_inicio || null,
      p_data_fim: filters.data_fim || null,
      p_threshold: filters.threshold || BOLSA_FAMILIA_THRESHOLDS.minimum,
    })

    if (error) {
      logger.error('Error fetching at-risk students', error, {
        feature: 'bolsa-familia',
        action: 'get_at_risk_failed',
        metadata: { filters },
      })

      // Fallback to view-based query if RPC fails
      return getBolsaFamiliaStudents(supabase, { ...filters, only_at_risk: true })
    }

    // Transform data to match interface
    const students: BolsaFamiliaStudent[] = (data || []).map((row: any) => ({
      aluno_id: row.aluno_id,
      aluno_nome: row.aluno_nome,
      nis: row.nis,
      turma_id: row.turma_id,
      turma_nome: row.turma_nome,
      serie: row.serie,
      escola_id: row.escola_id,
      escola_nome: row.escola_nome,
      total_aulas: row.total_aulas || 0,
      total_presencas: row.total_presencas || 0,
      total_faltas: row.total_faltas || 0,
      total_atestados: row.total_atestados || 0,
      frequencia_percentual: parseFloat(row.frequencia_percentual) || 0,
      status_bolsa_familia: row.status_bolsa_familia,
      em_risco: true, // All returned students are at risk
    }))

    logger.info('At-risk students fetched', {
      feature: 'bolsa-familia',
      action: 'get_at_risk_success',
      metadata: {
        count: students.length,
        filters,
      },
    })

    return {
      data: students,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getBolsaFamiliaStudentsAtRisk', error as Error, {
      feature: 'bolsa-familia',
      action: 'get_at_risk_exception',
    })

    // Fallback to view-based query
    return getBolsaFamiliaStudents(supabase, { ...filters, only_at_risk: true })
  }
}

/**
 * Generate Bolsa Familia report with summary
 *
 * Creates a complete report with summary statistics and student list.
 *
 * @param supabase - Supabase client instance
 * @param filters - Report filters
 * @returns BolsaFamiliaReportResponse with report or error
 */
export async function generateBolsaFamiliaReport(
  supabase: SupabaseClient<Database>,
  filters: BolsaFamiliaFilters = {}
): Promise<BolsaFamiliaReportResponse> {
  try {
    // Get all students with NIS
    const { data: students, error } = await getBolsaFamiliaStudents(supabase, filters)

    if (error || !students) {
      return {
        data: null,
        error: error || 'Erro ao gerar relatorio',
      }
    }

    // Calculate summary
    const summary = calculateBolsaFamiliaSummary(students)

    // Build report
    const report: BolsaFamiliaReport = {
      generated_at: new Date().toISOString(),
      data_inicio: filters.data_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      data_fim: filters.data_fim || new Date().toISOString().split('T')[0],
      filters,
      summary,
      students: filters.only_at_risk
        ? students.filter(s => s.em_risco)
        : students,
    }

    logger.info('Bolsa Familia report generated', {
      feature: 'bolsa-familia',
      action: 'report_generated',
      metadata: {
        totalStudents: students.length,
        atRiskCount: summary.total_alerta + summary.total_critico,
        complianceRate: summary.taxa_conformidade,
      },
    })

    return {
      data: report,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in generateBolsaFamiliaReport', error as Error, {
      feature: 'bolsa-familia',
      action: 'report_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao gerar relatorio',
    }
  }
}

/**
 * Get Bolsa Familia frequency for a single student
 *
 * @param supabase - Supabase client instance
 * @param alunoId - Student UUID
 * @param dataInicio - Optional start date
 * @param dataFim - Optional end date
 * @returns Student's Bolsa Familia data or null
 */
export async function getStudentBolsaFamiliaFrequency(
  supabase: SupabaseClient<Database>,
  alunoId: string,
  dataInicio?: string,
  dataFim?: string
): Promise<BolsaFamiliaStudent | null> {
  try {
    const { data, error } = await supabase.rpc('calculate_bolsa_familia_frequency', {
      p_aluno_id: alunoId,
      p_data_inicio: dataInicio || null,
      p_data_fim: dataFim || null,
    })

    if (error || !data || data.length === 0) {
      logger.warn('Failed to get student Bolsa Familia frequency', {
        feature: 'bolsa-familia',
        action: 'get_student_frequency_failed',
        metadata: { alunoId, error: error?.message },
      })
      return null
    }

    const row = data[0]
    return {
      aluno_id: row.aluno_id,
      aluno_nome: row.aluno_nome,
      nis: row.nis,
      turma_id: '',
      turma_nome: '',
      serie: '',
      escola_id: '',
      escola_nome: '',
      total_aulas: row.total_aulas || 0,
      total_presencas: row.total_presencas || 0,
      total_faltas: row.total_faltas || 0,
      total_atestados: row.total_atestados || 0,
      frequencia_percentual: parseFloat(row.frequencia_percentual) || 0,
      status_bolsa_familia: row.status_bolsa_familia,
      em_risco: row.em_risco,
    }
  } catch (error) {
    logger.error('Exception in getStudentBolsaFamiliaFrequency', error as Error, {
      feature: 'bolsa-familia',
      action: 'get_student_frequency_exception',
    })
    return null
  }
}

/**
 * Get schools with Bolsa Familia students for filter dropdown
 *
 * @param supabase - Supabase client instance
 * @returns List of schools with Bolsa Familia students
 */
export async function getEscolasWithBolsaFamiliaStudents(
  supabase: SupabaseClient<Database>
): Promise<{ id: string; nome: string; count: number }[]> {
  try {
    const { data, error } = await supabase
      .from('vw_bolsa_familia_frequencia')
      .select('escola_id, escola_nome')

    if (error) {
      logger.error('Error fetching schools with Bolsa Familia students', error, {
        feature: 'bolsa-familia',
        action: 'get_schools_failed',
      })
      return []
    }

    // Aggregate by school
    const schoolMap = new Map<string, { nome: string; count: number }>()
    for (const row of (data || [])) {
      const existing = schoolMap.get(row.escola_id)
      if (existing) {
        existing.count++
      } else {
        schoolMap.set(row.escola_id, { nome: row.escola_nome, count: 1 })
      }
    }

    return Array.from(schoolMap.entries()).map(([id, { nome, count }]) => ({
      id,
      nome,
      count,
    }))
  } catch (error) {
    logger.error('Exception in getEscolasWithBolsaFamiliaStudents', error as Error, {
      feature: 'bolsa-familia',
      action: 'get_schools_exception',
    })
    return []
  }
}

/**
 * Get turmas with Bolsa Familia students for filter dropdown
 *
 * @param supabase - Supabase client instance
 * @param escolaId - Optional school filter
 * @returns List of turmas with Bolsa Familia students
 */
export async function getTurmasWithBolsaFamiliaStudents(
  supabase: SupabaseClient<Database>,
  escolaId?: string
): Promise<{ id: string; nome: string; serie: string; count: number }[]> {
  try {
    let query = supabase
      .from('vw_bolsa_familia_frequencia')
      .select('turma_id, turma_nome, serie')

    if (escolaId) {
      query = query.eq('escola_id', escolaId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching turmas with Bolsa Familia students', error, {
        feature: 'bolsa-familia',
        action: 'get_turmas_failed',
      })
      return []
    }

    // Aggregate by turma
    const turmaMap = new Map<string, { nome: string; serie: string; count: number }>()
    for (const row of (data || [])) {
      const existing = turmaMap.get(row.turma_id)
      if (existing) {
        existing.count++
      } else {
        turmaMap.set(row.turma_id, { nome: row.turma_nome, serie: row.serie, count: 1 })
      }
    }

    return Array.from(turmaMap.entries()).map(([id, { nome, serie, count }]) => ({
      id,
      nome,
      serie,
      count,
    }))
  } catch (error) {
    logger.error('Exception in getTurmasWithBolsaFamiliaStudents', error as Error, {
      feature: 'bolsa-familia',
      action: 'get_turmas_exception',
    })
    return []
  }
}
