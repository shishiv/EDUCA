import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useCreateUser,
  useBulkUpdateUserStatus,
  useBulkAssignSchool,
} from '@/hooks/use-users-query'

/**
 * Unit Tests: User query mutation flows
 *
 * These are the flows that used to call the console.debug stubs
 * (addRecentActivity / clearBulkSelection). The stubs were removed,
 * so the tests pin the real externally visible behavior: API calls,
 * query invalidation, and user toasts still happen, and no console
 * debug output is emitted.
 */

const { usersApiMock, toastMock } = vi.hoisted(() => ({
  usersApiMock: {
    createUser: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkAssignSchool: vi.fn(),
  },
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/api/users', () => ({
  usersApi: usersApiMock,
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

describe('useCreateUser flow', () => {
  let queryClient: QueryClient
  let invalidateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = makeQueryClient()
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates the user, invalidates user queries, and toasts success', async () => {
    usersApiMock.createUser.mockResolvedValue({
      id: 'u-1',
      email: 'maria@escola.edu.br',
      nome: 'Maria Souza',
      tipo_usuario: 'secretario',
    })

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({
        id: 'u-1',
        email: 'maria@escola.edu.br',
        nome: 'Maria Souza',
        tipo_usuario: 'secretario',
      })
    })

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('Usuário criado com sucesso!'),
    )

    expect(usersApiMock.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u-1', nome: 'Maria Souza' }),
    )
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users', 'stats'] })
  })

  it('shows the error toast when creation fails', async () => {
    usersApiMock.createUser.mockRejectedValue(new Error('falha de rede'))

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({
        id: 'u-1',
        email: 'maria@escola.edu.br',
        nome: 'Maria Souza',
        tipo_usuario: 'secretario',
      })
    })

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('falha de rede'))
  })
})

describe('useBulkUpdateUserStatus flow', () => {
  let queryClient: QueryClient
  let invalidateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = makeQueryClient()
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updates statuses, invalidates user queries, and toasts the count', async () => {
    usersApiMock.bulkUpdateStatus.mockResolvedValue([
      { id: 'u-1', ativo: false },
      { id: 'u-2', ativo: false },
    ])

    const { result } = renderHook(() => useBulkUpdateUserStatus(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ userIds: ['u-1', 'u-2'], ativo: false })
    })

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('2 usuários desativados com sucesso!'),
    )

    expect(usersApiMock.bulkUpdateStatus).toHaveBeenCalledWith(['u-1', 'u-2'], false, undefined)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users', 'stats'] })
  })
})

describe('useBulkAssignSchool flow', () => {
  let queryClient: QueryClient
  let invalidateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = makeQueryClient()
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('assigns schools, invalidates user queries, and toasts the count', async () => {
    usersApiMock.bulkAssignSchool.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }])

    const { result } = renderHook(() => useBulkAssignSchool(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ userIds: ['u-1', 'u-2'], escolaId: 'esc-1' })
    })

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('2 usuários atribuídos à escola com sucesso!'),
    )

    expect(usersApiMock.bulkAssignSchool).toHaveBeenCalledWith(['u-1', 'u-2'], 'esc-1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users', 'stats'] })
  })
})

describe('stub removal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('never emits console.debug from the mutation flows', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    const queryClient = makeQueryClient()
    usersApiMock.createUser.mockResolvedValue({
      id: 'u-1',
      email: 'maria@escola.edu.br',
      nome: 'Maria Souza',
      tipo_usuario: 'secretario',
    })

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({
        id: 'u-1',
        email: 'maria@escola.edu.br',
        nome: 'Maria Souza',
        tipo_usuario: 'secretario',
      })
    })

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('Usuário criado com sucesso!'),
    )

    expect(debugSpy).not.toHaveBeenCalled()
  })
})
