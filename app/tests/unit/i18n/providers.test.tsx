import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '@/app/providers'
import commonMessages from '@/messages/pt-BR/common.json'

const mocks = vi.hoisted(() => ({
  pathname: '/',
  refresh: vi.fn(),
  setUserLocale: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/i18n/actions', () => ({
  setUserLocale: mocks.setUserLocale,
}))

vi.mock('@/contexts/auth-context', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/providers/service-worker-provider', () => ({
  ServiceWorkerProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

function renderProviders(pathname: string) {
  mocks.pathname = pathname
  render(
    <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
      <Providers><p>Conteúdo público</p></Providers>
    </NextIntlClientProvider>
  )
}

describe('Providers locale presentation', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(['/', '/demo', '/login', '/politica-privacidade', '/blog'])('hides the floating locale selector on public path %s', pathname => {
    renderProviders(pathname)

    expect(screen.queryByTestId('locale-switcher')).not.toBeInTheDocument()
  })

  it('keeps the app locale selector on dashboard paths', () => {
    renderProviders('/dashboard')

    expect(screen.getByTestId('locale-switcher')).toHaveClass('locale-switcher--app')
  })
})
