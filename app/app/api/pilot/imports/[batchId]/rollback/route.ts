import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import {
  demoSandboxSimulatedSuccessResponse,
  isDemoSandboxEnabled,
} from '@/lib/demo-sandbox/demo-sandbox'
import { writeDemoActionInterceptedAudit } from '@/lib/demo-sandbox/demo-audit'

const rollbackRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict()

interface SyntheticImportRollbackReceipt {
  batch_id: string
  deleted_enrollments: number
  deleted_relationships: number
  deleted_students: number
  deleted_guardians: number
  final_status: string
}

/** Rolls back one governed synthetic import through the service-role database RPC. */
export async function POST(
  request: Request,
  context: { params: Promise<{ batchId: string }> }
) {
  const demoSandbox = isDemoSandboxEnabled()

  try {
    const actor = await requirePilotActor(['admin', 'secretario', 'diretor'])
    const { batchId } = await context.params
    if (!z.string().uuid().safeParse(batchId).success) {
      return NextResponse.json({ error: 'PILOT_ROLLBACK_INVALID_BATCH' }, { status: 400 })
    }
    const parsedBody = rollbackRequestSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'PILOT_ROLLBACK_REASON_REQUIRED' }, { status: 400 })
    }

    if (demoSandbox) {
      const supabase = await createClient()
      const receipt = await writeDemoActionInterceptedAudit(
        asPilotRpcClient(supabase),
        {
          operation: 'demo.pilot.import_rollback',
          entityId: batchId,
          schoolId: actor.schoolId,
        }
      )
      const response = demoSandboxSimulatedSuccessResponse(
        'demo.pilot.import_rollback',
        {
          batch: { id: batchId, status: 'simulated_rolled_back' },
          rollback: { reasonRecorded: true },
        },
        { auditId: receipt.auditId, correlationId: receipt.correlationId },
      )
      return response ?? NextResponse.json({ error: 'DEMO_IMPORT_ROLLBACK_NOT_AVAILABLE' }, { status: 404 })
    }

    assertSyntheticPilotSafety('import')
    if (['admin', 'secretario'].includes(actor.role) && actor.schoolId !== null) {
      return NextResponse.json({ error: 'PILOT_ROLLBACK_SECRETARIAT_REQUIRED' }, { status: 403 })
    }
    if (actor.role === 'diretor' && !actor.schoolId) {
      return NextResponse.json({ error: 'PILOT_ROLLBACK_SCHOOL_REQUIRED' }, { status: 403 })
    }

    const service = createServiceRoleClient()
    const { data: batch, error: batchError } = await service
      .from('pilot_import_batches')
      .select('id,escola_id,import_target,status')
      .eq('id', batchId)
      .single()
    if (batchError || !batch) {
      return NextResponse.json({ error: 'PILOT_IMPORT_BATCH_NOT_FOUND' }, { status: 404 })
    }
    if (batch.import_target !== 'synthetic_local') {
      return NextResponse.json({ error: 'PILOT_IMPORT_ROLLBACK_TARGET_DENIED' }, { status: 403 })
    }
    if (actor.role === 'diretor' && batch.escola_id !== actor.schoolId) {
      return NextResponse.json({ error: 'PILOT_IMPORT_ROLLBACK_SCHOOL_DENIED' }, { status: 403 })
    }

    const { data: rollbackRows, error: rollbackError } = await asPilotRpcClient(service).rpc<SyntheticImportRollbackReceipt[]>(
      'pilot_rollback_synthetic_import_batch',
      {
        p_batch_id: batch.id,
        p_actor_user_id: actor.id,
        p_reason: parsedBody.data.reason,
      },
    )
    if (rollbackError) throw rollbackError
    const rollback = rollbackRows?.[0]
    if (!rollback) throw new Error('PILOT_IMPORT_ROLLBACK_RECEIPT_MISSING')

    return NextResponse.json({
      batch: { id: rollback.batch_id, status: rollback.final_status },
      rollback: {
        deletedEnrollments: rollback.deleted_enrollments,
        deletedRelationships: rollback.deleted_relationships,
        deletedStudents: rollback.deleted_students,
        deletedGuardians: rollback.deleted_guardians,
        reasonRecorded: true,
      },
    })
  } catch (error) {
    return pilotErrorResponse(error, { feature: 'pilot-import-rollback', fallbackCode: 'PILOT_ROLLBACK_FAILED' })
  }
}
