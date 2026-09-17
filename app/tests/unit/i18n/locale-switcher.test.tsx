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
    mocks.setUserLocale.mockImplementation(() => new Promise(() => {}))
  })

  it('exposes a labelled compact locale button', () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher variant="button" />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('button', { name: 'Mudar idioma para English' })).toHaveTextContent('PT')
    expect(screen.getByTestId('locale-switcher')).toHaveClass('locale-switcher--button')
  })

  it('switches to the other locale from the compact button', async () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher variant="button" />
      </NextIntlClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mudar idioma para English' }))

    await waitFor(() => expect(mocks.setUserLocale).toHaveBeenCalledWith('en'))
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
