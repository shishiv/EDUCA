import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'
import commonMessages from '@/messages/pt-BR/common.json'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  setUserLocale: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/i18n/actions', () => ({
  setUserLocale: mocks.setUserLocale,
}))

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.setUserLocale.mockResolvedValue(undefined)
  })

  it('exposes a labelled native selector with Portuguese selected by default', () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher variant="public" />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('combobox', { name: 'Idioma da aplicação' })).toHaveValue('pt-BR')
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByTestId('locale-switcher')).toHaveClass('locale-switcher--public')
  })

  it('persists a supported locale', async () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher />
      </NextIntlClientProvider>
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } })

    await waitFor(() => expect(mocks.setUserLocale).toHaveBeenCalledWith('en'))
  })

  it('announces persistence failures and restores the active locale', async () => {
    mocks.setUserLocale.mockRejectedValueOnce(new Error('network'))
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher />
      </NextIntlClientProvider>
    )

    const selector = screen.getByRole('combobox')
    fireEvent.change(selector, { target: { value: 'en' } })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível alterar o idioma. Tente novamente.'
    )
    expect(selector).toHaveValue('pt-BR')
  })
})
