'use client'

/**
 * EDUCA Logo Component v2.0
 * Brand Guidelines v1.0 - Dezembro 2024
 * Secretaria Municipal de Educação - Cidade/UF
 *
 * Logo: Texto "EDUCA" em Lexend Bold com gradiente verde→azul + underline amarelo curvo
 */

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { municipalConfig } from '@/lib/config'

// Size configurations matching brand guidelines
const sizeConfig = {
  xs: { height: 24, fontSize: 24, underlineWidth: 2.5 },
  sm: { height: 32, fontSize: 32, underlineWidth: 3 },
  md: { height: 40, fontSize: 40, underlineWidth: 3.5 },
  lg: { height: 56, fontSize: 48, underlineWidth: 4 },
  xl: { height: 80, fontSize: 64, underlineWidth: 5 },
}

// Gradient configurations for different backgrounds
const gradientConfigs = {
  default: { start: '#059669', end: '#0ea5e9' },      // Light backgrounds
  'dark-bg': { start: '#34d399', end: '#38bdf8' },    // Dark backgrounds
  'mono-green': { start: '#059669', end: '#059669' }, // Monochrome green
  'mono-dark': { start: '#1e293b', end: '#1e293b' },  // Monochrome dark
  'mono-white': { start: '#ffffff', end: '#ffffff' }, // Monochrome white
}

interface EducaLogoProps {
  /** Logo size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Color variant for different backgrounds */
  variant?: 'default' | 'dark-bg' | 'mono-green' | 'mono-dark' | 'mono-white'
  /** Show yellow underline squiggle */
  showUnderline?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * EDUCA Logo - Main component
 * Text-based logo with gradient and decorative underline
 */
export function EducaLogo({
  size = 'md',
  variant = 'default',
  showUnderline = true,
  className,
}: EducaLogoProps) {
  const config = sizeConfig[size]
  const colors = gradientConfigs[variant]
  const gradientId = `educa-gradient-${variant}-${size}`

  // Calculate viewBox based on size
  const viewBoxWidth = 180
  const viewBoxHeight = 52

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      height={config.height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="EDUCA - Sistema de Gestão Escolar"
      role="img"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>

      {/* EDUCA Text - Lexend Bold */}
      <text
        x="5"
        y="36"
        fontFamily="Lexend, var(--font-lexend), sans-serif"
        fontWeight="700"
        fontSize="40"
        fill={`url(#${gradientId})`}
      >
        EDUCA
      </text>

      {/* Underline Squiggle - Yellow (#fcd34d) */}
      {showUnderline && (
        <path
          d="M8 46 Q40 51 75 46 Q110 41 146 46"
          stroke="#fcd34d"
          strokeWidth={config.underlineWidth}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  )
}

/**
 * EDUCA Logo for dark backgrounds
 * Uses lighter gradient colors for better contrast
 */
export function EducaLogoLight(props: Omit<EducaLogoProps, 'variant'>) {
  return <EducaLogo {...props} variant="dark-bg" />
}

/**
 * EDUCA Logo Icon - Circular version for small spaces
 * Used in: favicons, mobile headers, collapsed sidebar
 */
export function EducaLogoIcon({
  size = 32,
  variant = 'default',
  className,
}: {
  size?: number
  variant?: 'default' | 'dark-bg' | 'mono-white'
  className?: string
}) {
  const colors = gradientConfigs[variant]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="EDUCA"
      role="img"
    >
      <defs>
        <linearGradient id={`educa-icon-gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>

      {/* Background circle with gradient */}
      <circle cx="24" cy="24" r="22" fill={`url(#educa-icon-gradient-${variant})`} />

      {/* Stylized "E" */}
      <text
        x="12"
        y="33"
        fontFamily="Lexend, var(--font-lexend), sans-serif"
        fontWeight="700"
        fontSize="28"
        fill="white"
      >
        E
      </text>

      {/* Small yellow accent dot */}
      <circle cx="36" cy="14" r="4" fill="#fcd34d" />
    </svg>
  )
}

/**
 * EDUCA Logo with municipal co-branding
 * Used in: official documents, footers, institutional materials
 */
export function EducaLogoWithPrefeitura({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sealSizes = { sm: 28, md: 36, lg: 44 }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <EducaLogo size={size} />

      <div className="w-px h-12 bg-gray-300" aria-hidden="true" />

      <div className="flex items-center gap-2">
        {/* Replace public/logo_pref.png with your municipality's official logo */}
        <Image
          src="/logo_pref.png"
          alt="Brasão municipal"
          width={sealSizes[size]}
          height={sealSizes[size]}
          className="object-contain"
        />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Prefeitura de
          </span>
          <span className="text-sm font-bold text-indigo-800">
            {municipalConfig.nome}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * EDUCA Logo Text Only - For minimal contexts
 */
export function EducaLogoText({
  size = 'md',
  variant = 'default',
  className,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'dark-bg' | 'mono-green' | 'mono-dark'
  className?: string
}) {
  const fontSizes = { xs: 'text-lg', sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' }

  return (
    <span
      className={cn(
        'font-display font-bold tracking-tight text-educa-gradient',
        fontSizes[size],
        className
      )}
    >
      EDUCA
    </span>
  )
}

// Re-export for backwards compatibility
export { EducaLogoIcon as EducaIconOnly }
