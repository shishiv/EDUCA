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
import type { StatusPresenca } from '@/types/diario-classe';
import { logger } from '@/lib/logger';
import { calculateAttendancePercentage } from './attendance-reports';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Bolsa Família minimum attendance threshold (80%)
 * Students below this threshold lose benefits
 */
export const BOLSA_FAMILIA_THRESHOLD = 80;

/**
 * Warning threshold (85%) - alert before critical
 */
export const BOLSA_FAMILIA_WARNING_THRESHOLD = 85;

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

export type BolsaFamiliaStatus = 'CONFORME' | 'ALERTA' | 'CRITICO';

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
  faltasParaCritico: number; // How many more absences until < 80%
}

export interface BolsaFamiliaReport {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    totalAlunosBolsaFamilia: number;
    conformes: number;
    emAlerta: number;
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
  if (percentual < BOLSA_FAMILIA_THRESHOLD) {
    return 'CRITICO';
  }
  if (percentual < BOLSA_FAMILIA_WARNING_THRESHOLD) {
    return 'ALERTA';
  }
  return 'CONFORME';
}

/**
 * Calculate how many more absences until the student falls below 80%
 */
export function calculateFaltasParaCritico(
  presencas: number,
  faltas: number,
  atestados: number
): number {
  // Current: (presencas + atestados) / total >= 0.80
  // We need to find how many more absences (n) would make:
  // (presencas + atestados) / (total + n) < 0.80

  const presentDays = presencas + atestados;
  const total = presencas + faltas + atestados;

  if (total === 0) return 0;

  // Solve: presentDays / (total + n) = 0.80
  // presentDays = 0.80 * (total + n)
  // presentDays = 0.80 * total + 0.80 * n
  // presentDays - 0.80 * total = 0.80 * n
  // n = (presentDays - 0.80 * total) / 0.80
  // n = presentDays / 0.80 - total

  const n = Math.floor(presentDays / 0.80 - total);

  // If already below 80%, return 0
  if (n < 0) return 0;

  return n;
}

/**
 * Count attendance status from records
 */
