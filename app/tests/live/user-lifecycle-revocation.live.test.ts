/**
 * Real local Auth, PostgREST, Storage, and audit contract for T07.
 *
 * The test creates one unique .invalid target, keeps an already-issued client,
 * and cleans only its synthetic rows. It does not reset the local database.
 * Run with EDUCA_LIVE_SUPABASE=1 and local Supabase credentials.
 */

import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import {
  createSupabaseUserLifecyclePorts,
  revokeSyntheticPilotIdentity,
  startOrResumeUserRegistration,
} from '@/lib/services/user-lifecycle'

const LIVE = process.env.EDUCA_LIVE_SUPABASE === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SCHOOL_ID = '10000000-0000-0000-0000-000000000001'
const ACTOR_EMAIL = 'secretaria@synthetic.invalid'
const ACTOR_PASSWORD = 'Synthetic-Only-2026!'
const TARGET_PASSWORD = 'T07-Target-Only-2026!'
const RELEASE = 't07-local'
const REASON = 'synthetic-boundary-test'

const run = LIVE ? describe : describe.skip
let service: SupabaseClient | null = null
let actorId = ''
let targetId = ''
let targetEmail = ''
let targetClient: SupabaseClient | null = null
let studentId = ''
let writeStudentId = ''
let storagePath = ''

function requireService(): SupabaseClient {
  if (!service) throw new Error('T07 live service client was not initialized')
  return service
}

async function createTargetFixture(): Promise<void> {
  const admin = requireService()
  const suffix = `${process.pid}-${Date.now()}-${randomUUID().slice(0, 8)}`
  targetEmail = `t07-target-${suffix}@synthetic.invalid`
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: targetEmail,
    password: TARGET_PASSWORD,
    email_confirm: true,
    user_metadata: { synthetic: true, pilot_role: 'diretor' },
  })
  if (authError || !authData.user) throw authError || new Error('T07 target Auth fixture was not created')
  targetId = authData.user.id

  const { data: actor, error: actorError } = await admin
    .from('users')
    .select('id')
    .eq('email', ACTOR_EMAIL)
    .eq('ativo', true)
    .single()
  if (actorError || !actor) throw actorError || new Error('T07 actor fixture was not found')
  actorId = actor.id

  const { error: profileError } = await admin.from('users').insert({
    id: targetId,
    email: targetEmail,
    nome: 'T07 Target Sintetico',
    tipo_usuario: 'diretor',
    escola_id: SCHOOL_ID,
    ativo: true,
    primeiro_login: false,
    senha_padrao: false,
  })
  if (profileError) throw profileError

  const { error: invitationError } = await admin.from('pilot_user_invitations').insert({
    auth_user_id: targetId,
    email: targetEmail,
    invited_role: 'diretor',
    escola_id: SCHOOL_ID,
    invited_by: actorId,
  })
  if (invitationError) throw invitationError

  targetClient = createClient(URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { error: signInError } = await targetClient.auth.signInWithPassword({ email: targetEmail, password: TARGET_PASSWORD })
  if (signInError) throw signInError

  studentId = randomUUID()
  writeStudentId = randomUUID()
  storagePath = `${SCHOOL_ID}/t07-revocation-${suffix}/avatar.png`
  const { error: studentError } = await admin.from('alunos').insert({
    id: studentId,
    escola_id: SCHOOL_ID,
    import_source_id: `t07:read:${suffix}`,
    nome_completo: 'T07 Student Sintetico',
    data_nascimento: '2018-01-01',
    sexo: 'F',
    ativo: true,
  })
  if (studentError) throw studentError
}

async function cleanTargetFixture(): Promise<void> {
  const admin = service
  if (!admin) return
  if (storagePath) await admin.storage.from('student-photos').remove([storagePath])
  if (writeStudentId) await admin.from('alunos').delete().eq('id', writeStudentId)
  if (studentId) await admin.from('alunos').delete().eq('id', studentId)
  if (targetId) await admin.from('pilot_user_invitations').delete().eq('auth_user_id', targetId)
  if (targetId) await admin.from('users').delete().eq('id', targetId)
  if (targetId) await admin.auth.admin.deleteUser(targetId)
}

