/**
 * Attendance Reports API
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.1: Relatórios de Frequência
 *
 * Functions for generating attendance reports:
 * - generateStudentAttendanceReport: Individual student attendance report
 * - generateClassAttendanceReport: Class-level attendance report
 * - getStudentsAtRisk: Students below attendance threshold
 * - calculateAttendancePercentage: Helper for attendance calculation
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StatusPresenca } from '@/types/diario-classe';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface AttendanceReportFilters {
  startDate: string;
  endDate: string;
  riskThreshold?: number; // Default: 80
}

export interface StudentAttendanceReport {
  matriculaId: string;
  alunoId?: string;
  alunoNome?: string;
  presencas: number;
  faltas: number;
  atestados: number;
  totalAulas: number;
  percentual: number;
  periodo: {
    inicio: string;
    fim: string;
  };
  detalhes: Array<{
    data: string;
    status: StatusPresenca | null;
  }>;
}

export interface ClassAttendanceReport {
  turmaId: string;
  turmaNome: string;
  turmaSerie?: string;
  totalAlunos: number;
  mediaFrequencia: number;
  alunosEmRisco: number;
  students: Array<{
    matriculaId: string;
    alunoId: string;
    nome: string;
    presencas: number;
    faltas: number;
    atestados: number;
    totalAulas: number;
    percentual: number;
    emRisco: boolean;
  }>;
  periodo: {
    inicio: string;
    fim: string;
  };
}

export interface StudentAtRiskReport {
  matriculaId: string;
  alunoId: string;
  nome: string;
  nis: string | null;
  turmaId: string;
  turmaNome: string;
  presencas: number;
  faltas: number;
  atestados: number;
  totalAulas: number;
  percentual: number;
}

export interface ReportResult<T> {
  data: T | null;
  error: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate attendance percentage
 * Attestados (A) count as present for Brazilian educational compliance
 *
 * @param presencas - Number of P (present) days
 * @param faltas - Number of F (absent) days
 * @param atestados - Number of A (excused) days
 * @returns Percentage (0-100) rounded to nearest integer
 */
