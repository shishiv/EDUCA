import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const email = 'invited.teacher@synthetic.invalid'
const temporaryPassword = 'Temporary-Only-2026!'
const firstAccessPassword = 'First-Access-Only-2026!'
const schoolA = '10000000-0000-0000-0000-000000000001'
const secretariatEmail = 'invited.secretariat@synthetic.invalid'
const directorEmail = 'invited.director@synthetic.invalid'

test('invites a teacher and completes first access', async ({ page, browser }) => {
  await page.goto('/dashboard')
  const invitationResponse = await page.evaluate(async ({ email, schoolA }) => {
    const response = await fetch('/api/pilot/invitations', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, name: 'Professora Convidada Sintetica', role: 'professor', schoolId: schoolA }),
    })
    return { status: response.status, body: await response.json() }
  }, { email, schoolA })
  expect(invitationResponse.status).toBe(201)

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: users } = await service.auth.admin.listUsers()
  const invited = users.users.find(user => user.email === email)
  expect(invited).toBeTruthy()
  await service.auth.admin.updateUserById(invited!.id, { password: temporaryPassword, email_confirm: true })
  const { data: incompleteProfile, error: incompleteProfileError } = await service
    .from('users')
    .select('id,email,tipo_usuario,escola_id,primeiro_login,senha_padrao')
    .eq('id', invited!.id)
    .single()
  expect(incompleteProfileError).toBeNull()
  expect(incompleteProfile).toMatchObject({
    id: invited!.id,
    email,
    tipo_usuario: 'professor',
    escola_id: schoolA,
    primeiro_login: true,
    senha_padrao: true,
  })

  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(temporaryPassword)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/dashboard/)

  const completion = await page.evaluate(async password => {
    const response = await fetch('/api/pilot/first-access', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }),
    })
    return { status: response.status, body: await response.json() }
  }, firstAccessPassword)
  expect(completion).toEqual({
    status: 200,
    body: { completed: true, resumedProfile: false, idempotentReplay: false },
  })

  const [
    { data: authUserResponse, error: authUserError },
    { data: profile, error: profileError },
    { data: storedInvitation, error: invitationError },
    { data: auditEvents, error: auditEventsError },
  ] = await Promise.all([
    service.auth.admin.getUserById(invited!.id),
    service.from('users').select('id,email,tipo_usuario,escola_id,primeiro_login,senha_padrao').eq('id', invited!.id).single(),
    service.from('pilot_user_invitations').select('id,auth_user_id,email,invited_role,escola_id,accepted_at').eq('auth_user_id', invited!.id).single(),
    service.from('pilot_audit_log').select('event_type,entity_type,entity_id,redacted_metadata').eq('entity_id', invited!.id).in('event_type', ['user_invited', 'first_access_completed']).order('created_at', { ascending: true }),
  ])
  expect(authUserError).toBeNull()
  expect(profileError).toBeNull()
  expect(invitationError).toBeNull()
  expect(auditEventsError).toBeNull()
  expect(authUserResponse?.user?.id).toBe(invited!.id)
  expect(authUserResponse?.user?.email).toBe(email)
  expect(profile).toMatchObject({
    id: invited!.id,
    email,
    tipo_usuario: 'professor',
    escola_id: schoolA,
    primeiro_login: false,
    senha_padrao: false,
  })
  expect(storedInvitation).toMatchObject({
    auth_user_id: invited!.id,
    email,
    invited_role: 'professor',
    escola_id: schoolA,
    accepted_at: expect.any(String),
  })
  expect(auditEvents).toHaveLength(2)
  const auditByType = new Map((auditEvents ?? []).map(event => [event.event_type, event]))
  expect(auditByType.get('user_invited')).toMatchObject({
    entity_type: 'user',
    entity_id: invited!.id,
    redacted_metadata: { role: 'professor' },
  })
  expect(auditByType.get('first_access_completed')).toMatchObject({
    entity_type: 'user',
    entity_id: invited!.id,
    redacted_metadata: {},
  })
  expect(JSON.stringify(auditEvents)).not.toMatch(/password|senha/i)

  const oldPasswordContext = await browser.newContext()
  const oldPasswordPage = await oldPasswordContext.newPage()
  await oldPasswordPage.goto('/login')
  await oldPasswordPage.getByLabel('E-mail', { exact: true }).fill(email)
  await oldPasswordPage.getByLabel('Senha', { exact: true }).fill(temporaryPassword)
  await oldPasswordPage.getByRole('button', { name: /entrar/i }).click()
  await expect(oldPasswordPage.getByRole('alert')).toBeVisible()
  await oldPasswordContext.close()

  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(firstAccessPassword)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/dashboard/)
})

test('rejects parent invitations during the pilot', async ({ page }) => {
  await page.goto('/dashboard')
  const response = await page.evaluate(async schoolId => {
    const response = await fetch('/api/pilot/invitations', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'parent@synthetic.invalid', name: 'Parent Synthetic', role: 'responsavel', schoolId }),
    })
    return { status: response.status, body: await response.json() }
  }, schoolA)
  expect(response).toEqual(expect.objectContaining({ status: 400, body: expect.objectContaining({ error: 'PILOT_INVITE_INVALID' }) }))
})

test('invites municipal secretariat and a school director', async ({ page }) => {
  await page.goto('/dashboard')
  const requestedInvitations = [
    { email: secretariatEmail, name: 'Secretaria Convidada Sintetica', role: 'secretario', schoolId: null },
    { email: directorEmail, name: 'Diretora Convidada Sintetica', role: 'diretor', schoolId: schoolA },
  ] as const
  for (const invitation of requestedInvitations) {
    const response = await page.evaluate(async payload => {
      const response = await fetch('/api/pilot/invitations', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      })
      return { status: response.status, body: await response.json() }
    }, invitation)
    expect(response).toEqual(expect.objectContaining({
      status: 201,
      body: {
        invitation: expect.objectContaining({
          email: invitation.email,
          invited_role: invitation.role,
          escola_id: invitation.schoolId,
        }),
      },
    }))
  }

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: storedInvitations, error: storedInvitationsError } = await service
    .from('pilot_user_invitations')
    .select('email,invited_role,escola_id,accepted_at')
    .in('email', requestedInvitations.map(invitation => invitation.email))
  expect(storedInvitationsError).toBeNull()
  expect(storedInvitations).toEqual(expect.arrayContaining([
    { email: secretariatEmail, invited_role: 'secretario', escola_id: null, accepted_at: null },
    { email: directorEmail, invited_role: 'diretor', escola_id: schoolA, accepted_at: null },
  ]))

  const { data: users } = await service.auth.admin.listUsers()
  const invitedUsers = requestedInvitations.map(invitation => users.users.find(user => user.email === invitation.email))
  expect(invitedUsers.every(Boolean)).toBe(true)
  const invitedUserIds = invitedUsers.map(user => user!.id)
  const { data: auditEvents, error: auditEventsError } = await service
    .from('pilot_audit_log')
    .select('event_type,entity_type,entity_id,redacted_metadata')
    .eq('event_type', 'user_invited')
    .in('entity_id', invitedUserIds)
  expect(auditEventsError).toBeNull()
  expect(auditEvents).toHaveLength(2)
  expect(auditEvents).toEqual(expect.arrayContaining([
    expect.objectContaining({ entity_type: 'user', entity_id: invitedUserIds[0], redacted_metadata: { role: 'secretario' } }),
    expect.objectContaining({ entity_type: 'user', entity_id: invitedUserIds[1], redacted_metadata: { role: 'diretor' } }),
  ]))
})
