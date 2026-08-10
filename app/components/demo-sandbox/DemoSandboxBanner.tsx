/**
 * DemoSandboxBanner
 *
 * Banner visivel em todo o painel quando o ambiente roda em modo sandbox
 * publico de demonstracao (NEXT_PUBLIC_DEMO_SANDBOX=true, issue #23).
 *
 * Deixa explicito para quem navega no demo que:
 *  - os dados sao sinteticos e reiniciados semanalmente;
 *  - nao ha criacao de conta (conta unica demo@educa.app.br);
 *  - acoes destrutivas estao bloqueadas.
 */

'use client'

import { FlaskConical } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function DemoSandboxBanner() {
  return (
    <Alert className="mb-4 bg-amber-50 border-amber-200">
      <FlaskConical className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">
        Sandbox público de demonstração
      </AlertTitle>
      <AlertDescription className="text-amber-700">
        Dados 100% sintéticos, reiniciados semanalmente. Não há criação de
        conta e ações destrutivas estão bloqueadas.
      </AlertDescription>
    </Alert>
  )
}
