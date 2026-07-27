import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { decryptSyntheticCsvFromStaging, validateSyntheticStudentCsv } from '@/lib/pilot/synthetic-csv-import'

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
  const { data, error } = await service.from(table).insert({ ...values, escola_id: schoolId, import_source_id: sourceId }).select('id').single()
  if (error) throw error
  return data.id
}

export async function POST(request: Request, context: { params: Promise<{ batchId: string }> }) {
  try {
    assertSyntheticPilotSafety('import')
    const actor = await requirePilotActor(['diretor'])
    if (!actor.schoolId) return NextResponse.json({ error: 'PILOT_APPROVAL_SCHOOL_REQUIRED' }, { status: 403 })
    const { batchId } = await context.params
    const body = await request.json() as { decision?: 'approved' | 'rejected' }
    if (!['approved', 'rejected'].includes(body.decision || '')) return NextResponse.json({ error: 'PILOT_APPROVAL_INVALID_DECISION' }, { status: 400 })

    const service = createServiceRoleClient()
    const { data: batch, error: batchError } = await service.from('pilot_import_batches').select('*').eq('id', batchId).single()
    if (batchError || !batch) return NextResponse.json({ error: 'PILOT_IMPORT_BATCH_NOT_FOUND' }, { status: 404 })
    if (batch.escola_id !== actor.schoolId || batch.submitted_by === actor.id) return NextResponse.json({ error: 'PILOT_IMPORT_MAKER_CHECKER_DENIED' }, { status: 403 })
    if (batch.status === 'published' || batch.status === 'rejected') return NextResponse.json({ batch, idempotentReplay: true })

    const reportSha256 = createHash('sha256').update(JSON.stringify(batch.validation_report)).digest('hex')
    const { error: approvalError } = await service.from('pilot_import_approvals').upsert({
      batch_id: batch.id, escola_id: batch.escola_id, submitted_by: batch.submitted_by,
      approved_by: actor.id, decision: body.decision!, report_sha256: reportSha256,
    }, { onConflict: 'batch_id' })
    if (approvalError) throw approvalError

    if (body.decision === 'rejected') {
      const { data: rejected, error } = await service.from('pilot_import_batches').update({
        status: 'rejected', approved_by: actor.id, approved_at: new Date().toISOString(),
        encrypted_payload: null, iv: null, auth_tag: null, cleaned_at: new Date().toISOString(),
      }).eq('id', batch.id).select('id,status,cleaned_at').single()
      if (error) throw error
      return NextResponse.json({ batch: rejected })
    }

    const key = process.env.PILOT_IMPORT_ENCRYPTION_KEY
    if (!key || !batch.encrypted_payload || !batch.iv || !batch.auth_tag) throw new Error('PILOT_IMPORT_ENCRYPTED_PAYLOAD_MISSING')
    const csv = decryptSyntheticCsvFromStaging({
      encryptionKeyId: batch.encryption_key_id,
      ciphertext: batch.encrypted_payload,
      iv: batch.iv,
      authTag: batch.auth_tag,
    }, key)
    const { rows, report } = validateSyntheticStudentCsv(csv)
    if (!report.valid || report.contentSha256 !== batch.content_sha256) throw new Error('PILOT_IMPORT_INTEGRITY_FAILED')

    await service.from('pilot_import_batches').update({ status: 'approved', approved_by: actor.id, approved_at: new Date().toISOString() }).eq('id', batch.id)
    for (const row of rows) {
      const { data: turma, error: turmaError } = await service.from('turmas').select('id,ano_letivo').eq('escola_id', batch.escola_id).eq('import_source_id', row.class_code).single()
      if (turmaError || !turma) throw new Error(`PILOT_IMPORT_CLASS_NOT_FOUND: row ${row.source_id}`)
      const guardianId = await findOrCreateByImportSource(service, 'responsaveis', batch.escola_id, `guardian:${row.source_id}`, {
        nome: row.guardian_name, parentesco: row.guardian_relationship, telefone: row.guardian_phone,
      })
      const studentId = await findOrCreateByImportSource(service, 'alunos', batch.escola_id, row.source_id, {
        nome_completo: row.student_name, data_nascimento: row.birth_date, sexo: row.sex, responsavel_id: guardianId,
      })
      const { error: linkError } = await service.from('aluno_responsaveis').upsert({
        aluno_id: studentId, responsavel_id: guardianId, tipo_responsabilidade: row.guardian_relationship,
      }, { onConflict: 'aluno_id,responsavel_id' })
      if (linkError) throw linkError
      const { error: enrollmentError } = await service.from('matriculas').upsert({
        aluno_id: studentId, turma_id: turma.id, ano_letivo: turma.ano_letivo, situacao: 'ativa', observacoes: 'synthetic pilot CSV import',
      }, { onConflict: 'aluno_id,turma_id,ano_letivo' })
      if (enrollmentError) throw enrollmentError
    }

    const now = new Date().toISOString()
    const { data: published, error: publishError } = await service.from('pilot_import_batches').update({
      status: 'published', published_at: now, encrypted_payload: null, iv: null, auth_tag: null, cleaned_at: now,
    }).eq('id', batch.id).select('id,status,published_at,cleaned_at').single()
    if (publishError) throw publishError

    const supabase = await createClient()
    await asPilotRpcClient(supabase).rpc('write_pilot_audit_event', {
      p_event_type: 'import_published', p_entity_type: 'pilot_import_batch', p_entity_id: batch.id,
      p_escola_id: batch.escola_id, p_metadata: { dataset: 'students', row_count: rows.length },
    })
    return NextResponse.json({ batch: published })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PILOT_APPROVAL_FAILED'
    const status = message.includes('AUTH_REQUIRED') ? 401 : message.includes('ROLE_DENIED') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
