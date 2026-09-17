#!/usr/bin/env tsx
/**
 * Deterministic local-only fixtures for Playwright.
 *
 * Safety: refuses non-loopback Supabase URLs. Cleanup only targets records with
 * E2E-specific names and today's E2E attendance sessions.
 */
import { createClient } from '@supabase/supabase-js'
import { getTodaySaoPaulo } from '../lib/date-utils'
import type { Database, Tables, TablesInsert, TablesUpdate } from '../types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const PASSWORD = 'test123456'

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const assertLocal = () => {
  const host = new URL(SUPABASE_URL).hostname
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`Refusing E2E seed against non-local Supabase host: ${host}`)
  }
  if (!SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('E2E seed requires the local sb_secret service key')
  }
}

const ids = <T extends { id: string }>(rows: T[] | null | undefined) => (rows || []).map(row => row.id)

interface DatabaseError {
  message: string
}

interface QueryResult<T> {
  data: T | null
  error: DatabaseError | null
}

type SchoolSeed = Omit<TablesInsert<'escolas'>, 'municipio_id'> & TablesUpdate<'escolas'>
type GuardianSeed = TablesInsert<'responsaveis'> & TablesUpdate<'responsaveis'>
type ClassSeed = TablesInsert<'turmas'> & TablesUpdate<'turmas'>
type StudentSeed = TablesInsert<'alunos'> & TablesUpdate<'alunos'>
type EnrollmentSeed = TablesInsert<'matriculas'> & TablesUpdate<'matriculas'>
type VivenciaSeed = TablesInsert<'vivencias'> & TablesUpdate<'vivencias'>
type DisciplineSeed = TablesInsert<'disciplinas'> & TablesUpdate<'disciplinas'>
type SessionSeed = TablesInsert<'sessoes_aula'> & TablesUpdate<'sessoes_aula'>
type LessonContentSeed = TablesInsert<'conteudo_aula'> & TablesUpdate<'conteudo_aula'>

async function findEnrollmentIds(studentIds: string[], classIds: string[]): Promise<string[]> {
  if (studentIds.length > 0 && classIds.length > 0) {
    const { data } = await supabase
      .from('matriculas')
      .select('id')
      .or(`aluno_id.in.(${studentIds.join(',')}),turma_id.in.(${classIds.join(',')})`)
    return ids(data)
  }
  if (studentIds.length > 0) {
    return ids((await supabase.from('matriculas').select('id').in('aluno_id', studentIds)).data)
  }
  if (classIds.length > 0) {
    return ids((await supabase.from('matriculas').select('id').in('turma_id', classIds)).data)
  }
  return []
}

async function findSessionIds(classIds: string[]): Promise<string[]> {
  if (classIds.length === 0) return []
  return ids((await supabase.from('sessoes_aula').select('id').in('turma_id', classIds)).data)
}

async function findVivenciaIds(studentIds: string[], classIds: string[]): Promise<string[]> {
  if (studentIds.length > 0 && classIds.length > 0) {
    const { data } = await supabase
      .from('vivencias')
      .select('id')
      .or(`aluno_id.in.(${studentIds.join(',')}),turma_id.in.(${classIds.join(',')})`)
    return ids(data)
  }
  if (studentIds.length > 0) {
    return ids((await supabase.from('vivencias').select('id').in('aluno_id', studentIds)).data)
  }
  if (classIds.length > 0) {
    return ids((await supabase.from('vivencias').select('id').in('turma_id', classIds)).data)
  }
  return []
}

async function deleteEnrollmentDependencies(enrollmentIds: string[]): Promise<void> {
  if (enrollmentIds.length === 0) return
  await supabase.from('frequencia').delete().in('matricula_id', enrollmentIds)
  await supabase.from('notas').delete().in('matricula_id', enrollmentIds)
}

async function deleteSessionDependencies(sessionIds: string[]): Promise<void> {
  if (sessionIds.length === 0) return
  await supabase.from('frequencia').delete().in('sessao_id', sessionIds)
  await supabase.from('conteudo_aula').delete().in('sessao_id', sessionIds)
  await supabase.from('sessoes_aula').delete().in('id', sessionIds)
}

