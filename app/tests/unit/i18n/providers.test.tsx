import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '@/app/providers'
import commonMessages from '@/messages/pt-BR/common.json'

beforeEach(() => {
  vi.stubGlobal('matchMedia', (media: string): MediaQueryList => ({
    media,
    matches: false,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => false,
  }))
})

afterEach(() => vi.unstubAllGlobals())

function renderProviders() {
  render(
    <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
      <Providers Auth={({ children }) => <>{children}</>} ServiceWorker={({ children }) => <>{children}</>}>
        <p>Conteúdo público</p>
      </Providers>
    </NextIntlClientProvider>
  )
}

describe('Providers locale presentation', () => {
  it('renders content without placing a locale overlay outside the page layout', () => {
    renderProviders()

    expect(screen.getByText('Conteúdo público')).toBeInTheDocument()
    expect(screen.queryByTestId('locale-switcher')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Notifications alt+T' })).toBeInTheDocument()
  })
})
