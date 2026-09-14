'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { schoolPeriodKeySchema, schoolPeriodsSchema, type SchoolPeriod } from '@/lib/services/school-periods'

const responseSchema = z.object({ periods: schoolPeriodsSchema.optional(), error: z.string().optional() })

export function SchoolPeriodSettings({ year, initialPeriods }: { year: number; initialPeriods: SchoolPeriod[] }) {
  const [periods, setPeriods] = useState(initialPeriods)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function change(key: SchoolPeriod['chave'], field: 'nome' | 'data_inicio' | 'data_fim', value: string) {
    setPeriods(current => {
      const existing = current.find(period => period.chave === key)
      const updated = { chave: key, nome: '', data_inicio: '', data_fim: '', ...existing, [field]: value }
      return [...current.filter(period => period.chave !== key), updated]
    })
  }

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      const parsed = schoolPeriodsSchema.safeParse(periods)
      if (!parsed.success) throw new Error('Preencha nome, início e fim de cada período ou remova-o.')
      const response = await fetch('/api/school-settings/periods', {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ year, periods: parsed.data }),
      })
      const body = responseSchema.parse(await response.json())
      if (!response.ok || !body.periods) throw new Error('Não foi possível salvar. Verifique as datas do ano e sobreposições entre períodos do mesmo tipo.')
      setPeriods(body.periods)
      setMessage('Períodos escolares salvos.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar períodos.')
    } finally { setSaving(false) }
  }

  return (
    <section aria-label="Períodos escolares" className="space-y-4 border-t pt-5">
      <h3 className="font-semibold">Períodos escolares de {year}</h3>
      <p className="text-sm text-muted-foreground">Sem datas cadastradas, os períodos ficam não configurados. O intervalo anual não aprova um calendário pedagógico.</p>
      {schoolPeriodKeySchema.options.map(key => {
        const period = periods.find(item => item.chave === key)
        return (
          <fieldset key={key} className="space-y-2 rounded-lg border p-3" disabled={saving}>
            <legend className="px-1 text-sm">{key.replace('_', ' ')}</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label htmlFor={`period-${key}-name`}>Nome</Label><Input id={`period-${key}-name`} value={period?.nome ?? ''} onChange={event => change(key, 'nome', event.target.value)} /></div>
              <div><Label htmlFor={`period-${key}-start`}>Início</Label><Input id={`period-${key}-start`} type="date" value={period?.data_inicio ?? ''} onChange={event => change(key, 'data_inicio', event.target.value)} /></div>
              <div><Label htmlFor={`period-${key}-end`}>Fim</Label><Input id={`period-${key}-end`} type="date" value={period?.data_fim ?? ''} onChange={event => change(key, 'data_fim', event.target.value)} /></div>
            </div>
            {period ? <Button type="button" variant="ghost" onClick={() => setPeriods(current => current.filter(item => item.chave !== key))}>Remover definição de {key.replace('_', ' ')}</Button> : <p className="text-sm text-muted-foreground">Não configurado</p>}
          </fieldset>
        )
      })}
      {message && <p role="status" className="text-sm">{message}</p>}
      <Button type="button" disabled={saving} onClick={() => void save()}>Salvar períodos</Button>
    </section>
  )
}
