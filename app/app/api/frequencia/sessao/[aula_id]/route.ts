/**
 * @deprecated The legacy aulas_abertas read endpoint is not part of the
 * canonical attendance flow. Read sessoes_aula through the turma chamada.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      code: 'ATTENDANCE_ROUTE_DEPRECATED',
      error: 'Use a sessão da chamada canônica da turma',
      route: '/dashboard/turmas/[id]/chamada',
    },
    { status: 410 }
  )
}
