/**
 * POST /api/whatsapp/opt-in - explicit guardian consent management.
 *
 * Pilot staff record (or withdraw) a guardian's explicit WhatsApp consent
 * for attendance alerts. The service stores consent timestamps, derives the
 * school scope from the guardian record, and writes the change to the
 * append-only audit log. Phone numbers are never part of this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asWhatsAppClient } from '@/lib/notifications/whatsapp-database'
import {
  setGuardianWhatsAppOptIn,
  whatsappOptInInputSchema,
} from '@/lib/notifications/whatsapp-optin-service'

export async function POST(request: NextRequest) {
  try {
    const actor = await requirePilotActor(['admin', 'secretario', 'diretor', 'professor'])
    const input = whatsappOptInInputSchema.parse(await request.json())
    const supabase = asWhatsAppClient(await createClient())

    const state = await setGuardianWhatsAppOptIn(supabase, { id: actor.id }, input)

    return NextResponse.json({ state }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'WHATSAPP_OPTIN_INVALID' }, { status: 400 })
    }
    return pilotErrorResponse(error, {
      feature: 'whatsapp-optin',
      fallbackCode: 'WHATSAPP_OPTIN_FAILED',
      fallbackStatus: 400,
    })
  }
}