async function deleteVivenciaDependencies(vivenciaIds: string[]): Promise<void> {
  if (vivenciaIds.length === 0) return
  await supabase.from('relatorios_descritivos_vivencias').delete().in('vivencia_id', vivenciaIds)
  await supabase.from('vivencias').delete().in('id', vivenciaIds)
}

async function deleteDependentRows(studentIds: string[], classIds: string[]) {
  const enrollmentIds = await findEnrollmentIds(studentIds, classIds)
  const sessionIds = await findSessionIds(classIds)
  const vivenciaIds = await findVivenciaIds(studentIds, classIds)

  await deleteEnrollmentDependencies(enrollmentIds)
  await deleteSessionDependencies(sessionIds)
  await deleteVivenciaDependencies(vivenciaIds)
  if (enrollmentIds.length > 0) await supabase.from('matriculas').delete().in('id', enrollmentIds)
  if (studentIds.length > 0) {
    await supabase.from('aluno_responsaveis').delete().in('aluno_id', studentIds)
  }
}

async function cleanupGeneratedRecords() {
  const { data: generatedStudents } = await supabase
    .from('alunos')
    .select('id')
    .or([
      'nome_completo.like.E2E Test Student %',
      'nome_completo.like.E2E No CPF %',
      'nome_completo.like.Loading Test %',
      'nome_completo.like.E2E Enrollment %',
    ].join(','))
  const studentIds = ids(generatedStudents)
  await deleteDependentRows(studentIds, [])
  if (studentIds.length > 0) await supabase.from('alunos').delete().in('id', studentIds)

  const { data: generatedClasses } = await supabase
    .from('turmas')
    .select('id')
    .or([
      'nome.like.Turma E2E %',
      'nome.eq.1º Ano A E2E',
      'nome.eq.2º Ano B E2E',
      'nome.eq.Berçário A E2E',
      'nome.eq.Turma com Professor',
      'nome.eq.Turma com Observações',
      'nome.like.Loading Test %',
    ].join(','))
  const classIds = ids(generatedClasses)
  await deleteDependentRows([], classIds)
  if (classIds.length > 0) await supabase.from('turmas').delete().in('id', classIds)

  const { data: generatedGuardians } = await supabase
    .from('responsaveis')
    .select('id')
    .or([
      'nome.like.E2E Test Responsavel %',
      'nome.like.Complete Test %',
      'nome.eq.Duplicate CPF Test',
      'nome.like.Test Validation%',
      'nome.like.Test Phone%',
    ].join(','))
  const guardianIds = ids(generatedGuardians)
  if (guardianIds.length > 0) {
    await supabase.from('aluno_responsaveis').delete().in('responsavel_id', guardianIds)
    await supabase.from('responsaveis').delete().in('id', guardianIds)
  }

  const { data: generatedUsers } = await supabase
    .from('users')
    .select('id')
    .or('nome.like.Loading Test %,nome.like.Test User %,email.ilike.loading%@teste.com')
  const userIds = ids(generatedUsers)
  if (userIds.length > 0) await supabase.from('users').delete().in('id', userIds)

  const { data: generatedSchools } = await supabase
    .from('escolas')
    .select('id')
    .or('nome.like.E2E Test Escola %,nome.like.Escola Completa %,nome.like.Loading Test %')
  const schoolIds = ids(generatedSchools)
  if (schoolIds.length > 0) await supabase.from('escolas').delete().in('id', schoolIds)
}

