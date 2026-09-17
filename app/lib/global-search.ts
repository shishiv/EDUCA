import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthorizedStudentProfiles } from '@/lib/sensitive-family-access'
import { fuzzyCPFSearch, fuzzySearchBrazilianName, normalizeForFuzzy, similarityScore } from '@/lib/utils/fuzzy-search'
import type { PilotUserRole } from '@/lib/pilot/pilot-server-auth'
import type { Database } from '@/types/database'
import { canAccessRoute } from '@/lib/route-policy'

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

type SearchField = { name: string; value: string | null; kind?: 'name' | 'cpf' }
export type GlobalSearchStudentRow = {
  id: string
  nome_completo: string
  escola_id: string | null
  ativo: boolean | null
  created_at: string | null
  cpf?: string | null
  endereco?: string | null
  telefone?: string | null
}
export type GlobalSearchEnrollmentRow = Pick<Database['public']['Tables']['matriculas']['Row'], 'aluno_id' | 'turma_id' | 'situacao'>
export type GlobalSearchClassRow = Pick<Database['public']['Tables']['turmas']['Row'], 'id' | 'nome' | 'serie' | 'turno' | 'escola_id' | 'professor_id' | 'ativo' | 'created_at'>
export type GlobalSearchTeacherRow = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'nome' | 'email' | 'escola_id' | 'ativo' | 'created_at'>
export type GlobalSearchSchoolRow = Pick<Database['public']['Tables']['escolas']['Row'], 'id' | 'nome' | 'codigo' | 'ativo'>

export interface GlobalSearchStore {
  readStudents(actor: GlobalSearchActor, status: GlobalSearchStatus): Promise<GlobalSearchStudentRow[]>
  readTeachers(actor: GlobalSearchActor, status: GlobalSearchStatus): Promise<GlobalSearchTeacherRow[]>
  readSchools(actor: GlobalSearchActor): Promise<GlobalSearchSchoolRow[]>
  readClasses(actor: GlobalSearchActor, status: GlobalSearchStatus, ids?: string[]): Promise<GlobalSearchClassRow[]>
  readEnrollments(studentIds: string[]): Promise<GlobalSearchEnrollmentRow[]>
  readTeacherNames(ids: string[]): Promise<Map<string, string>>
}

type SearchClient = SupabaseClient<Database>
type StudentRow = GlobalSearchStudentRow
type EnrollmentRow = GlobalSearchEnrollmentRow
type ClassRow = GlobalSearchClassRow
type TeacherRow = GlobalSearchTeacherRow
type SchoolRow = GlobalSearchSchoolRow

const canViewSensitiveFamily = (role: PilotUserRole) =>
  role === 'admin' || role === 'diretor' || role === 'secretario'

