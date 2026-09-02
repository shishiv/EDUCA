import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import { EducaLanding } from '@/components/marketing/educa-landing'
import { PublicDemoExplainer } from '@/components/marketing/public-demo-explainer'
import { getMessagesForLocale } from '@/i18n/messages'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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
  it('ships the public product explanation and safety state in both locales', () => {
    const portuguese = getMessagesForLocale('pt-BR') as unknown as { public: { landing: Record<string, string> } }
    const english = getMessagesForLocale('en') as unknown as { public: { landing: Record<string, string> } }

    expect(portuguese.public.landing.heroTitle).toBe('Gestão escolar para redes municipais, com código aberto.')
    expect(portuguese.public.landing.productDescription).toContain('escolas, turmas, estudantes, matrículas e frequência')
    expect(portuguese.public.landing.audience).toContain('Secretaria de Educação')
    expect(portuguese.public.landing.syntheticState).toContain('demonstração sintética')
    expect(english.public.landing.heroTitle).toBe('School management for municipal networks, with open-source code.')
    expect(english.public.landing.productDescription).toContain('schools, classes, students, enrolments, and attendance')
    expect(english.public.landing.audience).toContain('education department')
    expect(english.public.landing.syntheticState).toContain('synthetic demonstration')
  })

  it('ships English copy for public, dashboard, navigation, mobile, and students surfaces', () => {
    const messages = getMessagesForLocale('en') as unknown as {
      public: { landing: Record<string, string> }
      registry: { studentsList: Record<string, string> }
      layout: { mobileHeader: Record<string, string>; navigation: Record<string, string> }
      platform: { dashboard: Record<string, string> }
    }
    expect(messages.public.landing.heroTitle).toBe('School management for municipal networks, with open-source code.')
    expect(messages.public.landing.heroEmphasis).toBe('')
    expect((getMessagesForLocale('pt-BR') as unknown as PublicMessages).public.landing.heroTitle).toBe('Gestão escolar para redes municipais, com código aberto.')
    expect(messages.public.landing.privacy).toBe('Privacy policy')
    expect(messages.registry.studentsList.studentsCount).toContain('Students')
    expect(messages.layout.mobileHeader.openMenu).toBe('Open menu')
    expect(messages.layout.navigation.desktopAriaLabel).toBe('Main navigation')
    expect(messages.platform.dashboard.routines).toBe('Routines')
  })

  it.each([
    ['pt-BR', getMessagesForLocale('pt-BR')],
    ['en', getMessagesForLocale('en')],
  ] as const)('uses literal demo copy for %s', (locale, messages) => {
    const demo = (messages as unknown as PublicMessages).public.demo
    expect(demo.login).toMatch(/login/i)
    expect(demo.facts.sharedEnvironment).toMatch(/(visitantes|visitors)/i)
    expect(demo.facts.reset).toMatch(/(apag|delet|reset)/i)
  })

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
    expect(screen.getAllByRole('link', { name: publicMessages.public.landing.login }).every(link => link.getAttribute('href') === '/login')).toBe(true)
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
})