async function ensureRow<Row extends { id: string }>(
  table: string,
  findRows: () => Promise<QueryResult<Row[]>>,
  updateRow: (id: string) => Promise<QueryResult<Row>>,
  insertRow: () => Promise<QueryResult<Row>>,
): Promise<Row> {
  const { data: rows, error: findError } = await findRows()
  if (findError) throw new Error(`${table} lookup failed: ${findError.message}`)
  const existing = rows?.[0]
  if (existing) {
    const { data, error } = await updateRow(existing.id)
    if (error) throw new Error(`${table} update failed: ${error.message}`)
    if (!data) throw new Error(`${table} update returned no row`)
    return data
  }
  const { data, error } = await insertRow()
  if (error) throw new Error(`${table} insert failed: ${error.message}`)
  if (!data) throw new Error(`${table} insert returned no row`)
  return data
}

async function ensureSchool(name: string, value: SchoolSeed): Promise<Tables<'escolas'>> {
  return ensureRow(
    'escolas',
    async () => supabase.from('escolas').select('*').eq('nome', name).limit(1),
    async id => supabase.from('escolas').update(value).eq('id', id).select().single(),
    async () => {
      const municipio_id = await getDefaultMunicipalityId()
      const insertValue: TablesInsert<'escolas'> = { ...value, municipio_id }
      return supabase.from('escolas').insert(insertValue).select().single()
    },
  )
}

async function ensureGuardian(cpf: string, value: GuardianSeed): Promise<Tables<'responsaveis'>> {
  return ensureRow(
    'responsaveis',
    async () => supabase.from('responsaveis').select('*').eq('cpf', cpf).limit(1),
    async id => supabase.from('responsaveis').update(value).eq('id', id).select().single(),
    async () => supabase.from('responsaveis').insert(value).select().single(),
  )
}

async function ensureClass(name: string, value: ClassSeed): Promise<Tables<'turmas'>> {
  return ensureRow(
    'turmas',
    async () => supabase.from('turmas').select('*').eq('nome', name).limit(1),
    async id => supabase.from('turmas').update(value).eq('id', id).select().single(),
    async () => supabase.from('turmas').insert(value).select().single(),
  )
}

async function ensureStudent(name: string, value: StudentSeed): Promise<Tables<'alunos'>> {
  return ensureRow(
    'alunos',
    async () => supabase.from('alunos').select('*').eq('nome_completo', name).limit(1),
    async id => supabase.from('alunos').update(value).eq('id', id).select().single(),
    async () => supabase.from('alunos').insert(value).select().single(),
  )
}

async function ensureEnrollment(
  studentId: string,
  academicYear: number,
  value: EnrollmentSeed,
): Promise<Tables<'matriculas'>> {
  return ensureRow(
    'matriculas',
    async () => supabase.from('matriculas').select('*')
      .eq('aluno_id', studentId).eq('ano_letivo', academicYear).limit(1),
    async id => supabase.from('matriculas').update(value).eq('id', id).select().single(),
    async () => supabase.from('matriculas').insert(value).select().single(),
  )
}

async function ensureVivencia(description: string, value: VivenciaSeed): Promise<Tables<'vivencias'>> {
  return ensureRow(
    'vivencias',
    async () => supabase.from('vivencias').select('*').eq('descricao', description).limit(1),
    async id => supabase.from('vivencias').update(value).eq('id', id).select().single(),
    async () => supabase.from('vivencias').insert(value).select().single(),
  )
}

async function ensureDiscipline(
  code: string,
  schoolId: string,
  value: DisciplineSeed,
): Promise<Tables<'disciplinas'>> {
  return ensureRow(
    'disciplinas',
    async () => supabase.from('disciplinas').select('*')
      .eq('codigo', code).eq('escola_id', schoolId).limit(1),
    async id => supabase.from('disciplinas').update(value).eq('id', id).select().single(),
    async () => supabase.from('disciplinas').insert(value).select().single(),
  )
}

async function ensureSession(
  classId: string,
  lessonDate: string,
  value: SessionSeed,
): Promise<Tables<'sessoes_aula'>> {
  return ensureRow(
    'sessoes_aula',
    async () => supabase.from('sessoes_aula').select('*')
      .eq('turma_id', classId).eq('data_aula', lessonDate).limit(1),
    async id => supabase.from('sessoes_aula').update(value).eq('id', id).select().single(),
    async () => supabase.from('sessoes_aula').insert(value).select().single(),
  )
}

