'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SchoolPeriodSettings } from './school-period-settings'
import { schoolPeriodsSchema, type SchoolPeriod } from '@/lib/services/school-periods'

const configuredAcademicYearSchema = z.object({
  ano: z.number(),
  data_inicio: z.string(),
  data_fim: z.string(),
  periodos: schoolPeriodsSchema.optional(),
})

const academicYearResponseSchema = z.object({
  academicYear: configuredAcademicYearSchema.optional(),
  error: z.string().optional(),
}).strict()

type AcademicYearResponse = z.infer<typeof academicYearResponseSchema>
type ConfiguredAcademicYear = z.infer<typeof configuredAcademicYearSchema>

type AcademicYearSaveResult =
  | { kind: 'saved'; academicYear: ConfiguredAcademicYear }
  | { kind: 'denied' }
  | { kind: 'failed'; error?: string }

async function readAcademicYearResponse(response: Response): Promise<AcademicYearResponse | null> {
  const parsed = academicYearResponseSchema.safeParse(await response.json())
  return parsed.success ? parsed.data : null
}

async function saveAcademicYearDates(
  startDate: string,
  endDate: string,
  year: number,
): Promise<AcademicYearSaveResult> {
  const response = await fetch('/api/school-settings/academic-year', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, year }),
  })
  const body = await readAcademicYearResponse(response)
  if (response.ok && body?.academicYear) {
    return { kind: 'saved', academicYear: body.academicYear }
  }
  if (response.status === 403) return { kind: 'denied' }
  return { kind: 'failed', error: body?.error }
}

export function AcademicYearSettings() {
  const t = useTranslations('platform.settings')
  const [year, setYear] = useState(new Date().getFullYear())
  const [periods, setPeriods] = useState<SchoolPeriod[]>([])
  const [persisted, setPersisted] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/school-settings/academic-year?year=${year}`)
      const body = await readAcademicYearResponse(response)
      if (response.status === 404) {
        setStartDate('')
        setEndDate('')
        setPeriods([])
        setPersisted(false)
        setError('Ano ainda não cadastrado. Informe e salve as datas antes de configurar os períodos.')
        return
      }
      if (!response.ok || !body?.academicYear) {
        throw new Error(t('academicYearLoadError'))
      }
      setPersisted(true)
      setPeriods(body.academicYear.periodos ?? [])
      setStartDate(body.academicYear.data_inicio)
      setEndDate(body.academicYear.data_fim)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('academicYearLoadError'))
    } finally {
      setLoading(false)
    }
  }, [t, year])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    setError('')
    setSuccess('')
    if (!startDate || !endDate || startDate > endDate) {
      setError(t('academicYearInvalidRange'))
      return
    }

    setSaving(true)
    try {
      const result = await saveAcademicYearDates(startDate, endDate, year)
      if (result.kind === 'saved') {
        setStartDate(result.academicYear.data_inicio)
        setEndDate(result.academicYear.data_fim)
        setSuccess(t('academicYearSaved'))
        setPersisted(true)
        setPeriods(result.academicYear.periodos ?? [])
      } else {
        setError(result.kind === 'denied' ? t('academicYearDenied') : result.error || t('academicYearSaveError'))
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('academicYearSaveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          {t('academicYearTitle')}
        </CardTitle>
        <CardDescription>{t('academicYearDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div><Label htmlFor="academic-year-number">Ano letivo</Label><Input id="academic-year-number" type="number" min="1" max="9999" value={year} onChange={event => { const value = Number(event.target.value); if (value > 0 && value <= 9999) setYear(value) }} /></div>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('academicYearLoading')}</p>
        ) : error && !startDate && persisted ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-600">{error}</p>
            <Button type="button" variant="outline" onClick={() => void load()}>{t('retry')}</Button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={event => { event.preventDefault(); void save() }}>
            <p className="text-sm font-medium">{t('academicYearLabel', { year })}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="academic-year-start">{t('academicYearStart')}</Label>
                <Input id="academic-year-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academic-year-end">{t('academicYearEnd')}</Label>
                <Input id="academic-year-end" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} required />
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {success && <p role="status" className="text-sm text-green-700">{success}</p>}
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              {saving ? t('saving') : t('academicYearSave')}
            </Button>
          </form>
        )}
        {!loading && persisted && <SchoolPeriodSettings key={`${year}-${JSON.stringify(periods)}`} year={year} initialPeriods={periods} />}
      </CardContent>
    </Card>
  )
}
