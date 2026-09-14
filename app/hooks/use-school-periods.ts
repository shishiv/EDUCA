'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { loadSchoolPeriods, type SchoolPeriod } from '@/lib/services/school-periods'

export function useSchoolPeriods(schoolId: string | undefined, year: number | undefined) {
  const scope = `${schoolId}/${year}`
  const [result, setResult] = useState<{ scope: string; periods: SchoolPeriod[]; error: string }>({ scope: '', periods: [], error: '' })
  useEffect(() => {
    let active = true
    if (!schoolId || !year) return
    void loadSchoolPeriods(supabase, schoolId, year).then(
      periods => { if (active) setResult({ scope, periods, error: '' }) },
      () => { if (active) setResult({ scope, periods: [], error: 'Não foi possível consultar o calendário de períodos.' }) },
    )
    return () => { active = false }
  }, [schoolId, year, scope])
  return useMemo(() => result.scope === scope ? result : { periods: [], error: '', scope }, [result, scope])
}
