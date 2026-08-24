import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { EducaLanding } from '@/components/marketing/educa-landing'
import { getMessagesForLocale } from '@/i18n/messages'
import publicMessages from '@/messages/en/public.json'

describe('redesign localization contract', () => {
  it('ships English copy for public, dashboard, navigation, mobile, and students surfaces', () => {
    const messages = getMessagesForLocale('en') as unknown as {
      public: { landing: Record<string, string> }
      registry: { studentsList: Record<string, string> }
      layout: { mobileHeader: Record<string, string>; navigation: Record<string, string> }
      platform: { dashboard: Record<string, string> }
    }
    expect(messages.public.landing.heroTitle).toBe('A shared foundation for school management.')
    expect(messages.public.landing.privacy).toBe('Privacy policy')
    expect(messages.registry.studentsList.studentsCount).toContain('Students')
    expect(messages.layout.mobileHeader.openMenu).toBe('Open menu')
    expect(messages.layout.navigation.desktopAriaLabel).toBe('Main navigation')
    expect(messages.platform.dashboard.routines).toBe('Routines')
  })

  it('renders the redesigned public landing and privacy link in English', () => {
    render(
      <NextIntlClientProvider locale="en" messages={{ public: publicMessages }}>
        <EducaLanding />
      </NextIntlClientProvider>
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A shared foundation for school management.')
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/politica-privacidade')
  })
})
