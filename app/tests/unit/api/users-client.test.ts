import { afterEach, describe, expect, it, vi } from 'vitest'
import { UsersApiService } from '@/lib/api/users'

const user = {
  ativo: true,
  created_at: '2026-09-08T12:00:00.000Z',
  data_ultimo_acesso: null,
  email: 'teacher@example.com',
  escola_id: 'school-1',
  id: 'user-1',
  nome: 'Professora Teste',
  primeiro_login: false,
  senha_padrao: false,
  tipo_usuario: 'professor',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UsersApiService mutation responses', () => {
  it('returns a validated user from a successful status update', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ user: { id: user.id, ativo: false } })))

    await expect(new UsersApiService().updateUserStatus(user.id, false)).resolves.toEqual({ id: user.id, ativo: false })
  })

  it('rejects an invalid successful teacher update payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ user: { id: user.id } })))

    await expect(new UsersApiService().updateManagedTeacher(user.id, {
      nome: user.nome,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
      escola_id: user.escola_id,
    })).rejects.toThrow()
  })

  it('uses a validated issue message from a failed teacher update', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: 'VALIDATION_ERROR',
      issues: [{ message: 'Escola inválida' }],
    }, { status: 400 })))

    await expect(new UsersApiService().updateManagedTeacher(user.id, {
      nome: user.nome,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
      escola_id: user.escola_id,
    })).rejects.toThrow('Escola inválida')
  })
})
