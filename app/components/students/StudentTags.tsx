'use client'

import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface StudentTagsProps {
  /**
   * Current turma name (e.g., "5o Ano A")
   */
  turma?: string | null
  /**
   * Turno (shift): Matutino, Vespertino, Integral
   */
  turno?: string | null
  /**
   * Whether student is a Bolsa Familia beneficiary
   */
  bolsaFamilia?: boolean
  /**
   * Show Bolsa Familia badge (only for gestores per prior decision)
   */
  showBolsaFamilia?: boolean
  /**
   * Student status (ativo/inativo)
   */
  ativo?: boolean
  /**
   * Additional CSS classes
   */
  className?: string
}

const turnoLabels: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  integral: 'Integral',
  noturno: 'Noturno',
}

/**
 * Displays colored tag chips for turma, turno, status, and optionally Bolsa Familia.
 * Uses flex-wrap for responsive layout.
 */
export function StudentTags({
  turma,
  turno,
  bolsaFamilia,
  showBolsaFamilia = false,
  ativo = true,
  className,
}: StudentTagsProps) {
  const hasAnyTag =
    turma ||
    turno ||
    (showBolsaFamilia && bolsaFamilia) ||
    ativo !== undefined

  if (!hasAnyTag) return null

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ''}`}>
      {/* Status Badge */}
      {ativo !== undefined && (
        <Badge variant={ativo ? 'success' : 'secondary'}>
          {ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      )}

      {/* Turma Badge (blue) */}
      {turma && (
        <Badge variant="info">
          {turma}
        </Badge>
      )}

      {/* Turno Badge (gray/secondary) */}
      {turno && (
        <Badge variant="secondary">
          {turnoLabels[turno.toLowerCase()] || turno}
        </Badge>
      )}

      {/* Bolsa Familia Badge (yellow with warning icon) */}
      {showBolsaFamilia && bolsaFamilia && (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Bolsa Familia</span>
        </Badge>
      )}
    </div>
  )
}
