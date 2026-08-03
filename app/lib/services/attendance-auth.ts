/**
 * Attendance Authorization - single server-side authorization interface
 * for the attendance server actions.
 *
 * Every attendance server action must resolve the authenticated actor through
 * `requireAttendanceActor()` and then cross the ownership assertions below
 * before touching `sessoes_aula` or `frequencia`. Identity fields
 * (`professor_id`, `escola_id`) are NEVER read from the client: the actor and
 * the database rows are the only sources of truth.
 *
 * Rules (pilot product rules, matching `canRecordAttendance` in lib/auth.ts):
 * - professor: records attendance only for own sessions and own turmas
 * - diretor: records attendance for any session/turma of the own escola
 * - admin/secretario: view-only (can read lock status, cannot write)
 *
 * RLS remains defense in depth, never a substitute for these checks.
 */

import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Typed actor resolved from the server session.
 * `escola_id` is null for secretariat users (admin/gestor_sme).
 */
export interface AttendanceActor {
  userId: string
  tipo_usuario: string
  escola_id: string | null
}

/**
 * Error raised by the attendance authorization checks.
 * `code` lets callers (and the UI) distinguish the failure reason.
 */
export class AttendanceAuthError extends Error {
  readonly code:
    | 'UNAUTHENTICATED'
    | 'PROFILE_NOT_FOUND'
    | 'PROFILE_INACTIVE'
    | 'FORBIDDEN_ROLE'
    | 'SESSION_NOT_FOUND'
    | 'SESSION_NOT_OWNED'
    | 'SCHOOL_MISMATCH'
    | 'TURMA_NOT_FOUND'
    | 'TURMA_NOT_OWNED'
    | 'TURMA_INACTIVE'
    | 'MATRICULA_NOT_IN_TURMA'
    | 'MATRICULA_INACTIVE'

  constructor(
    code: AttendanceAuthError['code'],
    message: string
  ) {
    super(message)
    this.name = 'AttendanceAuthError'
    this.code = code
  }
}

/**
 * Roles allowed to record attendance (open, mark, close).
 * Mirrors `canRecordAttendance` in `lib/auth.ts` for the server path.
 */
const RECORD_ATTENDANCE_ROLES = new Set(['professor', 'diretor'])

/**
 * Roles allowed to read attendance state (check lock status).
 * Admin, secretario and gestor_sme are view-only.
 */
const READ_ATTENDANCE_ROLES = new Set([
  'professor',
  'diretor',
  'secretario',
  'admin',
  'gestor_sme',
])

/**
 * Resolve the authenticated actor from the server session.
 *
 * @param supabase - canonical SSR client created from request cookies
 * @returns the typed actor { userId, tipo_usuario, escola_id }
 * @throws AttendanceAuthError UNAUTHENTICATED when no session, PROFILE_NOT_FOUND
 *         when the users row is missing, PROFILE_INACTIVE when disabled
 */
export async function requireAttendanceActor(
  supabase: Pick<SupabaseClient<Database>, 'auth' | 'from'>
): Promise<AttendanceActor> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AttendanceAuthError(
      'UNAUTHENTICATED',
      'Autenticação obrigatória para registrar frequência'
    )
  }

  // Never trust user_metadata: the role and school come from the users table.
  const { data: profile } = await supabase
    .from('users')
    .select('id, tipo_usuario, escola_id, ativo')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new AttendanceAuthError(
      'PROFILE_NOT_FOUND',
      'Perfil de usuário não encontrado'
    )
  }

  if (profile.ativo === false) {
    throw new AttendanceAuthError(
      'PROFILE_INACTIVE',
      'Usuário inativo não pode registrar frequência'
    )
  }

  return {
    userId: profile.id,
    tipo_usuario: profile.tipo_usuario,
    escola_id: profile.escola_id ?? null,
  }
}

/**
 * Assert the actor may write attendance records (open, mark, close).
 *
 * @throws AttendanceAuthError FORBIDDEN_ROLE for view-only roles
 */
export function assertCanRecordAttendance(actor: AttendanceActor): void {
  if (!RECORD_ATTENDANCE_ROLES.has(actor.tipo_usuario)) {
    throw new AttendanceAuthError(
      'FORBIDDEN_ROLE',
      'Apenas professores e diretores podem registrar frequência'
    )
  }
}

/**
 * Assert the actor may read attendance state of the given escola.
 *
 * @throws AttendanceAuthError FORBIDDEN_ROLE / SCHOOL_MISMATCH
 */
export function assertCanReadSchool(actor: AttendanceActor, escolaId: string): void {
  if (!READ_ATTENDANCE_ROLES.has(actor.tipo_usuario)) {
    throw new AttendanceAuthError(
      'FORBIDDEN_ROLE',
      'Usuário sem permissão para consultar frequência'
    )
  }

  // Secretariat users (admin, secretario, gestor_sme without an escola)
  // can read every escola, mirroring pilot_is_secretariat().
  if (
    (actor.tipo_usuario === 'admin' ||
      actor.tipo_usuario === 'secretario' ||
      actor.tipo_usuario === 'gestor_sme') &&
    actor.escola_id === null
  ) {
    return
  }

  if (actor.escola_id !== escolaId) {
    throw new AttendanceAuthError(
      'SCHOOL_MISMATCH',
      'Sessão de aula de outra escola'
    )
  }
}

/**
 * Assert the actor may write to the given attendance session.
 *
 * - professor: only sessions owned by the actor (professor_id === userId)
 * - diretor: only sessions of the actor's escola
 *
 * @throws AttendanceAuthError SESSION_NOT_OWNED / SCHOOL_MISMATCH
 */
