import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { AuthProvider } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { renderWithMessages } from '../components/render-with-messages'

const router: AppRouterInstance = {
  back: vi.fn(), forward: vi.fn(), refresh: vi.fn(),
  push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), bfcacheId: 'login-test',
}
let signIn: MockInstance<typeof supabase.auth.signInWithPassword>

function renderLogin() {
  return renderWithMessages(
    <AppRouterContext.Provider value={router}>
      <SearchParamsContext.Provider value={new URLSearchParams()}>
        <AuthProvider><LoginPage /></AuthProvider>
      </SearchParamsContext.Provider>
    </AppRouterContext.Provider>,
  )
}

function fields() {
  return {
    email: screen.getByLabelText<HTMLInputElement>('E-mail'),
    password: screen.getByLabelText<HTMLInputElement>('Senha'),
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  vi.clearAllMocks()
  // Exercise the real auth provider and login adapter, stopping at the external Auth boundary.
  signIn = vi.spyOn(supabase.auth, 'signInWithPassword').mockRejectedValue(new Error('Invalid login credentials'))
  vi.spyOn(logger, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('explicit login submission', () => {
  // Initial values and restore-without-login belong to the public visitor E2E.
  it.each(['true', 'false'])('submits edited credentials only on Entrar and recovers from rejection with demo flag %s', async (flag) => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_SANDBOX', flag)
    renderLogin()
    const { email, password } = fields()

    fireEvent.change(email, { target: { value: 'operator@synthetic.invalid' } })
    fireEvent.change(password, { target: { value: 'synthetic-test-input' } })
    expect(signIn).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('button', { name: 'Entrando...' })).toBeDisabled()

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1))
    const submitted = signIn.mock.calls[0][0]
    expect('email' in submitted && submitted.email === 'operator@synthetic.invalid').toBe(true)
    expect(submitted.password === password.value).toBe(true)
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    expect(email.value).toBe('operator@synthetic.invalid')
    expect(password.value === 'synthetic-test-input').toBe(true)
    expect(router.replace).not.toHaveBeenCalled()
  })
})
