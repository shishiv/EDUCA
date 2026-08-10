#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import { assertSyntheticPilotSafety } from '../lib/pilot/pilot-safety-gate'

assertSyntheticPilotSafety('seed')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const service = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const password = 'Synthetic-Only-2026!'
const schoolA = '10000000-0000-0000-0000-000000000001'
const schoolB = '10000000-0000-0000-0000-000000000002'
const classA = '30000000-0000-0000-0000-000000000001'
const classB = '30000000-0000-0000-0000-000000000002'

const accounts = [
  { email: 'secretaria@synthetic.invalid', name: 'Secretaria Sintetica', role: 'secretario', schoolId: null },
  { email: 'diretora.a@synthetic.invalid', name: 'Diretora Sintetica A', role: 'diretor', schoolId: schoolA },
  { email: 'professora.a@synthetic.invalid', name: 'Professora Sintetica A', role: 'professor', schoolId: schoolA },
  { email: 'diretora.b@synthetic.invalid', name: 'Diretora Sintetica B', role: 'diretor', schoolId: schoolB },
] as const

async function createSyntheticAuthUser(account: typeof accounts[number]): Promise<string> {
  const { data, error } = await service.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    user_metadata: { synthetic: true, pilot_role: account.role },
  })
  if (error || !data.user) throw error || new Error(`SYNTHETIC_SEED_AUTH_FAILED: ${account.email}`)
  return data.user.id
}

