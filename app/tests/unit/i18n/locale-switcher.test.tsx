import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'
import commonMessages from '@/messages/pt-BR/common.json'

const setUserLocale = vi.fn()

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setUserLocale.mockImplementation(() => new Promise(() => {}))
  })

  it('exposes a labelled compact locale button', () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher variant="button" persistLocale={setUserLocale} />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('button', { name: 'Mudar idioma para English' })).toHaveTextContent('PT')
    expect(screen.getByTestId('locale-switcher')).toHaveClass('locale-switcher--button')
  })

  it('switches to the other locale from the compact button', async () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher variant="button" persistLocale={setUserLocale} />
      </NextIntlClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mudar idioma para English' }))

    await waitFor(() => expect(setUserLocale).toHaveBeenCalledWith('en'))
  })

  it('persists a supported locale', async () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher persistLocale={setUserLocale} />
      </NextIntlClientProvider>
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } })

    await waitFor(() => expect(setUserLocale).toHaveBeenCalledWith('en'))
  })

  it('announces persistence failures and restores the active locale', async () => {
    setUserLocale.mockRejectedValueOnce(new Error('network'))
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher persistLocale={setUserLocale} />
      </NextIntlClientProvider>
    )

    const selector = screen.getByRole('combobox')
    fireEvent.change(selector, { target: { value: 'en' } })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível alterar o idioma. Tente novamente.'
    )
    expect(selector).toHaveValue('pt-BR')
  })

  it('keeps the header button usable and announces a failed language change', async () => {
    setUserLocale.mockRejectedValueOnce(new Error('network'))
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{ common: commonMessages }}>
        <LocaleSwitcher variant="button" persistLocale={setUserLocale} />
      </NextIntlClientProvider>
    )

    const button = screen.getByRole('button', { name: 'Mudar idioma para English' })
    fireEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível alterar o idioma. Tente novamente.')
    expect(button).toBeEnabled()
    expect(button).toHaveTextContent('PT')
  })
})
