import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PostgresClient } from 'pg'
import { expect, test } from '@playwright/test'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const databaseUrl = process.env.SUPABASE_DB_URL || ''
const password = 'Synthetic-Only-2026!'

const schoolA = '10000000-0000-0000-0000-000000000001'
const schoolB = '10000000-0000-0000-0000-000000000002'
const teacherA = 'professora.a@synthetic.invalid'
const directorA = 'diretora.a@synthetic.invalid'
const directorB = 'diretora.b@synthetic.invalid'
const secretariat = 'secretaria@synthetic.invalid'

const fixtureClass = '30000000-0000-0000-0000-000000000010'
const fixtureNonTitularClass = '30000000-0000-0000-0000-000000000011'
const fixtureStudent = '40000000-0000-0000-0000-000000000010'
const fixtureNonTitularStudent = '40000000-0000-0000-0000-000000000011'
const fixtureEnrollment = '50000000-0000-0000-0000-000000000010'
const fixtureNonTitularEnrollment = '50000000-0000-0000-0000-000000000011'
const fixtureSession = '70500000-0000-0000-0000-000000000010'
const fixtureNonTitularSession = '70500000-0000-0000-0000-000000000011'
const fixturePositiveSession = '70500000-0000-0000-0000-000000000012'
const fixtureContent = '71000000-0000-0000-0000-000000000010'
const fixtureNonTitularContent = '71000000-0000-0000-0000-000000000011'
const fixtureRejectedContent = '71000000-0000-0000-0000-000000000091'
const fixtureTeacherCreatedContent = '71000000-0000-0000-0000-000000000092'
const fixtureReport = '72000000-0000-0000-0000-000000000010'
const fixtureOptIn = '73000000-0000-0000-0000-000000000010'

let teacherUserId = ''
let directorAUserId = ''

interface SchoolScopedRow {
  id: string
  escola_id: string | null
}

interface ConditionalityRow {
  aluno_id: string
  escola_id: string
}

function createServiceClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function signedInClient(email: string) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

async function removeFixtureRows() {
  const service = createServiceClient()
  const reportDelete = await service.from('relatorios_descritivos').delete().eq('id', fixtureReport)
  if (reportDelete.error) throw reportDelete.error
  const enrollmentDelete = await service
    .from('matriculas')
    .delete()
    .in('id', [fixtureEnrollment, fixtureNonTitularEnrollment])
  if (enrollmentDelete.error) throw enrollmentDelete.error
  const studentDelete = await service
    .from('alunos')
    .delete()
    .in('id', [fixtureStudent, fixtureNonTitularStudent])
  if (studentDelete.error) throw studentDelete.error
  const contentDelete = await service
    .from('conteudo_aula')
    .delete()
    .in('id', [
      fixtureContent,
      fixtureNonTitularContent,
      fixtureRejectedContent,
      fixtureTeacherCreatedContent,
    ])
  if (contentDelete.error) throw contentDelete.error
  const sessionDelete = await service
    .from('sessoes_aula')
    .delete()
    .in('id', [fixtureSession, fixtureNonTitularSession, fixturePositiveSession])
  if (sessionDelete.error) throw sessionDelete.error
  const classDelete = await service
    .from('turmas')
    .delete()
    .in('id', [fixtureClass, fixtureNonTitularClass])
  if (classDelete.error) throw classDelete.error
  const optInDelete = await service
    .from('whatsapp_notification_optins')
    .delete()
    .eq('id', fixtureOptIn)
  if (optInDelete.error) throw optInDelete.error
}

