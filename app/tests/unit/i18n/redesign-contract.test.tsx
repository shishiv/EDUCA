import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { EducaLanding } from '@/components/marketing/educa-landing'
import { PublicDemoExplainer } from '@/components/marketing/public-demo-explainer'
import { PublicHeader } from '@/components/marketing/public-header'
import { getMessagesForLocale } from '@/i18n/messages'
import type { AppLocale } from '@/i18n/config'
import publicEn from '@/messages/en/public.json'
import publicPtBr from '@/messages/pt-BR/public.json'

type PublicMessages = {
  landing: Record<string, string>
  demo: {
    title: string
    intro: string
    facts: Record<string, string>
    login: string
    home: string
  }
}

type PublicContract = {
  locale: AppLocale
  messages: ReturnType<typeof getMessagesForLocale>
  publicMessages: PublicMessages
}

const publicContracts: PublicContract[] = [
  { locale: 'pt-BR', messages: getMessagesForLocale('pt-BR'), publicMessages: publicPtBr },
  { locale: 'en', messages: getMessagesForLocale('en'), publicMessages: publicEn },
]

describe('redesign localization contract', () => {
  it.each(publicContracts)('renders the public landing contract in $locale', ({ locale, messages, publicMessages }) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <EducaLanding />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      `${publicMessages.landing.heroTitle} ${publicMessages.landing.heroEmphasis}`
    )
    expect(screen.getByText(publicMessages.landing.productDescription)).toBeVisible()
    expect(screen.getByText(publicMessages.landing.syntheticState)).toBeVisible()

    // The demo call to action is repeated in the header and in the hero under
    // one label, and both reach the same destination.
    const demoLinks = screen.getAllByRole('link', { name: publicMessages.landing.demo })
    expect(demoLinks.length).toBeGreaterThanOrEqual(2)
    for (const link of demoLinks) expect(link).toHaveAttribute('href', '/demo')
    expect(screen.getAllByRole('link', { name: publicMessages.landing.login })[0]).toHaveAttribute('href', '/login')
    expect(screen.getAllByRole('button', { name: /language|idioma/i })).not.toHaveLength(0)
    expect(screen.getByRole('link', { name: publicMessages.landing.privacy })).toHaveAttribute('href', '/politica-privacidade')
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === 'https://github.com/shishiv/EDUCA')).toBe(true)

    // Feature rows have no destination yet, so they must carry no link affordance.
    for (const feature of [publicMessages.landing.module1Title, publicMessages.landing.module2Title, publicMessages.landing.module3Title]) {
      expect(screen.queryByRole('link', { name: feature })).not.toBeInTheDocument()
    }

    const renderedText = document.body.textContent ?? ''
    expect(renderedText).not.toMatch(/measured impact|measured impact|adoption claim|production ready/i)
  })

  it.each(publicContracts)('renders the demo safety contract in $locale', ({ locale, messages, publicMessages }) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PublicDemoExplainer />
      </NextIntlClientProvider>
    )

    const demo = publicMessages.demo
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(demo.title)
    for (const fact of Object.values(demo.facts)) expect(screen.getByText(fact)).toBeVisible()
    expect(screen.getByRole('link', { name: demo.login })).toHaveAttribute('href', '/login')
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === '/')).toBe(true)
  })

  it.each(publicContracts)('renders the compact locale button in the public header for $locale', ({ locale, messages }) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PublicHeader pathname="/demo" />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('button', { name: /language|idioma/i })).toBeVisible()
  })

  it.each(['/blog', '/blog/encarregado-de-dados-em-prefeitura'])('omits the locale button on %s', (route) => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={getMessagesForLocale('pt-BR')}>
        <PublicHeader pathname={route} />
      </NextIntlClientProvider>
    )

    expect(screen.queryByRole('button', { name: /language|idioma/i })).not.toBeInTheDocument()
  })
})
