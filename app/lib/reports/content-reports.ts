/**
 * Content Reports API (Relatorio de Conteudo Ministrado)
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.4: Relatorio de Conteudo Ministrado
 *
 * Functions for generating taught content reports:
 * - generateContentReport: Report of all lessons taught in a period
 * - getBNNCSkillsSummary: Aggregated BNCC skills worked on
 * - getContentByPeriod: Content grouped by period (weekly/monthly/bimestral)
 *
 * BNCC Reference: Base Nacional Comum Curricular
 * - EF: Ensino Fundamental (Elementary School)
 * - EI: Educacao Infantil (Early Childhood Education)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import {
  BNCC_EXPERIENCE_FIELDS,
  BNCC_SUBJECTS,
  type BNNCSubjectCode,
  type BNNCExperienceFieldCode,
} from '@/types/lesson-content';
import {
  assembleContentReport,
  buildContentReportQuery,
  type ContentReportClient,
  type ContentReportFilters,
  type ContentReportGrouped,
  type ContentReportResult,
  type ContentGroupedResult,
  type LessonContentReportItem,
  type BNNCSkillUsage,
} from '@/lib/reports/content-report-data';

export type {
  BNNCSkillUsage,
  ContentGroupedResult,
  ContentReport,
  ContentReportFilters,
  ContentReportGrouped,
  ContentReportResult,
  LessonContentReportItem,
} from '@/lib/reports/content-report-data';

// ============================================================================
// TYPES
// ============================================================================

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Group date by period type
 */
function getGroupKey(date: string, groupBy: 'week' | 'month' | 'bimestre'): string {
  const d = new Date(date);
  const year = d.getFullYear();

  switch (groupBy) {
    case 'week': {
      // Get ISO week number
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    }
    case 'month': {
      const month = d.getMonth() + 1;
      return `${year}-${month.toString().padStart(2, '0')}`;
    }
    case 'bimestre': {
      const month = d.getMonth();
      let bimestre: number;
      if (month < 4) bimestre = 1;
      else if (month < 7) bimestre = 2;
      else if (month < 10) bimestre = 3;
      else bimestre = 4;
      return `${year}-B${bimestre}`;
    }
  }
}

/**
 * Get period label for display
 */
