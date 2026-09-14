'use client'

import { useParams } from 'next/navigation'
import { StudentNarrativeReports } from '@/components/reports/StudentNarrativeReports'

export default function StudentReportsPage() {
  const { alunoId } = useParams<{ alunoId: string }>()
  return <StudentNarrativeReports studentId={alunoId} />
}
