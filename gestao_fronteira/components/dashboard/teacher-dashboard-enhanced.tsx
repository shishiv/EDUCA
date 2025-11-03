'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap } from 'lucide-react'

interface TeacherDashboardEnhancedProps {
  professorId: string
}

export function TeacherDashboardEnhanced({ professorId }: TeacherDashboardEnhancedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Dashboard do Professor
        </CardTitle>
        <CardDescription>
          Visão geral das suas turmas e atividades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Dashboard em desenvolvimento...
        </p>
      </CardContent>
    </Card>
  )
}