function getPeriodLabel(key: string, groupBy: 'week' | 'month' | 'bimestre'): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  switch (groupBy) {
    case 'week': {
      const [year, week] = key.split('-W');
      return `Semana ${week} de ${year}`;
    }
    case 'month': {
      const [year, month] = key.split('-');
      return `${months[parseInt(month, 10) - 1]} de ${year}`;
    }
    case 'bimestre': {
      const [year, bim] = key.split('-B');
      return `${bim}º Bimestre de ${year}`;
    }
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate content report with lessons and BNCC skills
 *
 * @param supabase - Supabase client
 * @param filters - Period and optional turma/disciplina filters
 * @returns Content report with all lessons and aggregated BNCC skills
 */
export async function generateContentReport(
  supabase: SupabaseClient,
  filters: ContentReportFilters
): Promise<ContentReportResult> {
  try {
    logger.info('Generating content report', {
      feature: 'content-reports',
      action: 'generate',
      metadata: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        turmaId: filters.turmaId,
        disciplina: filters.disciplina,
      },
    });

    const { data: contentData, error: contentError } = await buildContentReportQuery(
      supabase as unknown as ContentReportClient,
      filters,
    );

    if (contentError) {
      logger.error('Failed to fetch lesson content', contentError.message);
      return { data: null, error: contentError.message };
    }

    const report = assembleContentReport(contentData || [], filters, new Date().toISOString());
    if (report.aulas.length > 0) {
      logger.info('Content report generated', {
        feature: 'content-reports',
        action: 'generated',
        metadata: {
          totalAulas: report.aulas.length,
          totalHabilidades: report.habilidadesBncc.length,
        },
      });
    }

    return { data: report, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error generating content report', error instanceof Error ? error : errorMessage);
    return { data: null, error: errorMessage };
  }
}

/**
 * Get content grouped by period (week, month, or bimestre)
 *
 * @param supabase - Supabase client
 * @param filters - Period and optional turma/disciplina filters
 * @param groupBy - Grouping type: 'week', 'month', or 'bimestre'
 * @returns Content grouped by the specified period
 */
export async function getContentByPeriod(
  supabase: SupabaseClient,
  filters: ContentReportFilters,
  groupBy: 'week' | 'month' | 'bimestre' = 'month'
): Promise<ContentGroupedResult> {
  try {
    logger.info('Getting content by period', {
      feature: 'content-reports',
      action: 'get_by_period',
      metadata: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy,
      },
    });

    // Get the full report first
    const reportResult = await generateContentReport(supabase, filters);

    if (reportResult.error || !reportResult.data) {
      return { data: null, error: reportResult.error };
    }

    const report = reportResult.data;

    // Group lessons by period
    const groupedMap = new Map<string, {
      aulas: LessonContentReportItem[];
      habilidades: Set<string>;
    }>();

    for (const aula of report.aulas) {
      const key = getGroupKey(aula.dataAula, groupBy);

      if (!groupedMap.has(key)) {
        groupedMap.set(key, { aulas: [], habilidades: new Set() });
      }

      const group = groupedMap.get(key)!;
      group.aulas.push(aula);
      aula.habilidadesBncc.forEach((h) => group.habilidades.add(h));
    }

    // Convert to array and sort by period
    const grouped: ContentReportGrouped[] = Array.from(groupedMap.entries())
      .map(([key, value]) => ({
        periodo: key,
        label: getPeriodLabel(key, groupBy),
        aulas: value.aulas,
        habilidades: Array.from(value.habilidades).sort(),
      }))
      .sort((a, b) => b.periodo.localeCompare(a.periodo)); // Most recent first

    logger.info('Content grouped by period', {
      feature: 'content-reports',
      action: 'grouped',
      metadata: {
        periods: grouped.length,
        groupBy,
      },
    });

    return { data: grouped, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting content by period', error instanceof Error ? error : errorMessage);
    return { data: null, error: errorMessage };
  }
}

/**
 * Get summary of BNCC skills worked on in a period
 *
 * @param supabase - Supabase client
 * @param turmaId - Class ID
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns Summary of BNCC skills with usage counts
 */
export async function getBNNCSkillsSummary(
  supabase: SupabaseClient,
  turmaId: string,
  startDate: string,
  endDate: string
): Promise<{
  data: {
    skills: BNNCSkillUsage[];
    totalSkills: number;
    uniqueSkills: number;
    byDisciplina: Array<{ disciplina: string; quantidade: number; habilidades: string[] }>;
    byNivel: { fundamental: number; infantil: number };
  } | null;
  error: string | null;
}> {
  try {
    logger.info('Getting BNCC skills summary', {
      feature: 'content-reports',
      action: 'skills_summary',
      metadata: { turmaId, startDate, endDate },
    });

    const reportResult = await generateContentReport(supabase, {
      startDate,
      endDate,
      turmaId,
    });

    if (reportResult.error || !reportResult.data) {
      return { data: null, error: reportResult.error };
    }

    const report = reportResult.data;

    // Count by education level
    let fundamentalCount = 0;
    let infantilCount = 0;

    for (const skill of report.habilidadesBncc) {
      if (skill.nivel === 'fundamental') {
        fundamentalCount += skill.vezesTrabalhado;
      } else {
        infantilCount += skill.vezesTrabalhado;
      }
    }

    // Group by discipline with skills list
    const disciplinaMap = new Map<string, { quantidade: number; habilidades: Set<string> }>();

    for (const skill of report.habilidadesBncc) {
      const codigo = skill.codigo;
      let disciplina = 'Outros';

      if (codigo.startsWith('EF') && codigo.length >= 6) {
        const subjectCode = codigo.substring(4, 6) as BNNCSubjectCode;
        const subject = BNCC_SUBJECTS[subjectCode];
        if (subject) {
          disciplina = subject.fullName;
        }
      } else if (codigo.startsWith('EI') && codigo.length >= 6) {
        const fieldCode = codigo.substring(4, 6) as BNNCExperienceFieldCode;
        const field = BNCC_EXPERIENCE_FIELDS[fieldCode];
        if (field) {
          disciplina = field.name;
        }
      }

      if (!disciplinaMap.has(disciplina)) {
        disciplinaMap.set(disciplina, { quantidade: 0, habilidades: new Set() });
      }

      const entry = disciplinaMap.get(disciplina)!;
      entry.quantidade += skill.vezesTrabalhado;
      entry.habilidades.add(codigo);
    }

    const byDisciplina = Array.from(disciplinaMap.entries())
      .map(([disciplina, data]) => ({
        disciplina,
        quantidade: data.quantidade,
        habilidades: Array.from(data.habilidades).sort(),
      }))
      .sort((a, b) => b.quantidade - a.quantidade);

    return {
      data: {
        skills: report.habilidadesBncc,
        totalSkills: report.resumo.totalHabilidadesBncc,
        uniqueSkills: report.resumo.habilidadesUnicas,
        byDisciplina,
        byNivel: {
          fundamental: fundamentalCount,
          infantil: infantilCount,
        },
      },
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting BNCC skills summary', error instanceof Error ? error : errorMessage);
    return { data: null, error: errorMessage };
  }
}