run('T07 synthetic auth revocation against local Supabase', () => {
  beforeAll(async () => {
    if (!URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error('T07 live test requires local Supabase credentials')
    }
    service = createClient(URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
    await createTargetFixture()
  })

  afterAll(async () => {
    await cleanTargetFixture()
  })

  it('denies an issued session at app data and Storage boundaries, rejects replay and login, and records redacted proof', async () => {
    if (!targetClient) throw new Error('T07 target client was not initialized')
    const admin = requireService()

    const beforeRead = await targetClient.from('alunos').select('id').eq('id', studentId).maybeSingle()
    expect(beforeRead.error).toBeNull()
    expect(beforeRead.data?.id).toBe(studentId)

    const beforeUpload = await targetClient.storage.from('student-photos').upload(
      storagePath,
      new Uint8Array([137, 80, 78, 71]),
      { contentType: 'image/png', upsert: true },
    )
    expect(beforeUpload.error).toBeNull()

    const ports = createSupabaseUserLifecyclePorts({ serviceClient: admin, sessionClient: targetClient })
    const revocation = await revokeSyntheticPilotIdentity(ports, {
      userId: targetId,
      release: RELEASE,
      reason: REASON,
    }, '2026-08-13T12:00:00.000Z')
    expect(revocation).toMatchObject({
      revoked: true,
      idempotent: false,
      profileDeactivated: true,
      authIdentity: 'removed',
      role: 'diretor',
      schoolId: SCHOOL_ID,
      revokedAt: '2026-08-13T12:00:00.000Z',
    })
    expect(revocation.identity).toMatch(/^synthetic-[a-f0-9]+$/)
    expect(revocation).not.toHaveProperty('email')

    const freshClient = createClient(URL!, ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
    const freshLogin = await freshClient.auth.signInWithPassword({ email: targetEmail, password: TARGET_PASSWORD })
    expect(freshLogin.error).not.toBeNull()

    // Deliberate break: bypass the application profile guard and query the profile table directly.
    const oldProfileRead = await targetClient.from('users').select('id,ativo').eq('id', targetId).maybeSingle()
    expect(oldProfileRead.error).toBeNull()
    expect(oldProfileRead.data).toBeNull()

    const oldRead = await targetClient.from('alunos').select('id').eq('id', studentId).maybeSingle()
    expect(oldRead.error).toBeNull()
    expect(oldRead.data).toBeNull()

    const oldWrite = await targetClient.from('alunos').insert({
      id: writeStudentId,
      escola_id: SCHOOL_ID,
      import_source_id: `t07:write:${writeStudentId}`,
      nome_completo: 'T07 Write Sintetico',
      data_nascimento: '2018-01-02',
      sexo: 'M',
    }).select('id').maybeSingle()
    expect(oldWrite.error).not.toBeNull()
    const { data: unexpectedWrite } = await admin.from('alunos').select('id').eq('id', writeStudentId).maybeSingle()
    expect(unexpectedWrite).toBeNull()

    const oldStorageRead = await targetClient.storage.from('student-photos').download(storagePath)
    expect(oldStorageRead.error).not.toBeNull()
    const oldStorageWrite = await targetClient.storage.from('student-photos').upload(
      `${storagePath}.after-revocation`,
      new Uint8Array([137, 80, 78, 71]),
      { contentType: 'image/png', upsert: true },
    )
    expect(oldStorageWrite.error).not.toBeNull()

    await expect(startOrResumeUserRegistration(ports, {
      email: targetEmail,
      name: 'T07 Target Sintetico',
      role: 'diretor',
      schoolId: SCHOOL_ID,
      invitedBy: actorId,
    }, '/primeiro-acesso')).rejects.toMatchObject({ code: 'INVITATION_REVOKED' })

    const repeated = await revokeSyntheticPilotIdentity(ports, {
      userId: targetId,
      release: RELEASE,
      reason: REASON,
    }, '2026-08-13T12:00:01.000Z')
    expect(repeated).toMatchObject({ revoked: true, idempotent: true, profileDeactivated: false, authIdentity: 'already_missing' })

    const actorClient = createClient(URL!, ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
    const { error: actorSignInError } = await actorClient.auth.signInWithPassword({ email: ACTOR_EMAIL, password: ACTOR_PASSWORD })
    if (actorSignInError) throw actorSignInError
    const { data: auditId, error: auditError } = await asPilotRpcClient(actorClient).rpc<string>('write_pilot_user_revocation_audit', {
      p_user_id: targetId,
      p_role: revocation.role,
      p_escola_id: SCHOOL_ID,
      p_release: RELEASE,
      p_reason: REASON,
    })
    expect(auditError).toBeNull()
    expect(auditId).toBeTruthy()

    const { data: audit, error: auditReadError } = await admin
      .from('pilot_audit_log')
      .select('event_type,entity_id,escola_id,redacted_metadata,created_at')
      .eq('id', auditId!)
      .single()
    expect(auditReadError).toBeNull()
    expect(audit).toMatchObject({
      event_type: 'user_revoked',
      entity_id: revocation.identity,
      escola_id: SCHOOL_ID,
      redacted_metadata: {
        identity: revocation.identity,
        role: 'diretor',
        release: RELEASE,
        reason: REASON,
      },
    })
    expect(audit?.created_at).toEqual(expect.any(String))
    expect(Object.keys(audit?.redacted_metadata ?? {}).sort()).toEqual(['identity', 'reason', 'release', 'role'])
    expect(JSON.stringify(audit)).not.toMatch(/@|password|senha|token|jwt|phone|telefone|header/i)
  })
})
