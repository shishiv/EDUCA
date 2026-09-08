import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { Providers } from '@/app/providers'
import commonMessages from '@/messages/pt-BR/common.json'

function renderProviders(pathname: string) {
  render(
    <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
      <Providers pathname={pathname} Auth={({ children }) => <>{children}</>} ServiceWorker={({ children }) => <>{children}</>}>
        <p>Conteúdo público</p>
      </Providers>
    </NextIntlClientProvider>
  )
}

describe('Providers locale presentation', () => {
  it.each(['/', '/demo', '/login', '/politica-privacidade', '/blog'])('hides the floating locale selector on public path %s', pathname => {
    renderProviders(pathname)

    expect(screen.queryByTestId('locale-switcher')).not.toBeInTheDocument()
  })

  it('keeps the app locale selector on dashboard paths', () => {
    renderProviders('/dashboard')

    expect(screen.getByTestId('locale-switcher')).toHaveClass('locale-switcher--app')
  })
})