async function ensureLessonContent(
  sessionId: string,
  value: LessonContentSeed,
): Promise<Tables<'conteudo_aula'>> {
  return ensureRow(
    'conteudo_aula',
    async () => supabase.from('conteudo_aula').select('*').eq('sessao_id', sessionId).limit(1),
    async id => supabase.from('conteudo_aula').update(value).eq('id', id).select().single(),
    async () => supabase.from('conteudo_aula').insert(value).select().single(),
  )
}

async function ensureAuthUser(email: string, role: string, name: string) {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  let user = list.users.find(candidate => candidate.email === email)
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { nome: name, tipo_usuario: role },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { nome: name, tipo_usuario: role },
    })
    if (error) throw error
    user = data.user
  }
  return user
}

type E2ERole = 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'

interface RoleFixture {
  email: string
  role: E2ERole
  name: string
  schoolId: string | null
}

function requireProfile(
  profiles: ReadonlyMap<E2ERole, Tables<'users'>>,
  role: E2ERole,
): Tables<'users'> {
  const profile = profiles.get(role)
  if (!profile) throw new Error(`Missing E2E profile for role: ${role}`)
  return profile
}

async function getDefaultMunicipalityId(): Promise<string> {
  const { data, error } = await supabase
    .from('pilot_municipality_config')
    .select('id')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .single()
  if (error) throw new Error(`municipality lookup failed: ${error.message}`)
  return data.id
}

async function seedAttendanceCutoff(schoolId: string) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey) throw new Error('E2E seed requires the local publishable key')
  const director = createClient<Database>(SUPABASE_URL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const login = await director.auth.signInWithPassword({ email: 'diretor@test.com', password: PASSWORD })
  if (login.error) throw login.error
  try {
    // Persist the same audited, same-day fixture policy used by the pilot seed.
    const result = await director.rpc('set_attendance_daily_cutoff', {
      p_school_id: schoolId, p_cutoff: '24:00:00',
    })
    if (result.error) throw result.error
  } finally {
    await director.auth.signOut()
  }
}

