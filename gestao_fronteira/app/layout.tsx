import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Gestão Escolar - Fronteira/MG',
  description: 'Sistema completo para gestão da rede municipal de ensino de Fronteira/MG',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Preload critical municipal assets for performance */}
        <link
          rel="preload"
          href="/identity/brasao.png"
          as="image"
          type="image/png"
        />
        <link
          rel="preload"
          href="/identity/logo-completo.png"
          as="image"
          type="image/png"
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}