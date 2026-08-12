/**
 * Typed data surface for the attendance reopen feature.
 *
 * The committed app/types/database.ts intentionally lags the live pilot
 * schema. This feature owns its new table and RPC contract, then bridges the
 * real Supabase client at one explicit seam.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type AttendanceReopenJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: AttendanceReopenJson | undefined }
  | AttendanceReopenJson[]

export type AttendanceReopenStatus = 'PENDENTE' | 'APROVADA' | 'REJEITADA'

export type AttendanceReopenRequestRow = {
  id: string
  sessao_id: string
  escola_id: string
  requested_by: string
  request_reason: string
  status: AttendanceReopenStatus
  requested_at: string
  decided_by: string | null
  decision_reason: string | null
  decided_at: string | null
  before_state: AttendanceReopenJson
  after_state: AttendanceReopenJson | null
  created_at: string
  updated_at: string
}

type ReadOnlyTable<Row> = {
  Row: Row
  Insert: never
  Update: never
  Relationships: []
}

export type AttendanceReopenDatabase = {
  public: {
    Tables: {
      attendance_reopen_requests: ReadOnlyTable<AttendanceReopenRequestRow>
    }
    Views: Record<string, never>
    Functions: {
      request_attendance_reopen: {
        Args: { p_reason: string; p_session_id: string }
        Returns: AttendanceReopenRequestRow
      }
      decide_attendance_reopen: {
        Args: { p_decision: string; p_reason?: string | null; p_request_id: string }
        Returns: AttendanceReopenRequestRow
      }
    }
  }
}

export type AttendanceReopenSupabase = SupabaseClient<AttendanceReopenDatabase>

/** Bridges a real stale-typed client into the feature's SQL surface. */
export function asAttendanceReopenClient(client: unknown): AttendanceReopenSupabase {
  return client as AttendanceReopenSupabase
}
