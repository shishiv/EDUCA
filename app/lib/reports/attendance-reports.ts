/**
 * Attendance Reports API
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.1: Relatórios de Frequência
 *
 * Functions for generating attendance reports:
 * - generateStudentAttendanceReport: Individual student attendance report
 * - generateClassAttendanceReport: Class-level attendance report
 * - calculateAttendancePercentage: Helper for attendance calculation
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database';
import { logger } from '@/lib/logger';
import {
  loadCanonicalAttendanceFacts,
  loadCanonicalAttendanceSummaries,
  summarizeCanonicalAttendanceFacts,
  type CanonicalAttendanceSummary,
} from '@/lib/api/canonical-attendance-facts';
import {
  CONFORMIDADE,
  type FrequencyPolicyStatus,
} from '@/lib/attendance/attendance-policy';

export { calculateAttendancePercentage } from '@/lib/attendance/attendance-calculations';

// ============================================================================
// TYPES
// ============================================================================

export interface AttendanceReportFilters {
  startDate: string;
  endDate: string;
  /** Kept as an explicit report filter, with the canonical policy as default. */
  riskThreshold?: number;
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
    status: string | null;
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
    status: FrequencyPolicyStatus;
  }>;
  periodo: {
    inicio: string;
    fim: string;
  };
}

export interface ReportResult<T> {
  data: T | null;
  error: string | null;
}

type ActiveEnrollment = Pick<Tables<'matriculas'>, 'id' | 'aluno_id'> & {
  aluno: Pick<Tables<'alunos'>, 'id' | 'nome_completo'> | null;
};
type ClassHeader = Pick<Tables<'turmas'>, 'id' | 'nome' | 'serie'>;
type ClassAttendanceStudent = ClassAttendanceReport['students'][number];

function toClassAttendanceStudent(
  matricula: ActiveEnrollment,
  summary: CanonicalAttendanceSummary | undefined,
  riskThreshold: number,
): ClassAttendanceStudent | null {
  if (!summary) return null;

  return {
    matriculaId: matricula.id,
    alunoId: matricula.aluno_id,
    nome: matricula.aluno?.nome_completo || 'Nome não disponível',
    presencas: summary.presencas,
    faltas: summary.faltas,
    atestados: summary.atestados,
    totalAulas: summary.total,
    percentual: summary.percentual,
    emRisco: summary.percentual < riskThreshold,
    status: summary.status,
  };
}

function isClassAttendanceStudent(
  student: ClassAttendanceStudent | null,
): student is ClassAttendanceStudent {
  return student !== null;
}

function buildClassAttendanceReport(
  turma: ClassHeader,
  matriculas: ActiveEnrollment[],
  summaries: Map<string, CanonicalAttendanceSummary>,
  filters: AttendanceReportFilters,
  riskThreshold: number,
): ClassAttendanceReport {
  const students = matriculas
    .map((matricula) => toClassAttendanceStudent(
      matricula,
      summaries.get(matricula.id),
      riskThreshold,
    ))
    .filter(isClassAttendanceStudent)
    .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));
  const percentages = students.filter((student) => student.totalAulas > 0);
  const totalPercentage = percentages.reduce((total, student) => total + student.percentual, 0);

  return {
    turmaId: turma.id,
    turmaNome: turma.nome,
    turmaSerie: turma.serie,
    totalAlunos: students.length,
    mediaFrequencia: percentages.length > 0
      ? Math.round(totalPercentage / percentages.length)
      : 0,
    alunosEmRisco: students.filter((student) => student.emRisco).length,
    students,
    periodo: { inicio: filters.startDate, fim: filters.endDate },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
  supabase: SupabaseClient<Database>,
  matriculaId: string,
  filters: AttendanceReportFilters
): Promise<ReportResult<StudentAttendanceReport>> {
  try {
    logger.info('Generating student attendance report', {
      feature: 'attendance-reports',
      action: 'generate_student_report',
      metadata: {
        matriculaId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }
    });

    const records = await loadCanonicalAttendanceFacts(supabase, [matriculaId], {
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    const summary = summarizeCanonicalAttendanceFacts(records, [matriculaId]).get(matriculaId);

    if (!summary) {
      return { data: null, error: 'Não foi possível calcular a frequência' };
    }

    const report: StudentAttendanceReport = {
      matriculaId,
      presencas: summary.presencas,
      faltas: summary.faltas,
      atestados: summary.atestados,
      totalAulas: summary.total,
      percentual: summary.percentual,
      periodo: {
        inicio: filters.startDate,
        fim: filters.endDate,
      },
      detalhes: records.map((r) => ({
        data: r.dataAula,
        status: r.statusPresenca,
      })),
    };

    logger.info('Student attendance report generated', {
      feature: 'attendance-reports',
      action: 'student_report_complete',
      metadata: {
        matriculaId,
        total: summary.total,
        percentual: summary.percentual,
      }
    });

    return { data: report, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error generating student attendance report', errorMessage, {
      feature: 'attendance-reports',
      action: 'generate_student_report'
    });
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
  supabase: SupabaseClient<Database>,
  turmaId: string,
  filters: AttendanceReportFilters
): Promise<ReportResult<ClassAttendanceReport>> {
  try {
    const riskThreshold = filters.riskThreshold ?? CONFORMIDADE;

    logger.info('Generating class attendance report', {
      feature: 'attendance-reports',
      action: 'generate_class_report',
      metadata: {
        turmaId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        riskThreshold,
      }
    });

    // General attendance reads use ordinary RLS and only active enrollments.
    const { data: turmaData, error: turmaError } = await supabase
      .from('turmas')
      .select('id, nome, serie')
      .eq('id', turmaId)
      .single();

    if (turmaError) {
      logger.error('Failed to fetch class data', turmaError.message, {
        feature: 'attendance-reports',
        action: 'fetch_class'
      });
      return { data: null, error: turmaError.message };
    }

    if (!turmaData) {
      return { data: null, error: 'Turma não encontrada' };
    }

    const { data: matriculas, error: matriculasError } = await supabase
      .from('matriculas')
      .select('id, aluno_id, aluno:alunos(id, nome_completo)')
      .eq('turma_id', turmaId)
      .eq('situacao', 'ativa');

    if (matriculasError) {
      logger.error('Failed to fetch active class enrollments', matriculasError.message, {
        feature: 'attendance-reports',
        action: 'fetch_active_enrollments'
      });
      return { data: null, error: matriculasError.message };
    }

    const activeMatriculas = matriculas ?? [];
    const matriculaIds = activeMatriculas.map((matricula) => matricula.id);

    const attendanceByStudent = await loadCanonicalAttendanceSummaries(
      supabase,
      matriculaIds,
      { startDate: filters.startDate, endDate: filters.endDate }
    );
    const report = buildClassAttendanceReport(
      turmaData,
      activeMatriculas,
      attendanceByStudent,
      filters,
      riskThreshold,
    );

    logger.info('Class attendance report generated', {
      feature: 'attendance-reports',
      action: 'class_report_complete',
      metadata: {
        turmaId,
        totalAlunos: report.totalAlunos,
        mediaFrequencia: report.mediaFrequencia,
        alunosEmRisco: report.alunosEmRisco,
      }
    });

    return { data: report, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error generating class attendance report', errorMessage, {
      feature: 'attendance-reports',
      action: 'generate_class_report'
    });
    return { data: null, error: errorMessage };
  }
}
