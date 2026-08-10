import { CONFORMIDADE } from '../../app/lib/attendance/attendance-policy'

/**
 * attendance-generator.ts
 *
 * Deterministic synthetic attendance generator for the EDUCA public demo
 * sandbox (issue #23). The static demo dataset (escolas, turmas, alunos,
 * matriculas, ...) lives in seed-demo.sql; the time-varying attendance history
 * and canonical lesson content are generated here relative to the reset date.
 * The demo therefore shows recent "chamadas" and report rows from real
 * sessoes_aula sessions.
 *
 * Determinism contract: the same anchorDate always produces the exact same
 * SQL. Weekends are skipped; the window covers DEMO_SCHOOL_DAYS school days
 * ending on the anchor date (inclusive when the anchor is a weekday).
 * Attendance rates come from a seeded PRNG keyed by (matricula, data_aula),
 * so a weekly reset with the same anchor date yields an identical dataset.
 *
 * Receipts (issue #23 / measured seed volume):
 *  - 3 escolas, 5 turmas, 10 professores, 50 alunos: issue #23 seed spec.
 *  - DEMO_SCHOOL_DAYS = 20: measured volume choice - one month (4 weeks) of
 *    school history, scaling the previous 10-day seed to 50 matriculas x 20
 *    days = 1000 frequencia rows and 5 turmas x 20 days = 100 sessoes.
 *  - LOW_ATTENDANCE_RATE = 0.70: fixed 70% < 80%, the BOLSA_FAMILIA_THRESHOLD
 *    receipt lives in app/lib/reports/bolsa-familia-reports.ts (80) and in the
 *    seeded configs row `frequencia_minima` = 80 (issue #23: "<80% para
 *    demonstrar alerta Bolsa Família").
 */

// -----------------------------------------------------------------------------
// Receipt-backed constants
// -----------------------------------------------------------------------------

/** School-day window size (working days, weekends skipped). */
export const DEMO_SCHOOL_DAYS = 20

/** Matricula of the fixed low-attendance alert case (aluno ...0201 "Miguel"). */
export const LOW_ATTENDANCE_MATRICULA_ID = '00000000-0000-0000-0000-000000000401'

/** Fixed attendance rate for the alert case: exactly 70% (< 80% threshold). */
export const LOW_ATTENDANCE_RATE = 0.7

/** Deterministic per-student base rates for everyone else (86% - 98%). */
export const ATTENDANCE_RATE_MIN = 0.86
export const ATTENDANCE_RATE_MAX = 0.98

/** Bolsa Família compliance threshold from the shared attendance policy. */
export const BOLSA_FAMILIA_THRESHOLD = CONFORMIDADE

/** Anchor timestamp used for every static created_at in the demo dataset. */
export const STATIC_CREATED_AT = '2026-02-03 08:00:00-03'

// -----------------------------------------------------------------------------
// Deterministic ID scheme (kept from the original seed so IDs stay stable)
// -----------------------------------------------------------------------------

export interface TurmaRef {
  id: string
  escolaId: string
  professorId: string
  turno: 'manha' | 'tarde' | 'integral'
}

export interface MatriculaRef {
  id: string
  turmaRef: TurmaRef
}

export const TURMAS: TurmaRef[] = [
  { id: '00000000-0000-0000-0000-000000000101', escolaId: '00000000-0000-0000-0000-000000000001', professorId: '00000000-0000-0000-0000-000000000011', turno: 'manha' },
  { id: '00000000-0000-0000-0000-000000000102', escolaId: '00000000-0000-0000-0000-000000000001', professorId: '00000000-0000-0000-0000-000000000012', turno: 'tarde' },
  { id: '00000000-0000-0000-0000-000000000103', escolaId: '00000000-0000-0000-0000-000000000001', professorId: '00000000-0000-0000-0000-000000000013', turno: 'manha' },
  { id: '00000000-0000-0000-0000-000000000104', escolaId: '00000000-0000-0000-0000-000000000002', professorId: '00000000-0000-0000-0000-000000000015', turno: 'manha' },
  { id: '00000000-0000-0000-0000-000000000105', escolaId: '00000000-0000-0000-0000-000000000003', professorId: '00000000-0000-0000-0000-000000000018', turno: 'integral' },
]

interface DemoContentTemplate {
  disciplinaId: string
  tema: string
  objetivo: string
  habilidadesBncc: string[]
  metodologia: string
  recursos: string
}

/**
 * Every generated session receives one content row through its real session
 * id. The discipline ids point to the static canonical discipline rows above.
 */
