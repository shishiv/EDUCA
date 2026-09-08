import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'
import {
  assertVivenciaWriteAccess,
  requireVivenciaActor,
} from '@/lib/services/vivencias-auth'

describe('requireVivenciaActor', () => {
  it('maps unauthenticated attendance wording to the Vivências domain', async () => {
    const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async () => Response.json({ message: 'missing session' }, { status: 401 }),
      },
    })

    await expect(requireVivenciaActor(client)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'Autenticação obrigatória para acessar vivências',
    })
  })

  it.each(['admin', 'diretor', 'secretario'])('keeps %s write access denied', tipo_usuario => {
    expect(() => assertVivenciaWriteAccess(
      { userId: 'user-1', tipo_usuario, escola_id: 'school-1' },
      { escola_id: 'school-1', turma_id: 'class-1', professor_id: 'teacher-1', ativo: true },
      { escola_id: 'school-1', turma_id: 'class-1', professor_id: 'teacher-1' },
      { id: 'enrollment-1', aluno_id: 'student-1', turma_id: 'class-1', situacao: 'ativa' },
    )).toThrow('Apenas professores podem registrar vivências')
  })
})
