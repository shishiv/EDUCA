import './globals.css'
import type { Metadata } from 'next'
import { Inter, Lexend, Caveat } from 'next/font/google'
import { Providers } from './providers'

// Body text font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Display/heading font
const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

// Decorative/cursive font for child-friendly elements
const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'EDUCA - Sistema de Gestão Escolar Municipal',
  description: 'Sistema aberto de gestão escolar para municípios brasileiros',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${lexend.variable} ${caveat.variable}`}>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