async function seed() {
  const { error: schoolsError } = await service.from('escolas').upsert([
    { id: schoolA, codigo: 'SYN-A', nome: 'Escola Sintetica A', tipo: 'fundamental', ativo: true },
    { id: schoolB, codigo: 'SYN-B', nome: 'Escola Sintetica B', tipo: 'fundamental', ativo: true },
  ], { onConflict: 'id' })
  if (schoolsError) throw schoolsError

  const accountIds = new Map<string, string>()
  for (const account of accounts) accountIds.set(account.email, await createSyntheticAuthUser(account))
  const { error: profilesError } = await service.from('users').upsert(accounts.map(account => ({
    id: accountIds.get(account.email)!, nome: account.name, email: account.email,
    tipo_usuario: account.role, escola_id: account.schoolId, ativo: true, primeiro_login: false, senha_padrao: false,
  })), { onConflict: 'id' })
  if (profilesError) throw profilesError

  const professorA = accountIds.get('professora.a@synthetic.invalid')!
  const { error: classesError } = await service.from('turmas').upsert([
    { id: classA, import_source_id: 'CLASS-A', nome: 'Turma Sintetica A', serie: '1 ano', turno: 'matutino', ano_letivo: 2026, escola_id: schoolA, professor_id: professorA, ativo: true },
    { id: classB, import_source_id: 'CLASS-B', nome: 'Turma Sintetica B', serie: '1 ano', turno: 'vespertino', ano_letivo: 2026, escola_id: schoolB, professor_id: null, ativo: true },
  ], { onConflict: 'id' })
  if (classesError) throw classesError

  const guardianA = '60000000-0000-0000-0000-000000000001'
  const guardianB = '60000000-0000-0000-0000-000000000002'
  const studentA = '40000000-0000-0000-0000-000000000001'
  const studentB = '40000000-0000-0000-0000-000000000002'
  const { error: guardiansError } = await service.from('responsaveis').upsert([
    { id: guardianA, escola_id: schoolA, import_source_id: 'guardian:seed-a', nome: 'Responsavel Sintetico A', parentesco: 'mae', telefone: '(11) 99999-0001', ativo: true },
    { id: guardianB, escola_id: schoolB, import_source_id: 'guardian:seed-b', nome: 'Responsavel Sintetico B', parentesco: 'pai', telefone: '(11) 99999-0002', ativo: true },
  ], { onConflict: 'id' })
  if (guardiansError) throw guardiansError
  const { error: studentsError } = await service.from('alunos').upsert([
    { id: studentA, escola_id: schoolA, import_source_id: 'seed-a', nome_completo: 'Aluno Sintetico A', data_nascimento: '2018-01-10', sexo: 'M', responsavel_id: guardianA, ativo: true },
    { id: studentB, escola_id: schoolB, import_source_id: 'seed-b', nome_completo: 'Aluna Sintetica B', data_nascimento: '2018-02-10', sexo: 'F', responsavel_id: guardianB, ativo: true },
  ], { onConflict: 'id' })
  if (studentsError) throw studentsError
  const { error: linksError } = await service.from('aluno_responsaveis').upsert([
    { aluno_id: studentA, responsavel_id: guardianA, tipo_responsabilidade: 'mae' },
    { aluno_id: studentB, responsavel_id: guardianB, tipo_responsabilidade: 'pai' },
  ], { onConflict: 'aluno_id,responsavel_id' })
  if (linksError) throw linksError
  const { error: enrollmentsError } = await service.from('matriculas').upsert([
    { id: '50000000-0000-0000-0000-000000000001', aluno_id: studentA, turma_id: classA, ano_letivo: 2026, situacao: 'ativa', observacoes: 'synthetic seed' },
    { id: '50000000-0000-0000-0000-000000000002', aluno_id: studentB, turma_id: classB, ano_letivo: 2026, situacao: 'ativa', observacoes: 'synthetic seed' },
  ], { onConflict: 'id' })
  if (enrollmentsError) throw enrollmentsError

  const sessionId = '70000000-0000-0000-0000-000000000010'
  const { error: sessionError } = await service.from('sessoes_aula').upsert({
    id: sessionId,
    turma_id: classA,
    escola_id: schoolA,
    professor_id: professorA,
    data_aula: '2026-08-10',
    status: 'ABERTA',
    conteudo_programatico: 'Chamada sintética do piloto',
    aberta_em: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (sessionError) throw sessionError

  const { error: attendanceError } = await service.from('frequencia').upsert({
    id: '70000000-0000-0000-0000-000000000001',
    matricula_id: '50000000-0000-0000-0000-000000000001',
    sessao_id: sessionId,
    data_aula: '2026-08-10',
    presente: true,
    status_presenca: 'P',
    professor_id: professorA,
    marcado_por: professorA,
    marcado_em: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (attendanceError) throw attendanceError

  const secretariatId = accountIds.get('secretaria@synthetic.invalid')!
  const { error: metricsError } = await service.from('pilot_metric_events').insert([
    { escola_id: schoolA, actor_user_id: secretariatId, event_name: 'weekly_school_active', metric_value: 1, dimensions: { synthetic: true } },
    { escola_id: schoolA, actor_user_id: secretariatId, event_name: 'expected_attendance', metric_value: 1, dimensions: { synthetic: true } },
    { escola_id: schoolA, actor_user_id: secretariatId, event_name: 'attendance_recorded', metric_value: 1, dimensions: { synthetic: true } },
    { escola_id: schoolA, actor_user_id: secretariatId, event_name: 'satisfaction_submitted', metric_value: 5, dimensions: { synthetic: true } },
  ])
  if (metricsError) throw metricsError
  const { error: tombstoneError } = await service.from('pilot_data_tombstones').upsert({
    entity_type: 'technical_copy', source_fingerprint: 'synthetic-deleted-copy-sha256', reason_code: 'synthetic_restore_test', created_by: secretariatId,
  }, { onConflict: 'entity_type,source_fingerprint' })
  if (tombstoneError) throw tombstoneError

  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  const { error: storageError } = await service.storage.from('student-photos').upload(`${schoolA}/synthetic-student/avatar.png`, pixel, { contentType: 'image/png', upsert: true })
  if (storageError) throw storageError
  process.stdout.write('Synthetic pilot seed complete\n')
}

seed().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
