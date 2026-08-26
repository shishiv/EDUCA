import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const password = 'Synthetic-Only-2026!'
const schoolA = '10000000-0000-0000-0000-000000000001'
const schoolB = '10000000-0000-0000-0000-000000000002'

async function signedInClient(email: string) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

test.describe('deployed Supabase isolation', () => {
  test('isolates directors and teachers across schools', async () => {
    const directorA = await signedInClient('diretora.a@synthetic.invalid')
    const directorB = await signedInClient('diretora.b@synthetic.invalid')
    const teacherA = await signedInClient('professora.a@synthetic.invalid')

    const [schoolsA, schoolsB, studentsA, studentsB, classesA, teachersA, schoolATeachersFromB] = await Promise.all([
      directorA.from('escolas').select('id'),
      directorB.from('escolas').select('id'),
      directorA.from('alunos').select('id,escola_id'),
      directorB.from('alunos').select('id,escola_id'),
      teacherA.from('turmas').select('id,escola_id'),
      directorA.from('users').select('id,escola_id').eq('tipo_usuario', 'professor'),
      directorB.from('users').select('id,escola_id').eq('tipo_usuario', 'professor').eq('escola_id', schoolA),
    ])
    expect(schoolsA.error).toBeNull()
    expect(schoolsA.data).toEqual([expect.objectContaining({ id: schoolA })])
    expect(schoolsB.data).toEqual([expect.objectContaining({ id: schoolB })])
    expect(studentsA.data?.every(row => row.escola_id === schoolA)).toBe(true)
    expect(studentsB.data?.every(row => row.escola_id === schoolB)).toBe(true)
    expect(classesA.data?.every(row => row.escola_id === schoolA)).toBe(true)
    expect(teachersA.data?.length).toBeGreaterThan(0)
    expect(teachersA.data?.every(row => row.escola_id === schoolA)).toBe(true)
    expect(schoolATeachersFromB.data).toEqual([])

    const forbiddenWrite = await teacherA.from('alunos').insert({
      nome_completo: 'Write Must Fail', data_nascimento: '2018-01-01', sexo: 'M', escola_id: schoolA,
    })
    expect(forbiddenWrite.error).not.toBeNull()
  })

  test('keeps secretariat municipal while views and RPCs honor RLS', async () => {
    const secretariat = await signedInClient('secretaria@synthetic.invalid')
    const { data: schools, error: schoolsError } = await secretariat.from('escolas').select('id')
    expect(schoolsError).toBeNull()
    expect(schools).toHaveLength(2)

    const { data: attendanceView, error: viewError } = await secretariat.from('vw_frequencia_completa').select('*')
    expect(viewError).toBeNull()
    expect(attendanceView).toHaveLength(1)
    expect(attendanceView?.[0]).not.toHaveProperty('aluno_cpf')
    expect(attendanceView?.[0]).not.toHaveProperty('professor_email')

    const { data: metrics, error: metricsError } = await secretariat.rpc('pilot_dashboard_metrics', { p_escola_id: schoolA })
    expect(metricsError).toBeNull()
    expect(metrics).toEqual(expect.arrayContaining([expect.objectContaining({ metric: 'attendance_capture_percent', target_met: true })]))

    const disabledNotes = await secretariat.from('notas').select('id')
    expect(disabledNotes.error).not.toBeNull()
  })

  test('enforces private school-prefixed storage policies', async () => {
    const directorA = await signedInClient('diretora.a@synthetic.invalid')
    const ownUpload = await directorA.storage.from('student-photos').upload(`${schoolA}/rls-test/avatar.png`, new Uint8Array([1, 2, 3]), { contentType: 'image/png', upsert: true })
    expect(ownUpload.error).toBeNull()
    const otherSchoolUpload = await directorA.storage.from('student-photos').upload(`${schoolB}/rls-test/avatar.png`, new Uint8Array([1, 2, 3]), { contentType: 'image/png', upsert: true })
    expect(otherSchoolUpload.error).not.toBeNull()

    const service = createClient(url, serviceKey, { auth: { persistSession: false } })
    await service.storage.from('student-photos').remove([`${schoolA}/rls-test/avatar.png`])
  })

  test('keeps audit append-only and redacted even for service role', async () => {
    const service = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: event, error: readError } = await service.from('pilot_audit_log').select('id,redacted_metadata').limit(1).single()
    expect(readError).toBeNull()
    expect(event?.redacted_metadata).not.toHaveProperty('cpf')
    expect(event?.redacted_metadata).not.toHaveProperty('nis')
    const mutation = await service.from('pilot_audit_log').update({ event_type: 'tampered' }).eq('id', event!.id)
    expect(mutation.error?.message).toContain('PILOT_AUDIT_APPEND_ONLY')
  })
})
