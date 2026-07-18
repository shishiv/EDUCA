'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface NavigationItem {
  name: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

interface NavigationContextType {
  currentPath: string
  breadcrumbs: NavigationItem[]
  pageTitle: string
  setBreadcrumbs: (breadcrumbs: NavigationItem[]) => void
  setPageTitle: (title: string) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  lastVisitedPages: NavigationItem[]
  addToRecentlyVisited: (item: NavigationItem) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [breadcrumbs, setBreadcrumbs] = useState<NavigationItem[]>([])
  const [pageTitle, setPageTitle] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [lastVisitedPages, setLastVisitedPages] = useState<NavigationItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recently-visited-pages')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Save recently visited pages to localStorage
  useEffect(() => {
    localStorage.setItem('recently-visited-pages', JSON.stringify(lastVisitedPages))
  }, [lastVisitedPages])

  // Auto-generate breadcrumbs based on pathname
  useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const generatedBreadcrumbs: NavigationItem[] = []

    // Always start with dashboard home
    if (pathSegments.includes('dashboard')) {
      generatedBreadcrumbs.push({
        name: 'Dashboard',
        href: '/dashboard'
      })

      // Map path segments to readable names
      const pathMap: Record<string, string> = {
        'alunos': 'Alunos',
        'usuarios': 'Usuários',
        'escolas': 'Escolas',
        'turmas': 'Turmas',
        'matriculas': 'Matrículas',
        'frequencia': 'Frequência',
        'notas': 'Notas',
        'relatorios': 'Relatórios',
        'configuracoes': 'Configurações',
        'perfil': 'Meu Perfil',
        'novo': 'Novo',
        'nova': 'Nova',
        'editar': 'Editar'
      }

      let currentPath = ''
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i]
        currentPath += `/${segment}`

        if (segment === 'dashboard') continue

        // Skip ID segments (assuming they are UUIDs or numbers)
        if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ||
            segment.match(/^\d+$/)) {
          continue
        }

        const displayName = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

        generatedBreadcrumbs.push({
          name: displayName,
          href: currentPath
        })
      }
    }

    setBreadcrumbs(generatedBreadcrumbs)
  }, [pathname])

  const addToRecentlyVisited = (item: NavigationItem) => {
    setLastVisitedPages(prev => {
      // Remove if already exists
      const filtered = prev.filter(page => page.href !== item.href)
      // Add to beginning and limit to 5 items
      return [item, ...filtered].slice(0, 5)
    })
  }

  // Add current page to recently visited when breadcrumbs change
  useEffect(() => {
    if (breadcrumbs.length > 0) {
      const currentPage = breadcrumbs[breadcrumbs.length - 1]
      if (currentPage && currentPage.href !== '/dashboard') {
        addToRecentlyVisited(currentPage)
      }
    }
  }, [breadcrumbs])

  const value: NavigationContextType = {
    currentPath: pathname,
    breadcrumbs,
    pageTitle,
    setBreadcrumbs,
    setPageTitle,
    sidebarCollapsed,
    setSidebarCollapsed,
    lastVisitedPages,
    addToRecentlyVisited
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

// Hook for setting page-specific navigation data
export function usePageNavigation(title: string, customBreadcrumbs?: NavigationItem[]) {
  const { setPageTitle, setBreadcrumbs } = useNavigation()

  useEffect(() => {
    setPageTitle(title)
    if (customBreadcrumbs) {
      setBreadcrumbs(customBreadcrumbs)
    }
  }, [title, customBreadcrumbs, setPageTitle, setBreadcrumbs])
}