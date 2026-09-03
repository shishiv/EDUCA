import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthorizedStudentProfiles } from '@/lib/sensitive-family-access'
import { fuzzyCPFSearch, fuzzySearchBrazilianName, normalizeForFuzzy, similarityScore } from '@/lib/utils/fuzzy-search'
import type { PilotUserRole } from '@/lib/pilot/pilot-server-auth'
import type { Database } from '@/types/database'

export const globalSearchKinds = ['student', 'teacher', 'school', 'class'] as const

export type GlobalSearchKind = typeof globalSearchKinds[number]
export type GlobalSearchType = GlobalSearchKind | 'all'
export type GlobalSearchStatus = 'active' | 'inactive' | 'all'

export interface GlobalSearchActor {
  id: string
  role: PilotUserRole
  schoolId: string | null
}

export interface GlobalSearchOptions {
  query: string
  type: GlobalSearchType
  status: GlobalSearchStatus
  limit: number
  offset: number
}

type StudentData = {
  nome_completo: string
  escola: string | null
  turma: string | null
  serie: string | null
  turno: string | null
  cpf?: string | null
  endereco?: string | null
  telefone?: string | null
}

type TeacherData = {
  nome_completo: string
  email: string | null
  escola: string | null
}

type SchoolData = {
  nome: string
  codigo: string
}

type ClassData = {
  nome: string
  serie: string
  turno: string
  escola: string | null
  professor: string | null
}

export type GlobalSearchData = StudentData | TeacherData | SchoolData | ClassData

export interface GlobalSearchResult {
  id: string
  type: GlobalSearchKind
  data: GlobalSearchData
  title: string
  subtitle: string
  href: string
  relevanceScore: number
  matchedFields: string[]
  lastUpdated: string | null
  status: 'active' | 'inactive'
}

export interface GlobalSearchResponse {
  success: true
  results: GlobalSearchResult[]
  totalCount: number
  query: string
  type: GlobalSearchType
  fuzzySearch: true
}

type SearchClient = SupabaseClient<Database>
type SearchField = { name: string; value: string | null; kind?: 'name' | 'cpf' }
type StudentRow = {
  id: string
  nome_completo: string
  escola_id: string | null
  ativo: boolean | null
  created_at: string | null
  cpf?: string | null
  endereco?: string | null
  telefone?: string | null
}
type EnrollmentRow = Pick<Database['public']['Tables']['matriculas']['Row'], 'aluno_id' | 'turma_id' | 'situacao'>
type ClassRow = Pick<Database['public']['Tables']['turmas']['Row'], 'id' | 'nome' | 'serie' | 'turno' | 'escola_id' | 'professor_id' | 'ativo' | 'created_at'>
type TeacherRow = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'nome' | 'email' | 'escola_id' | 'ativo' | 'created_at'>
type SchoolRow = Pick<Database['public']['Tables']['escolas']['Row'], 'id' | 'nome' | 'codigo' | 'ativo'>

const canViewSensitiveFamily = (role: PilotUserRole) =>
  role === 'admin' || role === 'diretor' || role === 'secretario'

