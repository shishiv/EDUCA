/**
 * Attendance Module - deep interface for the attendance domain
 *
 * Accepts a request/session-aware Supabase client (or a test/mock client)
 * and wires the attendance services to it. Server-side callers create the
 * client with createClient() from '@/lib/supabase/server' so RLS sees the
 * authenticated session; tests pass a mock client.
 *
 * The authorization policy (who may open, mark, close) lives in the caller
 * (server actions and API routes), never in this module. This module only
 * guarantees that every attendance database call goes through the client it
 * was given - it never constructs a browser client itself.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { AttendanceImmutabilityService } from './attendance-immutability'
import { AttendanceLockingService } from './attendance-locking'
import {
  AttendanceWorkflowManager,
  createAttendanceWorkflow,
} from './attendance-workflow'

export interface AttendanceModule {
  immutability: AttendanceImmutabilityService
  locking: AttendanceLockingService
  createWorkflow(classId: string, teacherId: string, date: string): AttendanceWorkflowManager
}

export function createAttendanceModule(
  supabase: SupabaseClient<Database>
): AttendanceModule {
  return {
    immutability: new AttendanceImmutabilityService(supabase),
    locking: new AttendanceLockingService(supabase),
    createWorkflow: (classId, teacherId, date) =>
      createAttendanceWorkflow(supabase, classId, teacherId, date),
  }
}
