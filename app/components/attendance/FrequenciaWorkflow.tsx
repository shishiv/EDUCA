'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList } from 'lucide-react'

/**
 * Compatibility shell for the retired daily workflow.
 * The canonical attendance journey starts from a turma and uses sessoes_aula.
 */
export function FrequenciaWorkflow() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Chamada por turma
        </CardTitle>
        <CardDescription>
          Escolha uma turma para abrir ou revisar uma sessão de chamada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/dashboard/turmas">Ver turmas</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
