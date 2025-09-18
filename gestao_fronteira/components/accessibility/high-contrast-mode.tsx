'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Monitor, Contrast, Sun } from 'lucide-react'

// High contrast mode context for accessibility
interface HighContrastContextType {
  isHighContrast: boolean
  toggleHighContrast: () => void
  contrastLevel: 'normal' | 'high' | 'extra-high'
  setContrastLevel: (level: 'normal' | 'high' | 'extra-high') => void
}

const HighContrastContext = createContext<HighContrastContextType | undefined>(undefined)

export function useHighContrast() {
  const context = useContext(HighContrastContext)
  if (!context) {
    throw new Error('useHighContrast must be used within a HighContrastProvider')
  }
  return context
}

interface HighContrastProviderProps {
  children: React.ReactNode
}

export function HighContrastProvider({ children }: HighContrastProviderProps) {
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [contrastLevel, setContrastLevel] = useState<'normal' | 'high' | 'extra-high'>('normal')

  useEffect(() => {
    // Check for system preference on mount
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches)
      if (e.matches) {
        setContrastLevel('high')
      }
    }

    mediaQuery.addEventListener('change', handleChange)

    // Check local storage for user preference
    const savedContrast = localStorage.getItem('high-contrast-mode')
    if (savedContrast === 'true') {
      setIsHighContrast(true)
    }

    const savedLevel = localStorage.getItem('contrast-level') as 'normal' | 'high' | 'extra-high'
    if (savedLevel) {
      setContrastLevel(savedLevel)
    }

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    // Apply contrast classes to document
    const body = document.body

    // Remove all contrast classes
    body.classList.remove('high-contrast', 'extra-high-contrast', 'normal-contrast')

    // Apply current contrast level
    if (isHighContrast) {
      if (contrastLevel === 'extra-high') {
        body.classList.add('extra-high-contrast')
      } else {
        body.classList.add('high-contrast')
      }
    } else {
      body.classList.add('normal-contrast')
    }

    // Save to localStorage
    localStorage.setItem('high-contrast-mode', isHighContrast.toString())
    localStorage.setItem('contrast-level', contrastLevel)
  }, [isHighContrast, contrastLevel])

  const toggleHighContrast = () => {
    setIsHighContrast(!isHighContrast)
    if (!isHighContrast && contrastLevel === 'normal') {
      setContrastLevel('high')
    }
  }

  return (
    <HighContrastContext.Provider value={{
      isHighContrast,
      toggleHighContrast,
      contrastLevel,
      setContrastLevel
    }}>
      {children}
    </HighContrastContext.Provider>
  )
}

// High contrast toggle button
interface HighContrastToggleProps {
  className?: string
  showLabel?: boolean
}

export function HighContrastToggle({ className, showLabel = true }: HighContrastToggleProps) {
  const { isHighContrast, toggleHighContrast, contrastLevel, setContrastLevel } = useHighContrast()

  const handleCycleContrast = () => {
    if (contrastLevel === 'normal') {
      setContrastLevel('high')
      if (!isHighContrast) toggleHighContrast()
    } else if (contrastLevel === 'high') {
      setContrastLevel('extra-high')
    } else {
      setContrastLevel('normal')
      if (isHighContrast) toggleHighContrast()
    }
  }

  const getIcon = () => {
    switch (contrastLevel) {
      case 'normal':
        return <Sun className="h-4 w-4" />
      case 'high':
        return <Contrast className="h-4 w-4" />
      case 'extra-high':
        return <Monitor className="h-4 w-4" />
    }
  }

  const getLabel = () => {
    switch (contrastLevel) {
      case 'normal':
        return 'Contraste Normal'
      case 'high':
        return 'Alto Contraste'
      case 'extra-high':
        return 'Contraste Máximo'
    }
  }

  const getDescription = () => {
    switch (contrastLevel) {
      case 'normal':
        return 'Clique para ativar alto contraste para melhor visibilidade'
      case 'high':
        return 'Alto contraste ativo. Clique para contraste máximo'
      case 'extra-high':
        return 'Contraste máximo ativo. Clique para voltar ao normal'
    }
  }

  return (
    <button
      onClick={handleCycleContrast}
      className={cn(
        'high-contrast-toggle',
        'flex items-center space-x-2 px-3 py-2 rounded-md border',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
        'transition-colors duration-200',
        // Normal mode colors
        'bg-background border-border text-foreground',
        'hover:bg-muted',
        // High contrast mode colors (applied via CSS)
        className
      )}
      aria-label={`${getLabel()}. ${getDescription()}`}
      aria-pressed={isHighContrast}
      title={getDescription()}
    >
      <span aria-hidden="true">{getIcon()}</span>
      {showLabel && <span>{getLabel()}</span>}
    </button>
  )
}

// High contrast compatible components
interface HighContrastCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger'
}

export function HighContrastCard({
  children,
  className,
  variant = 'default'
}: HighContrastCardProps) {
  return (
    <div
      className={cn(
        'high-contrast-card',
        'border rounded-lg p-4',
        // Base styles
        'bg-card text-card-foreground border-border',
        // Variant styles
        variant === 'secondary' && 'bg-secondary text-secondary-foreground border-secondary',
        variant === 'success' && 'bg-green-50 text-green-900 border-green-200',
        variant === 'warning' && 'bg-yellow-50 text-yellow-900 border-yellow-200',
        variant === 'danger' && 'bg-red-50 text-red-900 border-red-200',
        className
      )}
    >
      {children}
    </div>
  )
}

