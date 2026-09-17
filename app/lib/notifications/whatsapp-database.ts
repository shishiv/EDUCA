/**
 * Typed data surface for the WhatsApp notification module.
 *
 * This module deliberately exposes only the tables and RPCs it touches. The
 * read-only tables (responsaveis, alunos, aluno_responsaveis, escolas) are
 * typed with Insert/Update = never: the module can read them but only write
 * through its own notification tables. Callers bridge real clients with
 * asWhatsAppClient(), mirroring the pilot asPilotRpcClient convention.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type WhatsAppJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: WhatsAppJson | undefined }
  | WhatsAppJson[]

export type WhatsAppNotificationStatus =
  | 'queued'
  | 'processing'
  | 'accepted'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'blocked'
  | 'delivery_unknown'

export type WhatsAppNotificationMessageRow = {
  id: string
  responsavel_id: string
  aluno_id: string
  escola_id: string
  tipo: 'presenca_falta' | 'presenca_presente'
  data_aula: string
  status: WhatsAppNotificationStatus
  external_message_id: string | null
  idempotency_key: string
  tentativas: number
  proxima_tentativa: string
  ultimo_erro_codigo: string | null
  bloqueado_motivo:
    | 'pilot_mode'
    | 'missing_credentials'
    | 'not_enabled'
    | 'opt_out'
    | 'recipient_missing'
    | 'template_pending'
    | null
  entregue_em: string | null
  lido_em: string | null
  falhou_em: string | null
  bloqueado_em: string | null
  ultimo_status_em: string | null
  claim_token: string | null
  claim_expires_at: string | null
  reconciliation_required_at: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

export type WhatsAppNotificationMessageInsert = {
  responsavel_id: string
  aluno_id: string
  escola_id: string
  tipo: 'presenca_falta' | 'presenca_presente'
  data_aula: string
  idempotency_key: string
  status?: WhatsAppNotificationStatus
  tentativas?: number
  proxima_tentativa?: string
  external_message_id?: string | null
  ultimo_erro_codigo?: string | null
  bloqueado_motivo?: WhatsAppNotificationMessageRow['bloqueado_motivo']
  entregue_em?: string | null
  lido_em?: string | null
  falhou_em?: string | null
  bloqueado_em?: string | null
  ultimo_status_em?: string | null
  claim_token?: string | null
  claim_expires_at?: string | null
  reconciliation_required_at?: string | null
  criado_por?: string | null
  created_at?: string
  updated_at?: string
}

export type WhatsAppNotificationMessageUpdate = {
  status?: WhatsAppNotificationMessageRow['status']
  external_message_id?: string | null
  tentativas?: number
  proxima_tentativa?: string
  ultimo_erro_codigo?: string | null
  bloqueado_motivo?: WhatsAppNotificationMessageRow['bloqueado_motivo']
  entregue_em?: string | null
  lido_em?: string | null
  falhou_em?: string | null
  bloqueado_em?: string | null
  ultimo_status_em?: string | null
  claim_token?: string | null
  claim_expires_at?: string | null
  reconciliation_required_at?: string | null
  updated_at?: string
}

export type WhatsAppNotificationOptInRow = {
  id: string
  responsavel_id: string
  escola_id: string
  canal: 'whatsapp'
  opt_in: boolean
  consentido_em: string | null
  cancelado_em: string | null
  registrado_por: string | null
  created_at: string
  updated_at: string
}

export type WhatsAppNotificationOptInInsert = {
  responsavel_id: string
  canal: 'whatsapp'
  opt_in: boolean
  consentido_em?: string | null
  cancelado_em?: string | null
  registrado_por?: string | null
  updated_at?: string
}

export type WhatsAppNotificationOptInUpdate = {
  opt_in?: boolean
  consentido_em?: string | null
  cancelado_em?: string | null
  registrado_por?: string | null
  updated_at?: string
}

/** Guardian row: pilot columns exist in the live schema (pilot migration). */
export type WhatsAppGuardianRow = {
  id: string
  telefone: string | null
  escola_id: string | null
}

export type WhatsAppStudentRow = {
  id: string
  nome_completo: string
  escola_id: string | null
}

export type WhatsAppStudentGuardianLinkRow = {
  id: string
  aluno_id: string
  responsavel_id: string
  ativo: boolean
}

export type WhatsAppSchoolRow = {
  id: string
  nome: string
}

type ReadOnlyTable<Row> = {
  Row: Row
  Insert: never
  Update: never
  Relationships: []
}

export type WhatsAppDatabase = {
  public: {
    Tables: {
      whatsapp_notification_messages: {
        Row: WhatsAppNotificationMessageRow
        Insert: never
        Update: never
        Relationships: []
      }
      whatsapp_notification_optins: {
        Row: WhatsAppNotificationOptInRow
        Insert: never
        Update: never
        Relationships: []
      }
      responsaveis: ReadOnlyTable<WhatsAppGuardianRow>
      alunos: ReadOnlyTable<WhatsAppStudentRow>
      aluno_responsaveis: ReadOnlyTable<WhatsAppStudentGuardianLinkRow>
      escolas: ReadOnlyTable<WhatsAppSchoolRow>
    }
    Views: Record<string, never>
    Functions: {
      apply_whatsapp_delivery_status: {
        Args: {
          p_external_message_id: string
          p_status: 'sent' | 'delivered' | 'read' | 'failed'
          p_timestamp: string
          p_error_code?: string | null
        }
        Returns: boolean
      }
      enqueue_guardian_whatsapp_attendance_notification: {
        Args: {
          p_responsavel_id: string
          p_aluno_id: string
          p_tipo: 'presenca_falta' | 'presenca_presente'
          p_data_aula: string
          p_criado_por: string
        }
        Returns: Array<{
          message_id: string
          status: WhatsAppNotificationStatus
          duplicated: boolean
          audit_id: string
        }>
      }
      claim_whatsapp_notifications: {
        Args: {
          p_claim_token: string
          p_max_attempts: number
          p_limit?: number
          p_message_id?: string | null
          p_lease_seconds?: number
        }
        Returns: WhatsAppNotificationMessageRow[]
      }
      complete_whatsapp_notification_delivery: {
        Args: {
          p_message_id: string
          p_claim_token: string
          p_outcome: 'accepted' | 'delivered' | 'blocked' | 'failed' | 'retry' | 'indeterminate'
          p_external_message_id?: string | null
          p_block_reason?: string | null
          p_failure_code?: string | null
          p_retry_delay_seconds?: number | null
        }
        Returns: boolean
      }
      set_guardian_whatsapp_opt_in: {
        Args: {
          p_responsavel_id: string
          p_opt_in: boolean
          p_registrado_por: string
        }
        Returns: Array<{
          responsavel_id: string
          opt_in: boolean
          consentido_em: string | null
          cancelado_em: string | null
          audit_id: string
        }>
      }
      write_pilot_audit_event: {
        Args: {
          p_event_type: string
          p_entity_type: string
          p_entity_id?: string
          p_escola_id?: string
          p_metadata?: WhatsAppJson
        }
        Returns: string
      }
    }
  }
}

export type WhatsAppSupabase = SupabaseClient<WhatsAppDatabase>

/** Narrows a real client to the module's database capabilities. */
export function asWhatsAppClient(client: SupabaseClient<Database> | WhatsAppSupabase): WhatsAppSupabase {
  // SAFETY: this adapter narrows a Supabase client to the tables and RPCs owned by this module;
  // every member is backed by the same public schema and verified by typecheck/database tests.
  return client as WhatsAppSupabase
}
