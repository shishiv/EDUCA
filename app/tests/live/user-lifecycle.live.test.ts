/**
 * Real Auth and PostgREST contract for the C09 user lifecycle.
 *
 * The suite creates only unique `.invalid` identities and removes those exact
 * synthetic rows after each test. It never resets or truncates the database.
 * Run with EDUCA_LIVE_SUPABASE=1 and local Supabase credentials.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  completePendingUserRegistration,
  createSupabaseUserLifecyclePorts,
  startOrResumeUserRegistration,
  type UserLifecycleAuthUser,
} from '@/lib/services/user-lifecycle'

const LIVE = process.env.EDUCA_LIVE_SUPABASE === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PASSWORD = 'Temporary-C09-2026!'
const NEXT_PASSWORD = 'Completed-C09-2026!'

type Fixture = {
  id: string
  email: string
  invitedBy: string
  authUser: UserLifecycleAuthUser
  client: SupabaseClient
}

const run = LIVE ? describe : describe.skip
let service: SupabaseClient | null = null
const fixtureIds: string[] = []

async function createFixture(): Promise<Fixture> {
  if (!service || !URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    throw new Error('C09 live test requires local Supabase credentials')
  }

  const email = `c09-${process.pid}-${Date.now()}-${fixtureIds.length}@synthetic.invalid`
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { synthetic: true, nome: 'Usuário C09 Sintético' },
  })
  if (error || !data.user) throw error || new Error('C09 live Auth fixture was not created')

  fixtureIds.push(data.user.id)
  const { data: adminUser, error: adminUserError } = await service
    .from('users')
    .select('id')
    .eq('tipo_usuario', 'admin')
    .limit(1)
    .maybeSingle()
  if (adminUserError || !adminUser) throw adminUserError || new Error('C09 live actor fixture was not found')

  const { error: invitationError } = await service.from('pilot_user_invitations').insert({
    auth_user_id: data.user.id,
    email,
    invited_role: 'secretario',
    escola_id: null,
    invited_by: adminUser.id,
  })
  if (invitationError) throw invitationError

  const client = createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  return {
    id: data.user.id,
    email,
    invitedBy: adminUser.id,
    authUser: {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    },
    client,
  }
}

async function removeFixtures() {
  if (!service) return
  for (const id of fixtureIds.splice(0)) {
    await service.from('pilot_user_invitations').delete().eq('auth_user_id', id)
    await service.from('users').delete().eq('id', id)
    await service.auth.admin.deleteUser(id)
  }
}

function requireServiceClient(): SupabaseClient {
  if (!service) throw new Error('C09 live service client was not initialized')
  return service
}

run('C09 user lifecycle against local Supabase', () => {
  beforeAll(() => {
    if (!URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error('C09 live test requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
    }
    service = createClient(URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
  })

  afterAll(async () => {
    await removeFixtures()
  })

  it('keeps one Auth identity across resume, duplicate submission, and first access', async () => {
    const fixture = await createFixture()
    const admin = requireServiceClient()
    const ports = createSupabaseUserLifecyclePorts({ serviceClient: admin, sessionClient: fixture.client })
    const input = {
      email: fixture.email,
      name: 'Usuário C09 Sintético',
      role: 'secretario' as const,
      schoolId: null,
      invitedBy: fixture.invitedBy,
    }

    const resumed = await startOrResumeUserRegistration(ports, input, '/primeiro-acesso')
    const duplicate = await startOrResumeUserRegistration(ports, input, '/primeiro-acesso')
    expect(resumed).toMatchObject({ created: false, resumed: true, status: 'incomplete' })
    expect(duplicate).toMatchObject({ created: false, resumed: false, status: 'incomplete' })

    const { data: authUsers, error: authUsersError } = await admin.auth.admin.listUsers()
    if (authUsersError) throw authUsersError
    expect(authUsers.users.filter(user => user.email === fixture.email)).toHaveLength(1)
    expect(resumed.profile?.id).toBe(fixture.id)

    const { error: signInError } = await fixture.client.auth.signInWithPassword({ email: fixture.email, password: PASSWORD })
    if (signInError) throw signInError
    const completion = await completePendingUserRegistration(ports, fixture.authUser, NEXT_PASSWORD)
    expect(completion.completed).toBe(true)

    const { data: sessionUser } = await fixture.client.auth.getUser()
    expect(sessionUser.user?.id).toBe(fixture.id)
    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('id,primeiro_login,senha_padrao')
      .eq('id', fixture.id)
      .single()
    if (profileError) throw profileError
    expect(profile).toMatchObject({ id: fixture.id, primeiro_login: false, senha_padrao: false })

    const { data: invitation, error: invitationError } = await admin
      .from('pilot_user_invitations')
      .select('accepted_at')
      .eq('auth_user_id', fixture.id)
      .single()
    if (invitationError) throw invitationError
    expect(invitation.accepted_at).toBeTruthy()
  })

  it('resumes first access when the real profile row is absent', async () => {
    const fixture = await createFixture()
    const ports = createSupabaseUserLifecyclePorts({ serviceClient: requireServiceClient(), sessionClient: fixture.client })

    const { error: signInError } = await fixture.client.auth.signInWithPassword({ email: fixture.email, password: PASSWORD })
    if (signInError) throw signInError
    const completion = await completePendingUserRegistration(ports, fixture.authUser, NEXT_PASSWORD)

    expect(completion).toMatchObject({ completed: true, resumedProfile: true, idempotentReplay: false })
    const { data: authUser } = await fixture.client.auth.getUser()
    expect(authUser.user?.id).toBe(fixture.id)
  })
})
