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

  it.each(['/', '/demo', '/politica-privacidade'])('keeps the locale selector on %s', pathname => {
    renderProviders(pathname)

    expect(screen.getByTestId('locale-switcher')).toBeVisible()
  })

  it.each([
    '/blog',
    '/blog/lgpd-em-escola-municipal',
    '/blog/encarregado-de-dados-em-prefeitura',
    '/blog/dado-de-crianca-no-educacenso',
  ])('hides the locale selector on Portuguese-only blog route %s', pathname => {
    renderProviders(pathname)

    expect(screen.queryByTestId('locale-switcher')).not.toBeInTheDocument()
  })
})
