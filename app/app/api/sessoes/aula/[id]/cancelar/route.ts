/**
 * @deprecated Cancellation is not part of the canonical pilot chamada flow.
 * It stays disabled so closed attendance history cannot be rewritten through a
 * second HTTP boundary.
 */

import { NextResponse } from 'next/server'

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      code: 'ATTENDANCE_CANCEL_ROUTE_DEPRECATED',
      error: 'A sessão canônica só pode ser fechada pela chamada da turma',
      route: '/dashboard/turmas/[id]/chamada',
    },
    { status: 410 }
  )
}
