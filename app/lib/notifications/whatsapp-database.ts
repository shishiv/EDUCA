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

export type WhatsAppJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: WhatsAppJson | undefined }
  | WhatsAppJson[]

export type WhatsAppNotificationMessageRow = {
  id: string
  responsavel_id: string
  aluno_id: string
  escola_id: string
  tipo: 'presenca_falta' | 'presenca_presente'
  data_aula: string
  status: 'queued' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'blocked'
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
  status?: 'queued' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'blocked'
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
        Insert: WhatsAppNotificationMessageInsert
        Update: WhatsAppNotificationMessageUpdate
        Relationships: []
      }
      whatsapp_notification_optins: {
        Row: WhatsAppNotificationOptInRow
        Insert: WhatsAppNotificationOptInInsert
        Update: WhatsAppNotificationOptInUpdate
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
export function asWhatsAppClient(client: unknown): WhatsAppSupabase {
  return client as WhatsAppSupabase
}
