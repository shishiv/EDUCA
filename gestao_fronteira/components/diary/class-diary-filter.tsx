'use client'

/**
 * Class Diary Filter Component
 * Brazilian Educational Context: Diário de Classe Filters
 *
 * Provides filtering controls for the class diary:
 * - Turma (Class) selector
 * - Date range picker (from/to)
 * - Status/Phase filter
 *
 * Mobile-first responsive design with Tailwind CSS
 */

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAvailableTurmas } from '@/lib/api/class-diary'
import type { ClassDiaryFilters } from '@/lib/api/class-diary'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface ClassDiaryFilterProps {
  onFilterChange: (filters: ClassDiaryFilters) => void
  initialFilters?: ClassDiaryFilters
  profesor_id?: string
  escola_id?: string
}

export function ClassDiaryFilter({
  onFilterChange,
  initialFilters = {},
  profesor_id,
  escola_id,
}: ClassDiaryFilterProps) {
  // Local state for filter values
  const [turmaId, setTurmaId] = useState<string>(initialFilters.turma_id || 'all')
  const [dateFrom, setDateFrom] = useState<string>(initialFilters.date_from || '')
  const [dateTo, setDateTo] = useState<string>(initialFilters.date_to || '')
  const [fase, setFase] = useState<string>(initialFilters.status || 'all')

  // Available turmas for dropdown
  const [turmas, setTurmas] = useState<
    Array<{ id: string; nome: string; serie: string }>
  >([])
  const [loadingTurmas, setLoadingTurmas] = useState(true)

  // Fetch available turmas on mount
  useEffect(() => {
    async function fetchTurmas() {
      setLoadingTurmas(true)
      const { data, error } = await getAvailableTurmas(supabase, profesor_id, escola_id)

      if (error) {
        logger.error('Error fetching turmas:', { error: error })
        setLoadingTurmas(false)
        return
      }

      setTurmas(data || [])
      setLoadingTurmas(false)
    }

    fetchTurmas()
  }, [profesor_id, escola_id])

  // Handle filter application
  const handleApplyFilters = () => {
    const filters: ClassDiaryFilters = {}

    if (turmaId && turmaId !== 'all') filters.turma_id = turmaId
    if (dateFrom) filters.date_from = dateFrom
    if (dateTo) filters.date_to = dateTo
    if (fase && fase !== 'all') filters.status = fase as 'aberta' | 'fechada' | 'travada'
    if (profesor_id) filters.professor_id = profesor_id
    if (escola_id) filters.escola_id = escola_id

    onFilterChange(filters)
  }

  // Handle filter reset
  const handleResetFilters = () => {
    setTurmaId('all')
    setDateFrom('')
    setDateTo('')
    setFase('all')

    const filters: ClassDiaryFilters = {}
    if (profesor_id) filters.professor_id = profesor_id
    if (escola_id) filters.escola_id = escola_id

    onFilterChange(filters)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Filtros do Diário
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Turma Selector */}
          <div className="space-y-2">
            <Label htmlFor="turma-select">Turma</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger id="turma-select">
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {loadingTurmas ? (
                  <SelectItem value="loading" disabled>
                    Carregando...
                  </SelectItem>
                ) : turmas.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Nenhuma turma encontrada
                  </SelectItem>
                ) : (
                  turmas.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.serie}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label htmlFor="date-from">Data Inicial</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label htmlFor="date-to">Data Final</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Fase/Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="fase-select">Status da Aula</Label>
            <Select value={fase} onValueChange={setFase}>
              <SelectTrigger id="fase-select">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="fechada">Fechada</SelectItem>
                <SelectItem value="travada">Travada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            onClick={handleApplyFilters}
            className="w-full sm:w-auto"
            size="default"
          >
            Buscar
          </Button>
          <Button
            onClick={handleResetFilters}
            variant="outline"
            className="w-full sm:w-auto"
            size="default"
          >
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
