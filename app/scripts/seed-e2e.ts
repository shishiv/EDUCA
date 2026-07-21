#!/usr/bin/env tsx
/**
 * Deterministic local-only fixtures for Playwright.
 *
 * Safety: refuses non-loopback Supabase URLs. Cleanup only targets records with
 * E2E-specific names and today's E2E attendance sessions.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const PASSWORD = 'test123456'

const supabase = createClient<any>(SUPABASE_URL, SERVICE_KEY, {
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

async function deleteDependentRows(studentIds: string[], classIds: string[]) {
  let enrollmentIds: string[] = []
  if (studentIds.length > 0 || classIds.length > 0) {
    let query = supabase.from('matriculas').select('id')
    if (studentIds.length > 0 && classIds.length > 0) {
      query = query.or(`aluno_id.in.(${studentIds.join(',')}),turma_id.in.(${classIds.join(',')})`)
    } else if (studentIds.length > 0) {
      query = query.in('aluno_id', studentIds)
    } else {
      query = query.in('turma_id', classIds)
    }
    enrollmentIds = ids((await query).data)
  }

  const sessionIds = classIds.length > 0
    ? ids((await supabase.from('sessoes_aula').select('id').in('turma_id', classIds)).data)
    : []

  if (enrollmentIds.length > 0) {
    await supabase.from('frequencia').delete().in('matricula_id', enrollmentIds)
    await supabase.from('notas').delete().in('matricula_id', enrollmentIds)
  }
  if (sessionIds.length > 0) {
    await supabase.from('frequencia').delete().in('sessao_id', sessionIds)
    await supabase.from('conteudo_aula').delete().in('sessao_id', sessionIds)
    await supabase.from('sessoes_aula').delete().in('id', sessionIds)
  }
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

async function ensureRow(
  table: string,
  match: Record<string, string | number>,
  value: Record<string, unknown>
) {
  let query = supabase.from(table).select('*')
  for (const [column, expected] of Object.entries(match)) query = query.eq(column, expected)
  const existing = (await query.limit(1)).data?.[0]
  if (existing) {
    const { data, error } = await supabase.from(table).update(value).eq('id', existing.id).select().single()
    if (error) throw new Error(`${table} update failed: ${error.message}`)
    return data
  }
  const { data, error } = await supabase.from(table).insert(value).select().single()
  if (error) throw new Error(`${table} insert failed: ${error.message}`)
  return data
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

export async function seedE2E() {
  assertLocal()
  await cleanupGeneratedRecords()

  const school1 = await ensureRow('escolas', { nome: 'CEMEI Pequenos Passos' }, {
    nome: 'CEMEI Pequenos Passos', codigo: '00000001', tipo: 'creche',
    endereco: 'Rua A, 100 - Centro', telefone: '3435550001',
    email: 'escola1@municipio.edu.br', ativo: true,
  })
  const school2 = await ensureRow('escolas', { nome: 'EMEI Jardim da Infância' }, {
    nome: 'EMEI Jardim da Infância', codigo: '00000002', tipo: 'pre_escola',
    endereco: 'Av. B, 200 - Vila Nova', telefone: '3435550002',
    email: 'escola2@municipio.edu.br', ativo: true,
  })
  await ensureRow('escolas', { nome: 'EMEF Professor João Silva' }, {
    nome: 'EMEF Professor João Silva', codigo: '00000003', tipo: 'fundamental',
    endereco: 'Praça C, 300 - São José', telefone: '3435550003',
    email: 'escola3@municipio.edu.br', ativo: true,
  })

  const roleFixtures = [
    ['admin@test.com', 'admin', 'Admin Teste', null],
    ['diretor@test.com', 'diretor', 'Diretor Teste', school1.id],
    ['secretario@test.com', 'secretario', 'Secretario Teste', school1.id],
    ['professor@test.com', 'professor', 'Professor Teste', school1.id],
    ['responsavel@test.com', 'responsavel', 'Responsavel Teste', school1.id],
  ] as const
  const profiles = new Map<string, any>()
  for (const [email, role, name, schoolId] of roleFixtures) {
    const authUser = await ensureAuthUser(email, role, name)
    const { data, error } = await supabase.from('users').upsert({
      id: authUser.id, email, nome: name, tipo_usuario: role,
      escola_id: schoolId, ativo: true, primeiro_login: false, senha_padrao: false,
    }, { onConflict: 'id' }).select().single()
    if (error) throw error
    profiles.set(role, data)
  }
  await supabase.from('escolas').update({ diretor_id: profiles.get('diretor').id }).eq('id', school1.id)

  const guardian = await ensureRow('responsaveis', { cpf: '98765432100' }, {
    nome: 'Jose da Silva E2E', cpf: '98765432100', telefone: '34999990001',
    email: 'jose.e2e@test.com', parentesco: 'pai', endereco: 'Rua A, 100',
    profissao: 'Agricultor', ativo: true, lgpd_consentimento: true,
    lgpd_data_consentimento: '2026-01-01T00:00:00Z',
  })
  await ensureRow('responsaveis', { cpf: '12345678909' }, {
    nome: 'Maria Oliveira E2E', cpf: '12345678909', telefone: '34999990002',
    email: 'maria.e2e@test.com', parentesco: 'mae', endereco: 'Rua B, 200',
    profissao: 'Professora', ativo: true, lgpd_consentimento: true,
    lgpd_data_consentimento: '2026-01-01T00:00:00Z',
  })

  const class1 = await ensureRow('turmas', { nome: '1º Ano A E2E' }, {
    nome: '1º Ano A E2E', ano_letivo: 2026, serie: '1º Ano', capacidade: 30,
    turno: 'matutino', ativo: true, escola_id: school1.id, professor_id: profiles.get('professor').id,
  })
  const class2 = await ensureRow('turmas', { nome: '2º Ano B E2E' }, {
    nome: '2º Ano B E2E', ano_letivo: 2026, serie: '2º Ano', capacidade: 25,
    turno: 'vespertino', ativo: true, escola_id: school1.id, professor_id: profiles.get('professor').id,
  })
  await ensureRow('turmas', { nome: 'Berçário A E2E' }, {
    nome: 'Berçário A E2E', ano_letivo: 2026, serie: 'Berçário', capacidade: 15,
    turno: 'integral', ativo: true, escola_id: school2.id, professor_id: profiles.get('professor').id,
  })

  // Each run starts with no attendance session for today. This makes the grid's
  // default-all-present state and Abrir Aula workflow deterministic.
  const today = new Date().toISOString().slice(0, 10)
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
  const students: any[] = []
  for (const [name, birthDate, sex, address, mother] of studentFixtures) {
    students.push(await ensureRow('alunos', { nome_completo: name }, {
      nome_completo: name, data_nascimento: birthDate, sexo: sex,
      endereco: address, telefone: '34999990000', nome_mae: mother,
      nome_pai: 'Pai E2E', ativo: true, responsavel_id: guardian.id,
    }))
  }

  for (let index = 0; index < students.length; index += 1) {
    const turma = index % 2 === 0 ? class1 : class2
    await ensureRow('matriculas', { aluno_id: students[index].id, ano_letivo: 2026 }, {
      aluno_id: students[index].id, turma_id: turma.id, ano_letivo: 2026,
      situacao: 'ativa', data_matricula: '2026-02-02', observacoes: 'E2E seed data',
    })
  }

  for (const [code, name] of [['MAT', 'Matemática'], ['PORT', 'Português'], ['CIEN', 'Ciências']]) {
    await ensureRow('disciplinas', { codigo: code, escola_id: school1.id }, {
      codigo: code, nome: name, escola_id: school1.id, ativa: true,
    })
  }

  // Stable current-month lesson for content-report coverage.
  const lessonDate = '2026-07-15'
  const session = await ensureRow('sessoes_aula', { turma_id: class1.id, data_aula: lessonDate }, {
    turma_id: class1.id, escola_id: school1.id, professor_id: profiles.get('professor').id,
    data_aula: lessonDate, inicio_aula: '08:00:00', fim_aula: '08:50:00',
    conteudo_programatico: 'Números e operações', objetivos_aprendizagem: 'Resolver situações de adição',
    metodologia: 'Aprendizagem baseada em problemas', recursos_utilizados: 'Material dourado',
    status: 'fechada',
  })
  await ensureRow('conteudo_aula', { sessao_id: session.id }, {
    sessao_id: session.id, tema: 'Adição com números naturais',
    objetivo: 'Resolver e elaborar problemas de adição', habilidades_bncc: ['EF01MA06'],
    metodologia: 'Resolução colaborativa de problemas', recursos: 'Material dourado e quadro',
    observacoes: 'Aula E2E determinística', created_by: profiles.get('professor').id,
  })

  console.log('E2E seed ready: 5 roles, 3 schools, 3 classes, 5 students')
}

if (require.main === module) {
  seedE2E().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
