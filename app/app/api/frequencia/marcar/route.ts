/**
 * @deprecated The legacy aulas_abertas endpoint is removed from the pilot.
 * Use /api/sessoes/aula/[id]/frequencia/batch from the canonical chamada flow.
 */

import { NextResponse } from 'next/server'

export async function POST(_request?: Request) {
  return NextResponse.json(
    {
      success: false,
      code: 'ATTENDANCE_ROUTE_DEPRECATED',
      error: 'Use a chamada da turma e a sessão sessoes_aula para registrar frequência',
      route: '/dashboard/turmas/[id]/chamada',
    },
    { status: 410 }
  )
}
