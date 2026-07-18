/**
 * ViewOnlyNotice - Alert banner for view-only attendance mode
 * Shown to admin/secretario users who can view but not record attendance
 */

import { Shield } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface ViewOnlyNoticeProps {
  message?: string
  className?: string
}

export function ViewOnlyNotice({
  message = "Como administrador, voce pode visualizar dados de frequencia, mas o registro e feito pelos professores.",
  className
}: ViewOnlyNoticeProps) {
  return (
    <Alert className={cn("bg-blue-50 border-blue-200", className)}>
      <Shield className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800">Modo de Visualizacao</AlertTitle>
      <AlertDescription className="text-blue-700">
        {message}
      </AlertDescription>
    </Alert>
  )
}