const CONTENT_TEMPLATE_BY_TURMA: Record<string, DemoContentTemplate> = {
  '00000000-0000-0000-0000-000000000101': {
    disciplinaId: '00000000-0000-0000-0000-000000000600',
    tema: 'Operacoes e resolucao de problemas',
    objetivo: 'Resolver problemas de adicao e subtracao em situacoes do cotidiano',
    habilidadesBncc: ['EF03MA06'],
    metodologia: 'Resolucao colaborativa de problemas',
    recursos: 'Material dourado e quadro',
  },
  '00000000-0000-0000-0000-000000000102': {
    disciplinaId: '00000000-0000-0000-0000-000000000601',
    tema: 'Leitura e producao de textos',
    objetivo: 'Localizar informacoes explicitas e produzir pequenos textos',
    habilidadesBncc: ['EF03LP08'],
    metodologia: 'Leitura compartilhada e escrita orientada',
    recursos: 'Livro didatico e caderno',
  },
  '00000000-0000-0000-0000-000000000103': {
    disciplinaId: '00000000-0000-0000-0000-000000000602',
    tema: 'Ciencia e observacao do ambiente',
    objetivo: 'Observar fenomenos do ambiente e registrar descobertas',
    habilidadesBncc: ['EF03CI01'],
    metodologia: 'Investigacao guiada',
    recursos: 'Lupa, folhas e cartaz',
  },
  '00000000-0000-0000-0000-000000000104': {
    disciplinaId: '00000000-0000-0000-0000-000000000608',
    tema: 'Identidade e convivencia',
    objetivo: 'Reconhecer sentimentos e respeitar combinados de convivencia',
    habilidadesBncc: ['EI03EO01'],
    metodologia: 'Roda de conversa e brincadeira dirigida',
    recursos: 'Historias ilustradas e brinquedos',
  },
  '00000000-0000-0000-0000-000000000105': {
    disciplinaId: '00000000-0000-0000-0000-000000000612',
    tema: 'Movimento e expressao corporal',
    objetivo: 'Explorar movimentos do corpo em diferentes brincadeiras',
    habilidadesBncc: ['EI02CG02'],
    metodologia: 'Exploracao livre com intervencao do professor',
    recursos: 'Colchonetes e tecidos',
  },
}

/** Matriculas 401-410 -> turma 101, 411-420 -> 102, 421-430 -> 103, 431-440 -> 104, 441-450 -> 105. */
export const MATRICULAS: MatriculaRef[] = (() => {
  const refs: MatriculaRef[] = []
  for (let i = 0; i < 50; i += 1) {
    const turmaRef = TURMAS[Math.floor(i / 10)]
    refs.push({
      id: `00000000-0000-0000-0000-000000000${400 + i + 1}`,
      turmaRef,
    })
  }
  return refs
})()

export interface AulaRow {
  id: string
  turmaId: string
  escolaId: string
  professorId: string
  disciplinaId: string
  dataAula: string
  status: string
  abertaEm: string
  fechadaEm: string
  createdAt: string
}

export interface LessonContentRow {
  id: string
  sessaoId: string
  tema: string
  objetivo: string
  habilidadesBncc: string[]
  metodologia: string
  recursos: string
  observacoes: string
  createdBy: string
  createdAt: string
}

export interface FrequenciaRow {
  id: string
  matriculaId: string
  dataAula: string
  presente: boolean
  statusPresenca: string
  justificativa: string | null
  professorId: string
  marcadoPor: string
  marcadoEm: string
  aulaId: string
  createdAt: string
}

export interface GeneratedAttendance {
  aulas: AulaRow[]
  frequencia: FrequenciaRow[]
  conteudos: LessonContentRow[]
}

export interface AttendanceGenerationOptions {
  /** Inclusive end of the window, ISO date YYYY-MM-DD. */
  anchorDate: string
  /** Number of school days to generate. Defaults to DEMO_SCHOOL_DAYS. */
  schoolDays?: number
}

// -----------------------------------------------------------------------------
// Deterministic primitives
// -----------------------------------------------------------------------------

