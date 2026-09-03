import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  assertVivenciaWriteAccess,
  requireVivenciaActor,
} from '@/lib/services/vivencias-auth'

describe('requireVivenciaActor', () => {
  it('maps unauthenticated attendance wording to the Vivências domain', async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('missing session'),
        }),
      },
    } as unknown as Pick<SupabaseClient<Database>, 'auth' | 'from'>

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
