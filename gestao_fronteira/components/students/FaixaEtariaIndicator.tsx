'use client'

import {
  calculateFaixaEtaria,
  FAIXA_ETARIA_CONFIG,
  type FaixaEtaria,
} from '@/lib/utils/faixa-etaria'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Baby } from 'lucide-react'

const faixaColorClasses: Record<FaixaEtaria, string> = {
  bebes: 'bg-orange-100 text-orange-700 border border-orange-200',
  'criancas-bem-pequenas':
    'bg-violet-100 text-violet-700 border border-violet-200',
  'criancas-pequenas': 'bg-sky-100 text-sky-700 border border-sky-200',
}

interface FaixaEtariaIndicatorProps {
  /**
   * The child's birth date (ISO string or Date object)
   */
  birthDate: string | Date
  /**
   * Show the icon before the label (default: true)
   */
  showIcon?: boolean
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Displays a badge indicating the child's age group (faixa etaria) according to BNCC.
 * Returns null if the child is outside the early childhood range (0-71 months).
 */
export function FaixaEtariaIndicator({
  birthDate,
  showIcon = true,
  className,
}: FaixaEtariaIndicatorProps) {
  const faixa = calculateFaixaEtaria(birthDate)

  // Return null if student is not in Infantil age range
  if (!faixa) return null

  const config = FAIXA_ETARIA_CONFIG[faixa]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${faixaColorClasses[faixa]} ${className || ''}`}>
            {showIcon && <Baby className="h-3 w-3 mr-1" />}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Etapa: {config.stage}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
