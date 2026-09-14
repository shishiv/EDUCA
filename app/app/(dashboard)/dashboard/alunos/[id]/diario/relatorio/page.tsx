'use client'

import { useParams } from 'next/navigation'
import { StudentNarrativeReports } from '@/components/reports/StudentNarrativeReports'

export default function RelatorioPage() {
  const { id } = useParams<{ id: string }>()
  return <StudentNarrativeReports studentId={id} />
}
