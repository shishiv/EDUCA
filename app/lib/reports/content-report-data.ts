import {
  BNCC_EXPERIENCE_FIELDS,
  BNCC_SUBJECTS,
  type BNNCExperienceFieldCode,
  type BNNCSubjectCode,
} from '@/types/lesson-content'

export interface ContentReportFilters {
  startDate: string
  endDate: string
  turmaId?: string
  disciplina?: BNNCSubjectCode
  professorId?: string
  escolaId?: string
}

export interface ContentReportRow {
  id: string
  sessao_id: string
  tema: string
  objetivo: string
  habilidades_bncc: string[]
  metodologia: string | null
  recursos: string | null
  observacoes: string | null
  created_at: string
  sessoes_aula: {
    id: string
    data_aula: string
    inicio_aula: string | null
    fim_aula: string | null
    turma_id: string
    professor_id: string
    turmas: {
      id: string
      nome: string
      serie: string
      escola_id: string
      escolas: { id: string; nome: string } | null
    } | null
    users: { id: string; nome: string } | null
    disciplinas: { id: string; codigo: string; nome: string } | null
  } | null
}

interface ContentReportQueryResult {
  data: ContentReportRow[] | null
  error: { message: string } | null
}

export interface ContentReportQueryBuilder {
  select(columns: string): ContentReportQueryBuilder
  gte(column: string, value: string): ContentReportQueryBuilder
  lte(column: string, value: string): ContentReportQueryBuilder
  eq(column: string, value: string): ContentReportQueryBuilder
  in(column: string, values: string[]): ContentReportQueryBuilder
  order(column: string, options: { ascending: boolean }): ContentReportQueryBuilder
  then<TResult1 = ContentReportQueryResult, TResult2 = never>(
    onfulfilled?: ((value: ContentReportQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>
}

export interface ContentReportClient {
  from(table: 'conteudo_aula'): ContentReportQueryBuilder
}

export interface LessonContentReportItem {
  id: string
  sessaoId: string
  dataAula: string
  tema: string
  objetivo: string
  habilidadesBncc: string[]
  metodologia: string | null
  recursos: string | null
  observacoes: string | null
  turmaNome: string
  turmaSerie: string
  professorNome: string
  escolaNome: string
  disciplinaCodigo: string | null
  disciplinaNome: string | null
  createdAt: string
}

export interface BNNCSkillUsage {
  codigo: string
  descricao: string
  vezesTrabalhado: number
  datasTrabalho: string[]
  nivel: 'fundamental' | 'infantil'
}

export interface ContentReport {
  periodo: { inicio: string; fim: string }
  turma?: { id: string; nome: string; serie: string }
  escola?: { id: string; nome: string }
  professor?: { id: string; nome: string }
  resumo: {
    totalAulas: number
    totalHabilidadesBncc: number
    habilidadesUnicas: number
    mediaHabilidadesPorAula: number
    disciplinasMaisTrabalhadas: Array<{ disciplina: string; quantidade: number }>
  }
  aulas: LessonContentReportItem[]
  habilidadesBncc: BNNCSkillUsage[]
  geradoEm: string
}

export interface ContentReportGrouped {
  periodo: string
  label: string
  aulas: LessonContentReportItem[]
  habilidades: string[]
}

export interface ContentReportResult {
  data: ContentReport | null
  error: string | null
}

export interface ContentGroupedResult {
  data: ContentReportGrouped[] | null
  error: string | null
}

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
}

function contentReportSelect(disciplineFilter: boolean): string {
  const disciplineRelation = disciplineFilter ? 'disciplinas!inner' : 'disciplinas'
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
  `
}

export function buildContentReportQuery(
  client: ContentReportClient,
  filters: ContentReportFilters,
): ContentReportQueryBuilder {
  let query = client
    .from('conteudo_aula')
    .select(contentReportSelect(Boolean(filters.disciplina)))
    .gte('sessoes_aula.data_aula', filters.startDate)
    .lte('sessoes_aula.data_aula', filters.endDate)
    .order('sessoes_aula(data_aula)', { ascending: false })

  if (filters.turmaId) query = query.eq('sessoes_aula.turma_id', filters.turmaId)
  if (filters.professorId) query = query.eq('sessoes_aula.professor_id', filters.professorId)
  if (filters.escolaId) query = query.eq('sessoes_aula.turmas.escola_id', filters.escolaId)
  if (filters.disciplina) {
    query = query.in(
      'sessoes_aula.disciplinas.codigo',
      [...DISCIPLINE_DATABASE_CODES[filters.disciplina]],
    )
  }
  return query
}

function getDisciplineName(code: string): string {
  if (code.startsWith('EF') && code.length >= 6) {
    return BNCC_SUBJECTS[code.substring(4, 6) as BNNCSubjectCode]?.fullName ?? 'Outros'
  }
  if (code.startsWith('EI') && code.length >= 6) {
    return BNCC_EXPERIENCE_FIELDS[code.substring(4, 6) as BNNCExperienceFieldCode]?.name ?? 'Outros'
  }
  return 'Outros'
}

function getLessonContext(session: ContentReportRow['sessoes_aula']) {
  if (!session) {
    return {
      dataAula: '',
      turmaNome: '',
      turmaSerie: '',
      professorNome: '',
      escolaNome: '',
      disciplinaCodigo: null,
      disciplinaNome: null,
    }
  }
  return {
    dataAula: session.data_aula || '',
    turmaNome: session.turmas?.nome || '',
    turmaSerie: session.turmas?.serie || '',
    professorNome: session.users?.nome || '',
    escolaNome: session.turmas?.escolas?.nome || '',
    disciplinaCodigo: session.disciplinas?.codigo || null,
    disciplinaNome: session.disciplinas?.nome || null,
  }
}

function toLessonItem(record: ContentReportRow): LessonContentReportItem {
  return {
    id: record.id,
    sessaoId: record.sessao_id,
    tema: record.tema,
    objetivo: record.objetivo,
    habilidadesBncc: record.habilidades_bncc || [],
    metodologia: record.metodologia,
    recursos: record.recursos,
    observacoes: record.observacoes,
    ...getLessonContext(record.sessoes_aula),
    createdAt: record.created_at,
  }
}

function getReportHeader(content: ContentReportRow[], includeTurma: boolean) {
  const turma = includeTurma
    ? content.find(record => record.sessoes_aula?.turmas)?.sessoes_aula?.turmas
    : undefined
  const escola = content.find(record => record.sessoes_aula?.turmas?.escolas)
    ?.sessoes_aula?.turmas?.escolas
  const professor = content.find(record => record.sessoes_aula?.users)?.sessoes_aula?.users
  return {
    turma: turma ? { id: turma.id, nome: turma.nome, serie: turma.serie } : undefined,
    escola: escola ? { id: escola.id, nome: escola.nome } : undefined,
    professor: professor ? { id: professor.id, nome: professor.nome } : undefined,
  }
}

function summarizeSkills(content: ContentReportRow[]) {
  const usage = new Map<string, { count: number; dates: Set<string> }>()
  const allSkills: string[] = []
  for (const record of content) {
    const skills = record.habilidades_bncc || []
    allSkills.push(...skills)
    for (const skill of skills) {
      const fact = usage.get(skill) ?? { count: 0, dates: new Set<string>() }
      fact.count++
      if (record.sessoes_aula?.data_aula) fact.dates.add(record.sessoes_aula.data_aula)
      usage.set(skill, fact)
    }
  }
  return { usage, allSkills }
}

function buildSkillUsage(usage: Map<string, { count: number; dates: Set<string> }>): BNNCSkillUsage[] {
  return Array.from(usage.entries())
    .map(([codigo, fact]) => {
      const discipline = getDisciplineName(codigo)
      return {
        codigo,
        descricao: discipline === 'Outros' ? codigo : `${discipline} - ${codigo}`,
        vezesTrabalhado: fact.count,
        datasTrabalho: Array.from(fact.dates).sort(),
        nivel: codigo.startsWith('EI') ? 'infantil' as const : 'fundamental' as const,
      }
    })
    .sort((a, b) => b.vezesTrabalhado - a.vezesTrabalhado)
}

function buildDisciplineFrequency(skills: string[]) {
  const frequency = new Map<string, number>()
  for (const skill of skills) {
    const discipline = getDisciplineName(skill)
    frequency.set(discipline, (frequency.get(discipline) || 0) + 1)
  }
  return Array.from(frequency, ([disciplina, quantidade]) => ({ disciplina, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)
}

export function assembleContentReport(
  content: ContentReportRow[],
  filters: ContentReportFilters,
  generatedAt: string,
): ContentReport {
  const aulas = content.map(toLessonItem)
  const { usage, allSkills } = summarizeSkills(content)
  const totalSkills = allSkills.length
  return {
    periodo: { inicio: filters.startDate, fim: filters.endDate },
    ...(content.length > 0 ? getReportHeader(content, Boolean(filters.turmaId)) : {}),
    resumo: {
      totalAulas: aulas.length,
      totalHabilidadesBncc: totalSkills,
      habilidadesUnicas: usage.size,
      mediaHabilidadesPorAula: aulas.length > 0
        ? Math.round((totalSkills / aulas.length) * 10) / 10
        : 0,
      disciplinasMaisTrabalhadas: buildDisciplineFrequency(allSkills),
    },
    aulas,
    habilidadesBncc: buildSkillUsage(usage),
    geradoEm: generatedAt,
  }
}
