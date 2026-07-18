/**
 * ChamadaDateNav Component
 * Date navigation with < Today > buttons and calendar picker
 *
 * @see .planning/phases/04-turmas-chamada/04-02-PLAN.md
 */

'use client'

import { useState } from 'react'
import { addDays, subDays, format, isSameDay, isAfter, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// ============================================================================
// Types
// ============================================================================

export interface ChamadaDateNavProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  chamadaStatus?: Map<string, 'complete' | 'pending' | 'empty'>
}

// ============================================================================
// Component
// ============================================================================

export function ChamadaDateNav({
  currentDate,
  onDateChange,
  chamadaStatus,
}: ChamadaDateNavProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const today = startOfDay(new Date())
  const isToday = isSameDay(currentDate, today)
  const isFuture = isAfter(startOfDay(currentDate), today)

  const handlePrevDay = () => {
    onDateChange(subDays(currentDate, 1))
  }

  const handleNextDay = () => {
    onDateChange(addDays(currentDate, 1))
  }

  const handleToday = () => {
    onDateChange(today)
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date)
      setCalendarOpen(false)
    }
  }

  // Build modifiers for calendar styling
  const getModifiers = () => {
    if (!chamadaStatus) return {}

    const complete: Date[] = []
    const pending: Date[] = []

    chamadaStatus.forEach((status, dateStr) => {
      const date = new Date(dateStr)
      if (status === 'complete') {
        complete.push(date)
      } else if (status === 'pending') {
        pending.push(date)
      }
    })

    return {
      complete,
      pending,
    }
  }

  const modifiers = getModifiers()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Previous day button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevDay}
        aria-label="Dia anterior"
        className="h-10 w-10"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "min-w-[200px] justify-start text-left font-normal",
              !currentDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={handleCalendarSelect}
            locale={ptBR}
            modifiers={modifiers}
            modifiersClassNames={{
              complete: 'bg-green-100 text-green-900 hover:bg-green-200',
              pending: 'bg-red-100 text-red-900 hover:bg-red-200',
            }}
            disabled={(date) => {
              // Disable weekends
              const day = date.getDay()
              return day === 0 || day === 6
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Next day button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleNextDay}
        aria-label="Proximo dia"
        className="h-10 w-10"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Today button - visible when not viewing today */}
      {!isToday && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleToday}
          className="ml-2"
        >
          Hoje
        </Button>
      )}

      {/* Future date indicator */}
      {isFuture && (
        <Badge variant="secondary" className="ml-2">
          Visualizacao
        </Badge>
      )}
    </div>
  )
}

export default ChamadaDateNav
