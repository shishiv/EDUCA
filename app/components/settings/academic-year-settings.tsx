'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AcademicYearResponse {
  academicYear?: {
    ano: number
    data_inicio: string
    data_fim: string
  }
  error?: string
}

export function AcademicYearSettings() {
  const t = useTranslations('platform.settings')
  const [year, setYear] = useState<number | null>(null)
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
      const response = await fetch('/api/school-settings/academic-year')
      const body = await response.json() as AcademicYearResponse
      if (!response.ok || !body.academicYear) {
        throw new Error(response.status === 403 ? t('academicYearDenied') : body.error || t('academicYearLoadError'))
      }
      setYear(body.academicYear.ano)
      setStartDate(body.academicYear.data_inicio)
      setEndDate(body.academicYear.data_fim)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('academicYearLoadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

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
      const response = await fetch('/api/school-settings/academic-year', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const body = await response.json() as AcademicYearResponse
      if (!response.ok || !body.academicYear) {
        throw new Error(response.status === 403 ? t('academicYearDenied') : body.error || t('academicYearSaveError'))
      }
      setStartDate(body.academicYear.data_inicio)
      setEndDate(body.academicYear.data_fim)
      setSuccess(t('academicYearSaved'))
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
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('academicYearLoading')}</p>
        ) : error && year === null ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-600">{error}</p>
            <Button type="button" variant="outline" onClick={() => void load()}>{t('retry')}</Button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={event => { event.preventDefault(); void save() }}>
            <p className="text-sm font-medium">{t('academicYearLabel', { year: year ?? '' })}</p>
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
      </CardContent>
    </Card>
  )
}