/** FNV-1a 32-bit hash - stable across platforms (pure integer math). */
export function hashString(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 - tiny deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Day of week for a YYYY-MM-DD date (0 = Sunday, 6 = Saturday). */
export function dayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Returns `count` school days (Mon-Fri) ending on or before the anchor date,
 * in ascending order. Weekends are skipped. The anchor is included when it is
 * a weekday.
 */
export function schoolDaysEndingOn(anchorDate: string, count: number): string[] {
  const [y, m, d] = anchorDate.split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1, d))
  const days: string[] = []
  while (days.length < count) {
    const weekday = cursor.getUTCDay()
    if (weekday >= 1 && weekday <= 5) {
      const iso = cursor.toISOString().slice(0, 10)
      days.unshift(iso)
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return days
}

/** Deterministic per-student attendance rate. */
export function attendanceRateFor(matriculaId: string): number {
  if (matriculaId === LOW_ATTENDANCE_MATRICULA_ID) {
    return LOW_ATTENDANCE_RATE
  }
  const spread = Math.round((ATTENDANCE_RATE_MAX - ATTENDANCE_RATE_MIN) * 100)
  const offset = hashString(matriculaId) % (spread + 1)
  return ATTENDANCE_RATE_MIN + offset / 100
}

/** Deterministic presence for a (matricula, dataAula) pair. */
export function isPresentOn(matriculaId: string, dataAula: string, schoolDayIndex: number): boolean {
  if (matriculaId === LOW_ATTENDANCE_MATRICULA_ID) {
    // Fixed 70% pattern (14 of 20 days) - guaranteed below the 80% threshold.
    return schoolDayIndex % 10 < 7
  }
  const rng = mulberry32(hashString(`${matriculaId}|${dataAula}`))
  return rng() < attendanceRateFor(matriculaId)
}

// -----------------------------------------------------------------------------
// Generation
// -----------------------------------------------------------------------------

function aulaIdFor(turmaIndex: number, schoolDayIndex: number): string {
  // Stride 100 per turma so up to 20 school days stay unique within the table.
  const suffix = (600 + turmaIndex * 100 + schoolDayIndex + 1).toString().padStart(12, '0')
  return `00000000-0000-0000-0000-${suffix}`
}

function frequenciaIdFor(matriculaIndex: number, schoolDayIndex: number): string {
  // Stride 20 per matricula (DEMO_SCHOOL_DAYS) so ids stay unique per day.
  const suffix = (700 + matriculaIndex * 20 + schoolDayIndex + 1).toString().padStart(12, '0')
  return `00000000-0000-0000-0000-${suffix}`
}

function contentIdFor(turmaIndex: number, schoolDayIndex: number): string {
  const suffix = (1600 + turmaIndex * 100 + schoolDayIndex + 1).toString().padStart(12, '0')
  return `00000000-0000-0000-0000-${suffix}`
}

function abertaEmFor(turno: TurmaRef['turno'], dataAula: string): string {
  const start = turno === 'tarde' ? '13:30' : '07:30'
  return `${dataAula} ${start}:00-03`
}

export function generateAttendance(options: AttendanceGenerationOptions): GeneratedAttendance {
  const schoolDays = options.schoolDays ?? DEMO_SCHOOL_DAYS
  if (schoolDays < 1 || schoolDays > 20) {
    throw new Error(`schoolDays must be between 1 and 20 (got ${schoolDays}) - the deterministic ID scheme supports at most 20 days`)
  }
  const days = schoolDaysEndingOn(options.anchorDate, schoolDays)

  const aulas: AulaRow[] = []
  const frequencia: FrequenciaRow[] = []
  const conteudos: LessonContentRow[] = []

  TURMAS.forEach((turma, turmaIndex) => {
    days.forEach((dataAula, dayIndex) => {
      const abertaEm = abertaEmFor(turma.turno, dataAula)
      const id = aulaIdFor(turmaIndex, dayIndex)
      const contentTemplate = CONTENT_TEMPLATE_BY_TURMA[turma.id]
      aulas.push({
        id,
        turmaId: turma.id,
        escolaId: turma.escolaId,
        professorId: turma.professorId,
        disciplinaId: contentTemplate.disciplinaId,
        dataAula,
        status: 'FECHADA',
        abertaEm,
        fechadaEm: abertaEm.replace('07:30', '08:50').replace('13:30', '14:50'),
        createdAt: abertaEm,
      })

      conteudos.push({
        id: contentIdFor(turmaIndex, dayIndex),
        sessaoId: id,
        tema: contentTemplate.tema,
        objetivo: contentTemplate.objetivo,
        habilidadesBncc: contentTemplate.habilidadesBncc,
        metodologia: contentTemplate.metodologia,
        recursos: contentTemplate.recursos,
        observacoes: `Registro canonico da aula de ${dataAula}`,
        createdBy: turma.professorId,
        createdAt: abertaEm,
      })

      const matriculaIndex = turmaIndex * 10
      for (let offset = 0; offset < 10; offset += 1) {
        const matricula = MATRICULAS[matriculaIndex + offset]
        const presente = isPresentOn(matricula.id, dataAula, dayIndex)
        const marcadoEm = abertaEm.replace('07:30', '07:45').replace('13:30', '13:45')
        const hasJustificativa = !presente && hashString(`${matricula.id}|${dataAula}|just`) % 4 === 0
        frequencia.push({
          id: frequenciaIdFor(matriculaIndex + offset, dayIndex),
          matriculaId: matricula.id,
          dataAula,
          presente,
          statusPresenca: presente ? 'P' : 'F',
          justificativa: hasJustificativa ? 'Atestado medico apresentado' : null,
          professorId: turma.professorId,
          marcadoPor: turma.professorId,
          marcadoEm,
          aulaId: id,
          createdAt: marcadoEm,
        })
      }
    })
  })

  return { aulas, frequencia, conteudos }
}

// -----------------------------------------------------------------------------
// SQL emission
// -----------------------------------------------------------------------------

const sqlLiteral = (value: string | null): string => (value === null ? 'NULL' : `'${value.replace(/'/g, "''")}'`)
const sqlBool = (value: boolean): string => (value ? 'true' : 'false')

function emitMultiRowInsert(
  table: string,
  columns: string[],
  rows: Array<Array<string | number | boolean | null>>
): string {
  const chunks: string[] = []
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const values = batch
      .map(row => `(${row.map(v => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : sqlBoolOrLiteral(v))).join(',')})`)
      .join(',\n')
    chunks.push(`INSERT INTO ${table} (${columns.join(',')}) VALUES\n${values};`)
  }
  return chunks.join('\n')
}