async function readStudents(
  client: SearchClient,
  actor: GlobalSearchActor,
  status: GlobalSearchStatus,
): Promise<StudentRow[]> {
  if (canViewSensitiveFamily(actor.role)) {
    const profiles = await getAuthorizedStudentProfiles(client, { schoolId: actor.schoolId ?? undefined })
    return profiles
      .filter(profile => !actor.schoolId || profile.escola_id === actor.schoolId)
      .filter(profile => status === 'all' || profile.ativo === (status === 'active'))
      .map(profile => ({
        id: profile.id,
        nome_completo: profile.nome_completo,
        escola_id: profile.escola_id,
        ativo: profile.ativo,
        created_at: profile.created_at,
        cpf: profile.cpf,
        endereco: profile.endereco,
        telefone: profile.telefone,
      }))
  }

  let query = client
    .from('alunos')
    .select('id,nome_completo,escola_id,ativo,created_at')

  if (status !== 'all') query = query.eq('ativo', status === 'active')
  if (actor.schoolId) query = query.eq('escola_id', actor.schoolId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function readTeachers(
  client: SearchClient,
  actor: GlobalSearchActor,
  status: GlobalSearchStatus,
): Promise<TeacherRow[]> {
  let query = client
    .from('users')
    .select('id,nome,email,escola_id,ativo,created_at')
    .eq('tipo_usuario', 'professor')

  if (status !== 'all') query = query.eq('ativo', status === 'active')
  if (actor.role === 'professor') {
    query = query.eq('id', actor.id)
  } else if (actor.schoolId) {
    query = query.eq('escola_id', actor.schoolId)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function readSchools(
  client: SearchClient,
  actor: GlobalSearchActor,
): Promise<SchoolRow[]> {
  let query = client
    .from('escolas')
    .select('id,nome,codigo,ativo')
    .eq('ativo', true)

  if (actor.schoolId) query = query.eq('id', actor.schoolId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function readClasses(
  client: SearchClient,
  actor: GlobalSearchActor,
  status: GlobalSearchStatus,
  ids?: string[],
): Promise<ClassRow[]> {
  if (ids && ids.length === 0) return []

  let query = client
    .from('turmas')
    .select('id,nome,serie,turno,escola_id,professor_id,ativo,created_at')

  if (status !== 'all') query = query.eq('ativo', status === 'active')
  if (ids) {
    query = query.in('id', ids)
  } else if (actor.role === 'professor') {
    query = query.eq('professor_id', actor.id)
  } else if (actor.schoolId) {
    query = query.eq('escola_id', actor.schoolId)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function readEnrollments(client: SearchClient, studentIds: string[]): Promise<EnrollmentRow[]> {
  if (studentIds.length === 0) return []

  const { data, error } = await client
    .from('matriculas')
    .select('aluno_id,turma_id,situacao')
    .in('aluno_id', studentIds)
    .eq('situacao', 'ativa')

  if (error) throw error
  return data ?? []
}

async function readTeacherNames(client: SearchClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()

  const { data, error } = await client
    .from('users')
    .select('id,nome')
    .in('id', ids)
    .eq('tipo_usuario', 'professor')

  if (error) throw error
  return new Map((data ?? []).map(teacher => [teacher.id, teacher.nome]))
}

function scoreField(query: string, field: SearchField) {
  if (!field.value) return 0
  const normalizedQuery = normalizeForFuzzy(query)
  const normalizedValue = normalizeForFuzzy(field.value)
  if (!normalizedValue) return 0
  if (field.kind === 'cpf' && fuzzyCPFSearch(query, field.value)) return normalizedValue === normalizedQuery ? 1 : 0.88
  if (normalizedValue === normalizedQuery) return 1
  if (normalizedValue.startsWith(normalizedQuery)) return 0.94
  if (normalizedValue.includes(normalizedQuery)) return 0.82
  if (field.kind === 'name' && fuzzySearchBrazilianName(query, field.value)) {
    return Math.max(0.55, similarityScore(query, field.value) * 0.8)
  }
  return 0
}

function createResult<T extends GlobalSearchData>(input: {
  id: string
  type: GlobalSearchKind
  data: T
  title: string
  subtitle: string
  href: string
  fields: SearchField[]
  lastUpdated: string | null
  status: boolean | null
  query: string
}): GlobalSearchResult | null {
  const scoredFields = input.fields
    .map(field => ({ name: field.name, score: scoreField(input.query, field) }))
    .filter(field => field.score > 0)

  if (scoredFields.length === 0) return null

  return {
    id: input.id,
    type: input.type,
    data: input.data,
    title: input.title,
    subtitle: input.subtitle,
    href: input.href,
    relevanceScore: Math.max(...scoredFields.map(field => field.score)),
    matchedFields: scoredFields.map(field => field.name),
    lastUpdated: input.lastUpdated,
    status: input.status ? 'active' : 'inactive',
  }
}

function compareResults(a: GlobalSearchResult, b: GlobalSearchResult) {
  return b.relevanceScore - a.relevanceScore ||
    normalizeForFuzzy(a.title).localeCompare(normalizeForFuzzy(b.title)) ||
    a.type.localeCompare(b.type) ||
    a.id.localeCompare(b.id)
}

function includesKind(type: GlobalSearchType, kind: GlobalSearchKind) {
  return type === 'all' || type === kind
}

type SearchContext = {
  query: string
  schoolNames: Map<string, string>
  classesById: Map<string, ClassRow>
  teacherNames: Map<string, string>
  enrollmentsByStudent: Map<string, EnrollmentRow[]>
  sensitive: boolean
}

function schoolNameFor(schoolNames: Map<string, string>, schoolId: string | null) {
  return schoolId ? schoolNames.get(schoolId) ?? null : null
}

function classForStudent(studentId: string, context: SearchContext) {
  return (context.enrollmentsByStudent.get(studentId) ?? [])
    .map(enrollment => context.classesById.get(enrollment.turma_id))
    .filter((classRow): classRow is ClassRow => Boolean(classRow))
    .sort((a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id))[0]
}

function buildStudentResults(students: StudentRow[], context: SearchContext) {
  return students.flatMap(student => {
    const turma = classForStudent(student.id, context)
    const schoolName = schoolNameFor(context.schoolNames, student.escola_id)
    const data: StudentData = {
      nome_completo: student.nome_completo,
      escola: schoolName,
      turma: turma?.nome ?? null,
      serie: turma?.serie ?? null,
      turno: turma?.turno ?? null,
      ...(context.sensitive ? {
        cpf: student.cpf ?? null,
        endereco: student.endereco ?? null,
        telefone: student.telefone ?? null,
      } : {}),
    }
    const result = createResult({
      id: student.id,
      type: 'student',
      data,
      title: student.nome_completo,
      subtitle: [schoolName, turma?.nome].filter(Boolean).join(' · '),
      href: `/dashboard/alunos/${student.id}`,
      fields: [
        { name: 'nome_completo', value: student.nome_completo, kind: 'name' },
        ...(context.sensitive ? [
          { name: 'cpf', value: student.cpf ?? null, kind: 'cpf' as const },
          { name: 'endereco', value: student.endereco ?? null },
          { name: 'telefone', value: student.telefone ?? null },
        ] : []),
      ],
      lastUpdated: student.created_at,
      status: student.ativo,
      query: context.query,
    })
    return result ? [result] : []
  })
}

function buildTeacherResults(teachers: TeacherRow[], context: SearchContext) {
  return teachers.flatMap(teacher => {
    const schoolName = schoolNameFor(context.schoolNames, teacher.escola_id)
    const data: TeacherData = {
      nome_completo: teacher.nome,
      email: teacher.email,
      escola: schoolName,
    }
    const result = createResult({
      id: teacher.id,
      type: 'teacher',
      data,
      title: teacher.nome,
      subtitle: [teacher.email, schoolName].filter(Boolean).join(' · '),
      href: `/dashboard/usuarios/${teacher.id}`,
      fields: [
        { name: 'nome', value: teacher.nome, kind: 'name' },
        { name: 'email', value: teacher.email },
      ],
      lastUpdated: teacher.created_at,
      status: teacher.ativo,
      query: context.query,
    })
    return result ? [result] : []
  })
}

function buildSchoolResults(schools: SchoolRow[], context: SearchContext) {
  return schools.flatMap(school => {
    const data: SchoolData = { nome: school.nome, codigo: school.codigo }
    const result = createResult({
      id: school.id,
      type: 'school',
      data,
      title: school.nome,
      subtitle: school.codigo,
      href: `/dashboard/escolas/${school.id}`,
      fields: [
        { name: 'nome', value: school.nome, kind: 'name' },
        { name: 'codigo', value: school.codigo },
      ],
      lastUpdated: null,
      status: school.ativo,
      query: context.query,
    })
    return result ? [result] : []
  })
}

function buildClassResults(classes: ClassRow[], context: SearchContext) {
  return classes.flatMap(turma => {
    const schoolName = schoolNameFor(context.schoolNames, turma.escola_id)
    const professorName = turma.professor_id ? context.teacherNames.get(turma.professor_id) ?? null : null
    const data: ClassData = {
      nome: turma.nome,
      serie: turma.serie,
      turno: turma.turno,
      escola: schoolName,
      professor: professorName,
    }
    const result = createResult({
      id: turma.id,
      type: 'class',
      data,
      title: turma.nome,
      subtitle: [turma.serie, schoolName].filter(Boolean).join(' · '),
      href: `/dashboard/turmas/${turma.id}`,
      fields: [
        { name: 'nome', value: turma.nome, kind: 'name' },
        { name: 'serie', value: turma.serie },
        { name: 'escola', value: schoolName },
        { name: 'professor', value: professorName, kind: 'name' },
      ],
      lastUpdated: turma.created_at,
      status: turma.ativo,
      query: context.query,
    })
    return result ? [result] : []
  })
}

async function buildTeacherNames(
  client: SearchClient,
  classRows: ClassRow[],
  teacherRows: TeacherRow[],
) {
  const teacherIds = Array.from(new Set(classRows
    .map(turma => turma.professor_id)
    .filter((id): id is string => Boolean(id))))
  const names = new Map(teacherRows.map(teacher => [teacher.id, teacher.nome]))
  const missingIds = teacherIds.filter(id => !names.has(id))
  if (missingIds.length === 0) return names
  for (const [id, name] of await readTeacherNames(client, missingIds)) names.set(id, name)
  return names
}

async function readStudentContext(
  client: SearchClient,
  actor: GlobalSearchActor,
  status: GlobalSearchStatus,
  students: StudentRow[],
  classRows: ClassRow[],
) {
  const enrollments = await readEnrollments(client, students.map(student => student.id))
  const classIds = Array.from(new Set(enrollments.map(enrollment => enrollment.turma_id)))
  const studentClasses = classRows.length > 0 || classIds.length === 0
    ? []
    : await readClasses(client, actor, status, classIds)
  const classesById = new Map([...classRows, ...studentClasses].map(turma => [turma.id, turma]))
  const enrollmentsByStudent = new Map<string, EnrollmentRow[]>()
  for (const enrollment of enrollments) {
    const rows = enrollmentsByStudent.get(enrollment.aluno_id) ?? []
    rows.push(enrollment)
    enrollmentsByStudent.set(enrollment.aluno_id, rows)
  }
  return { classesById, enrollmentsByStudent }
}

function buildResults(
  type: GlobalSearchType,
  students: StudentRow[],
  teachers: TeacherRow[],
  schools: SchoolRow[],
  classes: ClassRow[],
  context: SearchContext,
) {
  return [
    ...(includesKind(type, 'student') ? buildStudentResults(students, context) : []),
    ...(includesKind(type, 'teacher') ? buildTeacherResults(teachers, context) : []),
    ...(includesKind(type, 'school') ? buildSchoolResults(schools, context) : []),
    ...(includesKind(type, 'class') ? buildClassResults(classes, context) : []),
  ]
}

export async function searchGlobal(
  client: SearchClient,
  actor: GlobalSearchActor,
  options: GlobalSearchOptions,
): Promise<GlobalSearchResponse> {
  const query = options.query.trim()
  if (query.length < 2) {
    return {
      success: true,
      results: [],
      totalCount: 0,
      query,
      type: options.type,
      fuzzySearch: true,
    }
  }

  const schoolRows = await readSchools(client, actor)
  const schoolNames = new Map(schoolRows.map(school => [school.id, school.nome]))
  const studentRows = includesKind(options.type, 'student')
    ? await readStudents(client, actor, options.status)
    : []
  const teacherRows = includesKind(options.type, 'teacher')
    ? await readTeachers(client, actor, options.status)
    : []
  const classRows = includesKind(options.type, 'class')
    ? await readClasses(client, actor, options.status)
    : []
  const studentContext = studentRows.length > 0
    ? await readStudentContext(client, actor, options.status, studentRows, classRows)
    : { classesById: new Map<string, ClassRow>(), enrollmentsByStudent: new Map<string, EnrollmentRow[]>() }
  const context: SearchContext = {
    query,
    schoolNames,
    classesById: studentContext.classesById,
    teacherNames: await buildTeacherNames(client, classRows, teacherRows),
    enrollmentsByStudent: studentContext.enrollmentsByStudent,
    sensitive: canViewSensitiveFamily(actor.role),
  }
  const results = buildResults(options.type, studentRows, teacherRows, schoolRows, classRows, context)
  results.sort(compareResults)
  return {
    success: true,
    results: results.slice(options.offset, options.offset + options.limit),
    totalCount: results.length,
    query,
    type: options.type,
    fuzzySearch: true,
  }
}
