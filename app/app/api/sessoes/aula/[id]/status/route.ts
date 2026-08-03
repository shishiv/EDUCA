/**
 * @deprecated Session status changes now use server actions from the canonical
 * chamada page. This adapter cannot mutate attendance state.
 */

import { NextResponse } from 'next/server'

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      code: 'ATTENDANCE_STATUS_ROUTE_DEPRECATED',
      error: 'Use as ações de servidor da chamada canônica para fechar a sessão',
      route: '/dashboard/turmas/[id]/chamada',
    },
    { status: 410 }
  )
}
