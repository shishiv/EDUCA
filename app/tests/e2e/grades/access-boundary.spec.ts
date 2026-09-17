import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { test, expect } from '../support/diagnostics'
import type { Database } from '@/types/database'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const auth = { autoRefreshToken: false, persistSession: false }

test('keeps grades hidden and immutable for every browser role in the canonical schema', async () => {
  if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname) || !serviceKey.startsWith('sb_secret_')) {
    throw new Error('Grades boundary proof requires isolated local Supabase')
  }
  const service = createClient<Database>(url, serviceKey, { auth })
  const enrollment = await service.from('matriculas').select('id').eq('situacao', 'ativa').limit(1).single()
  if (enrollment.error) throw enrollment.error
  const discipline = `Synthetic boundary ${randomUUID()}`
  const grade = {
    id: randomUUID(), matricula_id: enrollment.data.id, disciplina: discipline,
    bimestre: 1, nota: 8.4, tipo_avaliacao: 'synthetic boundary', data_avaliacao: '2026-03-15',
  }

  try {
    const inserted = await service.from('notas').insert(grade).select('id,nota').single()
    expect(inserted.error).toBeNull()
    expect(inserted.data).toEqual({ id: grade.id, nota: 8.4 })

    for (const role of ['admin', 'diretor', 'professor', 'secretario', 'responsavel']) {
      const client = createClient<Database>(url, anonKey, { auth })
      const login = await client.auth.signInWithPassword({ email: `${role}@test.com`, password: 'test123456' })
      if (login.error) throw login.error
      try {
        const read = await client.from('notas').select('id,nota').eq('id', grade.id)
        expect(read.error, role).toBeNull()
        expect(read.data, role).toEqual([])
        const write = await client.from('notas').insert({ ...grade, id: randomUUID(), bimestre: 2 })
        expect(write.error?.code, role).toBe('42501')
        await client.from('notas').update({ nota: 9 }).eq('id', grade.id)
        await client.from('notas').delete().eq('id', grade.id)
        const persisted = await service.from('notas').select('id,nota').eq('id', grade.id).single()
        expect(persisted.error, role).toBeNull()
        expect(persisted.data, role).toEqual({ id: grade.id, nota: 8.4 })
      } finally {
        await client.auth.signOut({ scope: 'local' })
      }
    }
    const anonymous = createClient<Database>(url, anonKey, { auth })
    const denied = await anonymous.from('notas').select('id').eq('id', grade.id)
    expect(denied.error?.code).toBe('42501')
  } finally {
    const cleanup = await service.from('notas').delete().eq('disciplina', discipline)
    if (cleanup.error) throw cleanup.error
  }
})
