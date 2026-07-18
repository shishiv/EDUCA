'use client'

import {
  BookOpen,
  CheckCircle,
  AlertCircle,
  Calculator,
  Palette,
  FlaskConical,
  MapPin,
  Landmark,
  Languages,
  Dumbbell,
  type LucideIcon
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * DisciplinaSelector - Subject selection component for attendance workflow.
 * Displays a grid of subject cards with icons and selection state.
 */

export interface Disciplina {
  id: string
  nome: string
}

export interface DisciplinaSelectorProps {
  /** Array of available disciplinas */
  disciplinas: Disciplina[]
  /** ID of currently selected disciplina (empty string if none) */
  selectedDisciplina: string
  /** Callback when a disciplina is selected */
  onSelect: (disciplinaId: string) => void
  /** Whether to show professor-specific empty state message */
  isProfessor?: boolean
}

/** Map disciplina names to icons and colors */
const getDisciplinaIcon = (nome: string): { icon: LucideIcon; color: string; bgColor: string } => {
  const iconMap: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
    'Matematica': { icon: Calculator, color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100' },
    'Lingua Portuguesa': { icon: BookOpen, color: 'text-green-600', bgColor: 'bg-green-50 hover:bg-green-100' },
    'Arte': { icon: Palette, color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100' },
    'Ciencias': { icon: FlaskConical, color: 'text-cyan-600', bgColor: 'bg-cyan-50 hover:bg-cyan-100' },
    'Geografia': { icon: MapPin, color: 'text-emerald-600', bgColor: 'bg-emerald-50 hover:bg-emerald-100' },
    'Historia': { icon: Landmark, color: 'text-amber-600', bgColor: 'bg-amber-50 hover:bg-amber-100' },
    'Ingles': { icon: Languages, color: 'text-rose-600', bgColor: 'bg-rose-50 hover:bg-rose-100' },
    'Educacao Fisica': { icon: Dumbbell, color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100' },
  }

  // Normalize the name for lookup (remove accents for matching)
  const normalizedNome = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return iconMap[normalizedNome] || { icon: BookOpen, color: 'text-gray-600', bgColor: 'bg-gray-50 hover:bg-gray-100' }
}

/**
 * Renders a card grid for selecting a subject (disciplina).
 * Each card shows an icon and name with visual selection feedback.
 */
export function DisciplinaSelector({
  disciplinas,
  selectedDisciplina,
  onSelect,
  isProfessor = false
}: DisciplinaSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BookOpen className="h-5 w-5 mr-2" />
          Selecionar Disciplina
        </CardTitle>
        <CardDescription>
          Escolha a disciplina que sera ministrada na aula
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {disciplinas.map((disciplina) => {
            const { icon: Icon, color, bgColor } = getDisciplinaIcon(disciplina.nome)
            const isSelected = selectedDisciplina === disciplina.id

            return (
              <button
                key={disciplina.id}
                onClick={() => onSelect(disciplina.id)}
                className={`
                  relative p-6 rounded-lg border-2 transition-all duration-200
                  flex flex-col items-center justify-center gap-3
                  min-h-[140px] group
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                    : `border-gray-200 ${bgColor} hover:shadow-md`
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  p-3 rounded-full transition-transform duration-200
                  ${isSelected ? 'bg-blue-100 scale-110' : 'bg-white group-hover:scale-110'}
                `}>
                  <Icon className={`h-8 w-8 ${isSelected ? 'text-blue-600' : color}`} />
                </div>

                {/* Disciplina name */}
                <span className={`
                  text-sm font-medium text-center
                  ${isSelected ? 'text-blue-900' : 'text-gray-700'}
                `}>
                  {disciplina.nome}
                </span>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Empty state message */}
        {disciplinas.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Nenhuma disciplina disponivel.
              {isProfessor && (
                <span className="block mt-2 text-sm">
                  Voce precisa ministrar pelo menos uma aula antes de ver disciplinas aqui.
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
