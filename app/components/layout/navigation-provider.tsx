'use client'

import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react'
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
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<{
    pathname: string
    items: NavigationItem[]
  } | null>(null)
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

  // Breadcrumbs are derived from the URL instead of synchronized via an effect.
  const generatedBreadcrumbs = useMemo<NavigationItem[]>(() => {
    const pathSegments = pathname.split('/').filter(Boolean)
    if (!pathSegments.includes('dashboard')) return []

    const result: NavigationItem[] = [{ name: 'Dashboard', href: '/dashboard' }]
    const pathMap: Record<string, string> = {
      alunos: 'Alunos', usuarios: 'Usuários', escolas: 'Escolas', turmas: 'Turmas',
      matriculas: 'Matrículas', frequencia: 'Frequência', notas: 'Notas',
      relatorios: 'Relatórios', configuracoes: 'Configurações', perfil: 'Meu Perfil',
      novo: 'Novo', nova: 'Nova', editar: 'Editar',
    }

    let currentPath = ''
    for (const segment of pathSegments) {
      currentPath += `/${segment}`
      if (segment === 'dashboard') continue
      if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(segment) || /^\d+$/.test(segment)) continue
      result.push({
        name: pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
      })
    }
    return result
  }, [pathname])

  const breadcrumbs = customBreadcrumbs?.pathname === pathname
    ? customBreadcrumbs.items
    : generatedBreadcrumbs

  const setBreadcrumbs = useCallback((items: NavigationItem[]) => {
    setCustomBreadcrumbs({ pathname, items })
  }, [pathname])

  const addToRecentlyVisited = (item: NavigationItem) => {
    setLastVisitedPages(prev => {
      // Remove if already exists
      const filtered = prev.filter(page => page.href !== item.href)
      // Add to beginning and limit to 5 items
      return [item, ...filtered].slice(0, 5)
    })
  }

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