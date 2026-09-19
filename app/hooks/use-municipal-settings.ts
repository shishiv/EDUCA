'use client'

import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { municipalSettingsSchema } from '@/lib/services/municipal-settings'

const municipalSettingsEnvelopeSchema = z.object({ settings: municipalSettingsSchema })

export function useMunicipalSettings(schoolId?: string | null, year = new Date().getFullYear()) {
  const { userProfile } = useAuth()
  const { data } = useQuery({
    queryKey: ['municipal-settings', userProfile?.id, schoolId ?? null, year],
    enabled: Boolean(userProfile),
    retry: false,
    throwOnError: true,
    queryFn: async ({ signal }) => {
      const search = new URLSearchParams({ year: String(year) })
      if (schoolId) search.set('schoolId', schoolId)
      const response = await fetch(`/api/school-settings/municipal?${search}`, { signal })
      if (!response.ok) throw new Error('MUNICIPAL_SETTINGS_LOAD_FAILED: configuração municipal indisponível')
      return municipalSettingsEnvelopeSchema.parse(await response.json()).settings
    },
  })
  return data ?? null
}
