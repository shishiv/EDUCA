import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import { EducaLanding } from '@/components/marketing/educa-landing'
import { PublicDemoExplainer } from '@/components/marketing/public-demo-explainer'
import { PublicHeader } from '@/components/marketing/public-header'
import { getMessagesForLocale } from '@/i18n/messages'

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/' } }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => pathname.current,
}))

type PublicMessages = {
  public: {
    landing: Record<string, string>
    demo: {
      title: string
      intro: string
      facts: Record<string, string>
      login: string
      home: string
    }
  }
}

describe('redesign localization contract', () => {
  it.each([
    ['pt-BR', getMessagesForLocale('pt-BR')],
    ['en', getMessagesForLocale('en')],
  ] as const)('renders the public landing contract in %s', (locale, messages) => {
    const publicMessages = messages as unknown as PublicMessages
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <EducaLanding />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('heading', { level: 1 })).toBeVisible()
    expect(screen.getByText(publicMessages.public.landing.productDescription)).toBeVisible()
    expect(screen.getByText(publicMessages.public.landing.syntheticState)).toBeVisible()
    expect(screen.getByRole('link', { name: publicMessages.public.landing.demo })).toHaveAttribute('href', '/demo')
    expect(screen.getByRole('link', { name: publicMessages.public.landing.meet })).toHaveAttribute('href', '/demo')
    expect(screen.queryByRole('link', { name: publicMessages.public.landing.login })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /language|idioma/i })).not.toHaveLength(0)
    expect(screen.getByRole('link', { name: publicMessages.public.landing.privacy })).toHaveAttribute('href', '/politica-privacidade')
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === 'https://github.com/shishiv/EDUCA')).toBe(true)

    const renderedText = document.body.textContent ?? ''
    expect(renderedText).not.toMatch(/measured impact|measured impact|adoption claim|production ready/i)
  })

  it.each([
    ['pt-BR', getMessagesForLocale('pt-BR')],
    ['en', getMessagesForLocale('en')],
  ] as const)('renders the demo safety contract in %s', (locale, messages) => {
    const publicMessages = messages as unknown as PublicMessages
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PublicDemoExplainer />
      </NextIntlClientProvider>
    )

    const demo = publicMessages.public.demo
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(demo.title)
    for (const fact of Object.values(demo.facts)) expect(screen.getByText(fact)).toBeVisible()
    expect(screen.getByRole('link', { name: demo.login })).toHaveAttribute('href', '/login')
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === '/')).toBe(true)
  })

  it.each([
    ['pt-BR', getMessagesForLocale('pt-BR')],
    ['en', getMessagesForLocale('en')],
  ] as const)('renders the compact locale button in the public header for %s', (locale, messages) => {
    pathname.current = '/demo'
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PublicHeader />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('button', { name: /language|idioma/i })).toBeVisible()
  })

  it.each(['/blog', '/blog/encarregado-de-dados-em-prefeitura'])('omits the locale button on %s', (route) => {
    pathname.current = route
    render(
      <NextIntlClientProvider locale="pt-BR" messages={getMessagesForLocale('pt-BR')}>
        <PublicHeader />
      </NextIntlClientProvider>
    )

    expect(screen.queryByRole('button', { name: /language|idioma/i })).not.toBeInTheDocument()
  })
})