function sqlBoolOrLiteral(value: string | number | boolean): string {
  if (typeof value === 'boolean') return sqlBool(value)
  return sqlLiteral(value as string)
}

export function attendanceSql(options: AttendanceGenerationOptions): string {
  const { aulas, frequencia, conteudos } = generateAttendance(options)

  const sessionRows: Array<Array<string | number | boolean | null>> = aulas.map(aula => [
    aula.id,
    aula.turmaId,
    aula.escolaId,
    aula.professorId,
    aula.disciplinaId,
    aula.dataAula,
    aula.abertaEm.slice(11, 16),
    aula.fechadaEm.slice(11, 16),
    aula.status,
    aula.abertaEm,
    aula.fechadaEm,
    aula.fechadaEm,
    'Chamada do sandbox',
    true,
    aula.createdAt,
    aula.createdAt,
  ])

  const frequenciaRows: Array<Array<string | number | boolean | null>> = frequencia.map(f => [
    f.id,
    f.matriculaId,
    f.aulaId,
    f.dataAula,
    f.presente,
    f.statusPresenca,
    f.justificativa,
    f.professorId,
    f.marcadoPor,
    f.marcadoEm,
    f.createdAt,
  ])

  const contentRows = conteudos.map(content => `(${[
    content.id,
    content.sessaoId,
    content.tema,
    content.objetivo,
    `ARRAY[${content.habilidadesBncc.map(sqlLiteral).join(',')}]::text[]`,
    content.metodologia,
    content.recursos,
    content.observacoes,
    content.createdBy,
    content.createdAt,
    content.createdAt,
  ].map((value) => value.startsWith('ARRAY[') ? value : sqlLiteral(value)).join(',')})`).join(',\n')

  return [
    '-- Generated by attendance-generator.ts (deterministic synthetic attendance)',
    `-- anchorDate: ${options.anchorDate} | schoolDays: ${options.schoolDays ?? DEMO_SCHOOL_DAYS}`,
    emitMultiRowInsert(
      'sessoes_aula',
      ['id', 'turma_id', 'escola_id', 'professor_id', 'disciplina_id', 'data_aula', 'inicio_aula', 'fim_aula', 'status', 'aberta_em', 'fechada_em', 'travada_em', 'conteudo_programatico', 'documento_oficial', 'created_at', 'updated_at'],
      sessionRows
    ),
    `INSERT INTO conteudo_aula (id,sessao_id,tema,objetivo,habilidades_bncc,metodologia,recursos,observacoes,created_by,created_at,updated_at) VALUES\n${contentRows};`,
    emitMultiRowInsert(
      'frequencia',
      ['id', 'matricula_id', 'sessao_id', 'data_aula', 'presente', 'status_presenca', 'justificativa', 'professor_id', 'marcado_por', 'marcado_em', 'created_at'],
      frequenciaRows
    ),
  ].join('\n')
}