async function prepareFixture() {
  await removeFixtureRows()
  const service = createServiceClient()
  const profiles = await service
    .from('users')
    .select('id,email')
    .in('email', [teacherA, directorA])
  if (profiles.error) throw profiles.error
  teacherUserId = profiles.data?.find(profile => profile.email === teacherA)?.id || ''
  directorAUserId = profiles.data?.find(profile => profile.email === directorA)?.id || ''
  if (!teacherUserId || !directorAUserId) throw new Error('SECURITY_E2E_PROFILE_FIXTURE_MISSING')

  const classes = await service.from('turmas').insert([
    {
      id: fixtureClass,
      import_source_id: 'security-e2e:teacher-class',
      nome: 'Turma Security E2E Titular',
      serie: '1 ano',
      turno: 'matutino',
      ano_letivo: 2026,
      escola_id: schoolA,
      professor_id: teacherUserId,
      ativo: true,
    },
    {
      id: fixtureNonTitularClass,
      import_source_id: 'security-e2e:non-titular-class',
      nome: 'Turma Security E2E Não Titular',
      serie: '2 ano',
      turno: 'vespertino',
      ano_letivo: 2026,
      escola_id: schoolA,
      professor_id: directorAUserId,
      ativo: true,
    },
  ])
  if (classes.error) throw classes.error

  const students = await service.from('alunos').insert([
    {
      id: fixtureStudent,
      escola_id: schoolA,
      import_source_id: 'security-e2e:student',
      nome_completo: 'Aluno Security E2E',
      data_nascimento: '2018-01-01',
      sexo: 'M',
      ativo: true,
    },
    {
      id: fixtureNonTitularStudent,
      escola_id: schoolA,
      import_source_id: 'security-e2e:non-titular-student',
      nome_completo: 'Aluno Security E2E Não Titular',
      data_nascimento: '2018-01-02',
      sexo: 'F',
      ativo: true,
    },
  ])
  if (students.error) throw students.error

  const enrollments = await service.from('matriculas').insert([
    {
      id: fixtureEnrollment,
      aluno_id: fixtureStudent,
      turma_id: fixtureClass,
      ano_letivo: 2026,
      situacao: 'ativa',
    },
    {
      id: fixtureNonTitularEnrollment,
      aluno_id: fixtureNonTitularStudent,
      turma_id: fixtureNonTitularClass,
      ano_letivo: 2026,
      situacao: 'ativa',
    },
  ])
  if (enrollments.error) throw enrollments.error

  const sessions = await service.from('sessoes_aula').insert([
    {
      id: fixtureSession,
      turma_id: fixtureClass,
      escola_id: schoolA,
      professor_id: teacherUserId,
      data_aula: '2026-08-10',
      status: 'ABERTA',
      conteudo_programatico: 'Conteúdo titular security E2E',
      aberta_em: new Date().toISOString(),
    },
    {
      id: fixtureNonTitularSession,
      turma_id: fixtureNonTitularClass,
      escola_id: schoolA,
      professor_id: directorAUserId,
      data_aula: '2026-08-10',
      status: 'ABERTA',
      conteudo_programatico: 'Conteúdo não titular security E2E',
      aberta_em: new Date().toISOString(),
    },
    {
      id: fixturePositiveSession,
      turma_id: fixtureClass,
      escola_id: schoolA,
      professor_id: teacherUserId,
      data_aula: '2026-08-11',
      status: 'ABERTA',
      conteudo_programatico: 'Segundo conteúdo titular security E2E',
      aberta_em: new Date().toISOString(),
    },
  ])
  if (sessions.error) throw sessions.error

  const content = await service.from('conteudo_aula').insert([
    {
      id: fixtureContent,
      sessao_id: fixtureSession,
      tema: 'Conteúdo titular security E2E',
      objetivo: 'Provar o caminho autorizado',
      habilidades_bncc: ['SEC-E2E'],
      created_by: teacherUserId,
    },
    {
      id: fixtureNonTitularContent,
      sessao_id: fixtureNonTitularSession,
      tema: 'Conteúdo não titular security E2E',
      objetivo: 'Provar o caminho negado',
      habilidades_bncc: ['SEC-E2E-DENIED'],
      created_by: directorAUserId,
    },
  ])
  if (content.error) throw content.error

  const report = await service.from('relatorios_descritivos').insert({
    id: fixtureReport,
    matricula_id: fixtureEnrollment,
    turma_id: fixtureClass,
    professor_id: teacherUserId,
    ano_letivo: 2026,
    semestre: 'primeiro',
    status: 'rascunho',
    campo_eu_outro_nos: 'Campo sintético E2E',
    campo_corpo_gestos: 'Campo sintético E2E',
    campo_tracos_sons: 'Campo sintético E2E',
    campo_escuta_fala: 'Campo sintético E2E',
    campo_espacos_tempos: 'Campo sintético E2E',
    created_by: teacherUserId,
  })
  if (report.error) throw report.error
}

async function getUserId(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw error || new Error('SECURITY_E2E_USER_MISSING')
  return data.user.id
}

