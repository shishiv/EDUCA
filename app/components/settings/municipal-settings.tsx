'use client'

import { useEffect, useState } from 'react'
import { Building2, Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/use-auth'
import { useEscola } from '@/contexts/escola-context'
import { useMunicipalSettings } from '@/hooks/use-municipal-settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function MunicipalSettings() {
  const t = useTranslations('platform.settings')
  const { userProfile } = useAuth()
  const { selectedEscolaId } = useEscola()
  const year = new Date().getFullYear()
  const settings = useMunicipalSettings(selectedEscolaId, year)
  const [form, setForm] = useState({
    municipalityName: '',
    educationDepartmentName: '',
    state: '',
    contactPhone: '',
    dpoEmail: '',
    dpoAddress: '',
    educacensoDeadline: '',
  })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const canEdit = ['admin', 'secretario'].includes(userProfile?.tipo_usuario ?? '') && userProfile?.escola_id === null

  useEffect(() => {
    if (!settings) return
    setForm({
      municipalityName: settings.municipality_name,
      educationDepartmentName: settings.education_department_name,
      state: settings.state,
      contactPhone: settings.contact_phone,
      dpoEmail: settings.dpo_email,
      dpoAddress: settings.dpo_address,
      educacensoDeadline: settings.educacenso_deadline ?? '',
    })
  }, [settings])

  async function save() {
    setSaving(true)
    setStatus('')
    try {
      const response = await fetch('/api/school-settings/municipal', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, schoolId: selectedEscolaId, educacensoYear: year, educacensoDeadline: form.educacensoDeadline || null }),
      })
      if (!response.ok) throw new Error()
      setStatus(t('municipalSaved'))
    } catch {
      setStatus(t('municipalSaveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" aria-hidden="true" />
          {t('municipalTitle')}
        </CardTitle>
        <CardDescription>{t(canEdit ? selectedEscolaId ? 'municipalSchoolDescription' : 'municipalDescription' : 'municipalReadOnly')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!settings ? <p className="text-sm text-muted-foreground">{t('municipalLoading')}</p> : (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void save() }}>
            <Field label={t('municipalityName')} value={form.municipalityName} onChange={value => setForm({ ...form, municipalityName: value })} disabled={!canEdit} />
            <Field label={t('educationDepartmentName')} value={form.educationDepartmentName} onChange={value => setForm({ ...form, educationDepartmentName: value })} disabled={!canEdit} />
            <Field label={t('municipalState')} value={form.state} onChange={value => setForm({ ...form, state: value })} disabled={!canEdit} />
            <Field label={t('municipalPhone')} value={form.contactPhone} onChange={value => setForm({ ...form, contactPhone: value })} disabled={!canEdit} />
            <Field label={t('dpoEmail')} type="email" value={form.dpoEmail} onChange={value => setForm({ ...form, dpoEmail: value })} disabled={!canEdit} />
            <Field label={t('dpoAddress')} value={form.dpoAddress} onChange={value => setForm({ ...form, dpoAddress: value })} disabled={!canEdit} />
            <Field label={t('educacensoDeadline', { year })} type="date" value={form.educacensoDeadline} onChange={value => setForm({ ...form, educacensoDeadline: value })} disabled={!canEdit} />
            {canEdit && <div className="flex items-end"><Button type="submit" disabled={saving}><Save className="mr-2 h-4 w-4" aria-hidden="true" />{saving ? t('saving') : t('municipalSave')}</Button></div>}
          </form>
        )}
        {status && <p role="status" className="text-sm">{status}</p>}
      </CardContent>
    </Card>
  )
}

function Field({ label, value, onChange, disabled, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; type?: string }) {
  const id = label.replaceAll(' ', '-').toLowerCase()
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} disabled={disabled} /></div>
}
