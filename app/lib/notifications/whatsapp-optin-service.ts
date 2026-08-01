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
import type { WhatsAppNotificationOptInInsert, WhatsAppSupabase } from './whatsapp-database'

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
  const now = new Date().toISOString()

  const { data: guardian, error: guardianError } = await supabase
    .from('responsaveis')
    .select('id, escola_id')
    .eq('id', parsed.responsavelId)
    .maybeSingle()
  if (guardianError) throw guardianError
  if (!guardian?.escola_id) {
    throw new Error('PILOT_NOTIFICATION_SCHOOL_DENIED: guardian not visible to actor')
  }

  const row: WhatsAppNotificationOptInInsert = {
    responsavel_id: parsed.responsavelId,
    canal: 'whatsapp',
    opt_in: parsed.optIn,
    consentido_em: parsed.optIn ? now : null,
    cancelado_em: parsed.optIn ? null : now,
    registrado_por: actor.id,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('whatsapp_notification_optins')
    .upsert(row, { onConflict: 'responsavel_id,canal' })
    .select('responsavel_id, opt_in, consentido_em, cancelado_em')
    .single()
  if (error) throw error

  await supabase.rpc('write_pilot_audit_event', {
    p_event_type: 'whatsapp_optin_changed',
    p_entity_type: 'responsavel',
    p_entity_id: parsed.responsavelId,
    p_escola_id: guardian.escola_id,
    p_metadata: { canal: 'whatsapp', opt_in: parsed.optIn },
  })

  return {
    responsavelId: data.responsavel_id,
    optIn: data.opt_in,
    consentidoEm: data.consentido_em,
    canceladoEm: data.cancelado_em,
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
