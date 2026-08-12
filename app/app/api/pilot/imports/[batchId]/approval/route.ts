import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import {
  completePilotImportGovernance,
  countCanonicalPilotRows,
  fingerprintCanonicalPilotRows,
  fingerprintPilotImportGovernance,
  transformGovernedPilotCsvToCanonicalRows,
  validatePilotImportGovernanceInput,
  validateGovernedPilotStudentCsv,
} from '@/lib/pilot/governed-csv-import'
import { decryptPilotImportPayload } from '@/lib/pilot/pilot-import-crypto'
import {
  demoSandboxSimulatedSuccessResponse,
  isDemoSandboxEnabled,
} from '@/lib/demo-sandbox/demo-sandbox'
import { writeDemoActionInterceptedAudit } from '@/lib/demo-sandbox/demo-audit'

async function findOrCreateByImportSource(
  service: ReturnType<typeof createServiceRoleClient>,
  table: 'alunos' | 'responsaveis',
  schoolId: string,
  sourceId: string,
  values: Record<string, unknown>
): Promise<string> {
  const { data: existing } = await service.from(table).select('id').eq('escola_id', schoolId).eq('import_source_id', sourceId).maybeSingle()
  if (existing) {
    const { error } = await service.from(table).update(values).eq('id', existing.id)
    if (error) throw error
    return existing.id
  }
  const { data, error } = await service.from(table).insert({
    ...values,
    escola_id: schoolId,
    import_source_id: sourceId,
  }).select('id').single()
  if (error) throw error
  return data.id
}

