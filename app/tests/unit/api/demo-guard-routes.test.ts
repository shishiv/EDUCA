import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { actorMock, createClientMock, serviceRoleMock, safetyMock } = vi.hoisted(() => ({
  actorMock: vi.fn(),
  createClientMock: vi.fn(),
  serviceRoleMock: vi.fn(),
  safetyMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({
  requirePilotActor: actorMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: serviceRoleMock,
}))

vi.mock('@/lib/pilot/pilot-safety-gate', () => ({
  assertSyntheticPilotSafety: safetyMock,
}))

import { POST as importPOST } from '@/app/api/pilot/imports/route'
import { POST as approvalPOST } from '@/app/api/pilot/imports/[batchId]/approval/route'
import { POST as invitationPOST } from '@/app/api/pilot/invitations/route'
import { POST as firstAccessPOST } from '@/app/api/pilot/first-access/route'

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'
const BATCH_ID = '00000000-0000-0000-0000-000000000101'
const AUDIT_ID = '00000000-0000-0000-0000-000000000901'

const CSV = [
  'synthetic_marker,source_id,school_code,class_code,student_name,birth_date,sex,guardian_name,guardian_phone,guardian_relationship',
  'SYNTHETIC-EDUCA-PILOT,student-1,SCHOOL-1,CLASS-1,Aluno Sintetico,2018-04-12,M,Responsavel Sintetico,+5511999990000,mae',
].join('\n')

const GOVERNANCE = {
  version: 'educa-synthetic-pilot-governance-v1',
  owner: { name: 'Owner Sintetico', email: 'owner@synthetic.invalid' },
  controller: { name: 'Controlador Sintetico', email: 'controller@synthetic.invalid', status: 'a confirmar' },
  processor: { name: 'Processador Sintetico', email: 'processor@synthetic.invalid', status: 'a confirmar' },
  purpose: 'preparacao tecnica do piloto sintetico',
  legalBasis: 'a confirmar',
  processingAgreement: { reference: 'DPA-DEMO-001', version: 'v1', status: 'a confirmar' },
  subprocessors: [{
    name: 'Armazenamento Sintetico', email: 'storage@synthetic.invalid', status: 'a confirmar',
    service: 'armazenamento cifrado de prova', processingLocation: 'isolated-proof-local',
  }],
  location: { primary: 'isolated-proof-local', transfer: 'a confirmar' },
  encryption: { algorithm: 'aes-256-gcm', keyReference: 'proof-local-v1', inTransit: 'a confirmar', plaintextStored: false },
  retention: {
    policy: 'synthetic-proof-30d',
    rawPayloadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    canonicalDataExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    rollbackUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  exit: {
    trigger: 'fim da prova tecnica', dataDisposition: 'a confirmar', accessRevocation: 'a confirmar', evidence: 'a confirmar',
  },
  incident: {
    contact: { name: 'Contato Incidente Sintetico', email: 'incidente@synthetic.invalid' },
    notification: 'a confirmar', response: 'a confirmar',
  },
}

function queryChain<T>(result: T) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
  }
  return chain
}

function demoSupabase(options: {
  userId?: string
  school?: { id: string } | null
  invitation?: { id: string; accepted_at: string | null } | null
} = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: AUDIT_ID, error: null })
  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: options.userId ? { id: options.userId } : null },
      error: null,
    }),
    updateUser: vi.fn(),
  }
  const from = vi.fn((table: string) => {
    if (table === 'escolas') return queryChain({ data: options.school ?? { id: SCHOOL_ID }, error: null })
    if (table === 'pilot_user_invitations') return queryChain({ data: options.invitation ?? { id: 'invitation-1', accepted_at: null }, error: null })
    throw new Error(`unexpected business table: ${table}`)
  })

  return { auth, from, rpc }
}

function request(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('demo simulated-success route handlers', () => {
  const previousDemoSandbox = process.env.NEXT_PUBLIC_DEMO_SANDBOX

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_SANDBOX = 'true'
    actorMock.mockReset()
    createClientMock.mockReset()
    serviceRoleMock.mockReset()
    safetyMock.mockReset()
    actorMock.mockResolvedValue({ id: 'actor-1', name: 'Admin Demo', role: 'admin', schoolId: null, email: 'demo@educa.app.br' })
    createClientMock.mockResolvedValue(demoSupabase())
    serviceRoleMock.mockReturnValue({
      auth: { admin: { inviteUserByEmail: vi.fn(), updateUserById: vi.fn() } },
      from: vi.fn(() => queryChain({ data: null, error: null })),
    })
  })

  afterEach(() => {
    if (previousDemoSandbox === undefined) delete process.env.NEXT_PUBLIC_DEMO_SANDBOX
    else process.env.NEXT_PUBLIC_DEMO_SANDBOX = previousDemoSandbox
  })

  it('returns a simulated import receipt without invoking safety or service-role writes', async () => {
    const response = await importPOST(request('http://test/api/pilot/imports', { csv: CSV, dryRun: true, governance: GOVERNANCE }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.demo).toMatchObject({
      operation: 'demo.pilot.import',
      outcome: 'simulated_success',
      effect_suppressed: true,
      audit_id: AUDIT_ID,
    })
    expect(safetyMock).not.toHaveBeenCalled()
    expect(serviceRoleMock).not.toHaveBeenCalled()
    expect(body).not.toHaveProperty('csv')
  })

  it('returns a simulated import approval without reading or publishing a batch', async () => {
    actorMock.mockResolvedValue({ id: 'director-1', name: 'Diretor Demo', role: 'diretor', schoolId: SCHOOL_ID, email: 'director@example.com' })
    const supabase = demoSupabase()
    createClientMock.mockResolvedValue(supabase)

    const response = await approvalPOST(
      request(`http://test/api/pilot/imports/${BATCH_ID}/approval`, { decision: 'approved' }),
      { params: Promise.resolve({ batchId: BATCH_ID }) },
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.batch).toMatchObject({ id: BATCH_ID, status: 'simulated_approved' })
    expect(body.demo.operation).toBe('demo.pilot.import_approval')
    expect(serviceRoleMock).not.toHaveBeenCalled()
  })

  it('returns a simulated invitation without calling Auth or profile writes', async () => {
    const response = await invitationPOST(request('http://test/api/pilot/invitations', {
      email: 'new-user@example.invalid',
      name: 'Usuário Sintético',
      role: 'professor',
      schoolId: SCHOOL_ID,
    }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.invitation.simulated).toBe(true)
    expect(body.demo).toMatchObject({ operation: 'demo.auth.invitation', outcome: 'simulated_success' })
    expect(serviceRoleMock).not.toHaveBeenCalled()
  })

  it('keeps first-access authentication and invitation checks but never changes the password', async () => {
    const supabase = demoSupabase({ userId: 'user-1' })
    createClientMock.mockResolvedValue(supabase)
    serviceRoleMock.mockReturnValue({
      from: vi.fn(() => queryChain({ data: { id: 'invitation-1', accepted_at: null }, error: null })),
    })

    const response = await firstAccessPOST(request('http://test/api/pilot/first-access', {
      password: 'Strong!Password123',
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, completed: true, simulated: true })
    expect(body.demo).toMatchObject({ operation: 'demo.auth.first_access', effect_suppressed: true })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })
})
