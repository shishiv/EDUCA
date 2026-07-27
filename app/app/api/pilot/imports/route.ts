import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import {
  createDryRunValidationToken,
  encryptSyntheticCsvForStaging,
  validateSyntheticStudentCsv,
  verifyDryRunValidationToken,
} from '@/lib/pilot/synthetic-csv-import'

const MAX_CSV_BYTES = 5 * 1024 * 1024

function getImportKey(): { key: string; keyId: string } {
  const key = process.env.PILOT_IMPORT_ENCRYPTION_KEY
  const keyId = process.env.PILOT_IMPORT_ENCRYPTION_KEY_ID || 'synthetic-local-v1'
  if (!key) throw new Error('PILOT_IMPORT_KEY_MISSING')
  return { key, keyId }
}

export async function POST(request: Request) {
  try {
    assertSyntheticPilotSafety('import')
    const actor = await requirePilotActor(['admin', 'secretario'])
    if (actor.schoolId !== null) return NextResponse.json({ error: 'PILOT_IMPORT_SECRETARIAT_REQUIRED' }, { status: 403 })

    const body = await request.json() as { csv?: string; dryRun?: boolean; validationToken?: string; idempotencyKey?: string }
    if (!body.csv || Buffer.byteLength(body.csv, 'utf8') > MAX_CSV_BYTES) {
      return NextResponse.json({ error: 'PILOT_IMPORT_INVALID_SIZE' }, { status: 400 })
    }

    const { rows, report } = validateSyntheticStudentCsv(body.csv)
    const { key, keyId } = getImportKey()
    if (!report.valid) return NextResponse.json({ report }, { status: 422 })
    if (body.dryRun) {
      return NextResponse.json({ report, validationToken: createDryRunValidationToken(report.contentSha256, key) })
    }
    if (!body.validationToken || !verifyDryRunValidationToken(report.contentSha256, body.validationToken, key)) {
      return NextResponse.json({ error: 'PILOT_IMPORT_DRY_RUN_REQUIRED' }, { status: 409 })
    }
    if (!body.idempotencyKey || !/^[A-Za-z0-9_-]{8,128}$/.test(body.idempotencyKey)) {
      return NextResponse.json({ error: 'PILOT_IMPORT_IDEMPOTENCY_KEY_REQUIRED' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: school, error: schoolError } = await supabase
      .from('escolas')
      .select('id,codigo')
      .eq('codigo', report.schoolCodes[0])
      .single()
    if (schoolError || !school) return NextResponse.json({ error: 'PILOT_IMPORT_SCHOOL_NOT_FOUND', report }, { status: 422 })

    const service = createServiceRoleClient()
    const { data: existing } = await service
      .from('pilot_import_batches')
      .select('id,status,validation_report')
      .eq('escola_id', school.id)
      .or(`idempotency_key.eq.${body.idempotencyKey},content_sha256.eq.${report.contentSha256}`)
      .maybeSingle()
    if (existing) return NextResponse.json({ batch: existing, idempotentReplay: true })

    const encrypted = encryptSyntheticCsvForStaging(body.csv, key, keyId)
    const { data: batch, error: insertError } = await service
      .from('pilot_import_batches')
      .insert({
        escola_id: school.id,
        dataset: 'students',
        idempotency_key: body.idempotencyKey,
        content_sha256: report.contentSha256,
        encryption_key_id: encrypted.encryptionKeyId,
        encrypted_payload: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        validation_report: report,
        submitted_by: actor.id,
      })
      .select('id,status,validation_report,raw_expires_at')
      .single()
    if (insertError) throw insertError

    await asPilotRpcClient(supabase).rpc('write_pilot_audit_event', {
      p_event_type: 'import_staged', p_entity_type: 'pilot_import_batch', p_entity_id: batch.id,
      p_escola_id: school.id, p_metadata: { dataset: 'students', row_count: rows.length },
    })
    return NextResponse.json({ batch }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PILOT_IMPORT_FAILED'
    const status = message.includes('AUTH_REQUIRED') ? 401 : message.includes('ROLE_DENIED') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
