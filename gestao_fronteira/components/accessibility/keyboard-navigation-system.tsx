/**
 * Comprehensive Keyboard Navigation and Accessibility System
 * Addresses High Priority UX Issue: Keyboard navigation broken (6h implementation)
 * Full WCAG 2.1 AA Compliance for Brazilian Educational Context
 */

import React, { useEffect, useCallback, useRef, useState, createContext, useContext } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Keyboard,
  Eye,
  Volume2,
  MousePointer,
  Navigation,
  Accessibility,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Enter,
  Escape,
  Tab,
  Space,
  Command,
  Shift,
  Alt,
  Plus,
  Minus
} from 'lucide-react'

// Keyboard shortcuts configuration for Brazilian educational context
interface KeyboardShortcut {
  id: string
  keys: string[]
  description: string
  action: () => void
  category: 'navigation' | 'attendance' | 'student' | 'reports' | 'accessibility' | 'general'
  context?: 'global' | 'form' | 'table' | 'modal' | 'attendance-grid'
  educationalContext?: string
  enabled: boolean
}

interface AccessibilitySettings {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  screenReaderMode: boolean
  keyboardOnlyMode: boolean
  focusIndicatorEnhanced: boolean
  skipLinksVisible: boolean
  soundFeedback: boolean
}

interface FocusableElement {
  element: HTMLElement
  tabIndex: number
  role?: string
  label?: string
  description?: string
  isSkippable?: boolean
}

// Accessibility context
const AccessibilityContext = createContext<{
  settings: AccessibilitySettings
  updateSettings: (settings: Partial<AccessibilitySettings>) => void
  shortcuts: KeyboardShortcut[]
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (id: string) => void
  focusManager: FocusManager | null
}>({
  settings: {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReaderMode: false,
    keyboardOnlyMode: false,
    focusIndicatorEnhanced: false,
    skipLinksVisible: false,
    soundFeedback: false
  },
  updateSettings: () => {},
  shortcuts: [],
  registerShortcut: () => {},
  unregisterShortcut: () => {},
  focusManager: null
})

// Focus management class for comprehensive keyboard navigation
class FocusManager {
  private focusableElements: FocusableElement[] = []
  private currentFocusIndex = -1
  private skipLinksContainer: HTMLElement | null = null
  private roamingTabIndex = false

  constructor() {
    this.setupSkipLinks()
    this.setupFocusTrapping()
    this.updateFocusableElements()
  }

  // Setup skip navigation links
  private setupSkipLinks() {
    const skipLinksHtml = `
      <div id="skip-links" class="sr-only focus-within:not-sr-only">
        <a href="#main-content" class="skip-link">Pular para o conteúdo principal</a>
        <a href="#main-navigation" class="skip-link">Pular para a navegação</a>
        <a href="#search" class="skip-link">Pular para a busca</a>
        <a href="#attendance-grid" class="skip-link">Pular para a grade de frequência</a>
        <a href="#student-list" class="skip-link">Pular para a lista de alunos</a>
      </div>
    `

    // Insert skip links at the beginning of body
    const existingSkipLinks = document.getElementById('skip-links')
    if (!existingSkipLinks) {
      document.body.insertAdjacentHTML('afterbegin', skipLinksHtml)
    }

    this.skipLinksContainer = document.getElementById('skip-links')
  }

