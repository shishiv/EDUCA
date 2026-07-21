'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, ClipboardList, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TurmaCardProps {
  turma: {
    id: string
    nome: string
    serie: string
    turno: 'matutino' | 'vespertino' | 'integral'
    escola: { nome: string }
    alunos_matriculados: number
    capacidade: number
    professor?: { nome: string } | null
    ativo: boolean
  }
  onChamada?: (turmaId: string) => void
  onDiario?: (turmaId: string) => void
}

type SerieColorKey = 'pink' | 'orange' | 'violet' | 'gray'

/**
 * Maps serie name to color category:
 * - Infantil (bercario, maternal, pre): pink
 * - Fundamental I (1-5 ano): orange
 * - Fundamental II (6-9 ano): violet
 * - Fallback: gray
 */
function getSerieColor(serie: string): SerieColorKey {
  const serieLower = serie.toLowerCase()

  // Infantil - pink
  if (
    serieLower.includes('berç') ||
    serieLower.includes('berc') ||
    serieLower.includes('maternal') ||
    serieLower.includes('pré') ||
    serieLower.includes('pre')
  ) {
    return 'pink'
  }

  // Fundamental I (1-5 ano) - orange
  const fundIPattern = /^[1-5]º?\s*(ano|série)/i
  if (fundIPattern.test(serie)) {
    return 'orange'
  }

  // Fundamental II (6-9 ano) - violet
  const fundIIPattern = /^[6-9]º?\s*(ano|série)/i
  if (fundIIPattern.test(serie)) {
    return 'violet'
  }

  return 'gray'
}

// Full class names lookup to avoid Tailwind dynamic class purging
const serieColorClasses: Record<SerieColorKey, string> = {
  pink: 'from-pink-400 to-pink-600',
  orange: 'from-orange-400 to-orange-600',
  violet: 'from-violet-400 to-violet-600',
  gray: 'from-gray-400 to-gray-600'
}

const getTurnoLabel = (turno: string): string => {
  const turnos: Record<string, string> = {
    matutino: 'Matutino',
    vespertino: 'Vespertino',
    integral: 'Integral'
  }
  return turnos[turno] || turno
}

const getTurnoBadgeVariant = (turno: string): 'default' | 'secondary' | 'outline' => {
  switch (turno) {
    case 'matutino': return 'default'
    case 'vespertino': return 'secondary'
    case 'integral': return 'outline'
    default: return 'outline'
  }
}

export function TurmaCard({ turma, onChamada, onDiario }: TurmaCardProps) {
  const router = useRouter()
  const serieColor = getSerieColor(turma.serie)
  const gradientClasses = serieColorClasses[serieColor]
  const ocupacao = turma.capacidade > 0
    ? Math.round((turma.alunos_matriculados / turma.capacidade) * 100)
    : 0

  const handleChamadaClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onChamada) {
      onChamada(turma.id)
    } else {
      router.push(`/dashboard/turmas/${turma.id}/chamada`)
    }
  }

  const handleDiarioClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDiario) {
      onDiario(turma.id)
    } else {
      router.push(`/dashboard/diario?turma=${turma.id}`)
    }
  }

  return (
    <Link href={`/dashboard/turmas/${turma.id}`} className="block group">
      <Card className={cn(
        'overflow-hidden cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        !turma.ativo && 'opacity-60'
      )}>
        {/* Serie color band */}
        <div className={cn(
          'h-2 bg-gradient-to-r',
          gradientClasses
        )} />

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">{turma.nome}</CardTitle>
              <CardDescription className="truncate">{turma.escola.nome}</CardDescription>
            </div>
            {!turma.ativo && (
              <Badge variant="secondary" className="shrink-0">Inativa</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-400" />
              <span>{turma.alunos_matriculados}/{turma.capacidade}</span>
              <span className={cn(
                'text-xs',
                ocupacao >= 90 ? 'text-red-600' : ocupacao >= 75 ? 'text-orange-600' : 'text-green-600'
              )}>
                ({ocupacao}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" />
              <Badge variant={getTurnoBadgeVariant(turma.turno)} className="text-xs">
                {getTurnoLabel(turma.turno)}
              </Badge>
            </div>
          </div>

          {/* Professor info */}
          {turma.professor && (
            <p className="text-xs text-gray-500 truncate">
              Prof. {turma.professor.nome}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleChamadaClick}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Fazer Chamada
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={handleDiarioClick}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Ver Diario
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
