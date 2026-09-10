import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { logger } from '@/lib/logger'

export type SessionConnectionStatus = 'connected' | 'disconnected' | 'error'

export interface SessionWatchScope {
  schoolId: string | null
  teacherId: string | null
}

const sessionLockSchema = z.object({
  id: z.string().uuid(),
  escola_id: z.string().uuid(),
  professor_id: z.string().uuid(),
  travada_em: z.string().nullable(),
})
type SessionLock = z.infer<typeof sessionLockSchema>

export interface SessionRealtimeObserver {
  onConnectionStatus: (status: SessionConnectionStatus) => void
  onSessionLocked: (sessionId: string, lockedAt: string) => void
}

export type SessionRealtimeSource = (
  scope: SessionWatchScope,
  observer: SessionRealtimeObserver,
) => () => Promise<void>

type RealtimeClient = Pick<SupabaseClient<Database>, 'channel' | 'removeChannel'>

/** The shell observes locks; the attendance grid owns row refreshes. */
export function createSupabaseSessionSource(client: RealtimeClient): SessionRealtimeSource {
  return (scope, observer) => {
    const locks = new Map<string, string>()
    const filter = scope.schoolId
      ? `escola_id=eq.${scope.schoolId}`
      : scope.teacherId ? `professor_id=eq.${scope.teacherId}` : undefined
    const channel = client.channel(`session-locks-${crypto.randomUUID()}`)
      .on<SessionLock>('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sessoes_aula', filter,
      }, payload => {
        const result = sessionLockSchema.safeParse(payload.new)
        if (!result.success) return
        const session = result.data
        if (scope.teacherId && session.professor_id !== scope.teacherId) return
        if (scope.schoolId && session.escola_id !== scope.schoolId) return
        if (!session.travada_em || locks.get(session.id) === session.travada_em) return
        locks.set(session.id, session.travada_em)
        observer.onSessionLocked(session.id, session.travada_em)
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') observer.onConnectionStatus('connected')
        else observer.onConnectionStatus(status === 'CLOSED' ? 'disconnected' : 'error')
      })
    return async () => { await client.removeChannel(channel) }
  }
}

/** Replaces subscriptions on scope changes and preserves their scope on retry. */
export class SessionRealtimeManager {
  private closeCurrent: (() => Promise<void>) | null = null
  private scope: SessionWatchScope | null = null
  private generation = 0
  private retry: ReturnType<typeof setTimeout> | null = null
  private attempts = 0

  constructor(private source: SessionRealtimeSource, private observer: SessionRealtimeObserver) {}

  async subscribe(scope: SessionWatchScope): Promise<void> {
    this.scope = scope
    this.attempts = 0
    await this.reconnect()
  }

  async reconnect(): Promise<void> {
    this.cancelRetry()
    const generation = ++this.generation
    const close = this.closeCurrent
    this.closeCurrent = null
    this.observer.onConnectionStatus('disconnected')
    if (close) await close()
    if (generation !== this.generation || !this.scope) return

    this.closeCurrent = this.source(this.scope, {
      onConnectionStatus: status => {
        if (generation !== this.generation) return
        this.observer.onConnectionStatus(status)
        if (status === 'connected') {
          this.attempts = 0
          this.cancelRetry()
        } else this.scheduleRetry()
      },
      onSessionLocked: (id, lockedAt) => {
        if (generation === this.generation) this.observer.onSessionLocked(id, lockedAt)
      },
    })
  }

  async dispose(): Promise<void> {
    this.scope = null
    this.generation++
    this.cancelRetry()
    const close = this.closeCurrent
    this.closeCurrent = null
    if (close) await close()
  }

  private cancelRetry(): void {
    if (this.retry) clearTimeout(this.retry)
    this.retry = null
  }

  private scheduleRetry(): void {
    if (!this.scope || this.retry || this.attempts >= 5) return
    const delay = Math.min(1000 * 2 ** this.attempts++, 30_000)
    this.retry = setTimeout(() => {
      this.retry = null
      void this.reconnect().catch(error => {
        logger.error('Session realtime reconnect failed', error instanceof Error ? error : new Error(String(error)))
        this.observer.onConnectionStatus('error')
        this.scheduleRetry()
      })
    }, delay)
  }
}