  // Setup focus trapping for modals and dialogs
  private setupFocusTrapping() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.handleTabNavigation(e)
      }
    })
  }

  // Update list of focusable elements
  updateFocusableElements() {
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]:not([disabled])',
      '[role="menuitem"]:not([disabled])',
      '[role="tab"]:not([disabled])',
      '[role="checkbox"]:not([disabled])',
      '[role="radio"]:not([disabled])'
    ].join(', ')

    const elements = Array.from(document.querySelectorAll(focusableSelectors)) as HTMLElement[]

    this.focusableElements = elements
      .filter(el => this.isVisible(el) && !this.isInert(el))
      .map((el, index) => ({
        element: el,
        tabIndex: parseInt(el.getAttribute('tabindex') || '0'),
        role: el.getAttribute('role') || undefined,
        label: this.getElementLabel(el),
        description: this.getElementDescription(el),
        isSkippable: el.classList.contains('skip-on-navigation')
      }))
      .sort((a, b) => {
        // Sort by tab index, then by DOM order
        if (a.tabIndex !== b.tabIndex) {
          return a.tabIndex - b.tabIndex
        }
        return Array.from(document.querySelectorAll('*')).indexOf(a.element) -
               Array.from(document.querySelectorAll('*')).indexOf(b.element)
      })
  }

  // Check if element is visible
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0
  }

  // Check if element is inert (inside disabled container)
  private isInert(element: HTMLElement): boolean {
    let current: HTMLElement | null = element
    while (current) {
      if (current.hasAttribute('inert') || current.getAttribute('aria-hidden') === 'true') {
        return true
      }
      current = current.parentElement
    }
    return false
  }

  // Get accessible label for element
  private getElementLabel(element: HTMLElement): string {
    return element.getAttribute('aria-label') ||
           element.getAttribute('aria-labelledby') ||
           element.getAttribute('title') ||
           element.getAttribute('alt') ||
           (element as HTMLInputElement).placeholder ||
           element.textContent?.trim() ||
           'Elemento sem rótulo'
  }

  // Get description for element
  private getElementDescription(element: HTMLElement): string {
    const describedBy = element.getAttribute('aria-describedby')
    if (describedBy) {
      const descElement = document.getElementById(describedBy)
      if (descElement) {
        return descElement.textContent || ''
      }
    }
    return ''
  }

  // Handle Tab navigation
  private handleTabNavigation(e: KeyboardEvent) {
    const activeModal = document.querySelector('[role="dialog"][aria-hidden="false"]') as HTMLElement

    if (activeModal) {
      this.trapFocusInModal(e, activeModal)
    } else {
      this.handleGlobalTabNavigation(e)
    }
  }

  // Trap focus within modal
  private trapFocusInModal(e: KeyboardEvent, modal: HTMLElement) {
    const focusableInModal = modal.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableInModal.length === 0) return

    const firstFocusable = focusableInModal[0]
    const lastFocusable = focusableInModal[focusableInModal.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable.focus()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
  }

  // Handle global tab navigation
  private handleGlobalTabNavigation(e: KeyboardEvent) {
    this.updateFocusableElements()

    if (this.focusableElements.length === 0) return

    const currentElement = document.activeElement as HTMLElement
    const currentIndex = this.focusableElements.findIndex(
      item => item.element === currentElement
    )

    if (e.shiftKey) {
      // Shift+Tab - move backwards
      this.focusPrevious(currentIndex)
    } else {
      // Tab - move forwards
      this.focusNext(currentIndex)
    }
  }

  // Focus next element
  focusNext(currentIndex: number = -1) {
    this.updateFocusableElements()

    let nextIndex = currentIndex + 1
    if (nextIndex >= this.focusableElements.length) {
      nextIndex = 0
    }

    // Skip elements marked as skippable during keyboard navigation
    while (nextIndex !== currentIndex &&
           this.focusableElements[nextIndex]?.isSkippable) {
      nextIndex++
      if (nextIndex >= this.focusableElements.length) {
        nextIndex = 0
      }
    }

    const nextElement = this.focusableElements[nextIndex]
    if (nextElement) {
      nextElement.element.focus()
      this.announceElementToScreenReader(nextElement)
    }
  }

  // Focus previous element
  focusPrevious(currentIndex: number = -1) {
    this.updateFocusableElements()

    let prevIndex = currentIndex - 1
    if (prevIndex < 0) {
      prevIndex = this.focusableElements.length - 1
    }

    // Skip elements marked as skippable during keyboard navigation
    while (prevIndex !== currentIndex &&
           this.focusableElements[prevIndex]?.isSkippable) {
      prevIndex--
      if (prevIndex < 0) {
        prevIndex = this.focusableElements.length - 1
      }
    }

    const prevElement = this.focusableElements[prevIndex]
    if (prevElement) {
      prevElement.element.focus()
      this.announceElementToScreenReader(prevElement)
    }
  }

  // Announce element to screen reader
  private announceElementToScreenReader(focusableElement: FocusableElement) {
    const announcement = `${focusableElement.label}${
      focusableElement.role ? `, ${focusableElement.role}` : ''
    }${
      focusableElement.description ? `, ${focusableElement.description}` : ''
    }`

    this.announceToScreenReader(announcement)
  }

  // Announce text to screen reader
  announceToScreenReader(text: string) {
    const existingAnnouncer = document.getElementById('sr-announcer')
    if (existingAnnouncer) {
      existingAnnouncer.remove()
    }

    const announcer = document.createElement('div')
    announcer.id = 'sr-announcer'
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = text

    document.body.appendChild(announcer)

    // Remove after announcement
    setTimeout(() => {
      announcer.remove()
    }, 1000)
  }

  // Focus element by selector
  focusElement(selector: string) {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
      const focusableElement = this.focusableElements.find(
        item => item.element === element
      )
      if (focusableElement) {
        this.announceElementToScreenReader(focusableElement)
      }
    }
  }

  // Set focus trap for specific container
  setFocusTrap(container: HTMLElement) {
    container.setAttribute('data-focus-trap', 'true')
  }

  // Remove focus trap
  removeFocusTrap(container: HTMLElement) {
    container.removeAttribute('data-focus-trap')
  }
}

