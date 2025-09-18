'use client'

import { cn } from '@/lib/utils'

interface SkipLink {
  href: string
  label: string
  description?: string
}

interface SkipLinksProps {
  links?: SkipLink[]
  className?: string
}

// Default skip links for educational management system
const defaultSkipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Pular para o conteúdo principal',
    description: 'Ir diretamente para o conteúdo principal da página'
  },
  {
    href: '#navigation',
    label: 'Pular para a navegação',
    description: 'Ir para o menu de navegação principal'
  },
  {
    href: '#student-data',
    label: 'Pular para dados dos alunos',
    description: 'Ir diretamente para a lista de alunos'
  },
  {
    href: '#attendance-section',
    label: 'Pular para frequência',
    description: 'Ir para a seção de marcação de frequência'
  }
]

export function SkipLinks({ links = defaultSkipLinks, className }: SkipLinksProps) {
  return (
    <div className={cn('skip-links', className)}>
      <nav
        role="navigation"
        aria-label="Links de navegação rápida"
        className="sr-only focus-within:not-sr-only"
      >
        <ul className="skip-links-list">
          {links.map((link, index) => (
            <li key={index} className="skip-link-item">
              <a
                href={link.href}
                className="skip-link"
                aria-describedby={link.description ? `skip-desc-${index}` : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    const target = document.querySelector(link.href)
                    if (target) {
                      // Focus the target element
                      ;(target as HTMLElement).focus()
                      // Scroll into view
                      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }
                }}
              >
                {link.label}
              </a>
              {link.description && (
                <span
                  id={`skip-desc-${index}`}
                  className="sr-only"
                  role="tooltip"
                >
                  {link.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <style jsx>{`
        .skip-links {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 9999;
          width: 100%;
        }

        .skip-links-list {
          display: flex;
          flex-direction: column;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .skip-link-item {
          margin: 0;
          padding: 0;
        }

        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: #000;
          color: #fff;
          padding: 8px 16px;
          text-decoration: none;
          font-size: 16px;
          font-weight: bold;
          border-radius: 4px;
          border: 2px solid #fff;
          transition: top 0.3s ease;
          white-space: nowrap;
          z-index: 10000;
        }

        .skip-link:focus {
          top: 6px;
          outline: 2px solid #ffff00;
          outline-offset: 2px;
        }

        .skip-link:hover {
          background: #333;
          text-decoration: underline;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .skip-link {
            background: #000;
            color: #fff;
            border: 3px solid #fff;
          }

          .skip-link:focus {
            background: #fff;
            color: #000;
            border: 3px solid #000;
          }
        }

        /* Screen reader only utility */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .sr-only.focus-within:not-sr-only:focus-within,
        .focus-within:not-sr-only:focus-within {
          position: static;
          width: auto;
          height: auto;
          padding: inherit;
          margin: inherit;
          overflow: visible;
          clip: auto;
          white-space: normal;
        }
      `}</style>
    </div>
  )
}

// Educational-specific skip links for different pages
export const dashboardSkipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Pular para estatísticas do dashboard',
    description: 'Ir para as estatísticas principais do sistema educacional'
  },
  {
    href: '#navigation',
    label: 'Pular para navegação',
    description: 'Acessar menu de navegação principal'
  },
  {
    href: '#quick-actions',
    label: 'Pular para ações rápidas',
    description: 'Ir para os botões de ações rápidas do sistema'
  }
]

export const studentSkipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Pular para lista de alunos',
    description: 'Ir diretamente para a tabela de alunos cadastrados'
  },
  {
    href: '#navigation',
    label: 'Pular para navegação',
    description: 'Acessar menu de navegação principal'
  },
  {
    href: '#student-search',
    label: 'Pular para busca de alunos',
    description: 'Ir para o campo de pesquisa de alunos'
  },
  {
    href: '#add-student',
    label: 'Pular para cadastro de aluno',
    description: 'Ir para o botão de cadastrar novo aluno'
  }
]

export const attendanceSkipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Pular para marcação de frequência',
    description: 'Ir diretamente para a grade de frequência dos alunos'
  },
  {
    href: '#navigation',
    label: 'Pular para navegação',
    description: 'Acessar menu de navegação principal'
  },
  {
    href: '#class-selection',
    label: 'Pular para seleção de turma',
    description: 'Ir para o seletor de turma'
  },
  {
    href: '#attendance-grid',
    label: 'Pular para grade de frequência',
    description: 'Ir diretamente para os botões de marcação de frequência'
  },
  {
    href: '#attendance-summary',
    label: 'Pular para resumo da frequência',
    description: 'Ir para o resumo de presenças e faltas'
  }
]

export const reportsSkipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Pular para relatórios',
    description: 'Ir diretamente para os relatórios educacionais'
  },
  {
    href: '#navigation',
    label: 'Pular para navegação',
    description: 'Acessar menu de navegação principal'
  },
  {
    href: '#report-filters',
    label: 'Pular para filtros',
    description: 'Ir para os filtros de relatório'
  },
  {
    href: '#report-data',
    label: 'Pular para dados do relatório',
    description: 'Ir diretamente para os dados e gráficos do relatório'
  }
]

// Landmark component for proper ARIA landmarks
export function LandmarkRegion({
  children,
  role,
  ariaLabel,
  ariaLabelledBy,
  className,
  id,
  ...props
}: {
  children: React.ReactNode
  role: 'banner' | 'navigation' | 'main' | 'contentinfo' | 'complementary' | 'region'
  ariaLabel?: string
  ariaLabelledBy?: string
  className?: string
  id?: string
} & React.HTMLAttributes<HTMLElement>) {
  const Component = role === 'main' ? 'main' :
                   role === 'navigation' ? 'nav' :
                   role === 'banner' ? 'header' :
                   role === 'contentinfo' ? 'footer' :
                   'section'

  return (
    <Component
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn('landmark-region', className)}
      id={id}
      {...props}
    >
      {children}
    </Component>
  )
}

// Focus management utilities
export function useFocusManagement() {
  const focusElement = (selector: string | HTMLElement) => {
    const element = typeof selector === 'string'
      ? document.querySelector(selector) as HTMLElement
      : selector

    if (element) {
      // Make element focusable if it's not already
      if (!element.hasAttribute('tabindex') && !['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
        element.setAttribute('tabindex', '-1')
      }

      element.focus()

      // Announce to screen readers if it has a label
      const label = element.getAttribute('aria-label') || element.textContent?.trim()
      if (label) {
        announceToScreenReader(`Foco movido para: ${label}`)
      }
    }
  }

  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  const trapFocus = (containerSelector: string) => {
    const container = document.querySelector(containerSelector) as HTMLElement
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }

      if (e.key === 'Escape') {
        // Return focus to trigger element or close modal
        container.dispatchEvent(new CustomEvent('escape-pressed'))
      }
    }

    container.addEventListener('keydown', handleTabKey)

    // Focus first element
    firstElement?.focus()

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }

  return {
    focusElement,
    announceToScreenReader,
    trapFocus
  }
}