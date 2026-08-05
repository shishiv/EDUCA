import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import {
  demoSandboxSimulatedSuccessResponse,
  isDemoSandboxEnabled,
} from '@/lib/demo-sandbox/demo-sandbox'
import { writeDemoActionInterceptedAudit } from '@/lib/demo-sandbox/demo-audit'

const demoConfigMutationSchema = z.object({
  operation: z.enum(['demo.config.update', 'demo.config.reset']),
  configId: z.string().uuid(),
  value: z.string().max(1000).optional(),
})

export async function POST(request: Request) {
  if (!isDemoSandboxEnabled()) {
    return NextResponse.json({ error: 'DEMO_CONFIG_NOT_AVAILABLE' }, { status: 404 })
  }

  try {
    const actor = await requirePilotActor(['admin', 'diretor'])
    const input = demoConfigMutationSchema.parse(await request.json())
    if (input.operation === 'demo.config.update' && input.value === undefined) {
      return NextResponse.json({ error: 'DEMO_CONFIG_VALUE_REQUIRED' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: config, error: configError } = await supabase
      .from('configs')
      .select('id,chave,valor,descricao,categoria,tipo_valor,valor_padrao,ativo,escola_id,criado_por,created_at,updated_at')
      .eq('id', input.configId)
      .eq('ativo', true)
      .single()

    if (configError) throw configError
    if (!config) return NextResponse.json({ error: 'DEMO_CONFIG_NOT_FOUND' }, { status: 404 })
    if (config.escola_id && actor.schoolId !== null && config.escola_id !== actor.schoolId) {
      return NextResponse.json({ error: 'DEMO_CONFIG_SCHOOL_DENIED' }, { status: 403 })
    }

    const value = input.operation === 'demo.config.reset'
      ? config.valor_padrao || config.valor
      : input.value!
    const receipt = await writeDemoActionInterceptedAudit(
      asPilotRpcClient(supabase),
      {
        operation: input.operation,
        entityId: config.id,
        schoolId: config.escola_id,
      }
    )
    const response = demoSandboxSimulatedSuccessResponse(
      input.operation,
      {
        config: { ...config, valor: value, updated_at: new Date().toISOString() },
      },
      { auditId: receipt.auditId, correlationId: receipt.correlationId },
    )

    return response ?? NextResponse.json({ error: 'DEMO_CONFIG_NOT_AVAILABLE' }, { status: 404 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'DEMO_CONFIG_INVALID' }, { status: 400 })
    }
    return pilotErrorResponse(error, {
      feature: 'demo-config',
      fallbackCode: 'DEMO_CONFIG_FAILED',
      fallbackStatus: 400,
    })
  }
}