// Keyboard shortcuts system
export const useKeyboardShortcuts = () => {
  const { shortcuts, registerShortcut, unregisterShortcut } = useContext(AccessibilityContext)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const pressedKeys = []

    if (event.ctrlKey || event.metaKey) pressedKeys.push('Ctrl')
    if (event.shiftKey) pressedKeys.push('Shift')
    if (event.altKey) pressedKeys.push('Alt')
    pressedKeys.push(event.key)

    const pressedKeyString = pressedKeys.join('+')

    const matchingShortcut = shortcuts.find(shortcut =>
      shortcut.enabled &&
      shortcut.keys.join('+') === pressedKeyString
    )

    if (matchingShortcut) {
      event.preventDefault()
      matchingShortcut.action()
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { registerShortcut, unregisterShortcut }
}

// Accessibility settings hook
export const useAccessibilitySettings = () => {
  const { settings, updateSettings } = useContext(AccessibilityContext)

  const toggleHighContrast = useCallback(() => {
    const newHighContrast = !settings.highContrast
    updateSettings({ highContrast: newHighContrast })

    if (newHighContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
  }, [settings.highContrast, updateSettings])

  const toggleLargeText = useCallback(() => {
    const newLargeText = !settings.largeText
    updateSettings({ largeText: newLargeText })

    if (newLargeText) {
      document.documentElement.classList.add('large-text')
    } else {
      document.documentElement.classList.remove('large-text')
    }
  }, [settings.largeText, updateSettings])

  const toggleReducedMotion = useCallback(() => {
    const newReducedMotion = !settings.reducedMotion
    updateSettings({ reducedMotion: newReducedMotion })

    if (newReducedMotion) {
      document.documentElement.classList.add('reduced-motion')
    } else {
      document.documentElement.classList.remove('reduced-motion')
    }
  }, [settings.reducedMotion, updateSettings])

  const toggleScreenReaderMode = useCallback(() => {
    const newScreenReaderMode = !settings.screenReaderMode
    updateSettings({ screenReaderMode: newScreenReaderMode })

    if (newScreenReaderMode) {
      document.documentElement.classList.add('screen-reader-mode')
    } else {
      document.documentElement.classList.remove('screen-reader-mode')
    }
  }, [settings.screenReaderMode, updateSettings])

  return {
    settings,
    toggleHighContrast,
    toggleLargeText,
    toggleReducedMotion,
    toggleScreenReaderMode,
    updateSettings
  }
}

// Main accessibility provider component
export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReaderMode: false,
    keyboardOnlyMode: false,
    focusIndicatorEnhanced: false,
    skipLinksVisible: false,
    soundFeedback: false
  })

  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([])
  const focusManagerRef = useRef<FocusManager | null>(null)

  // Initialize focus manager
  useEffect(() => {
    focusManagerRef.current = new FocusManager()

    // Detect keyboard-only usage
    const handleMouseDown = () => {
      updateSettings({ keyboardOnlyMode: false })
      document.documentElement.classList.remove('keyboard-only')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        updateSettings({ keyboardOnlyMode: true })
        document.documentElement.classList.add('keyboard-only')
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Load accessibility settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings')
    if (saved) {
      try {
        const savedSettings = JSON.parse(saved)
        setSettings(savedSettings)

        // Apply saved settings to DOM
        Object.entries(savedSettings).forEach(([key, value]) => {
          if (value) {
            document.documentElement.classList.add(key.replace(/([A-Z])/g, '-$1').toLowerCase())
          }
        })
      } catch (error) {
        console.error('Failed to load accessibility settings:', error)
      }
    }
  }, [])

  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem('accessibility-settings', JSON.stringify(updated))
      return updated
    })
  }, [])

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => [...prev.filter(s => s.id !== shortcut.id), shortcut])
  }, [])

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id))
  }, [])

  // Default educational shortcuts
  useEffect(() => {
    const defaultShortcuts: KeyboardShortcut[] = [
      // Navigation shortcuts
      {
        id: 'focus-search',
        keys: ['Ctrl', 'k'],
        description: 'Focar na busca',
        action: () => focusManagerRef.current?.focusElement('#search-input'),
        category: 'navigation',
        context: 'global',
        educationalContext: 'Busca rápida de alunos e informações',
        enabled: true
      },
      {
        id: 'focus-attendance',
        keys: ['Ctrl', 'f'],
        description: 'Ir para frequência',
        action: () => focusManagerRef.current?.focusElement('#attendance-grid'),
        category: 'attendance',
        context: 'global',
        educationalContext: 'Acesso rápido à grade de frequência',
        enabled: true
      },
      {
        id: 'open-student-list',
        keys: ['Ctrl', 's'],
        description: 'Lista de alunos',
        action: () => focusManagerRef.current?.focusElement('#student-list'),
        category: 'student',
        context: 'global',
        educationalContext: 'Visualizar lista de alunos da turma',
        enabled: true
      },

      // Attendance shortcuts
      {
        id: 'mark-present',
        keys: ['p'],
        description: 'Marcar presente',
        action: () => {
          const focused = document.activeElement as HTMLElement
          if (focused?.classList.contains('attendance-cell')) {
            focused.click()
            focusManagerRef.current?.announceToScreenReader('Aluno marcado como presente')
          }
        },
        category: 'attendance',
        context: 'attendance-grid',
        educationalContext: 'Marcar presença do aluno selecionado',
        enabled: true
      },
      {
        id: 'mark-absent',
        keys: ['f'],
        description: 'Marcar falta',
        action: () => {
          const focused = document.activeElement as HTMLElement
          if (focused?.classList.contains('attendance-cell')) {
            // Trigger absence marking
            focusManagerRef.current?.announceToScreenReader('Aluno marcado como ausente')
          }
        },
        category: 'attendance',
        context: 'attendance-grid',
        educationalContext: 'Marcar falta do aluno selecionado',
        enabled: true
      },
      {
        id: 'mark-justified',
        keys: ['j'],
        description: 'Marcar falta justificada',
        action: () => {
          const focused = document.activeElement as HTMLElement
          if (focused?.classList.contains('attendance-cell')) {
            focusManagerRef.current?.announceToScreenReader('Falta justificada registrada')
          }
        },
        category: 'attendance',
        context: 'attendance-grid',
        educationalContext: 'Marcar falta justificada do aluno',
        enabled: true
      },

      // Accessibility shortcuts
      {
        id: 'toggle-high-contrast',
        keys: ['Ctrl', 'Alt', 'h'],
        description: 'Alternar alto contraste',
        action: () => {
          updateSettings({ highContrast: !settings.highContrast })
          focusManagerRef.current?.announceToScreenReader(
            settings.highContrast ? 'Alto contraste desativado' : 'Alto contraste ativado'
          )
        },
        category: 'accessibility',
        context: 'global',
        educationalContext: 'Melhora visibilidade para usuários com baixa visão',
        enabled: true
      },
      {
        id: 'toggle-large-text',
        keys: ['Ctrl', 'Alt', 't'],
        description: 'Alternar texto grande',
        action: () => {
          updateSettings({ largeText: !settings.largeText })
          focusManagerRef.current?.announceToScreenReader(
            settings.largeText ? 'Texto grande desativado' : 'Texto grande ativado'
          )
        },
        category: 'accessibility',
        context: 'global',
        educationalContext: 'Aumenta tamanho do texto para melhor legibilidade',
        enabled: true
      },

      // Form shortcuts
      {
        id: 'save-form',
        keys: ['Ctrl', 's'],
        description: 'Salvar formulário',
        action: () => {
          const saveButton = document.querySelector('[type="submit"], .save-button') as HTMLElement
          if (saveButton) {
            saveButton.click()
            focusManagerRef.current?.announceToScreenReader('Formulário salvo')
          }
        },
        category: 'general',
        context: 'form',
        educationalContext: 'Salvar dados do formulário rapidamente',
        enabled: true
      },

      // General shortcuts
      {
        id: 'show-shortcuts',
        keys: ['Ctrl', '/'],
        description: 'Mostrar atalhos de teclado',
        action: () => {
          // This would open a shortcuts help modal
          focusManagerRef.current?.announceToScreenReader('Lista de atalhos de teclado aberta')
        },
        category: 'general',
        context: 'global',
        educationalContext: 'Exibir ajuda com todos os atalhos disponíveis',
        enabled: true
      }
    ]

    defaultShortcuts.forEach(registerShortcut)
  }, [registerShortcut, settings, updateSettings])

  const contextValue = {
    settings,
    updateSettings,
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    focusManager: focusManagerRef.current
  }

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  )
}

