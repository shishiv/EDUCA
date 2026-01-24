'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWeekend } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { CalendarioEventForm } from '@/components/calendario/evento-form'
import { CalendarioEventList } from '@/components/calendario/evento-list'
import { logger } from '@/lib/logger'

export interface CalendarioEvento {
  id: string
  escola_id: string
  titulo: string
  descricao: string | null
  data_inicio: string
  data_fim: string
  tipo: 'feriado' | 'recesso' | 'dia_letivo' | 'evento' | 'reuniao' | 'conselho'
  afeta_frequencia: boolean
  cor: string | null
  ano_letivo: number
  criado_por: string | null
  created_at: string | null
  updated_at: string | null
}

const TIPO_CORES: Record<string, string> = {
  feriado: 'bg-red-500',
  recesso: 'bg-orange-500',
  dia_letivo: 'bg-green-500',
  evento: 'bg-blue-500',
  reuniao: 'bg-purple-500',
  conselho: 'bg-amber-500',
}

const TIPO_LABELS: Record<string, string> = {
  feriado: 'Feriado',
  recesso: 'Recesso',
  dia_letivo: 'Dia Letivo Extra',
  evento: 'Evento',
  reuniao: 'Reunião',
  conselho: 'Conselho de Classe',
}

export default function CalendarioPage() {
  const { userProfile } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventos, setEventos] = useState<CalendarioEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvento, setEditingEvento] = useState<CalendarioEvento | null>(null)

  const isAdmin = userProfile?.tipo_usuario === 'admin' || userProfile?.tipo_usuario === 'secretario'

  const fetchEventos = useCallback(async () => {
    if (!userProfile?.escola_id) return

    setLoading(true)
    try {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)

      const { data, error } = await supabase
        .from('calendario_escolar')
        .select('*')
        .eq('escola_id', userProfile.escola_id)
        .gte('data_inicio', format(start, 'yyyy-MM-dd'))
        .lte('data_fim', format(end, 'yyyy-MM-dd'))
        .order('data_inicio', { ascending: true })

      if (error) throw error

      // Cast tipo to expected union type
      const typedData = (data || []).map(evento => ({
        ...evento,
        tipo: evento.tipo as CalendarioEvento['tipo'],
        afeta_frequencia: evento.afeta_frequencia ?? false,
      }))
      setEventos(typedData)
    } catch (error) {
      logger.error('Erro ao carregar eventos:', error as Error)
      toast.error('Erro ao carregar eventos do calendario')
    } finally {
      setLoading(false)
    }
  }, [userProfile?.escola_id, currentDate])

  useEffect(() => {
    if (userProfile?.escola_id) {
      fetchEventos()
    }
  }, [userProfile?.escola_id, fetchEventos])

  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    if (isAdmin) {
      setEditingEvento(null)
      setShowEventForm(true)
    }
  }

  const handleEditEvento = (evento: CalendarioEvento) => {
    setEditingEvento(evento)
    setSelectedDate(new Date(evento.data_inicio))
    setShowEventForm(true)
  }

  const handleDeleteEvento = async (eventoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return

    try {
      const { error } = await supabase
        .from('calendario_escolar')
        .delete()
        .eq('id', eventoId)

      if (error) throw error

      toast.success('Evento excluído com sucesso')
      fetchEventos()
    } catch (error) {
      logger.error('Erro ao excluir evento:', error as Error)
      toast.error('Erro ao excluir evento')
    }
  }

  const handleFormClose = () => {
    setShowEventForm(false)
    setEditingEvento(null)
    setSelectedDate(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    fetchEventos()
  }

  const getEventosForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return eventos.filter(e => {
      return dayStr >= e.data_inicio && dayStr <= e.data_fim
    })
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Calculate padding days for start of month
  const startPadding = monthStart.getDay()
  const paddingDays = Array(startPadding).fill(null)

  if (!userProfile) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendário Escolar</h1>
          <p className="text-muted-foreground">
            Gerencie feriados, recessos e eventos do ano letivo
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setSelectedDate(new Date()); setShowEventForm(true) }} className="mt-4 md:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        )}
      </div>

      {/* User Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Escola:</strong> {(userProfile as any).escola?.nome || 'Escola não informada'}
          {' | '}
          <strong>Ano Letivo:</strong> {new Date().getFullYear()}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Hoje
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Clique em um dia para ver os eventos ou adicionar um novo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Week headers */}
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}

                {/* Padding days */}
                {paddingDays.map((_, index) => (
                  <div key={`pad-${index}`} className="h-20 bg-gray-50 rounded" />
                ))}

                {/* Calendar days */}
                {days.map(day => {
                  const dayEventos = getEventosForDay(day)
                  const isToday = isSameDay(day, new Date())
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const weekend = isWeekend(day)

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={`
                        h-20 p-1 rounded border text-left transition-colors
                        ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                        ${!isCurrentMonth ? 'opacity-50' : ''}
                        ${weekend ? 'bg-gray-50' : 'bg-white'}
                        hover:border-blue-300 hover:bg-blue-50/50
                      `}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="mt-1 space-y-0.5 overflow-hidden">
                        {dayEventos.slice(0, 2).map(evento => (
                          <div
                            key={evento.id}
                            className={`text-xs text-white px-1 rounded truncate ${evento.cor || TIPO_CORES[evento.tipo] || 'bg-gray-500'}`}
                          >
                            {evento.titulo}
                          </div>
                        ))}
                        {dayEventos.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEventos.length - 2} mais
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event List */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos do Mês</CardTitle>
            <CardDescription>
              {eventos.length} evento(s) em {format(currentDate, 'MMMM', { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarioEventList
              eventos={eventos}
              onEdit={isAdmin ? handleEditEvento : undefined}
              onDelete={isAdmin ? handleDeleteEvento : undefined}
              tipoLabels={TIPO_LABELS}
              tipoCores={TIPO_CORES}
            />
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(TIPO_LABELS).map(([tipo, label]) => (
              <div key={tipo} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${TIPO_CORES[tipo]}`} />
                <span className="text-sm">{label}</span>
                {(tipo === 'feriado' || tipo === 'recesso') && (
                  <Badge variant="secondary" className="text-xs">
                    Afeta Frequência
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Form Modal */}
      {showEventForm && userProfile?.escola_id && (
        <CalendarioEventForm
          escolaId={userProfile.escola_id}
          selectedDate={selectedDate}
          evento={editingEvento}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          tipoLabels={TIPO_LABELS}
        />
      )}
    </div>
  )
}
