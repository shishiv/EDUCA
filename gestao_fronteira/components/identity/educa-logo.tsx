/**
 * EDUCA Logo Component
 * Nova identidade visual do Sistema Educacional de Fronteira/MG
 *
 * "A educação não é quadrada - e o EDUCA também não."
 */

import { cn } from '@/lib/utils'
import Image from 'next/image'

interface EducaLogoProps {
  /** Logo size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Show text alongside icon */
  showText?: boolean
  /** Show Fronteira badge */
  showFronteira?: boolean
  /** Additional CSS classes */
  className?: string
  /** Theme variant */
  variant?: 'default' | 'white' | 'dark'
}

const sizeConfig = {
  xs: { icon: 24, text: 'text-sm', gap: 'gap-1.5' },
  sm: { icon: 32, text: 'text-lg', gap: 'gap-2' },
  md: { icon: 40, text: 'text-xl', gap: 'gap-2.5' },
  lg: { icon: 48, text: 'text-2xl', gap: 'gap-3' },
  xl: { icon: 64, text: 'text-3xl', gap: 'gap-4' },
}

/**
 * EDUCA Logo Icon - Stylized "E" representing education/growth
 * SVG-based for crisp rendering at any size
 */
function EducaIcon({
  size = 40,
  variant = 'default'
}: {
  size?: number
  variant?: 'default' | 'white' | 'dark'
}) {
  const colors = {
    default: {
      primary: '#4361EE',   // EDUCA Blue
      secondary: '#10B981', // EDUCA Green
      accent: '#F59E0B',    // EDUCA Gold
    },
    white: {
      primary: '#FFFFFF',
      secondary: '#FFFFFF',
      accent: '#FFFFFF',
    },
    dark: {
      primary: '#18181B',
      secondary: '#3F3F46',
      accent: '#52525B',
    },
  }

  const c = colors[variant]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="EDUCA Logo"
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="educa-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.primary} />
          <stop offset="100%" stopColor={c.secondary} />
        </linearGradient>
      </defs>

      {/* Main circle */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="url(#educa-gradient)"
      />

      {/* Stylized "E" that looks like an open book / person learning */}
      <path
        d="M14 14 L14 34 L32 34"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M14 24 L28 24"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M14 14 L28 14"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Small accent dot (representing growth/learning) */}
      <circle
        cx="34"
        cy="14"
        r="4"
        fill={c.accent}
      />
    </svg>
  )
}

/**
 * EDUCA Logo - Full component with icon and text
 */
export function EducaLogo({
  size = 'md',
  showText = true,
  showFronteira = false,
  className,
  variant = 'default',
}: EducaLogoProps) {
  const config = sizeConfig[size]

  const textColors = {
    default: 'text-gray-900',
    white: 'text-white',
    dark: 'text-gray-900',
  }

  const subTextColors = {
    default: 'text-gray-500',
    white: 'text-white/80',
    dark: 'text-gray-500',
  }

  return (
    <div className={cn('flex items-center', config.gap, className)}>
      <EducaIcon size={config.icon} variant={variant} />

      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            'font-bold tracking-tight',
            config.text,
            textColors[variant]
          )}>
            EDUCA
          </span>

          {showFronteira && (
            <span className={cn(
              'text-xs font-medium tracking-wide uppercase',
              subTextColors[variant]
            )}>
              Fronteira/MG
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * EDUCA Logo with Fronteira seal - for official documents and footers
 */
export function EducaLogoWithSeal({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const config = sizeConfig[size]
  const sealSize = {
    sm: 28,
    md: 36,
    lg: 44,
  }

  return (
    <div className={cn('flex items-center', config.gap, className)}>
      <EducaLogo size={size} showText showFronteira={false} />

      <div className="h-8 w-px bg-gray-300 mx-2" />

      <div className="flex items-center gap-2">
        <Image
          src="/logo_pref.png"
          alt="Brasão de Fronteira"
          width={sealSize[size]}
          height={sealSize[size]}
          className="object-contain"
        />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-700">
            Prefeitura de
          </span>
          <span className="text-sm font-bold text-gray-900">
            Fronteira
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * EDUCA Icon Only - for favicons, mobile headers, collapsed sidebars
 */
export function EducaIconOnly({
  size = 32,
  variant = 'default',
  className,
}: {
  size?: number
  variant?: 'default' | 'white' | 'dark'
  className?: string
}) {
  return (
    <div className={className}>
      <EducaIcon size={size} variant={variant} />
    </div>
  )
}

export { EducaIcon }