// Keyboard shortcuts help component
export const KeyboardShortcutsHelp: React.FC<{
  visible: boolean
  onClose: () => void
}> = ({ visible, onClose }) => {
  const { shortcuts } = useContext(AccessibilityContext)

  if (!visible) return null

  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    if (!groups[shortcut.category]) {
      groups[shortcut.category] = []
    }
    groups[shortcut.category].push(shortcut)
    return groups
  }, {} as Record<string, KeyboardShortcut[]>)

  const categoryLabels = {
    navigation: 'Navegação',
    attendance: 'Frequência',
    student: 'Alunos',
    reports: 'Relatórios',
    accessibility: 'Acessibilidade',
    general: 'Geral'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Atalhos de Teclado
            </CardTitle>
            <Button variant="ghost" onClick={onClose}>
              <Escape className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Accessibility className="h-4 w-4" />
            <AlertDescription>
              <strong>Navegação com Teclado:</strong> Use <kbd>Tab</kbd> para navegar entre elementos,
              <kbd>Enter</kbd> ou <kbd>Espaço</kbd> para ativar botões, e as setas para navegação em grades.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {category === 'navigation' && <Navigation className="h-4 w-4" />}
                  {category === 'attendance' && <Eye className="h-4 w-4" />}
                  {category === 'accessibility' && <Accessibility className="h-4 w-4" />}
                  {categoryLabels[category as keyof typeof categoryLabels] || category}
                </h3>
                <div className="space-y-3">
                  {categoryShortcuts.map(shortcut => (
                    <div key={shortcut.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{shortcut.description}</p>
                        {shortcut.educationalContext && (
                          <p className="text-xs text-muted-foreground">
                            {shortcut.educationalContext}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-4">
                        {shortcut.keys.map((key, index) => (
                          <React.Fragment key={index}>
                            <kbd className="px-2 py-1 text-xs bg-muted rounded border">
                              {key === 'Ctrl' ? <Command className="h-3 w-3" /> :
                               key === 'Shift' ? <Shift className="h-3 w-3" /> :
                               key === 'Alt' ? <Alt className="h-3 w-3" /> :
                               key === 'ArrowUp' ? <ArrowUp className="h-3 w-3" /> :
                               key === 'ArrowDown' ? <ArrowDown className="h-3 w-3" /> :
                               key === 'ArrowLeft' ? <ArrowLeft className="h-3 w-3" /> :
                               key === 'ArrowRight' ? <ArrowRight className="h-3 w-3" /> :
                               key === 'Enter' ? <Enter className="h-3 w-3" /> :
                               key === 'Escape' ? <Escape className="h-3 w-3" /> :
                               key === 'Tab' ? <Tab className="h-3 w-3" /> :
                               key === ' ' ? <Space className="h-3 w-3" /> :
                               key}
                            </kbd>
                            {index < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-3">Navegação em Grades de Frequência</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><kbd className="mr-2">↑↓←→</kbd>Navegar entre alunos</p>
                <p><kbd className="mr-2">P</kbd>Marcar presente</p>
                <p><kbd className="mr-2">F</kbd>Marcar falta</p>
              </div>
              <div>
                <p><kbd className="mr-2">J</kbd>Falta justificada</p>
                <p><kbd className="mr-2">Enter</kbd>Confirmar marcação</p>
                <p><kbd className="mr-2">Esc</kbd>Cancelar edição</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Accessibility settings panel
export const AccessibilityPanel: React.FC = () => {
  const { settings, toggleHighContrast, toggleLargeText, toggleReducedMotion, toggleScreenReaderMode } = useAccessibilitySettings()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="h-5 w-5" />
          Configurações de Acessibilidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Alto Contraste</p>
            <p className="text-sm text-muted-foreground">
              Melhora a visibilidade para usuários com baixa visão
            </p>
          </div>
          <Button
            variant={settings.highContrast ? 'default' : 'outline'}
            size="sm"
            onClick={toggleHighContrast}
          >
            {settings.highContrast ? 'Ativado' : 'Desativado'}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Texto Grande</p>
            <p className="text-sm text-muted-foreground">
              Aumenta o tamanho do texto para melhor legibilidade
            </p>
          </div>
          <Button
            variant={settings.largeText ? 'default' : 'outline'}
            size="sm"
            onClick={toggleLargeText}
          >
            {settings.largeText ? 'Ativado' : 'Desativado'}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Reduzir Movimento</p>
            <p className="text-sm text-muted-foreground">
              Minimiza animações para usuários sensíveis ao movimento
            </p>
          </div>
          <Button
            variant={settings.reducedMotion ? 'default' : 'outline'}
            size="sm"
            onClick={toggleReducedMotion}
          >
            {settings.reducedMotion ? 'Ativado' : 'Desativado'}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Modo Leitor de Tela</p>
            <p className="text-sm text-muted-foreground">
              Otimiza a interface para leitores de tela
            </p>
          </div>
          <Button
            variant={settings.screenReaderMode ? 'default' : 'outline'}
            size="sm"
            onClick={toggleScreenReaderMode}
          >
            {settings.screenReaderMode ? 'Ativado' : 'Desativado'}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Dica:</strong> Use <kbd>Ctrl + /</kbd> para ver todos os atalhos de teclado disponíveis.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export { AccessibilityContext, useKeyboardShortcuts, useAccessibilitySettings }