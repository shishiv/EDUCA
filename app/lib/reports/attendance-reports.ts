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
import {
  loadCanonicalAttendanceFacts,
  loadCanonicalAttendanceSummaries,
  summarizeCanonicalAttendanceFacts,
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
    status: FrequencyPolicyStatus;
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
        status: r.statusPresenca as StatusPresenca | null,
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
  supabase: SupabaseClient,
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
      logger.error('Failed to fetch class data', turmaError.message, {
        feature: 'attendance-reports',
        action: 'fetch_class'
      });
      return { data: null, error: turmaError.message };
    }

    if (!turmaData) {
      return { data: null, error: 'Turma não encontrada' };
    }

    const matriculaIds = turmaData.matriculas?.map((m) => m.id) || [];

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

    const attendanceByStudent = await loadCanonicalAttendanceSummaries(
      supabase,
      matriculaIds,
      { startDate: filters.startDate, endDate: filters.endDate }
    );

    // Calculate attendance for each student
    const students: ClassAttendanceReport['students'] = [];
    let totalPercentage = 0;
    let studentsWithData = 0;
    let alunosEmRisco = 0;

    for (const matricula of turmaData.matriculas || []) {
      const summary = attendanceByStudent.get(matricula.id);
      if (!summary) continue;
      const emRisco = summary.percentual < riskThreshold;

      if (emRisco) {
        alunosEmRisco++;
      }

      if (summary.total > 0) {
        totalPercentage += summary.percentual;
        studentsWithData++;
      }

      // Supabase nested select returns array for nested relations
      const alunosArray = matricula.alunos as unknown as Array<{ id: string; nome_completo: string }> | null;
      const alunoData = alunosArray?.[0];
      students.push({
        matriculaId: matricula.id,
        alunoId: matricula.aluno_id,
        nome: alunoData?.nome_completo || 'Nome não disponível',
        presencas: summary.presencas,
        faltas: summary.faltas,
        atestados: summary.atestados,
        totalAulas: summary.total,
        percentual: summary.percentual,
        emRisco,
        status: summary.status,
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
      feature: 'attendance-reports',
      action: 'class_report_complete',
      metadata: {
        turmaId,
        totalAlunos: students.length,
        mediaFrequencia,
        alunosEmRisco,
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
    const riskThreshold = filters.riskThreshold ?? CONFORMIDADE;

    logger.info('Getting students at risk', {
      feature: 'attendance-reports',
      action: 'get_students_at_risk',
      metadata: {
        turmaId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        riskThreshold,
      }
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
      logger.error('Failed to fetch class data', turmaError.message, {
        feature: 'attendance-reports',
        action: 'fetch_class'
      });
      return { data: null, error: turmaError.message };
    }

    if (!turmaData) {
      return { data: null, error: 'Turma não encontrada' };
    }

    const matriculaIds = turmaData.matriculas?.map((m) => m.id) || [];

    if (matriculaIds.length === 0) {
      return { data: { studentsAtRisk: [], total: 0 }, error: null };
    }

    const attendanceByStudent = await loadCanonicalAttendanceSummaries(
      supabase,
      matriculaIds,
      { startDate: filters.startDate, endDate: filters.endDate }
    );

    // Find students at risk
    const studentsAtRisk: StudentAtRiskReport[] = [];

    for (const matricula of turmaData.matriculas || []) {
      const summary = attendanceByStudent.get(matricula.id);
      if (!summary) continue;

      // Only include students below threshold
      if (summary.percentual < riskThreshold) {
        // Supabase nested select returns array for nested relations
        const alunosArray = matricula.alunos as unknown as Array<{ id: string; nome_completo: string; nis: string | null }> | null;
        const alunoData = alunosArray?.[0];
        studentsAtRisk.push({
          matriculaId: matricula.id,
          alunoId: matricula.aluno_id,
          nome: alunoData?.nome_completo || 'Nome não disponível',
          nis: alunoData?.nis || null,
          turmaId,
          turmaNome: turmaData.nome,
          presencas: summary.presencas,
          faltas: summary.faltas,
          atestados: summary.atestados,
          totalAulas: summary.total,
          percentual: summary.percentual,
        });
      }
    }

    // Sort by attendance percentage ascending (worst first)
    studentsAtRisk.sort((a, b) => a.percentual - b.percentual);

    logger.info('Students at risk identified', {
      feature: 'attendance-reports',
      action: 'students_at_risk_complete',
      metadata: {
        turmaId,
        totalAtRisk: studentsAtRisk.length,
        riskThreshold,
      }
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
    logger.error('Error getting students at risk', errorMessage, {
      feature: 'attendance-reports',
      action: 'get_students_at_risk'
    });
    return { data: null, error: errorMessage };
  }
}
