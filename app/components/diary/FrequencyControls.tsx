/**
 * FrequencyControls Component - Control Panel for Frequency Page
 * Task 1.4.2: Implement controls panel (filters)
 *
 * Features:
 * - Class/Turma dropdown selector
 * - Date picker with day navigation (previous/next)
 * - Period toggle (week/month view)
 * - Frequency summary display
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see planning/visuals/frequencia.html
 */

'use client'

import React from 'react'
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, UserCheck, UserX, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AttendanceSummary } from '@/types/diario-classe'

// ============================================================================
// Types
// ============================================================================

export interface Turma {
  id: string
  nome: string
  serie?: string
  ano_letivo?: number
}

export type PeriodView = 'week' | 'month'

export interface FrequencyControlsProps {
  /** List of available turmas for selection */
  turmas: Turma[]
  /** Currently selected turma ID */
  selectedTurmaId: string | null
  /** Callback when turma selection changes */
  onTurmaChange: (turmaId: string) => void
  /** Currently selected date */
  selectedDate: Date
  /** Callback when date changes */
  onDateChange: (date: Date) => void
  /** Current period view mode */
  periodView: PeriodView
  /** Callback when period view changes */
  onPeriodViewChange: (view: PeriodView) => void
  /** Current frequency summary statistics */
  summary?: AttendanceSummary
  /** Whether controls are in loading state */
  loading?: boolean
  /** Whether controls are disabled (e.g., during save) */
  disabled?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function FrequencyControls({
  turmas,
  selectedTurmaId,
  onTurmaChange,
  selectedDate,
  onDateChange,
  periodView,
  onPeriodViewChange,
  summary,
  loading = false,
  disabled = false,
}: FrequencyControlsProps) {
  // Date navigation handlers
  const handlePreviousDay = () => {
    onDateChange(subDays(selectedDate, 1))
  }

  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1))
  }

  // Get date range for display based on period view
  const getDateRangeDisplay = () => {
    if (periodView === 'week') {
      const weekStart = startOfWeek(selectedDate, { locale: ptBR, weekStartsOn: 0 })
      const weekEnd = endOfWeek(selectedDate, { locale: ptBR, weekStartsOn: 0 })
      return `${format(weekStart, 'dd/MM', { locale: ptBR })} - ${format(weekEnd, 'dd/MM', { locale: ptBR })}`
    } else {
      return format(selectedDate, 'MMMM yyyy', { locale: ptBR })
    }
  }

  // Calculate attendance rate color
  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className="bg-gray-100 border-gray-200">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
          {/* Turma Selector */}
          <div className="space-y-2">
            <Label htmlFor="turma-select" className="text-sm font-semibold text-gray-900">
              Turma
            </Label>
            <Select
              value={selectedTurmaId || ''}
              onValueChange={onTurmaChange}
              disabled={loading || disabled || turmas.length === 0}
            >
              <SelectTrigger
                id="turma-select"
                className="w-full bg-white"
                aria-label="Selecionar turma"
              >
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome}
                    {turma.serie && <span className="text-muted-foreground ml-1">({turma.serie})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selector with Navigation */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-900">
              Data
            </Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal bg-white',
                      !selectedDate && 'text-muted-foreground'
                    )}
                    disabled={loading || disabled}
                    aria-label="Selecionar data"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && onDateChange(date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousDay}
                disabled={loading || disabled}
                className="bg-gray-300 hover:bg-gray-400 border-gray-300"
                aria-label="Dia anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                disabled={loading || disabled}
                className="bg-gray-300 hover:bg-gray-400 border-gray-300"
                aria-label="Proximo dia"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Period Toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-900">
              Periodo
            </Label>
            <div className="flex gap-2">
              <Button
                variant={periodView === 'week' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  periodView === 'week'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-900 hover:bg-gray-400'
                )}
                onClick={() => onPeriodViewChange('week')}
                disabled={loading || disabled}
              >
                Semana
              </Button>
              <Button
                variant={periodView === 'month' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  periodView === 'month'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-900 hover:bg-gray-400'
                )}
                onClick={() => onPeriodViewChange('month')}
                disabled={loading || disabled}
              >
                Mes
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {getDateRangeDisplay()}
            </p>
          </div>

          {/* Frequency Summary */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            {summary ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Frequencia:</span>
                  <span className={cn('font-bold text-lg', getAttendanceRateColor(summary.percentualPresenca))}>
                    {summary.percentualPresenca}%
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-green-600" />
                    <span>{summary.presentes} presentes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserX className="h-3 w-3 text-red-600" />
                    <span>{summary.faltas} ausentes</span>
                  </div>
                  {summary.atestados > 0 && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-yellow-600" />
                      <span>{summary.atestados} atestados</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <Users className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">
                  Selecione uma turma
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default FrequencyControls