test.describe.serial('isolated governed pilot security hardening', () => {
  test.beforeAll(async () => {
    const host = new URL(supabaseUrl).hostname
    if (!['127.0.0.1', 'localhost'].includes(host)) {
      throw new Error(`SECURITY_E2E_LOCAL_SUPABASE_REQUIRED: ${host}`)
    }
    if (!databaseUrl) throw new Error('SECURITY_E2E_DATABASE_URL_REQUIRED')
    await prepareFixture()
  })

  test.afterAll(async () => {
    await removeFixtureRows()
  })

  test('proves the three roles, conditionality release, and negative writes at PostgREST', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/dashboard/)

    const [secretariatClient, directorClient, otherDirectorClient, teacherClient] = await Promise.all([
      signedInClient(secretariat),
      signedInClient(directorA),
      signedInClient(directorB),
      signedInClient(teacherA),
    ])

    const [secretariatStudents, directorStudents, otherDirectorStudents, teacherClasses] = await Promise.all([
      secretariatClient.from('alunos').select('id,escola_id'),
      directorClient.from('alunos').select('id,escola_id'),
      otherDirectorClient.from('alunos').select('id,escola_id'),
      teacherClient.from('turmas').select('id,escola_id'),
    ])
    expect(secretariatStudents.error).toBeNull()
    expect(directorStudents.error).toBeNull()
    expect(otherDirectorStudents.error).toBeNull()
    expect(teacherClasses.error).toBeNull()
    expect(secretariatStudents.data?.some((row: SchoolScopedRow) => row.id === fixtureStudent)).toBe(true)
    expect(directorStudents.data?.every((row: SchoolScopedRow) => row.escola_id === schoolA)).toBe(true)
    expect(otherDirectorStudents.data?.every((row: SchoolScopedRow) => row.escola_id === schoolB)).toBe(true)
    expect(teacherClasses.data?.map((row: SchoolScopedRow) => row.id)).toEqual(expect.arrayContaining([
      '30000000-0000-0000-0000-000000000001',
      fixtureClass,
    ]))
    expect(teacherClasses.data?.some((row: SchoolScopedRow) => row.id === fixtureNonTitularClass)).toBe(false)

    const rpcArgs = {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-31',
    }
    const [secretariatRpc, directorRpc, otherDirectorRpc, teacherRpc] = await Promise.all([
      secretariatClient.rpc('get_attendance_conditionality', rpcArgs),
      directorClient.rpc('get_attendance_conditionality', rpcArgs),
      otherDirectorClient.rpc('get_attendance_conditionality', rpcArgs),
      teacherClient.rpc('get_attendance_conditionality', rpcArgs),
    ])
    expect(secretariatRpc.error).toBeNull()
    expect(directorRpc.error).toBeNull()
    expect(otherDirectorRpc.error).toBeNull()
    expect(teacherRpc.error).toBeNull()
    expect(secretariatRpc.data?.some((row: ConditionalityRow) => row.aluno_id === fixtureStudent)).toBe(true)
    expect(directorRpc.data?.every((row: ConditionalityRow) => row.escola_id === schoolA)).toBe(true)
    expect(otherDirectorRpc.data?.every((row: ConditionalityRow) => row.escola_id === schoolB)).toBe(true)
    expect(teacherRpc.data?.some((row: ConditionalityRow) => row.aluno_id === fixtureStudent)).toBe(true)
    expect(teacherRpc.data?.some((row: ConditionalityRow) => row.aluno_id === fixtureNonTitularStudent)).toBe(false)

    const [conditionalityView, legacyView, secretariatReports, otherDirectorReports] = await Promise.all([
      directorClient.from('vw_frequencia_condicionalidade').select('aluno_id,escola_id'),
      secretariatClient.from('vw_alunos_risco_bolsa_familia').select('aluno_id'),
      secretariatClient.from('relatorios_descritivos').select('id').eq('id', fixtureReport),
      otherDirectorClient.from('relatorios_descritivos').select('id').eq('id', fixtureReport),
    ])
    expect(conditionalityView.error).toBeNull()
    expect(conditionalityView.data?.every(row => row.escola_id === schoolA)).toBe(true)
    expect(legacyView.error).not.toBeNull()
    expect(secretariatReports.error).toBeNull()
    expect(secretariatReports.data).toHaveLength(1)
    expect(otherDirectorReports.error).toBeNull()
    expect(otherDirectorReports.data).toHaveLength(0)

    const secretaryWrite = await secretariatClient.from('alunos').insert({
      id: '40000000-0000-0000-0000-000000000090',
      escola_id: schoolA,
      nome_completo: 'Escrita Secretaria Security E2E',
      data_nascimento: '2018-04-01',
      sexo: 'F',
    })
    expect(secretaryWrite.error).not.toBeNull()

    const crossSchoolDirectorWrite = await directorClient.from('alunos').insert({
      id: '40000000-0000-0000-0000-000000000091',
      escola_id: schoolB,
      nome_completo: 'Escrita Cruzada Security E2E',
      data_nascimento: '2018-04-02',
      sexo: 'M',
    })
    expect(crossSchoolDirectorWrite.error).not.toBeNull()

    const teacherNonTitularWrite = await teacherClient.from('conteudo_aula').insert({
      id: '71000000-0000-0000-0000-000000000091',
      sessao_id: fixtureNonTitularSession,
      tema: 'Escrita fora da titularidade Security E2E',
      objetivo: 'Deve falhar',
      habilidades_bncc: ['SEC-E2E-BREAK'],
      created_by: await getUserId(teacherClient),
    })
    expect(teacherNonTitularWrite.error).not.toBeNull()

    const teacherTitularWrite = await teacherClient.from('conteudo_aula').insert({
      id: '71000000-0000-0000-0000-000000000092',
      sessao_id: fixturePositiveSession,
      tema: 'Escrita titular Security E2E',
      objetivo: 'Deve passar',
      habilidades_bncc: ['SEC-E2E-PASS'],
      created_by: await getUserId(teacherClient),
    })
    expect(teacherTitularWrite.error).toBeNull()

    const teacherDelete = await teacherClient
      .from('conteudo_aula')
      .delete()
      .eq('id', '71000000-0000-0000-0000-000000000092')
    expect(teacherDelete.error).not.toBeNull()
  })

  test('keeps audit and cleanup boundaries, and proves the deliberate DELETE break', async () => {
    const service = createServiceClient()
    const directorClient = await signedInClient(directorA)
    const teacherClient = await signedInClient(teacherA)
    const secretaryClient = await signedInClient(secretariat)

    const directorId = await getUserId(directorClient)
    const optIn = await directorClient.from('whatsapp_notification_optins').upsert({
      id: fixtureOptIn,
      responsavel_id: '60000000-0000-0000-0000-000000000001',
      escola_id: schoolA,
      canal: 'whatsapp',
      opt_in: true,
      consentido_em: new Date().toISOString(),
      registrado_por: directorId,
    }, { onConflict: 'responsavel_id,canal' }).select('id').single()
    expect(optIn.error).toBeNull()

    const validAudit = await directorClient.rpc('write_pilot_audit_event', {
      p_event_type: 'whatsapp_optin_changed',
      p_entity_type: 'responsavel',
      p_entity_id: '60000000-0000-0000-0000-000000000001',
      p_escola_id: schoolA,
      p_metadata: { canal: 'whatsapp', opt_in: true },
    })
    expect(validAudit.error).toBeNull()

    const arbitraryAudit = await teacherClient.rpc('write_pilot_audit_event', {
      p_event_type: 'arbitrary_event',
      p_entity_type: 'arbitrary_entity',
      p_entity_id: 'arbitrary-id',
      p_metadata: {},
    })
    expect(arbitraryAudit.error?.message).toContain('PILOT_AUDIT_EVENT_NOT_ALLOWED')

    const secretaryConsentUpdate = await secretaryClient
      .from('whatsapp_notification_optins')
      .update({ opt_in: false, cancelado_em: new Date().toISOString(), registrado_por: await getUserId(secretaryClient) })
      .eq('id', fixtureOptIn)
      .select('id')
    expect(secretaryConsentUpdate.error).toBeNull()
    expect(secretaryConsentUpdate.data).toHaveLength(0)

    const secretaryConsentDelete = await secretaryClient
      .from('whatsapp_notification_optins')
      .delete()
      .eq('id', fixtureOptIn)
    expect(secretaryConsentDelete.error).not.toBeNull()

    const secretaryCleanup = await secretaryClient.rpc('pilot_cleanup_import_staging')
    expect(secretaryCleanup.error).not.toBeNull()
    const secretaryRollback = await secretaryClient.rpc('pilot_rollback_import_batch', {
      p_batch_id: fixtureReport,
      p_actor_user_id: directorId,
      p_reason: 'unauthorized e2e rollback',
    })
    expect(secretaryRollback.error).not.toBeNull()

    const serviceCleanup = await service.rpc('pilot_cleanup_import_staging')
    expect(serviceCleanup.error).toBeNull()

    const { data: contentSnapshot, error: snapshotError } = await service
      .from('conteudo_aula')
      .select('*')
      .eq('id', fixtureContent)
      .single()
    expect(snapshotError).toBeNull()
    expect(contentSnapshot).toBeTruthy()

    const database = new PostgresClient({ connectionString: databaseUrl })
    await database.connect()
    try {
      await database.query('GRANT DELETE ON public.conteudo_aula TO authenticated')
      await database.query('CREATE POLICY pilot_security_e2e_delete_break ON public.conteudo_aula FOR DELETE TO authenticated USING (true)')

      const deliberateBreak = await teacherClient
        .from('conteudo_aula')
        .delete()
        .eq('id', fixtureContent)
        .select('id')
      expect(deliberateBreak.error).toBeNull()
      expect(deliberateBreak.data).toHaveLength(1)
    } finally {
      await database.query('DROP POLICY IF EXISTS pilot_security_e2e_delete_break ON public.conteudo_aula')
      await database.query('REVOKE DELETE ON public.conteudo_aula FROM authenticated')
      await database.end()
      const restore = await service.from('conteudo_aula').insert(contentSnapshot!)
      if (restore.error) throw restore.error
    }
  })
})
