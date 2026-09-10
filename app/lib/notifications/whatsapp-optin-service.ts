/**
 * Guardian WhatsApp opt-in service - explicit responsible-party consent.
 *
 * Consent is per guardian (responsavel) and channel, recorded with its own
 * timestamps so the LGPD trail survives withdrawal. School scope comes from
 * the guardian record (trigger-enforced), and every change lands in the
 * append-only pilot audit log. Phone numbers never leave the responsaveis
 * table and are never logged here.
 */

import { z } from 'zod'
import type { WhatsAppSupabase } from './whatsapp-database'

export const whatsappOptInInputSchema = z.object({
  responsavelId: z.string().uuid(),
  optIn: z.boolean(),
})

export type WhatsAppOptInInput = z.infer<typeof whatsappOptInInputSchema>

export interface GuardianWhatsAppOptInState {
  responsavelId: string
  optIn: boolean
  consentidoEm: string | null
  canceladoEm: string | null
  auditReceiptId: string
}

export interface WhatsAppOptInActor {
  id: string
}

/**
 * Records (or withdraws) a guardian's explicit WhatsApp consent. Throws
 * PILOT_NOTIFICATION_SCHOOL_DENIED when the guardian is not visible to the
 * actor, so the RLS write below can never leak across schools.
 */
export async function setGuardianWhatsAppOptIn(
  supabase: WhatsAppSupabase,
  actor: WhatsAppOptInActor,
  input: WhatsAppOptInInput
): Promise<GuardianWhatsAppOptInState> {
  const parsed = whatsappOptInInputSchema.parse(input)
  const { data, error } = await supabase.rpc('set_guardian_whatsapp_opt_in', {
    p_responsavel_id: parsed.responsavelId,
    p_opt_in: parsed.optIn,
    p_registrado_por: actor.id,
  })
  if (error) throw error
  const state = data?.[0]
  if (!state?.audit_id) throw new Error('WHATSAPP_OPTIN_AUDIT_RECEIPT_MISSING')

  return {
    responsavelId: state.responsavel_id,
    optIn: state.opt_in,
    consentidoEm: state.consentido_em,
    canceladoEm: state.cancelado_em,
    auditReceiptId: state.audit_id,
  }
}

/** Current consent state; absent row and explicit withdrawal both mean false. */
export async function getGuardianWhatsAppOptIn(
  supabase: WhatsAppSupabase,
  responsavelId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('whatsapp_notification_optins')
    .select('opt_in')
    .eq('responsavel_id', responsavelId)
    .eq('canal', 'whatsapp')
    .maybeSingle()
  if (error) throw error
  return data?.opt_in ?? false
}