export function assertSessionWriteAccess(
  actor: AttendanceActor,
  session: { id: string; professor_id: string; escola_id: string },
  turma?: { id: string; professor_id: string | null; escola_id: string; ativo?: boolean | null }
): void {
  if (turma?.ativo === false) {
    throw new AttendanceAuthError(
      'TURMA_INACTIVE',
      'A turma está inativa e não aceita alterações de frequência'
    )
  }

  if (turma && turma.escola_id !== session.escola_id) {
    throw new AttendanceAuthError(
      'SCHOOL_MISMATCH',
      'Sessão e turma pertencem a escolas diferentes'
    )
  }

  if (turma && turma.professor_id !== session.professor_id) {
    throw new AttendanceAuthError(
      'SESSION_NOT_OWNED',
      'A sessão não pertence ao professor titular atual da turma'
    )
  }

  if (actor.tipo_usuario === 'professor') {
    if (session.professor_id !== actor.userId) {
      throw new AttendanceAuthError(
        'SESSION_NOT_OWNED',
        'Você só pode registrar frequência nas suas próprias sessões de aula'
      )
    }
    return
  }

  if (actor.tipo_usuario === 'diretor') {
    if (session.escola_id !== actor.escola_id) {
      throw new AttendanceAuthError(
        'SCHOOL_MISMATCH',
        'Você só pode registrar frequência em sessões da sua escola'
      )
    }
    return
  }

  // View-only roles reach this only through assertCanRecordAttendance first;
  // this branch is a safety net, never a grant.
  throw new AttendanceAuthError(
    'FORBIDDEN_ROLE',
    'Apenas professores e diretores podem registrar frequência'
  )
}

/**
 * Assert the actor may read the given attendance session.
 *
 * - professor: only sessions owned by the actor
 * - diretor/secretario/admin/gestor_sme: sessions of the actor's escola
 *   (secretariat users without an escola read every escola)
 *
 * @throws AttendanceAuthError SESSION_NOT_OWNED / SCHOOL_MISMATCH
 */
export function assertSessionReadAccess(
  actor: AttendanceActor,
  session: { id: string; professor_id: string; escola_id: string }
): void {
  if (actor.tipo_usuario === 'professor') {
    if (session.professor_id !== actor.userId) {
      throw new AttendanceAuthError(
        'SESSION_NOT_OWNED',
        'Você só pode consultar as suas próprias sessões de aula'
      )
    }
    return
  }

  assertCanReadSchool(actor, session.escola_id)
}

/**
 * Assert the actor may open a session for the given turma.
 *
 * - professor: only own turmas (turma.professor_id === userId) of own escola
 * - diretor: only turmas of the actor's escola
 *
 * @throws AttendanceAuthError TURMA_NOT_OWNED / SCHOOL_MISMATCH
 */
export function assertTurmaWriteAccess(
  actor: AttendanceActor,
  turma: { id: string; professor_id: string | null; escola_id: string; ativo?: boolean | null }
): void {
  if (turma.ativo === false) {
    throw new AttendanceAuthError(
      'TURMA_INACTIVE',
      'A turma está inativa e não aceita novas sessões de aula'
    )
  }

  if (actor.tipo_usuario === 'professor') {
    if (turma.professor_id !== actor.userId) {
      throw new AttendanceAuthError(
        'TURMA_NOT_OWNED',
        'Você só pode abrir sessões de aula das suas próprias turmas'
      )
    }
    if (turma.escola_id !== actor.escola_id) {
      throw new AttendanceAuthError(
        'SCHOOL_MISMATCH',
        'Turma de outra escola'
      )
    }
    return
  }

  if (actor.tipo_usuario === 'diretor') {
    if (turma.escola_id !== actor.escola_id) {
      throw new AttendanceAuthError(
        'SCHOOL_MISMATCH',
        'Você só pode abrir sessões de aula em turmas da sua escola'
      )
    }
    return
  }

  throw new AttendanceAuthError(
    'FORBIDDEN_ROLE',
    'Apenas professores e diretores podem abrir sessões de aula'
  )
}

/**
 * Assert the actor may query attendance state for the given turma.
 *
 * @throws AttendanceAuthError TURMA_NOT_OWNED / SCHOOL_MISMATCH
 */
export function assertTurmaReadAccess(
  actor: AttendanceActor,
  turma: { id: string; professor_id: string | null; escola_id: string }
): void {
  if (actor.tipo_usuario === 'professor') {
    if (turma.professor_id !== actor.userId) {
      throw new AttendanceAuthError(
        'TURMA_NOT_OWNED',
        'Você só pode consultar as suas próprias turmas'
      )
    }
    return
  }

  assertCanReadSchool(actor, turma.escola_id)
}

/**
 * Assert the matricula belongs to the session's turma (class ownership).
 * Prevents marking students that are not enrolled in the class of the session.
 *
 * @throws AttendanceAuthError MATRICULA_NOT_IN_TURMA
 */
export function assertMatriculaInTurma(
  matricula: { id: string; turma_id: string; situacao?: string | null },
  sessionTurmaId: string
): void {
  if (matricula.turma_id !== sessionTurmaId) {
    throw new AttendanceAuthError(
      'MATRICULA_NOT_IN_TURMA',
      'Matrícula não pertence à turma desta sessão de aula'
    )
  }

  if (matricula.situacao !== undefined && matricula.situacao !== null && matricula.situacao !== 'ativa') {
    throw new AttendanceAuthError(
      'MATRICULA_INACTIVE',
      'A matrícula não está ativa nesta turma'
    )
  }
}
