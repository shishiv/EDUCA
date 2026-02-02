'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pencil, Trash2, Calendar, AlertCircle } from 'lucide-react'
import { format, parseISO, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CalendarioEvento } from '@/app/(dashboard)/dashboard/calendario/page'

interface CalendarioEventListProps {
  eventos: CalendarioEvento[]
  onEdit?: (evento: CalendarioEvento) => void
  onDelete?: (eventoId: string) => void
  tipoLabels: Record<string, string>
  tipoCores: Record<string, string>
}

export function CalendarioEventList({
  eventos,
  onEdit,
  onDelete,
  tipoLabels,
  tipoCores,
}: CalendarioEventListProps) {
  if (eventos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum evento neste mês</p>
      </div>
    )
  }

  const formatDateRange = (inicio: string, fim: string) => {
    const dataInicio = parseISO(inicio)
    const dataFim = parseISO(fim)

    if (isSameDay(dataInicio, dataFim)) {
      return format(dataInicio, "dd 'de' MMMM", { locale: ptBR })
    }

    return `${format(dataInicio, 'dd/MM')} - ${format(dataFim, 'dd/MM')}`
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-3">
        {eventos.map((evento) => (
          <div
            key={evento.id}
            className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${tipoCores[evento.tipo] || 'bg-gray-500'}`} />
                  <h4 className="font-medium text-sm truncate">{evento.titulo}</h4>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDateRange(evento.data_inicio, evento.data_fim)}</span>
                  <Badge variant="secondary" className="text-xs">
                    {tipoLabels[evento.tipo]}
                  </Badge>
                  {evento.afeta_frequencia && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Afeta Frequência
                    </Badge>
                  )}
                </div>

                {evento.descricao && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {evento.descricao}
                  </p>
                )}
              </div>

              {(onEdit || onDelete) && (
                <div className="flex items-center gap-1 shrink-0">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(evento)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDelete(evento.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