function countAttendanceStatus(records: Array<{ status_presenca: StatusPresenca | null }>) {
  let presencas = 0;
  let faltas = 0;
  let atestados = 0;

  for (const record of records) {
    switch (record.status_presenca) {
      case 'P':
        presencas++;
        break;
      case 'F':
        faltas++;
        break;
      case 'A':
        atestados++;
        break;
      default:
        // null or unknown status - count as absence
        faltas++;
        break;
    }
  }

  return { presencas, faltas, atestados, total: records.length };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get all Bolsa Família students with attendance data
 * Filters for students with NIS or bolsa_familia flag
 *
 * @param supabase - Supabase client
 * @param filters - Period and optional school/class filters
 * @returns List of Bolsa Família students with attendance status
 */
export async function getBolsaFamiliaStudents(
  supabase: SupabaseClient,
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
      .eq('situacao', 'Ativa');

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

    // Filter for Bolsa Família students (has NIS or bolsa_familia flag)
    // This filtering is done in code because Supabase PostgREST doesn't support
    // .or() filters on columns from related tables
    const matriculas = (matriculasData || []).filter((m: any) => {
      const aluno = m.alunos;
      return aluno && (aluno.nis || aluno.bolsa_familia);
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
          emAlerta: 0,
          emRiscoCritico: 0,
          percentualConformidade: 100,
        },
        alunos: [],
        geradoEm: new Date().toISOString(),
      };
      return { data: emptyReport, error: null };
    }

    const matriculaIds = matriculas.map((m: any) => m.id);

    // Fetch attendance for all Bolsa Família students
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('frequencia')
      .select('matricula_id, status_presenca, data_aula')
      .in('matricula_id', matriculaIds)
      .gte('data_aula', filters.startDate)
      .lte('data_aula', filters.endDate);

    if (attendanceError) {
      logger.error('Failed to fetch attendance records', attendanceError.message);
      return { data: null, error: attendanceError.message };
    }

    // Group attendance by student
    const attendanceByStudent: Record<string, Array<{ status_presenca: StatusPresenca | null }>> = {};
    for (const record of attendanceData || []) {
      if (!attendanceByStudent[record.matricula_id]) {
        attendanceByStudent[record.matricula_id] = [];
      }
      attendanceByStudent[record.matricula_id].push({
        status_presenca: record.status_presenca,
      });
    }

    // Build student list with attendance data
    const alunos: BolsaFamiliaStudent[] = [];
    let conformes = 0;
    let emAlerta = 0;
    let emRiscoCritico = 0;

    for (const matricula of matriculas) {
      const records = attendanceByStudent[matricula.id] || [];
      const { presencas, faltas, atestados, total } = countAttendanceStatus(records);
      const percentual = calculateAttendancePercentage(presencas, faltas, atestados);
      const status = calculateBolsaFamiliaStatus(percentual);
      const faltasParaCritico = calculateFaltasParaCritico(presencas, faltas, atestados);

      // Count by status
      if (status === 'CONFORME') conformes++;
      else if (status === 'ALERTA') emAlerta++;
      else emRiscoCritico++;

      // Skip if onlyAtRisk and student is compliant
      if (filters.onlyAtRisk && status === 'CONFORME') {
        continue;
      }

      const turma = matricula.turmas as any;
      const aluno = matricula.alunos as any;
      const escola = turma?.escolas as any;

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
        presencas,
        faltas,
        atestados,
        totalAulas: total,
        percentual,
        status,
        faltasParaCritico,
      });
    }

    // Sort by percentage (worst first)
    alunos.sort((a, b) => a.percentual - b.percentual);

    const totalBF = conformes + emAlerta + emRiscoCritico;
    const percentualConformidade = totalBF > 0 ? Math.round((conformes / totalBF) * 100) : 100;

    const report: BolsaFamiliaReport = {
      periodo: {
        inicio: filters.startDate,
        fim: filters.endDate,
      },
      resumo: {
        totalAlunosBolsaFamilia: totalBF,
        conformes,
        emAlerta,
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
        emAlerta,
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
  supabase: SupabaseClient,
  filters: Omit<BolsaFamiliaFilters, 'onlyAtRisk'>
): Promise<BolsaFamiliaReportResult> {
  return getBolsaFamiliaStudents(supabase, { ...filters, onlyAtRisk: true });
}

/**
 * Generate summary statistics for Bolsa Família compliance
 * by school or across all schools
 */
export async function getBolsaFamiliaSummary(
  supabase: SupabaseClient,
  filters: BolsaFamiliaFilters
): Promise<{
  data: {
    bySchool: Array<{
      escolaId: string;
      escolaNome: string;
      total: number;
      conformes: number;
      emAlerta: number;
      emRiscoCritico: number;
      percentualConformidade: number;
    }>;
    overall: {
      total: number;
      conformes: number;
      emAlerta: number;
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
    emAlerta: number;
    emRiscoCritico: number;
  }> = {};

  for (const aluno of report.alunos) {
    if (!schoolMap[aluno.escolaId]) {
      schoolMap[aluno.escolaId] = {
        escolaId: aluno.escolaId,
        escolaNome: aluno.escolaNome,
        total: 0,
        conformes: 0,
        emAlerta: 0,
        emRiscoCritico: 0,
      };
    }

    schoolMap[aluno.escolaId].total++;
    if (aluno.status === 'CONFORME') schoolMap[aluno.escolaId].conformes++;
    else if (aluno.status === 'ALERTA') schoolMap[aluno.escolaId].emAlerta++;
    else schoolMap[aluno.escolaId].emRiscoCritico++;
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
        emAlerta: report.resumo.emAlerta,
        emRiscoCritico: report.resumo.emRiscoCritico,
        percentualConformidade: report.resumo.percentualConformidade,
      },
    },
    error: null,
  };
}
