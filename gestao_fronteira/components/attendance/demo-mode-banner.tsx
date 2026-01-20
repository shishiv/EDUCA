/**
 * DemoModeBanner - Visual indicator for admin demo mode
 *
 * Shows a distinctive purple banner when admin is in demo mode,
 * with clear exit button. Follows ViewOnlyNotice pattern but with
 * purple styling to differentiate from view-only (blue) state.
 *
 * @see .planning/phases/13-admin-demo-assignment/13-01-PLAN.md
 */

import { Presentation, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DemoModeBannerProps {
  /** Handler for exit button click */
  onExit: () => void
  /** Optional additional CSS classes */
  className?: string
}

export function DemoModeBanner({ onExit, className }: DemoModeBannerProps) {
  return (
    <Alert className={cn("bg-purple-50 border-purple-200", className)}>
      <Presentation className="h-4 w-4 text-purple-600" />
      <AlertTitle className="text-purple-800 flex items-center justify-between">
        <span>Modo Demonstracao</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="h-6 text-purple-600 hover:text-purple-800 hover:bg-purple-100"
        >
          <X className="h-4 w-4 mr-1" />
          Sair
        </Button>
      </AlertTitle>
      <AlertDescription className="text-purple-700">
        Voce esta demonstrando o fluxo de professor. Acoes serao registradas com seu usuario admin.
      </AlertDescription>
    </Alert>
  )
}
