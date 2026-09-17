import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { getMessagesForLocale } from '@/i18n/messages'

function Messages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider locale="pt-BR" timeZone="America/Sao_Paulo" messages={getMessagesForLocale('pt-BR')}>
    {children}
  </NextIntlClientProvider>
}

export function renderWithMessages(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { ...options, wrapper: Messages })
}
