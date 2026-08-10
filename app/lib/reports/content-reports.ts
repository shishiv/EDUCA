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
  BNCC_SUBJECTS,
  BNCC_EXPERIENCE_FIELDS,
  type BNNCSubjectCode,
  type BNNCExperienceFieldCode,
} from '@/types/lesson-content';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentReportFilters {
  startDate: string;
  endDate: string;
  turmaId?: string;
  disciplina?: BNNCSubjectCode;
  professorId?: string;
  escolaId?: string;
}

/**
 * The report filter uses BNCC component codes, while the legacy discipline
 * catalog keeps its own short codes. Keep the translation at the query seam
 * so the filter still resolves through sessoes_aula.disciplina_id.
 */
const DISCIPLINE_DATABASE_CODES: Record<BNNCSubjectCode, readonly string[]> = {
  LP: ['LP', 'POR', 'PORT'],
  MA: ['MA', 'MAT'],
  CI: ['CI', 'CIE', 'CIEN'],
  HI: ['HI', 'HIS'],
  GE: ['GE', 'GEO'],
  AR: ['AR', 'ART'],
  EF: ['EF', 'EDF'],
  ER: ['ER'],
  LI: ['LI', 'ING'],
};

interface ContentReportRow {
  id: string;
  sessao_id: string;
  tema: string;
  objetivo: string;
  habilidades_bncc: string[];
  metodologia: string | null;
  recursos: string | null;
  observacoes: string | null;
  created_at: string;
  sessoes_aula: {
    id: string;
    data_aula: string;
    inicio_aula: string | null;
    fim_aula: string | null;
    turma_id: string;
    professor_id: string;
    turmas: {
      id: string;
      nome: string;
      serie: string;
      escola_id: string;
      escolas: {
        id: string;
        nome: string;
      } | null;
    } | null;
    users: {
      id: string;
      nome: string;
    } | null;
    disciplinas: {
      id: string;
      codigo: string;
      nome: string;
    } | null;
  } | null;
}

interface ContentReportQueryResult {
  data: ContentReportRow[] | null;
  error: { message: string } | null;
}

/**
 * Narrow seam for the content table, which is not in the committed generated
 * database type surface yet. The runtime client remains the real Supabase
 * client and this seam exposes only the report query contract.
 */
