'use client'

import { useEffect, useState } from 'react'
import type { MunicipalSettings } from '@/lib/services/municipal-settings'

export function useMunicipalSettings(schoolId?: string | null, year = new Date().getFullYear()) {
  const [settings, setSettings] = useState<MunicipalSettings | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const search = new URLSearchParams({ year: String(year) })
    if (schoolId) search.set('schoolId', schoolId)
    setSettings(null)

    fetch(`/api/school-settings/municipal?${search}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('MUNICIPAL_SETTINGS_LOAD_FAILED')
        return response.json() as Promise<{ settings?: MunicipalSettings }>
      })
      .then(body => setSettings(body.settings ?? null))
      .catch(error => {
        if (error.name !== 'AbortError') setSettings(null)
      })

    return () => controller.abort()
  }, [schoolId, year])

  return settings
}
