import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { supabaseFrom, recordDemoAction } = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
  recordDemoAction: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabase: { from: supabaseFrom } }))
vi.mock('@/lib/demo-sandbox/demo-audit-client', () => ({ recordDemoClientAction: recordDemoAction }))

import {
  configsApi,
  resetDemoConfigOverrides,
} from '@/lib/api/configs'
import {
  featureFlagsApi,
  resetDemoFeatureFlagOverrides,
} from '@/lib/api/feature-flags'
import { recordDemoClientAction } from '@/lib/demo-sandbox/demo-audit-client'

const CONFIG = {
  id: '00000000-0000-0000-0000-000000000001',
  chave: 'sessao_timeout',
  valor: '30',
  descricao: 'Timeout',
  categoria: 'seguranca',
  tipo_valor: 'number',
  valor_padrao: '30',
  ativo: true,
  escola_id: null,
  criado_por: null,
  created_at: '2026-02-03T00:00:00.000Z',
  updated_at: '2026-02-03T00:00:00.000Z',
}

function queryChain(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    update: vi.fn(() => {
      throw new Error('business table mutation must not run in demo')
    }),
    upsert: vi.fn(() => {
      throw new Error('business table mutation must not run in demo')
    }),
    then: <TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve({ data, error }).then(onfulfilled, onrejected),
  }
  return query
}

describe('demo client no-op mutations', () => {
  const previousDemoSandbox = process.env.NEXT_PUBLIC_DEMO_SANDBOX

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_SANDBOX = 'true'
    resetDemoConfigOverrides()
    resetDemoFeatureFlagOverrides()
    supabaseFrom.mockReset()
    recordDemoAction.mockReset()
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { operation: string; configId: string; value?: string }
      return {
        ok: true,
        json: async () => ({
          success: true,
          config: {
            ...CONFIG,
            id: body.configId,
            valor: body.operation === 'demo.config.reset' ? CONFIG.valor_padrao : body.value,
          },
        }),
      }
    }))
    recordDemoAction.mockResolvedValue({
      auditId: 'audit-1',
      correlationId: 'correlation-1',
      operation: 'demo.config.update',
      outcome: 'simulated_success',
      effectSuppressed: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (previousDemoSandbox === undefined) delete process.env.NEXT_PUBLIC_DEMO_SANDBOX
    else process.env.NEXT_PUBLIC_DEMO_SANDBOX = previousDemoSandbox
  })

  it('normalizes the server receipt while preserving the simulated outcome', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        demo: {
          operation: 'demo.config.update',
          outcome: 'simulated_success',
          effect_suppressed: true,
          synthetic_only: true,
          correlation_id: 'correlation-1',
          audit_id: 'audit-1',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(recordDemoClientAction({
      operation: 'demo.config.update',
      entityId: 'config-1',
      schoolId: null,
    })).resolves.toMatchObject({
      auditId: 'audit-1',
      correlationId: 'correlation-1',
      outcome: 'simulated_success',
      effectSuppressed: true,
    })
  })

  it('simulates config update and reset without calling update on configs', async () => {
    supabaseFrom.mockImplementation(() => queryChain([CONFIG]))

    const updated = await configsApi.update(CONFIG.id, { valor: '60' })
    expect(updated.valor).toBe('60')

    const reset = await configsApi.resetToDefault(CONFIG.id)
    expect(reset.valor).toBe('30')

    for (const query of supabaseFrom.mock.results.map(result => result.value)) {
      expect(query.update).not.toHaveBeenCalled()
    }
  })

  it('simulates feature-flag toggles without calling upsert', async () => {
    await featureFlagsApi.toggleFlagsForEscolas(
      '00000000-0000-0000-0000-000000000002',
      ['00000000-0000-0000-0000-000000000003'],
      true,
      'actor-1',
    )

    expect(recordDemoAction).toHaveBeenCalledWith({
      operation: 'demo.feature_flag.toggle',
      entityId: '00000000-0000-0000-0000-000000000002',
      schoolId: '00000000-0000-0000-0000-000000000003',
    })
    expect(supabaseFrom).not.toHaveBeenCalled()
  })
})
