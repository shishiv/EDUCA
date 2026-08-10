/**
 * Bolsa Família Attendance Reports API
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.2: Alerta Bolsa Família
 *
 * Functions for generating Bolsa Família compliance reports:
 * - getBolsaFamiliaStudentsAtRisk: Students with NIS below 80% threshold
 * - generateBolsaFamiliaReport: Full report for government compliance
 * - calculateBolsaFamiliaStatus: Compliance status calculation
 *
 * IMPORTANT: For Bolsa Família compliance, attestados (A) count as present.
 * This is consistent with Brazilian educational compliance regulations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/logger';
import { loadCanonicalAttendanceSummaries } from '@/lib/api/canonical-attendance-facts';
import { CONFORMIDADE, getFrequencyPolicyStatus, type FrequencyPolicyStatus } from '@/lib/attendance/attendance-policy';

// ============================================================================
// POLICY RECEIPTS
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface BolsaFamiliaFilters {
  startDate: string;
  endDate: string;
  escolaId?: string;
  turmaId?: string;
  onlyAtRisk?: boolean;
}

export type BolsaFamiliaStatus = FrequencyPolicyStatus;

export interface BolsaFamiliaStudent {
  matriculaId: string;
  alunoId: string;
  nome: string;
  nis: string;
  bolsaFamilia: boolean;
  turmaId: string;
  turmaNome: string;
  turmaSerie: string;
  escolaId: string;
  escolaNome: string;
  presencas: number;
  faltas: number;
  atestados: number;
  totalAulas: number;
  percentual: number;
  status: BolsaFamiliaStatus;
  faltasParaCritico: number; // How many more absences until below CONFORMIDADE
}

export interface BolsaFamiliaReport {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    totalAlunosBolsaFamilia: number;
    conformes: number;
    emAtencaoPreventiva: number;
    emRiscoCritico: number;
    percentualConformidade: number;
  };
  alunos: BolsaFamiliaStudent[];
  geradoEm: string;
}

export interface BolsaFamiliaReportResult {
  data: BolsaFamiliaReport | null;
  error: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate Bolsa Família compliance status
 */
export function calculateBolsaFamiliaStatus(percentual: number): BolsaFamiliaStatus {
  return getFrequencyPolicyStatus(percentual);
}

