import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Github, Menu, X } from 'lucide-react'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EDUCA — Gestão Escolar Municipal Open Source',
  description:
    'Sistema aberto de gestão escolar para os 5.570 municípios brasileiros. Matrículas, chamada digital, boletim, frequência, relatórios INEP e mais.',
}

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/funcionalidades', label: 'Funcionalidades' },
  { href: '/demo', label: 'Demo' },
  { href: '/blog', label: 'Blog' },
  { href: '/comunidade', label: 'Comunidade' },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}

function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">EDUCA</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/shishiv/EDUCA"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </a>
        </nav>

        {/* Mobile menu toggle */}
        <details className="md:hidden">
          <summary className="list-none cursor-pointer p-2">
            <Menu className="h-5 w-5" />
          </summary>
          <nav className="absolute left-0 right-0 top-16 border-b bg-background p-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/shishiv/EDUCA"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </nav>
        </details>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-3">EDUCA</h3>
            <p className="text-sm text-muted-foreground">
              Sistema aberto de gestão escolar municipal.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-3">Navegação</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-3">Comunidade</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://github.com/shishiv/EDUCA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/educa_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Telegram
                </a>
              </li>
              <li>
                <span className="text-muted-foreground/60">Fórum (em breve)</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/politica-privacidade"
                  className="hover:text-foreground transition-colors"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/shishiv/EDUCA/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Licença MIT
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            Feito para os 5.570 municípios brasileiros. Código aberto sob
            licença MIT.
          </p>
        </div>
      </div>
    </footer>
  )
}