export async function POST(request: Request, context: { params: Promise<{ batchId: string }> }) {
  const demoSandbox = isDemoSandboxEnabled()
  try {
    const actor = await requirePilotActor(['diretor'])
    if (!actor.schoolId) return NextResponse.json({ error: 'PILOT_APPROVAL_SCHOOL_REQUIRED' }, { status: 403 })
    const { batchId } = await context.params
    if (!z.string().uuid().safeParse(batchId).success) {
      return NextResponse.json({ error: 'PILOT_APPROVAL_INVALID_BATCH' }, { status: 400 })
    }
    const body = await request.json() as { decision?: 'approved' | 'rejected' }
    if (!['approved', 'rejected'].includes(body.decision || '')) return NextResponse.json({ error: 'PILOT_APPROVAL_INVALID_DECISION' }, { status: 400 })

    if (demoSandbox) {
      const supabase = await createClient()
      const receipt = await writeDemoActionInterceptedAudit(
        asPilotRpcClient(supabase),
        {
          operation: 'demo.pilot.import_approval',
          entityId: batchId,
          schoolId: actor.schoolId,
        }
      )
      const response = demoSandboxSimulatedSuccessResponse(
        'demo.pilot.import_approval',
        {
          batch: {
            id: batchId,
            status: body.decision === 'approved' ? 'simulated_approved' : 'simulated_rejected',
            decision: body.decision,
          },
        },
        { auditId: receipt.auditId, correlationId: receipt.correlationId },
      )

      return response ?? NextResponse.json({ error: 'DEMO_IMPORT_APPROVAL_NOT_AVAILABLE' }, { status: 404 })
    }

    assertSyntheticPilotSafety('import')

    const service = createServiceRoleClient()
    const { data: batch, error: batchError } = await service.from('pilot_import_batches').select('*').eq('id', batchId).single()
    if (batchError || !batch) return NextResponse.json({ error: 'PILOT_IMPORT_BATCH_NOT_FOUND' }, { status: 404 })
    if (batch.escola_id !== actor.schoolId || batch.submitted_by === actor.id) return NextResponse.json({ error: 'PILOT_IMPORT_MAKER_CHECKER_DENIED' }, { status: 403 })
    if (batch.status === 'published' || batch.status === 'rejected') return NextResponse.json({ batch, idempotentReplay: true })

    const submittedByName = typeof batch.submitted_by_name === 'string' ? batch.submitted_by_name : ''
    const submittedByEmail = typeof batch.submitted_by_email === 'string' ? batch.submitted_by_email : ''
    const governanceInput = validatePilotImportGovernanceInput(batch.governance_metadata)
    if (!actor.email || !submittedByName || !submittedByEmail) throw new Error('PILOT_IMPORT_GOVERNANCE_ACTOR_SNAPSHOT_MISSING')
    const now = new Date()
    const completeGovernance = completePilotImportGovernance(
      governanceInput,
      { name: submittedByName, email: submittedByEmail },
      { name: actor.name, email: actor.email },
      now,
    )
    const governanceFingerprint = fingerprintPilotImportGovernance(completeGovernance)
    const reportSha256 = createHash('sha256').update(JSON.stringify(batch.validation_report)).digest('hex')
    const { error: approvalError } = await service.from('pilot_import_approvals').upsert({
      batch_id: batch.id, escola_id: batch.escola_id, submitted_by: batch.submitted_by,
      approved_by: actor.id, decision: body.decision!, report_sha256: reportSha256, decided_at: now.toISOString(),
    }, { onConflict: 'batch_id' })
    if (approvalError) throw approvalError

    if (body.decision === 'rejected') {
      const { data: rejected, error } = await service.from('pilot_import_batches').update({
        status: 'rejected', approved_by: actor.id, approved_by_name: actor.name, approved_by_email: actor.email,
        approved_at: now.toISOString(), governance_fingerprint_sha256: governanceFingerprint,
        governance_metadata: completeGovernance,
        encrypted_payload: null, iv: null, auth_tag: null, cleaned_at: new Date().toISOString(),
      }).eq('id', batch.id).select('id,status,cleaned_at').single()
      if (error) throw error
      return NextResponse.json({ batch: rejected })
    }

    const key = process.env.PILOT_IMPORT_ENCRYPTION_KEY
    if (!key || !batch.encrypted_payload || !batch.iv || !batch.auth_tag) throw new Error('PILOT_IMPORT_ENCRYPTED_PAYLOAD_MISSING')
    const csv = decryptPilotImportPayload({
      encryptionKeyId: batch.encryption_key_id,
      ciphertext: batch.encrypted_payload,
      iv: batch.iv,
      authTag: batch.auth_tag,
    }, key)
    const { rows, report } = validateGovernedPilotStudentCsv(csv, 'synthetic')
    if (!report.valid || report.contentSha256 !== batch.content_sha256) throw new Error('PILOT_IMPORT_INTEGRITY_FAILED')
    const canonicalRows = transformGovernedPilotCsvToCanonicalRows(rows)
    const canonicalCounts = countCanonicalPilotRows(canonicalRows)
    const canonicalFingerprint = fingerprintCanonicalPilotRows(canonicalRows)

    const { error: approvedUpdateError } = await service.from('pilot_import_batches').update({
      status: 'approved',
      approved_by: actor.id,
      approved_by_name: actor.name,
      approved_by_email: actor.email,
      approved_at: now.toISOString(),
      governance_fingerprint_sha256: governanceFingerprint,
      governance_metadata: completeGovernance,
      canonical_counts: canonicalCounts,
      canonical_fingerprint_sha256: canonicalFingerprint,
    }).eq('id', batch.id)
    if (approvedUpdateError) throw approvedUpdateError
    for (const row of rows) {
      const { data: turma, error: turmaError } = await service.from('turmas').select('id,ano_letivo').eq('escola_id', batch.escola_id).eq('import_source_id', row.class_code).single()
      if (turmaError || !turma) throw new Error(`PILOT_IMPORT_CLASS_NOT_FOUND: row ${row.source_id}`)
      const guardianId = await findOrCreateByImportSource(service, 'responsaveis', batch.escola_id, `guardian:${row.source_id}`, {
        nome: row.guardian_name,
        parentesco: row.guardian_relationship,
        telefone: row.guardian_phone,
        pilot_import_batch_id: batch.id,
      })
      const studentId = await findOrCreateByImportSource(service, 'alunos', batch.escola_id, row.source_id, {
        nome_completo: row.student_name,
        data_nascimento: row.birth_date,
        sexo: row.sex,
        responsavel_id: guardianId,
        pilot_import_batch_id: batch.id,
      })
      const { error: linkError } = await service.from('aluno_responsaveis').upsert({
        aluno_id: studentId,
        responsavel_id: guardianId,
        tipo_responsabilidade: row.guardian_relationship,
        pilot_import_batch_id: batch.id,
      }, { onConflict: 'aluno_id,responsavel_id' })
      if (linkError) throw linkError
      const { error: enrollmentError } = await service.from('matriculas').upsert({
        aluno_id: studentId,
        turma_id: turma.id,
        ano_letivo: turma.ano_letivo,
        situacao: 'ativa',
        observacoes: 'synthetic pilot CSV import',
        pilot_import_batch_id: batch.id,
      }, { onConflict: 'aluno_id,turma_id,ano_letivo' })
      if (enrollmentError) throw enrollmentError
    }

    const publishedAt = new Date().toISOString()
    const { data: published, error: publishError } = await service.from('pilot_import_batches').update({
      status: 'published', published_at: publishedAt, encrypted_payload: null, iv: null, auth_tag: null, cleaned_at: publishedAt,
    }).eq('id', batch.id).select('id,status,published_at,cleaned_at').single()
    if (publishError) throw publishError

    const supabase = await createClient()
    await asPilotRpcClient(supabase).rpc('write_pilot_audit_event', {
      p_event_type: 'import_published', p_entity_type: 'pilot_import_batch', p_entity_id: batch.id,
      p_escola_id: batch.escola_id,
      p_metadata: {
        dataset: 'students',
        row_count: rows.length,
        canonical_counts: canonicalCounts,
        canonical_fingerprint_sha256: canonicalFingerprint,
        governance_recorded: true,
        plaintext_stored: false,
      },
    })
    return NextResponse.json({ batch: published })
  } catch (error) {
    return pilotErrorResponse(error, { feature: 'pilot-import-approval', fallbackCode: 'PILOT_APPROVAL_FAILED' })
  }
}