/** Calculate how many more absences until the student falls below CONFORMIDADE. */
export function calculateFaltasParaCritico(
  presencas: number,
  faltas: number,
  atestados: number
): number {
  // Current: (presencas + atestados) / total >= CONFORMIDADE
  // We need to find how many more absences (n) would make:
  // (presencas + atestados) / (total + n) < CONFORMIDADE

  const presentDays = presencas + atestados;
  const total = presencas + faltas + atestados;

  if (total === 0) return 0;

  // Solve for the first whole absence that makes the ratio strictly lower.
  const complianceRate = CONFORMIDADE / 100;
  const n = Math.floor(presentDays / complianceRate - total) + 1;

  // If already below the compliance threshold, return 0
  if (n < 0) return 0;

  return n;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get all Bolsa Família students with attendance data.
 *
 * A NIS alone is not proof that a student receives Bolsa Família. The report
 * uses the explicit bolsa_familia enrollment flag so its total matches the
 * benefit population.
 *
 * @param supabase - Supabase client
 * @param filters - Period and optional school/class filters
 * @returns List of Bolsa Família students with attendance status
 */
export async function getBolsaFamiliaStudents(
  supabase: SupabaseClient<Database>,
  filters: BolsaFamiliaFilters
): Promise<BolsaFamiliaReportResult> {
  try {
    logger.info('Getting Bolsa Família students', {
      feature: 'bolsa-familia-reports',
      action: 'get_students',
      metadata: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        escolaId: filters.escolaId,
        turmaId: filters.turmaId,
      },
    });

    // Build query for students - filter Bolsa Família in code since Supabase
    // doesn't support .or() on related table columns in PostgREST syntax
    let query = supabase
      .from('matriculas')
      .select(`
        id,
        aluno_id,
        turma_id,
        situacao,
        alunos!inner (
          id,
          nome_completo,
          nis,
          bolsa_familia
        ),
        turmas!inner (
          id,
          nome,
          serie,
          escola_id,
          escolas (
            id,
            nome
          )
        )
      `)
      .eq('situacao', 'ativa');

    // Apply optional filters
    if (filters.turmaId) {
      query = query.eq('turma_id', filters.turmaId);
    }

    if (filters.escolaId) {
      query = query.eq('turmas.escola_id', filters.escolaId);
    }

    const { data: matriculasData, error: matriculasError } = await query;

    if (matriculasError) {
      logger.error('Failed to fetch Bolsa Família students', matriculasError.message);
      return { data: null, error: matriculasError.message };
    }

    const matriculas = (matriculasData || []).filter((matricula) => {
      return matricula.alunos?.bolsa_familia === true;
    });

    if (matriculas.length === 0) {
      const emptyReport: BolsaFamiliaReport = {
        periodo: {
          inicio: filters.startDate,
          fim: filters.endDate,
        },
        resumo: {
          totalAlunosBolsaFamilia: 0,
          conformes: 0,
          emAtencaoPreventiva: 0,
          emRiscoCritico: 0,
          percentualConformidade: 100,
        },
        alunos: [],
        geradoEm: new Date().toISOString(),
      };
      return { data: emptyReport, error: null };
    }

    const matriculaIds = matriculas.map((matricula) => matricula.id);

    const attendanceByStudent = await loadCanonicalAttendanceSummaries(
      supabase,
      matriculaIds,
      { startDate: filters.startDate, endDate: filters.endDate }
    );

    // Build student list with attendance data
    const alunos: BolsaFamiliaStudent[] = [];
    let conformes = 0;
    let emAtencaoPreventiva = 0;
    let emRiscoCritico = 0;

    for (const matricula of matriculas) {
      const summary = attendanceByStudent.get(matricula.id);
      if (!summary) continue;
      const status = calculateBolsaFamiliaStatus(summary.percentual);
      const faltasParaCritico = calculateFaltasParaCritico(
        summary.presencas,
        summary.faltas,
        summary.atestados
      );

      // Compliance includes the preventive band. The band is a separate
      // municipal signal and must not lower the Bolsa Família compliance rate.
      if (summary.conforme) conformes++;
      if (status === 'ATENCAO') emAtencaoPreventiva++;
      if (status === 'CRITICO') emRiscoCritico++;

      // The risk view includes preventive attention and critical cases.
      if (filters.onlyAtRisk && status === 'CONFORME') {
        continue;
      }

      const turma = matricula.turmas;
      const aluno = matricula.alunos;
      const escola = turma?.escolas;

      alunos.push({
        matriculaId: matricula.id,
        alunoId: matricula.aluno_id,
        nome: aluno?.nome_completo || 'Nome não disponível',
        nis: aluno?.nis || '',
        bolsaFamilia: aluno?.bolsa_familia || false,
        turmaId: turma?.id || '',
        turmaNome: turma?.nome || '',
        turmaSerie: turma?.serie || '',
        escolaId: escola?.id || '',
        escolaNome: escola?.nome || '',
        presencas: summary.presencas,
        faltas: summary.faltas,
        atestados: summary.atestados,
        totalAulas: summary.total,
        percentual: summary.percentual,
        status,
        faltasParaCritico,
      });
    }

    // Sort by percentage (worst first)
    alunos.sort((a, b) => a.percentual - b.percentual);

    const totalBF = matriculas.length;
    const percentualConformidade = totalBF > 0 ? Math.round((conformes / totalBF) * 100) : 100;

    const report: BolsaFamiliaReport = {
      periodo: {
        inicio: filters.startDate,
        fim: filters.endDate,
      },
      resumo: {
        totalAlunosBolsaFamilia: totalBF,
        conformes,
        emAtencaoPreventiva,
        emRiscoCritico,
        percentualConformidade,
      },
      alunos,
      geradoEm: new Date().toISOString(),
    };

    logger.info('Bolsa Família report generated', {
      feature: 'bolsa-familia-reports',
      action: 'report_generated',
      metadata: {
        total: totalBF,
        conformes,
        emAtencaoPreventiva,
        emRiscoCritico,
      },
    });

    return { data: report, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error generating Bolsa Família report', error instanceof Error ? error : errorMessage);
    return { data: null, error: errorMessage };
  }
}

/**
 * Get Bolsa Família students at risk (< 80% or in alert zone)
 * Convenience wrapper around getBolsaFamiliaStudents with onlyAtRisk=true
 */
export async function getBolsaFamiliaStudentsAtRisk(
  supabase: SupabaseClient<Database>,
  filters: Omit<BolsaFamiliaFilters, 'onlyAtRisk'>
): Promise<BolsaFamiliaReportResult> {
  return getBolsaFamiliaStudents(supabase, { ...filters, onlyAtRisk: true });
}

/**
 * Generate summary statistics for Bolsa Família compliance
 * by school or across all schools
 */
export async function getBolsaFamiliaSummary(
  supabase: SupabaseClient<Database>,
  filters: BolsaFamiliaFilters
): Promise<{
  data: {
    bySchool: Array<{
      escolaId: string;
      escolaNome: string;
      total: number;
      conformes: number;
      emAtencaoPreventiva: number;
      emRiscoCritico: number;
      percentualConformidade: number;
    }>;
    overall: {
      total: number;
      conformes: number;
      emAtencaoPreventiva: number;
      emRiscoCritico: number;
      percentualConformidade: number;
    };
  } | null;
  error: string | null;
}> {
  const result = await getBolsaFamiliaStudents(supabase, filters);

  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }

  const report = result.data;

  // Group by school
  const schoolMap: Record<string, {
    escolaId: string;
    escolaNome: string;
    total: number;
    conformes: number;
    emAtencaoPreventiva: number;
    emRiscoCritico: number;
  }> = {};

  for (const aluno of report.alunos) {
    if (!schoolMap[aluno.escolaId]) {
      schoolMap[aluno.escolaId] = {
        escolaId: aluno.escolaId,
        escolaNome: aluno.escolaNome,
        total: 0,
        conformes: 0,
        emAtencaoPreventiva: 0,
        emRiscoCritico: 0,
      };
    }

    schoolMap[aluno.escolaId].total++;
    if (aluno.percentual >= CONFORMIDADE) schoolMap[aluno.escolaId].conformes++;
    if (aluno.status === 'ATENCAO') schoolMap[aluno.escolaId].emAtencaoPreventiva++;
    if (aluno.status === 'CRITICO') schoolMap[aluno.escolaId].emRiscoCritico++;
  }

  const bySchool = Object.values(schoolMap).map((school) => ({
    ...school,
    percentualConformidade: school.total > 0
      ? Math.round((school.conformes / school.total) * 100)
      : 100,
  }));

  // Sort by risk (worst first)
  bySchool.sort((a, b) => a.percentualConformidade - b.percentualConformidade);

  return {
    data: {
      bySchool,
      overall: {
        total: report.resumo.totalAlunosBolsaFamilia,
        conformes: report.resumo.conformes,
        emAtencaoPreventiva: report.resumo.emAtencaoPreventiva,
        emRiscoCritico: report.resumo.emRiscoCritico,
        percentualConformidade: report.resumo.percentualConformidade,
      },
    },
    error: null,
  };
}
