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

export function DemoSandboxBanner() {
  return (
    <div
      role="note"
      className="mb-4 flex items-center gap-2 rounded-educa border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:text-sm"
    >
      <FlaskConical className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="min-w-0">
        <span className="font-semibold">Sandbox de demonstração</span>
        <span className="text-amber-700">
          {' '}&middot; dados sintéticos, reiniciados semanalmente; sem criação de
          conta; ações destrutivas bloqueadas.
        </span>
      </p>
    </div>
  )
}
