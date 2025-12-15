import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter, Lexend, Caveat } from 'next/font/google'
import { Providers } from './providers'

// EDUCA Brand Guidelines v1.0 - Typography
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EDUCA - Sistema de Gestão Escolar | Fronteira/MG',
  description: 'Sistema completo para gestão da rede municipal de ensino de Fronteira/MG. Chamada digital, diário de classe, notas e relatórios.',
  keywords: ['educação', 'gestão escolar', 'Fronteira', 'MG', 'diário de classe', 'chamada digital'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#059669',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${lexend.variable} ${caveat.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}