export function calculateAttendancePercentage(
  presencas: number,
  faltas: number,
  atestados: number
): number {
  const total = presencas + faltas + atestados;
  if (total === 0) return 0;

  // Attestados count as present for Bolsa Família compliance
  const presentDays = presencas + atestados;
  const percentage = (presentDays / total) * 100;

  return Math.round(percentage);
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
// REPORT GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate individual student attendance report
 *
 * @param supabase - Supabase client
 * @param matriculaId - Student enrollment ID
 * @param filters - Date range filters
 * @returns Student attendance report with daily details
 */
export async function generateStudentAttendanceReport(
  supabase: SupabaseClient,
  matriculaId: string,
  filters: AttendanceReportFilters
): Promise<ReportResult<StudentAttendanceReport>> {
  try {
    logger.info('Generating student attendance report', {
      matriculaId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    // Fetch attendance records for the student
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('frequencia')
      .select('status_presenca, data_aula')
      .eq('matricula_id', matriculaId)
      .gte('data_aula', filters.startDate)
      .lte('data_aula', filters.endDate)
      .order('data_aula', { ascending: true });

    if (attendanceError) {
      logger.error('Failed to fetch attendance records', { error: attendanceError });
      return { data: null, error: attendanceError.message };
    }

    const records = attendanceData || [];
    const { presencas, faltas, atestados, total } = countAttendanceStatus(records);
    const percentual = calculateAttendancePercentage(presencas, faltas, atestados);

    const report: StudentAttendanceReport = {
      matriculaId,
      presencas,
      faltas,
      atestados,
      totalAulas: total,
      percentual,
      periodo: {
        inicio: filters.startDate,
        fim: filters.endDate,
      },
      detalhes: records.map((r) => ({
        data: r.data_aula,
        status: r.status_presenca,
      })),
    };

    logger.info('Student attendance report generated', {
      matriculaId,
      total,
      percentual,
    });

    return { data: report, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error generating student attendance report', { error: errorMessage });
    return { data: null, error: errorMessage };
  }
}

/**
 * Generate class attendance report with all students
 *
 * @param supabase - Supabase client
 * @param turmaId - Class ID
 * @param filters - Date range filters
 * @returns Class attendance report with all students
 */
export async function generateClassAttendanceReport(
  supabase: SupabaseClient,
  turmaId: string,
  filters: AttendanceReportFilters
): Promise<ReportResult<ClassAttendanceReport>> {
  try {
    const riskThreshold = filters.riskThreshold ?? 80;

    logger.info('Generating class attendance report', {
      turmaId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      riskThreshold,
    });

    // Fetch class with enrolled students
    const { data: turmaData, error: turmaError } = await supabase
      .from('turmas')
      .select(`
        id,
        nome,
        serie,
        matriculas (
          id,
          aluno_id,
          alunos (
            id,
            nome_completo
          )
        )
      `)
      .eq('id', turmaId)
      .single();

    if (turmaError) {
      logger.error('Failed to fetch class data', { error: turmaError });
      return { data: null, error: turmaError.message };
    }

    if (!turmaData) {
      return { data: null, error: 'Turma não encontrada' };
    }

    const matriculaIds = turmaData.matriculas?.map((m: any) => m.id) || [];

    if (matriculaIds.length === 0) {
      // No students enrolled
      const emptyReport: ClassAttendanceReport = {
        turmaId,
        turmaNome: turmaData.nome,
        turmaSerie: turmaData.serie,
        totalAlunos: 0,
        mediaFrequencia: 0,
        alunosEmRisco: 0,
        students: [],
        periodo: {
          inicio: filters.startDate,
          fim: filters.endDate,
        },
      };
      return { data: emptyReport, error: null };
    }

    // Fetch attendance for all students
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('frequencia')
      .select('matricula_id, status_presenca, data_aula')
      .in('matricula_id', matriculaIds)
      .gte('data_aula', filters.startDate)
      .lte('data_aula', filters.endDate)
      .order('data_aula', { ascending: true });

    if (attendanceError) {
      logger.error('Failed to fetch attendance records', { error: attendanceError });
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

    // Calculate attendance for each student
    const students: ClassAttendanceReport['students'] = [];
    let totalPercentage = 0;
    let studentsWithData = 0;
    let alunosEmRisco = 0;

    for (const matricula of turmaData.matriculas || []) {
      const records = attendanceByStudent[matricula.id] || [];
      const { presencas, faltas, atestados, total } = countAttendanceStatus(records);
      const percentual = calculateAttendancePercentage(presencas, faltas, atestados);
      const emRisco = percentual < riskThreshold;

      if (emRisco) {
        alunosEmRisco++;
      }

      if (total > 0) {
        totalPercentage += percentual;
        studentsWithData++;
      }

      students.push({
        matriculaId: matricula.id,
        alunoId: matricula.aluno_id,
        nome: matricula.alunos?.nome_completo || 'Nome não disponível',
        presencas,
        faltas,
        atestados,
        totalAulas: total,
        percentual,
        emRisco,
      });
    }

    // Sort by name
    students.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const mediaFrequencia = studentsWithData > 0
      ? Math.round(totalPercentage / studentsWithData)
      : 0;

    const report: ClassAttendanceReport = {
      turmaId,
      turmaNome: turmaData.nome,
      turmaSerie: turmaData.serie,
      totalAlunos: students.length,
      mediaFrequencia,
      alunosEmRisco,
      students,
      periodo: {
        inicio: filters.startDate,
        fim: filters.endDate,
      },
    };

    logger.info('Class attendance report generated', {
      turmaId,
      totalAlunos: students.length,
      mediaFrequencia,
      alunosEmRisco,
    });

    return { data: report, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error generating class attendance report', { error: errorMessage });
    return { data: null, error: errorMessage };
  }
}

/**
 * Get students at risk (below attendance threshold)
 *
 * @param supabase - Supabase client
 * @param turmaId - Class ID
 * @param filters - Date range and risk threshold filters
 * @returns List of students at risk sorted by attendance percentage
 */
export async function getStudentsAtRisk(
  supabase: SupabaseClient,
  turmaId: string,
  filters: AttendanceReportFilters
): Promise<ReportResult<{ studentsAtRisk: StudentAtRiskReport[]; total: number }>> {
  try {
    const riskThreshold = filters.riskThreshold ?? 80;

    logger.info('Getting students at risk', {
      turmaId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      riskThreshold,
    });

    // Fetch class with enrolled students and NIS
    const { data: turmaData, error: turmaError } = await supabase
      .from('turmas')
      .select(`
        id,
        nome,
        serie,
        matriculas (
          id,
          aluno_id,
          alunos (
            id,
            nome_completo,
            nis
          )
        )
      `)
      .eq('id', turmaId)
      .single();

    if (turmaError) {
      logger.error('Failed to fetch class data', { error: turmaError });
      return { data: null, error: turmaError.message };
    }

    if (!turmaData) {
      return { data: null, error: 'Turma não encontrada' };
    }

    const matriculaIds = turmaData.matriculas?.map((m: any) => m.id) || [];

    if (matriculaIds.length === 0) {
      return { data: { studentsAtRisk: [], total: 0 }, error: null };
    }

    // Fetch attendance for all students
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('frequencia')
      .select('matricula_id, status_presenca, data_aula')
      .in('matricula_id', matriculaIds)
      .gte('data_aula', filters.startDate)
      .lte('data_aula', filters.endDate)
      .order('data_aula', { ascending: true });

    if (attendanceError) {
      logger.error('Failed to fetch attendance records', { error: attendanceError });
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

    // Find students at risk
    const studentsAtRisk: StudentAtRiskReport[] = [];

    for (const matricula of turmaData.matriculas || []) {
      const records = attendanceByStudent[matricula.id] || [];
      const { presencas, faltas, atestados, total } = countAttendanceStatus(records);
      const percentual = calculateAttendancePercentage(presencas, faltas, atestados);

      // Only include students below threshold
      if (percentual < riskThreshold) {
        studentsAtRisk.push({
          matriculaId: matricula.id,
          alunoId: matricula.aluno_id,
          nome: matricula.alunos?.nome_completo || 'Nome não disponível',
          nis: matricula.alunos?.nis || null,
          turmaId,
          turmaNome: turmaData.nome,
          presencas,
          faltas,
          atestados,
          totalAulas: total,
          percentual,
        });
      }
    }

    // Sort by attendance percentage ascending (worst first)
    studentsAtRisk.sort((a, b) => a.percentual - b.percentual);

    logger.info('Students at risk identified', {
      turmaId,
      totalAtRisk: studentsAtRisk.length,
      riskThreshold,
    });

    return {
      data: {
        studentsAtRisk,
        total: studentsAtRisk.length,
      },
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting students at risk', { error: errorMessage });
    return { data: null, error: errorMessage };
  }
}