// Educational status indicator with high contrast support
interface StatusIndicatorProps {
  status: 'present' | 'absent' | 'justified' | 'late' | 'pending'
  label: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusIndicator({
  status,
  label,
  size = 'md',
  className
}: StatusIndicatorProps) {
  const { isHighContrast } = useHighContrast()

  const getStatusConfig = () => {
    const configs = {
      present: {
        color: isHighContrast ? 'bg-green-700 text-white border-green-800' : 'bg-green-100 text-green-800 border-green-200',
        symbol: '✓',
        ariaLabel: 'Presente'
      },
      absent: {
        color: isHighContrast ? 'bg-red-700 text-white border-red-800' : 'bg-red-100 text-red-800 border-red-200',
        symbol: '✗',
        ariaLabel: 'Ausente'
      },
      justified: {
        color: isHighContrast ? 'bg-blue-700 text-white border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200',
        symbol: 'J',
        ariaLabel: 'Falta Justificada'
      },
      late: {
        color: isHighContrast ? 'bg-yellow-700 text-white border-yellow-800' : 'bg-yellow-100 text-yellow-800 border-yellow-200',
        symbol: '⏰',
        ariaLabel: 'Atrasado'
      },
      pending: {
        color: isHighContrast ? 'bg-gray-700 text-white border-gray-800' : 'bg-gray-100 text-gray-800 border-gray-200',
        symbol: '?',
        ariaLabel: 'Pendente'
      }
    }

    return configs[status]
  }

  const config = getStatusConfig()
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  return (
    <span
      className={cn(
        'status-indicator',
        'inline-flex items-center rounded-full border font-medium',
        config.color,
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={`${label}: ${config.ariaLabel}`}
    >
      <span aria-hidden="true" className="mr-1">{config.symbol}</span>
      {label}
    </span>
  )
}

// Color-safe button component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function AccessibleButton({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: AccessibleButtonProps) {
  const { isHighContrast } = useHighContrast()

  const getVariantClasses = () => {
    if (isHighContrast) {
      return {
        primary: 'bg-blue-700 text-white border-blue-800 hover:bg-blue-800 focus:ring-blue-500',
        secondary: 'bg-gray-700 text-white border-gray-800 hover:bg-gray-800 focus:ring-gray-500',
        success: 'bg-green-700 text-white border-green-800 hover:bg-green-800 focus:ring-green-500',
        warning: 'bg-yellow-700 text-white border-yellow-800 hover:bg-yellow-800 focus:ring-yellow-500',
        danger: 'bg-red-700 text-white border-red-800 hover:bg-red-800 focus:ring-red-500',
        ghost: 'bg-transparent text-gray-900 border-gray-900 hover:bg-gray-100 focus:ring-gray-500'
      }
    }

    return {
      primary: 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 focus:ring-primary',
      secondary: 'bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90 focus:ring-secondary',
      success: 'bg-green-600 text-white border-green-600 hover:bg-green-700 focus:ring-green-500',
      warning: 'bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-foreground border-border hover:bg-muted focus:ring-muted'
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  const variantClasses = getVariantClasses()[variant]

  return (
    <button
      className={cn(
        'accessible-button',
        'border rounded-md font-medium transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// CSS classes to be added to globals.css
export const highContrastStyles = `
/* High Contrast Mode Styles */
.high-contrast {
  --background: 255 255 255;
  --foreground: 0 0 0;
  --card: 255 255 255;
  --card-foreground: 0 0 0;
  --primary: 0 0 139;
  --primary-foreground: 255 255 255;
  --secondary: 105 105 105;
  --secondary-foreground: 255 255 255;
  --muted: 245 245 245;
  --muted-foreground: 0 0 0;
  --accent: 0 0 139;
  --accent-foreground: 255 255 255;
  --destructive: 139 0 0;
  --destructive-foreground: 255 255 255;
  --border: 0 0 0;
  --input: 0 0 0;
  --ring: 0 0 139;
}

.extra-high-contrast {
  --background: 0 0 0;
  --foreground: 255 255 255;
  --card: 0 0 0;
  --card-foreground: 255 255 255;
  --primary: 255 255 0;
  --primary-foreground: 0 0 0;
  --secondary: 255 255 255;
  --secondary-foreground: 0 0 0;
  --muted: 64 64 64;
  --muted-foreground: 255 255 255;
  --accent: 255 255 0;
  --accent-foreground: 0 0 0;
  --destructive: 255 0 0;
  --destructive-foreground: 0 0 0;
  --border: 255 255 255;
  --input: 255 255 255;
  --ring: 255 255 0;
}

/* Ensure sufficient contrast for all interactive elements */
.high-contrast button,
.extra-high-contrast button {
  border-width: 2px !important;
}

.high-contrast a,
.extra-high-contrast a {
  text-decoration: underline;
  font-weight: bold;
}

.high-contrast .focus\\:ring-2:focus,
.extra-high-contrast .focus\\:ring-2:focus {
  ring-width: 4px !important;
}

/* Enhanced focus indicators */
.high-contrast *:focus,
.extra-high-contrast *:focus {
  outline: 3px solid currentColor;
  outline-offset: 2px;
}

/* Image and icon adjustments */
.high-contrast img:not([alt]),
.extra-high-contrast img:not([alt]) {
  opacity: 0.8;
  filter: contrast(1.5);
}

.high-contrast svg,
.extra-high-contrast svg {
  filter: contrast(2);
}
`