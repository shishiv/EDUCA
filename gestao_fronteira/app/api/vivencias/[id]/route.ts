/**
 * Single Vivencia API Routes
 *
 * STUBBED: The vivencias table does not exist in the production database yet.
 * These routes return 501 Not Implemented until the table is created.
 *
 * TODO: Create vivencias migration when ready to enable this feature
 * @see types/diario-infantil.ts for planned Vivencia types
 */

import { NextResponse } from 'next/server'

const NOT_IMPLEMENTED_RESPONSE = {
  error: 'Vivencias feature not yet available',
  code: 'NOT_IMPLEMENTED',
  message: 'The vivencias table has not been created in the database. This feature is planned for a future release.'
}

/**
 * GET /api/vivencias/[id]
 * STUBBED - Returns 501 Not Implemented
 */
export async function GET() {
  return NextResponse.json(NOT_IMPLEMENTED_RESPONSE, { status: 501 })
}

/**
 * PUT /api/vivencias/[id]
 * STUBBED - Returns 501 Not Implemented
 */
export async function PUT() {
  return NextResponse.json(NOT_IMPLEMENTED_RESPONSE, { status: 501 })
}

/**
 * DELETE /api/vivencias/[id]
 * STUBBED - Returns 501 Not Implemented
 */
export async function DELETE() {
  return NextResponse.json(NOT_IMPLEMENTED_RESPONSE, { status: 501 })
}
