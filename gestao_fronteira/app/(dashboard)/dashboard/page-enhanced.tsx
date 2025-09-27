'use client'

import { useRouter } from 'next/navigation'
import { RoleSpecificDashboard } from '@/components/dashboard/role-specific-dashboards'

export default function EnhancedDashboardPage() {
  const router = useRouter()

  const handleNavigateToAttendance = (classInfo: any, sessionData?: any) => {
    // Navigate to attendance marking page
    const params = new URLSearchParams()
    params.set('turma', classInfo.id)
    if (sessionData?.id) {
      params.set('sessao', sessionData.id)
    }
    router.push(`/dashboard/frequencia?${params.toString()}`)
  }

  return <RoleSpecificDashboard onNavigateToAttendance={handleNavigateToAttendance} />
}