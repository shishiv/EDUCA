'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Save, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import type { CalendarioEvento, CalendarioEventoTipo } from '@/app/(dashboard)/dashboard/calendario/page'
import { useClassroomTranslations } from '@/i18n/classroom'

interface CalendarioEventFormProps {
  escolaId: string
  selectedDate: Date | null
  evento: CalendarioEvento | null
  onClose: () => void
  onSuccess: () => void
  tipoLabels: Record<CalendarioEventoTipo, string>
}

const TIPO_OPTIONS = [
  { value: 'feriado', afeta: true },
  { value: 'recesso', afeta: true },
  { value: 'dia_letivo', afeta: false },
  { value: 'evento', afeta: false },
  { value: 'reuniao', afeta: false },
  { value: 'conselho', afeta: false },
] as const satisfies ReadonlyArray<{ value: CalendarioEventoTipo; afeta: boolean }>

interface CalendarioEventFormData {
  titulo: string
  descricao: string
  data_inicio: string
  data_fim: string
  tipo: CalendarioEventoTipo
  afeta_frequencia: boolean
  ano_letivo: number
}

function validateEvent(formData: CalendarioEventFormData): string | null {
  if (!formData.titulo.trim()) return 'Informe o título do evento'
  if (!formData.data_inicio || !formData.data_fim) return 'Informe as datas de início e fim'
  if (formData.data_fim < formData.data_inicio) {
    return 'A data de fim não pode ser anterior à data de início'
  }
  return null
}

function isEventType(value: string): value is CalendarioEventoTipo {
  return TIPO_OPTIONS.some(option => option.value === value)
}

export function CalendarioEventForm({
  escolaId,
  selectedDate,
  evento,
  onClose,
  onSuccess,
  tipoLabels,
}: CalendarioEventFormProps) {
  const t = useClassroomTranslations()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CalendarioEventFormData>({
    titulo: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    tipo: 'evento',
    afeta_frequencia: false,
    ano_letivo: new Date().getFullYear(),
  })

  useEffect(() => {
    if (evento) {
      setFormData({
        titulo: evento.titulo,
        descricao: evento.descricao || '',
        data_inicio: evento.data_inicio,
        data_fim: evento.data_fim,
        tipo: evento.tipo,
        afeta_frequencia: evento.afeta_frequencia,
        ano_letivo: evento.ano_letivo,
      })
    } else if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      setFormData(prev => ({
        ...prev,
        data_inicio: dateStr,
        data_fim: dateStr,
      }))
    }
  }, [evento, selectedDate])

  // Auto-set afeta_frequencia based on tipo
  useEffect(() => {
    const tipoConfig = TIPO_OPTIONS.find(t => t.value === formData.tipo)
    if (tipoConfig) {
      setFormData(prev => ({
        ...prev,
        afeta_frequencia: tipoConfig.afeta,
      }))
    }
  }, [formData.tipo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateEvent(formData)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)
    try {
      const eventoData = {
        escola_id: escolaId,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim() || null,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        tipo: formData.tipo,
        afeta_frequencia: formData.afeta_frequencia,
        ano_letivo: formData.ano_letivo,
      }

      if (evento) {
        // Update existing
        const { error } = await supabase
          .from('calendario_escolar')
          .update(eventoData)
          .eq('id', evento.id)

        if (error) throw error
        toast.success('Evento atualizado com sucesso')
      } else {
        // Create new
        const { error } = await supabase
          .from('calendario_escolar')
          .insert([eventoData])

        if (error) throw error
        toast.success('Evento criado com sucesso')
      }

      onSuccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar evento'
      logger.error('Erro ao salvar evento:', message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = <Field extends keyof CalendarioEventFormData>(
    field: Field,
    value: CalendarioEventFormData[Field],
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTypeChange = (value: string) => {
    if (isEventType(value)) handleChange('tipo', value)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {evento ? 'Editar Evento' : t('actions.newEvent')}
          </DialogTitle>
          <DialogDescription>
            {evento
              ? 'Atualize as informações do evento no calendário'
              : 'Adicione um novo evento ao calendário escolar'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => handleChange('titulo', e.target.value)}
              placeholder="Ex: Feriado Nacional - Proclamação da República"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">
              Tipo <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.tipo}
              onValueChange={handleTypeChange}
              disabled={loading}
            >
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map(({ value }) => (
                  <SelectItem key={value} value={value}>
                    {tipoLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">
                Data Início <span className="text-red-500">*</span>
              </Label>
              <Input
                id="data_inicio"
                type="date"
                value={formData.data_inicio}
                onChange={(e) => handleChange('data_inicio', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fim">
                Data Fim <span className="text-red-500">*</span>
              </Label>
              <Input
                id="data_fim"
                type="date"
                value={formData.data_fim}
                onChange={(e) => handleChange('data_fim', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">{t('labels.description')}</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
              placeholder="Detalhes adicionais sobre o evento..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="afeta_frequencia"
              checked={formData.afeta_frequencia}
              onCheckedChange={(checked) => handleChange('afeta_frequencia', checked === true)}
              disabled={loading}
            />
            <Label htmlFor="afeta_frequencia" className="text-sm cursor-pointer">
              Este evento afeta o cálculo de frequência (dias não letivos)
            </Label>
          </div>

          {formData.afeta_frequencia && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Atenção:</strong> Eventos que afetam frequência serão desconsiderados
                no cálculo de dias letivos. Faltas registradas nesses dias não contarão
                para o percentual de frequência.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {evento ? 'Atualizar' : t('actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
