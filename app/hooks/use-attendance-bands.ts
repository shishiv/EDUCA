'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { resolveAttendanceBands } from '@/lib/attendance/resolve-attendance-bands'

/** Undefined waits for the resource; null explicitly requests municipal defaults. */
export function useAttendanceBands(schoolId: string | null | undefined) {
  const { userProfile } = useAuth()
  return useQuery({
    queryKey: ['attendance-bands', userProfile?.id, schoolId],
    enabled: Boolean(userProfile) && schoolId !== undefined,
    queryFn: () => {
      if (schoolId === undefined) throw new Error('ATTENDANCE_SCHOOL_REQUIRED')
      return resolveAttendanceBands(supabase, schoolId)
    },
    retry: false,
  })
}
