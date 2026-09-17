import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import {
  createAttendanceModule,
  type OpenSessionParams,
  type OpenSessionResult,
  type CloseSessionParams,
  type CloseSessionResult,
  type MarkAttendanceParams,
  type MarkAttendanceResult,
  type CheckLockStatusResult,
} from './attendance-module'

export interface AttendanceActionDependencies {
  createClient(): Promise<SupabaseClient<Database>>
  revalidatePath(path: string): void
}

export function createOpenSessionAction(
  dependencies: AttendanceActionDependencies,
) {
  return async function openSessionAction(
    params: OpenSessionParams,
  ): Promise<OpenSessionResult> {
    try {
      const supabase = await dependencies.createClient()
      const result = await createAttendanceModule(supabase).openSession(params)

      if (result.success && result.session) {
        dependencies.revalidatePath(`/dashboard/turmas/${result.session.turma_id}/chamada`)
        dependencies.revalidatePath(`/dashboard/turmas/${result.session.turma_id}`)
      }

      return result
    } catch (error) {
      logger.error('ATTENDANCE_SESSION_OPEN_ADAPTER_FAILED', error instanceof Error ? error : new Error('Erro desconhecido'), {
        metadata: { turmaId: params.turma_id, date: params.data_aula },
      })
      return {
        success: false,
        code: 'SESSION_OPEN_FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }
}


export function createCloseSessionAction(
  dependencies: AttendanceActionDependencies,
) {
  return async function closeSessionAction(
    params: CloseSessionParams,
  ): Promise<CloseSessionResult> {
    try {
      const supabase = await dependencies.createClient()
      const result = await createAttendanceModule(supabase).closeSession(params)

      if (result.success && result.session) {
        dependencies.revalidatePath(`/dashboard/turmas/${result.session.turma_id}/chamada`)
        dependencies.revalidatePath(`/dashboard/turmas/${result.session.turma_id}`)
      }

      return result
    } catch (error) {
      logger.error('ATTENDANCE_SESSION_CLOSE_ADAPTER_FAILED', error instanceof Error ? error : new Error('Erro desconhecido'), {
        metadata: { sessionId: params.session_id },
      })
      return {
        success: false,
        code: 'SESSION_CLOSE_FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }
}


export function createMarkAttendanceAction(
  dependencies: AttendanceActionDependencies,
) {
  return async function markAttendanceAction(
    params: MarkAttendanceParams,
  ): Promise<MarkAttendanceResult> {
    try {
      const supabase = await dependencies.createClient()
      const result = await createAttendanceModule(supabase).markAttendance(params)

      if (result.success && result.turma_id) {
        dependencies.revalidatePath(`/dashboard/turmas/${result.turma_id}/chamada`)
        dependencies.revalidatePath(`/dashboard/turmas/${result.turma_id}`)
      }

      if (result.success) {
        return { success: true, record: result.record }
      }

      return {
        success: false,
        error: result.error,
        code: result.code,
      }
    } catch (error) {
      logger.error('ATTENDANCE_RECORD_ADAPTER_FAILED', error instanceof Error ? error : new Error('Erro desconhecido'), {
        metadata: { sessionId: params.sessao_id, matriculaId: params.matricula_id },
      })
      return {
        success: false,
        code: 'ATTENDANCE_WRITE_FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }
}


export function createCheckLockStatusAction(
  dependencies: AttendanceActionDependencies,
) {
  return async function checkLockStatusAction(
    sessionIdOrTurmaId: string,
    date?: string,
  ): Promise<CheckLockStatusResult> {
    try {
      const supabase = await dependencies.createClient()
      return await createAttendanceModule(supabase).checkLockStatus({
        sessionIdOrTurmaId,
        date,
      })
    } catch (error) {
      logger.error('ATTENDANCE_SESSION_LOCK_ADAPTER_FAILED', error instanceof Error ? error : new Error('Erro desconhecido'), {
        metadata: { sessionIdOrTurmaId, date },
      })
      return {
        success: false,
        isLocked: false,
        code: 'SESSION_READ_FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }
}