interface ContentReportQueryBuilder {
  select(columns: string): ContentReportQueryBuilder;
  gte(column: string, value: string): ContentReportQueryBuilder;
  lte(column: string, value: string): ContentReportQueryBuilder;
  eq(column: string, value: string): ContentReportQueryBuilder;
  in(column: string, values: string[]): ContentReportQueryBuilder;
  order(column: string, options: { ascending: boolean }): ContentReportQueryBuilder;
  then<TResult1 = ContentReportQueryResult, TResult2 = never>(
    onfulfilled?: ((value: ContentReportQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}

interface ContentReportClient {
  from(table: 'conteudo_aula'): ContentReportQueryBuilder;
}

function contentReportSelect(disciplineFilter: boolean): string {
  const disciplineRelation = disciplineFilter ? 'disciplinas!inner' : 'disciplinas';

  return `
    id,
    sessao_id,
    tema,
    objetivo,
    habilidades_bncc,
    metodologia,
    recursos,
    observacoes,
    created_at,
    sessoes_aula!inner (
      id,
      data_aula,
      inicio_aula,
      fim_aula,
      turma_id,
      professor_id,
      turmas!inner (
        id,
        nome,
        serie,
        escola_id,
        escolas (
          id,
          nome
        )
      ),
      users (
        id,
        nome
      ),
      ${disciplineRelation} (
        id,
        codigo,
        nome
      )
    )
  `;
}

export interface LessonContentReportItem {
  id: string;
  sessaoId: string;
  dataAula: string;
  tema: string;
  objetivo: string;
  habilidadesBncc: string[];
  metodologia: string | null;
  recursos: string | null;
  observacoes: string | null;
  turmaNome: string;
  turmaSerie: string;
  professorNome: string;
  escolaNome: string;
  disciplinaCodigo: string | null;
  disciplinaNome: string | null;
  createdAt: string;
}

export interface BNNCSkillUsage {
  codigo: string;
  descricao: string;
  vezesTrabalhado: number;
  datasTrabalho: string[];
  nivel: 'fundamental' | 'infantil';
}

export interface ContentReport {
  periodo: {
    inicio: string;
    fim: string;
  };
  turma?: {
    id: string;
    nome: string;
    serie: string;
  };
  escola?: {
    id: string;
    nome: string;
  };
  professor?: {
    id: string;
    nome: string;
  };
  resumo: {
    totalAulas: number;
    totalHabilidadesBncc: number;
    habilidadesUnicas: number;
    mediaHabilidadesPorAula: number;
    disciplinasMaisTrabalhadas: Array<{
      disciplina: string;
      quantidade: number;
    }>;
  };
  aulas: LessonContentReportItem[];
  habilidadesBncc: BNNCSkillUsage[];
  geradoEm: string;
}

export interface ContentReportGrouped {
  periodo: string;
  label: string;
  aulas: LessonContentReportItem[];
  habilidades: string[];
}

export interface ContentReportResult {
  data: ContentReport | null;
  error: string | null;
}

export interface ContentGroupedResult {
  data: ContentReportGrouped[] | null;
  error: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get description for a BNCC skill code
 */
function getBNNCSkillDescription(code: string): string {
  // Extract subject/field from code
  if (code.startsWith('EF') && code.length >= 6) {
    const subjectCode = code.substring(4, 6) as BNNCSubjectCode;
    const subject = BNCC_SUBJECTS[subjectCode];
    if (subject) {
      return `${subject.fullName} - ${code}`;
    }
  }

  if (code.startsWith('EI') && code.length >= 6) {
    const fieldCode = code.substring(4, 6) as BNNCExperienceFieldCode;
    const field = BNCC_EXPERIENCE_FIELDS[fieldCode];
    if (field) {
      return `${field.name} - ${code}`;
    }
  }

  return code;
}

/**
 * Get education level from BNCC code
 */
function getEducationLevel(code: string): 'fundamental' | 'infantil' {
  return code.startsWith('EI') ? 'infantil' : 'fundamental';
}

/**
 * Extract discipline from BNCC skill codes
 */
function extractDisciplinesFromSkills(skills: string[]): Map<string, number> {
  const disciplineCount = new Map<string, number>();

  for (const code of skills) {
    let disciplineName = 'Outros';

    if (code.startsWith('EF') && code.length >= 6) {
      const subjectCode = code.substring(4, 6) as BNNCSubjectCode;
      const subject = BNCC_SUBJECTS[subjectCode];
      if (subject) {
        disciplineName = subject.fullName;
      }
    } else if (code.startsWith('EI') && code.length >= 6) {
      const fieldCode = code.substring(4, 6) as BNNCExperienceFieldCode;
      const field = BNCC_EXPERIENCE_FIELDS[fieldCode];
      if (field) {
        disciplineName = field.name;
      }
    }

    disciplineCount.set(disciplineName, (disciplineCount.get(disciplineName) || 0) + 1);
  }

  return disciplineCount;
}

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

    // Build the report from the canonical content -> session -> class ->
    // school/teacher/discipline chain. A discipline filter must be an
    // embedded database predicate, not a client-side post-filter.
    const reportClient = supabase as unknown as ContentReportClient;
    let query = reportClient
      .from('conteudo_aula')
      .select(contentReportSelect(Boolean(filters.disciplina)))
      .gte('sessoes_aula.data_aula', filters.startDate)
      .lte('sessoes_aula.data_aula', filters.endDate)
      .order('sessoes_aula(data_aula)', { ascending: false });

    // Apply optional filters
    if (filters.turmaId) {
      query = query.eq('sessoes_aula.turma_id', filters.turmaId);
    }

    if (filters.professorId) {
      query = query.eq('sessoes_aula.professor_id', filters.professorId);
    }

    if (filters.escolaId) {
      query = query.eq('sessoes_aula.turmas.escola_id', filters.escolaId);
    }

    if (filters.disciplina) {
      query = query.in(
        'sessoes_aula.disciplinas.codigo',
        [...DISCIPLINE_DATABASE_CODES[filters.disciplina]],
      );
    }

    const { data: contentData, error: contentError } = await query;

    if (contentError) {
      logger.error('Failed to fetch lesson content', contentError.message);
      return { data: null, error: contentError.message };
    }

    const content = contentData || [];

    if (content.length === 0) {
      // Return empty report
      const emptyReport: ContentReport = {
        periodo: {
          inicio: filters.startDate,
          fim: filters.endDate,
        },
        resumo: {
          totalAulas: 0,
          totalHabilidadesBncc: 0,
          habilidadesUnicas: 0,
          mediaHabilidadesPorAula: 0,
          disciplinasMaisTrabalhadas: [],
        },
        aulas: [],
        habilidadesBncc: [],
        geradoEm: new Date().toISOString(),
      };
      return { data: emptyReport, error: null };
    }

    // Process content into report items
    const aulas: LessonContentReportItem[] = [];
    const skillUsageMap = new Map<string, { count: number; dates: Set<string> }>();
    const allSkills: string[] = [];
    let totalSkills = 0;

    // Get turma, escola, professor info from first record for report header
    let turmaInfo: ContentReport['turma'];
    let escolaInfo: ContentReport['escola'];
    let professorInfo: ContentReport['professor'];

    for (const record of content) {
      const sessao = record.sessoes_aula;
      const turma = sessao?.turmas;
      const escola = turma?.escolas;
      const professor = sessao?.users;
      const disciplina = sessao?.disciplinas;

      // Set header info from first record if filtering by turma
      if (!turmaInfo && filters.turmaId && turma) {
        turmaInfo = {
          id: turma.id,
          nome: turma.nome,
          serie: turma.serie,
        };
      }
      if (!escolaInfo && escola) {
        escolaInfo = {
          id: escola.id,
          nome: escola.nome,
        };
      }
      if (!professorInfo && professor) {
        professorInfo = {
          id: professor.id,
          nome: professor.nome,
        };
      }

      // Build lesson item
      const lessonItem: LessonContentReportItem = {
        id: record.id,
        sessaoId: record.sessao_id,
        dataAula: sessao?.data_aula || '',
        tema: record.tema,
        objetivo: record.objetivo,
        habilidadesBncc: record.habilidades_bncc || [],
        metodologia: record.metodologia,
        recursos: record.recursos,
        observacoes: record.observacoes,
        turmaNome: turma?.nome || '',
        turmaSerie: turma?.serie || '',
        professorNome: professor?.nome || '',
        escolaNome: escola?.nome || '',
        disciplinaCodigo: disciplina?.codigo || null,
        disciplinaNome: disciplina?.nome || null,
        createdAt: record.created_at,
      };

      aulas.push(lessonItem);

      // Count BNCC skills
      const skills = record.habilidades_bncc || [];
      totalSkills += skills.length;
      allSkills.push(...skills);

      for (const skill of skills) {
        if (!skillUsageMap.has(skill)) {
          skillUsageMap.set(skill, { count: 0, dates: new Set() });
        }
        const usage = skillUsageMap.get(skill)!;
        usage.count++;
        if (sessao?.data_aula) {
          usage.dates.add(sessao.data_aula);
        }
      }
    }

    // Build BNCC skills summary
    const habilidadesBncc: BNNCSkillUsage[] = Array.from(skillUsageMap.entries())
      .map(([codigo, usage]) => ({
        codigo,
        descricao: getBNNCSkillDescription(codigo),
        vezesTrabalhado: usage.count,
        datasTrabalho: Array.from(usage.dates).sort(),
        nivel: getEducationLevel(codigo),
      }))
      .sort((a, b) => b.vezesTrabalhado - a.vezesTrabalhado);

    // Calculate discipline frequency
    const disciplineFrequency = extractDisciplinesFromSkills(allSkills);
    const disciplinasMaisTrabalhadas = Array.from(disciplineFrequency.entries())
      .map(([disciplina, quantidade]) => ({ disciplina, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    // Build report
    const report: ContentReport = {
      periodo: {
        inicio: filters.startDate,
        fim: filters.endDate,
      },
      turma: turmaInfo,
      escola: escolaInfo,
      professor: professorInfo,
      resumo: {
        totalAulas: aulas.length,
        totalHabilidadesBncc: totalSkills,
        habilidadesUnicas: skillUsageMap.size,
        mediaHabilidadesPorAula: aulas.length > 0
          ? Math.round((totalSkills / aulas.length) * 10) / 10
          : 0,
        disciplinasMaisTrabalhadas,
      },
      aulas,
      habilidadesBncc,
      geradoEm: new Date().toISOString(),
    };

    logger.info('Content report generated', {
      feature: 'content-reports',
      action: 'generated',
      metadata: {
        totalAulas: aulas.length,
        totalHabilidades: skillUsageMap.size,
      },
    });

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
