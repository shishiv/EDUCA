'use client'

import { Users, CheckCircle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * TurmaSelector - Class selection component for attendance workflow.
 * Displays a list of classes with student counts and selection state.
 */

export interface Turma {
  id: string
  nome: string
  serie: string
  escola: {
    id: string
    nome: string
  }
  total_alunos: number
}

export interface TurmaSelectorProps {
  /** Array of available turmas */
  turmas: Turma[]
  /** ID of currently selected turma (empty string if none) */
  selectedTurma: string
  /** Callback when a turma is selected */
  onSelect: (turmaId: string) => void
  /** Callback when "Abrir Aula" button is clicked */
  onAbrirAula: () => void
  /** Whether the Abrir Aula action is loading */
  loading?: boolean
}

/**
 * Renders a card list for selecting a class (turma).
 * Each card shows name, series, school, and student count.
 * Shows "Abrir Aula" button when a turma is selected.
 */
export function TurmaSelector({
  turmas,
  selectedTurma,
  onSelect,
  onAbrirAula,
  loading = false
}: TurmaSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Selecionar Turma
        </CardTitle>
        <CardDescription>
          Escolha a turma para a qual sera ministrada a aula
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {turmas.map((turma) => (
          <div
            key={turma.id}
            className={`
              p-4 border rounded-lg cursor-pointer transition-colors
              ${selectedTurma === turma.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
            `}
            onClick={() => onSelect(turma.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{turma.nome} - {turma.serie}</h3>
                <p className="text-sm text-gray-600">{turma.escola.nome}</p>
                <p className="text-sm text-gray-500">{turma.total_alunos} alunos</p>
              </div>
              {selectedTurma === turma.id && (
                <CheckCircle className="h-5 w-5 text-blue-600" />
              )}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {turmas.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma turma disponivel.</p>
          </div>
        )}

        {/* Abrir Aula button */}
        {selectedTurma && (
          <div className="pt-4 border-t">
            <Button onClick={onAbrirAula} disabled={loading} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Abrindo Aula...' : 'Abrir Aula'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