async function readSupabaseStudents(
  client: SearchClient,
  actor: GlobalSearchActor,
  status: GlobalSearchStatus,
  getAuthorizedProfiles: (filters: { schoolId?: string }) => Promise<StudentRow[]>,
): Promise<StudentRow[]> {
  if (canViewSensitiveFamily(actor.role)) {
    const profiles = await getAuthorizedProfiles({ schoolId: actor.schoolId ?? undefined })
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

async function readSupabaseTeachers(
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

async function readSupabaseSchools(
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

async function readSupabaseClasses(
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

async function readSupabaseEnrollments(client: SearchClient, studentIds: string[]): Promise<EnrollmentRow[]> {
  if (studentIds.length === 0) return []

  const { data, error } = await client
    .from('matriculas')
    .select('aluno_id,turma_id,situacao')
    .in('aluno_id', studentIds)
    .eq('situacao', 'ativa')

  if (error) throw error
  return data ?? []
}

async function readSupabaseTeacherNames(client: SearchClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()

  const { data, error } = await client
    .from('users')
    .select('id,nome')
    .in('id', ids)
    .eq('tipo_usuario', 'professor')

  if (error) throw error
  return new Map((data ?? []).map(teacher => [teacher.id, teacher.nome]))
}

/** Builds the production search adapter over the typed Supabase client. */
export function createSupabaseGlobalSearchStore(client: SearchClient): GlobalSearchStore {
  return {
    async readStudents(actor, status) {
      return readSupabaseStudents(
        client,
        actor,
        status,
        filters => getAuthorizedStudentProfiles(client, filters),
      )
    },
    async readTeachers(actor, status) {
      return readSupabaseTeachers(client, actor, status)
    },
    async readSchools(actor) {
      return readSupabaseSchools(client, actor)
    },
    async readClasses(actor, status, ids) {
      return readSupabaseClasses(client, actor, status, ids)
    },
    async readEnrollments(studentIds) {
      return readSupabaseEnrollments(client, studentIds)
    },
    async readTeacherNames(ids) {
      return readSupabaseTeacherNames(client, ids)
    },
  }
}

function scoreField(query: string, field: SearchField) {
  if (!field.value) return 0
  const normalizedQuery = normalizeForFuzzy(query)
  const normalizedValue = normalizeForFuzzy(field.value)
  if (!normalizedValue) return 0
  if (field.kind === 'cpf') return scoreCpfField(query, field.value, normalizedQuery, normalizedValue)
  return scoreTextField(query, field.value, field.kind, normalizedQuery, normalizedValue)
}

function scoreCpfField(query: string, value: string, normalizedQuery: string, normalizedValue: string) {
  if (!fuzzyCPFSearch(query, value)) return 0
  return normalizedValue === normalizedQuery ? 1 : 0.88
}

function scoreTextField(
  query: string,
  value: string,
  kind: SearchField['kind'],
  normalizedQuery: string,
  normalizedValue: string,
) {
  if (normalizedValue === normalizedQuery) return 1
  if (normalizedValue.startsWith(normalizedQuery)) return 0.94
  if (normalizedValue.includes(normalizedQuery)) return 0.82
  return scoreBrazilianName(query, value, kind)
}

function scoreBrazilianName(query: string, value: string, kind: SearchField['kind']) {
  if (kind !== 'name' || !fuzzySearchBrazilianName(query, value)) return 0
  return Math.max(0.55, similarityScore(query, value) * 0.8)
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
  return students.flatMap(student => buildStudentResult(student, context))
}

function buildStudentResult(student: StudentRow, context: SearchContext): GlobalSearchResult[] {
    const turma = classForStudent(student.id, context)
    const schoolName = schoolNameFor(context.schoolNames, student.escola_id)
    const data = studentData(student, schoolName, turma, context.sensitive)
    const result = createResult({
      id: student.id,
      type: 'student',
      data,
      title: student.nome_completo,
      subtitle: [schoolName, turma?.nome].filter(Boolean).join(' · '),
      href: `/dashboard/alunos/${student.id}`,
      fields: studentFields(student, context.sensitive),
      lastUpdated: student.created_at,
      status: student.ativo,
      query: context.query,
    })
    return result ? [result] : []
}

function studentData(student: StudentRow, schoolName: string | null, turma: ClassRow | undefined, sensitive: boolean): StudentData {
  const data: StudentData = { nome_completo: student.nome_completo, escola: schoolName, turma: turma?.nome ?? null, serie: turma?.serie ?? null, turno: turma?.turno ?? null }
  if (sensitive) addSensitiveStudentData(data, student)
  return data
}

function addSensitiveStudentData(data: StudentData, student: StudentRow): void {
  data.cpf = student.cpf ?? null
  data.endereco = student.endereco ?? null
  data.telefone = student.telefone ?? null
}

function studentFields(student: StudentRow, sensitive: boolean): SearchField[] {
  const fields: SearchField[] = [{ name: 'nome_completo', value: student.nome_completo, kind: 'name' }]
  if (sensitive) fields.push({ name: 'cpf', value: student.cpf ?? null, kind: 'cpf' }, { name: 'endereco', value: student.endereco ?? null }, { name: 'telefone', value: student.telefone ?? null })
  return fields
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
  store: GlobalSearchStore,
  classRows: ClassRow[],
  teacherRows: TeacherRow[],
) {
  const teacherIds = Array.from(new Set(classRows
    .map(turma => turma.professor_id)
    .filter((id): id is string => Boolean(id))))
  const names = new Map(teacherRows.map(teacher => [teacher.id, teacher.nome]))
  const missingIds = teacherIds.filter(id => !names.has(id))
  if (missingIds.length === 0) return names
  for (const [id, name] of await store.readTeacherNames(missingIds)) names.set(id, name)
  return names
}

async function readStudentContext(
  store: GlobalSearchStore,
  actor: GlobalSearchActor,
  status: GlobalSearchStatus,
  students: StudentRow[],
  classRows: ClassRow[],
) {
  const enrollments = await store.readEnrollments(students.map(student => student.id))
  const classIds = Array.from(new Set(enrollments.map(enrollment => enrollment.turma_id)))
  const studentClasses = classRows.length > 0 || classIds.length === 0
    ? []
    : await store.readClasses(actor, status, classIds)
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

function resultsReachableByRole(results: GlobalSearchResult[], role: PilotUserRole): GlobalSearchResult[] {
  return results.filter(result => canAccessRoute(result.href, role))
}

type SearchRows = {
  schools: SchoolRow[]
  students: StudentRow[]
  teachers: TeacherRow[]
  classes: ClassRow[]
}

async function readSearchRows(
  store: GlobalSearchStore,
  actor: GlobalSearchActor,
  options: GlobalSearchOptions,
): Promise<SearchRows> {
  const schools = await store.readSchools(actor)
  const students = includesKind(options.type, 'student')
    ? await store.readStudents(actor, options.status)
    : []
  const teachers = includesKind(options.type, 'teacher')
    ? await store.readTeachers(actor, options.status)
    : []
  const classes = includesKind(options.type, 'class')
    ? await store.readClasses(actor, options.status)
    : []
  return { schools, students, teachers, classes }
}

async function createSearchContext(
  store: GlobalSearchStore,
  actor: GlobalSearchActor,
  options: GlobalSearchOptions,
  query: string,
  rows: SearchRows,
): Promise<SearchContext> {
  const studentContext = rows.students.length > 0
    ? await readStudentContext(store, actor, options.status, rows.students, rows.classes)
    : { classesById: new Map<string, ClassRow>(), enrollmentsByStudent: new Map<string, EnrollmentRow[]>() }
  return {
    query,
    schoolNames: new Map(rows.schools.map(school => [school.id, school.nome])),
    classesById: studentContext.classesById,
    teacherNames: await buildTeacherNames(store, rows.classes, rows.teachers),
    enrollmentsByStudent: studentContext.enrollmentsByStudent,
    sensitive: canViewSensitiveFamily(actor.role),
  }
}

export async function searchGlobal(
  store: GlobalSearchStore,
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

  const rows = await readSearchRows(store, actor, options)
  const context = await createSearchContext(store, actor, options, query, rows)
  const results = resultsReachableByRole(
    buildResults(options.type, rows.students, rows.teachers, rows.schools, rows.classes, context),
    actor.role,
  )
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
