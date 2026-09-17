'use client'
import { useTranslations } from 'next-intl'

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

function StatusTag({ active }: { active: boolean }) {
  const t = useTranslations('registry')
  return <Badge variant={active ? 'success' : 'secondary'}>{active ? t('ui.ativo') : t('labels.inativo')}</Badge>
}

function TurmaTag({ turma }: { turma?: string | null }) {
  return turma ? <Badge variant="info">{turma}</Badge> : null
}

function TurnoTag({ turno }: { turno?: string | null }) {
  const t = useTranslations('registry')
  if (!turno) return null
  const labels = new Map([
    ['matutino', t('labels.matutino')],
    ['vespertino', t('labels.vespertino')],
    ['integral', t('labels.integral')],
    ['noturno', t('labels.noturno')],
  ])
  return <Badge variant="secondary">{labels.get(turno.toLowerCase()) ?? turno}</Badge>
}

function BolsaFamiliaTag({ visible }: { visible: boolean }) {
  const t = useTranslations('registry')
  if (!visible) return null
  return (
    <Badge variant="warning" className="flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" />
      <span>{t('labels.bolsa-familia')}</span>
    </Badge>
  )
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
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ''}`}>
      <StatusTag active={ativo} />
      <TurmaTag turma={turma} />
      <TurnoTag turno={turno} />
      <BolsaFamiliaTag visible={showBolsaFamilia && Boolean(bolsaFamilia)} />
    </div>
  )
}
