import Image from 'next/image'
import { cn } from '@/lib/utils'

interface MunicipalBrasaoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  priority?: boolean
}

interface MunicipalLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  priority?: boolean
}

/**
 * Brasão oficial da Prefeitura de Fronteira-MG
 * Para uso em headers, documentos oficiais e autenticação
 */
export function MunicipalBrasao({
  size = 'md',
  className,
  priority = false
}: MunicipalBrasaoProps) {
  const sizeMap = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 }
  }

  const dimensions = sizeMap[size]

  return (
    <Image
      src="/identity/brasao.png"
      alt="Brasão da Prefeitura de Fronteira MG"
      width={dimensions.width}
      height={dimensions.height}
      className={cn(
        'object-contain',
        'drop-shadow-sm', // Subtle shadow for better visibility
        'w-auto h-auto', // Maintain aspect ratio
        className
      )}
      priority={priority}
    />
  )
}

/**
 * Logo completo da Prefeitura de Fronteira-MG
 * Para uso em headers principais, splash screens e documentos oficiais
 */
export function MunicipalLogo({
  size = 'md',
  className,
  priority = false
}: MunicipalLogoProps) {
  const sizeMap = {
    sm: { width: 120, height: 48 },
    md: { width: 200, height: 80 },
    lg: { width: 300, height: 120 },
    xl: { width: 400, height: 160 }
  }

  const dimensions = sizeMap[size]

  return (
    <Image
      src="/identity/logo-completo.png"
      alt="Prefeitura de Fronteira - Trabalho, Dedicação e Amor"
      width={dimensions.width}
      height={dimensions.height}
      className={cn(
        'object-contain',
        'drop-shadow-sm',
        'w-full h-auto max-w-full', // Responsive behavior
        className
      )}
      priority={priority}
    />
  )
}

/**
 * Container municipal para uso em headers e documentos oficiais
 * Combina brasão e informações municipais
 */
interface MunicipalHeaderIdentityProps {
  showLogo?: boolean
  showBrasao?: boolean
  variant?: 'compact' | 'full'
  className?: string
}

export function MunicipalHeaderIdentity({
  showLogo = true,
  showBrasao = true,
  variant = 'full',
  className
}: MunicipalHeaderIdentityProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        {showBrasao && (
          <MunicipalBrasao size="sm" priority />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-fronteira-primary">
            Prefeitura de Fronteira
          </span>
          <span className="text-xs text-fronteira-gray-500">
            Minas Gerais
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center space-x-4', className)}>
      {showBrasao && (
        <MunicipalBrasao size="md" priority />
      )}
      {showLogo ? (
        <MunicipalLogo size="sm" priority />
      ) : (
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-fronteira-primary">
            PREFEITURA DE FRONTEIRA
          </h1>
          <p className="text-sm text-fronteira-gray-500">
            Trabalho, Dedicação e Amor
          </p>
          <p className="text-xs text-fronteira-gray-500">
            Minas Gerais
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Cores municipais disponíveis como classes CSS
 */
export const municipalColors = {
  red: 'text-fronteira-red bg-fronteira-red border-fronteira-red',
  green: 'text-fronteira-green bg-fronteira-green border-fronteira-green',
  blue: 'text-fronteira-blue bg-fronteira-blue border-fronteira-blue',
  yellow: 'text-fronteira-yellow bg-fronteira-yellow border-fronteira-yellow',
  primary: 'text-fronteira-primary bg-fronteira-primary border-fronteira-primary',
  secondary: 'text-fronteira-secondary bg-fronteira-secondary border-fronteira-secondary',
} as const

/**
 * Hook para acessar cores municipais programaticamente
 */
export function useMunicipalColors() {
  return {
    red: 'hsl(var(--fronteira-red))',
    green: 'hsl(var(--fronteira-green))',
    blue: 'hsl(var(--fronteira-blue))',
    yellow: 'hsl(var(--fronteira-yellow))',
    primary: 'hsl(var(--fronteira-primary))',
    secondary: 'hsl(var(--fronteira-secondary))',
    gray: {
      50: 'hsl(var(--fronteira-gray-50))',
      100: 'hsl(var(--fronteira-gray-100))',
      500: 'hsl(var(--fronteira-gray-500))',
      900: 'hsl(var(--fronteira-gray-900))',
    }
  }
}