export async function seedE2E(): Promise<{ selectedSchoolId: string }> {
  assertLocal()
  await cleanupGeneratedRecords()

  const school1 = await ensureSchool('CEMEI Pequenos Passos', {
    nome: 'CEMEI Pequenos Passos', codigo: '00000001', tipo: 'creche',
    endereco: 'Rua A, 100 - Centro', telefone: '3435550001',
    email: 'escola1@municipio.edu.br', ativo: true,
  })
  const school2 = await ensureSchool('EMEI Jardim da Infância', {
    nome: 'EMEI Jardim da Infância', codigo: '00000002', tipo: 'pre_escola',
    endereco: 'Av. B, 200 - Vila Nova', telefone: '3435550002',
    email: 'escola2@municipio.edu.br', ativo: true,
  })
  await ensureSchool('EMEF Professor João Silva', {
    nome: 'EMEF Professor João Silva', codigo: '00000003', tipo: 'fundamental',
    endereco: 'Praça C, 300 - São José', telefone: '3435550003',
    email: 'escola3@municipio.edu.br', ativo: true,
  })

  const roleFixtures: RoleFixture[] = [
    { email: 'admin@test.com', role: 'admin', name: 'Admin Teste', schoolId: null },
    { email: 'diretor@test.com', role: 'diretor', name: 'Diretor Teste', schoolId: school1.id },
    { email: 'secretario@test.com', role: 'secretario', name: 'Secretario Teste', schoolId: school1.id },
    { email: 'professor@test.com', role: 'professor', name: 'Professor Teste', schoolId: school1.id },
    { email: 'responsavel@test.com', role: 'responsavel', name: 'Responsavel Teste', schoolId: school1.id },
  ]
  const profiles = new Map<E2ERole, Tables<'users'>>()
  for (const fixture of roleFixtures) {
    const authUser = await ensureAuthUser(fixture.email, fixture.role, fixture.name)
    const { data, error } = await supabase.from('users').upsert({
      id: authUser.id, email: fixture.email, nome: fixture.name, tipo_usuario: fixture.role,
      escola_id: fixture.schoolId, ativo: true, primeiro_login: false, senha_padrao: false,
    }, { onConflict: 'id' }).select().single()
    if (error) throw error
    profiles.set(fixture.role, data)
  }
  const director = requireProfile(profiles, 'diretor')
  const professor = requireProfile(profiles, 'professor')
  await supabase.from('escolas').update({ diretor_id: director.id }).eq('id', school1.id)
  await seedAttendanceCutoff(school1.id)

  const guardian = await ensureGuardian('98765432100', {
    escola_id: school1.id,
    nome: 'Jose da Silva E2E', cpf: '98765432100', telefone: '34999990001',
    email: 'jose.e2e@test.com', parentesco: 'pai', endereco: 'Rua A, 100',
    profissao: 'Agricultor', ativo: true, lgpd_consentimento: true,
    lgpd_data_consentimento: '2026-01-01T00:00:00Z',
  })
  await ensureGuardian('12345678909', {
    escola_id: school1.id,
    nome: 'Maria Oliveira E2E', cpf: '12345678909', telefone: '34999990002',
    email: 'maria.e2e@test.com', parentesco: 'mae', endereco: 'Rua B, 200',
    profissao: 'Professora', ativo: true, lgpd_consentimento: true,
    lgpd_data_consentimento: '2026-01-01T00:00:00Z',
  })

  const class1 = await ensureClass('1º Ano A E2E', {
    nome: '1º Ano A E2E', ano_letivo: 2026, serie: '1º Ano', capacidade: 30,
    turno: 'matutino', ativo: true, escola_id: school1.id, professor_id: professor.id,
  })
  const class2 = await ensureClass('2º Ano B E2E', {
    nome: '2º Ano B E2E', ano_letivo: 2026, serie: '2º Ano', capacidade: 25,
    turno: 'vespertino', ativo: true, escola_id: school1.id, professor_id: professor.id,
  })
  await ensureClass('Berçário A E2E', {
    nome: 'Berçário A E2E', ano_letivo: 2026, serie: 'Berçário', capacidade: 15,
    turno: 'integral', ativo: true, escola_id: school2.id, professor_id: professor.id,
  })

  // Each run starts with no attendance session for today. This makes the grid's
  // default-all-present state and Abrir Aula workflow deterministic.
  const today = getTodaySaoPaulo()
  const { data: todaySessions } = await supabase
    .from('sessoes_aula')
    .select('id')
    .in('turma_id', [class1.id, class2.id])
    .eq('data_aula', today)
  const todaySessionIds = ids(todaySessions)
  if (todaySessionIds.length > 0) {
    await supabase.from('frequencia').delete().in('sessao_id', todaySessionIds)
    await supabase.from('conteudo_aula').delete().in('sessao_id', todaySessionIds)
    await supabase.from('sessoes_aula').delete().in('id', todaySessionIds)
  }

  const studentFixtures = [
    ['Pedro Silva E2E', '2018-03-15', 'M', 'Rua A, 100', 'Ana Silva'],
    ['Julia Oliveira E2E', '2017-07-22', 'F', 'Rua B, 200', 'Maria Oliveira'],
    ['Lucas Santos E2E', '2016-11-08', 'M', 'Rua C, 300', 'Carmen Santos'],
    ['Ana Carolina E2E', '2018-05-12', 'F', 'Rua D, 400', 'Lucia Ferreira'],
    ['Gabriel Souza E2E', '2017-09-30', 'M', 'Rua E, 500', 'Patricia Souza'],
  ] as const
  const students: Tables<'alunos'>[] = []
  for (const [name, birthDate, sex, address, mother] of studentFixtures) {
    students.push(await ensureStudent(name, {
      nome_completo: name, data_nascimento: birthDate, sexo: sex,
      endereco: address, telefone: '34999990000', nome_mae: mother,
      nome_pai: 'Pai E2E', ativo: true, escola_id: school1.id, responsavel_id: guardian.id,
    }))
  }

  const enrollments: Tables<'matriculas'>[] = []
  for (let index = 0; index < students.length; index += 1) {
    const turma = index % 2 === 0 ? class1 : class2
    enrollments.push(await ensureEnrollment(students[index].id, 2026, {
      aluno_id: students[index].id, turma_id: turma.id, ano_letivo: 2026,
      situacao: 'ativa', data_matricula: '2026-02-02', observacoes: 'E2E seed data',
    }))
  }

  await ensureVivencia('Vivência E2E determinística de exploração corporal', {
    escola_id: school1.id,
    aluno_id: students[0].id,
    matricula_id: enrollments[0].id,
    turma_id: class1.id,
    professor_id: professor.id,
    data_vivencia: today,
    campos_experiencia: ['eu', 'corpo'],
    descricao: 'Vivência E2E determinística de exploração corporal',
    observacoes: 'Fixture sintético para prova de persistência.',
    escopo: 'individual',
    created_by: professor.id,
    updated_by: professor.id,
  })

  const mathDiscipline = await ensureDiscipline('MAT', school1.id, {
    codigo: 'MAT', nome: 'Matemática', escola_id: school1.id, ativa: true,
  })
  const portugueseDiscipline = await ensureDiscipline('PORT', school1.id, {
    codigo: 'PORT', nome: 'Português', escola_id: school1.id, ativa: true,
  })
  await ensureDiscipline('CIEN', school1.id, {
    codigo: 'CIEN', nome: 'Ciências', escola_id: school1.id, ativa: true,
  })

  // Stable current-month sessions and canonical content for content-report coverage.
  const lessonDate = `${today.slice(0, 7)}-15`
  const secondLessonDate = `${today.slice(0, 7)}-16`
  const mathSession = await ensureSession(class1.id, lessonDate, {
    turma_id: class1.id, escola_id: school1.id, professor_id: professor.id,
    disciplina_id: mathDiscipline.id,
    data_aula: lessonDate, inicio_aula: '08:00:00', fim_aula: '08:50:00',
    conteudo_programatico: 'Números e operações', objetivos_aprendizagem: 'Resolver situações de adição',
    metodologia: 'Aprendizagem baseada em problemas', recursos_utilizados: 'Material dourado',
    status: 'FECHADA',
  })
  const portugueseSession = await ensureSession(class1.id, secondLessonDate, {
    turma_id: class1.id, escola_id: school1.id, professor_id: professor.id,
    disciplina_id: portugueseDiscipline.id,
    data_aula: secondLessonDate, inicio_aula: '09:00:00', fim_aula: '09:50:00',
    conteudo_programatico: 'Leitura e interpretação', objetivos_aprendizagem: 'Localizar informações explícitas',
    metodologia: 'Leitura compartilhada', recursos_utilizados: 'Livro didático',
    status: 'FECHADA',
  })
  await ensureLessonContent(mathSession.id, {
    sessao_id: mathSession.id, tema: 'Adição com números naturais',
    objetivo: 'Resolver e elaborar problemas de adição', habilidades_bncc: ['EF01MA06'],
    metodologia: 'Resolução colaborativa de problemas', recursos: 'Material dourado e quadro',
    observacoes: 'Aula E2E determinística de Matemática', created_by: professor.id,
  })
  await ensureLessonContent(portugueseSession.id, {
    sessao_id: portugueseSession.id, tema: 'Leitura de textos informativos',
    objetivo: 'Localizar informações explícitas em textos curtos', habilidades_bncc: ['EF01LP02'],
    metodologia: 'Leitura compartilhada e conversa orientada', recursos: 'Livro didático e quadro',
    observacoes: 'Aula E2E determinística de Português', created_by: professor.id,
  })

  console.info('E2E seed ready: 5 roles, 3 schools, 3 classes, 5 students')
  return { selectedSchoolId: school1.id }
}

if (require.main === module) {
  seedE2E().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
