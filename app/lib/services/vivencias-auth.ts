import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  AttendanceAuthError,
  type AttendanceActor,
  requireAttendanceActor,
} from '@/lib/services/attendance-auth'

export type VivenciaScope = {
  escola_id: string
  turma_id: string
  professor_id: string
}

export type VivenciaTurma = VivenciaScope & { ativo: boolean | null }

export type VivenciaEnrollment = {
  id: string
  aluno_id: string
  turma_id: string
  situacao: string | null
}

export async function requireVivenciaActor(
  supabase: Pick<SupabaseClient<Database>, 'auth' | 'from'>,
): Promise<AttendanceActor> {
  return requireAttendanceActor(supabase)
}

export async function getVivenciaTurma(
  supabase: Pick<SupabaseClient<Database>, 'from'>,
  turmaId: string,
): Promise<VivenciaTurma> {
  const { data, error } = await supabase
    .from('turmas')
    .select('id, escola_id, professor_id, ativo')
    .eq('id', turmaId)
    .maybeSingle()

  if (error || !data || !data.professor_id) {
    throw new AttendanceAuthError('TURMA_NOT_FOUND', 'Turma não encontrada')
  }

  return {
    turma_id: data.id,
    escola_id: data.escola_id,
    professor_id: data.professor_id,
    ativo: data.ativo,
  }
}

export async function getVivenciaEnrollment(
  supabase: Pick<SupabaseClient<Database>, 'from'>,
  alunoId: string,
  turmaId: string,
): Promise<VivenciaEnrollment> {
  const { data, error } = await supabase
    .from('matriculas')
    .select('id, aluno_id, turma_id, situacao')
    .eq('aluno_id', alunoId)
    .eq('turma_id', turmaId)
    .maybeSingle()

  if (error || !data) {
    throw new AttendanceAuthError(
      'MATRICULA_NOT_IN_TURMA',
      'Aluno não está matriculado nesta turma',
    )
  }

  return data
}

export function assertVivenciaReadAccess(
  actor: AttendanceActor,
  scope: VivenciaScope,
): void {
  if (!['admin', 'secretario', 'diretor', 'professor'].includes(actor.tipo_usuario)) {
    throw new AttendanceAuthError('FORBIDDEN_ROLE', 'Usuário sem permissão para consultar vivências')
  }

  if (
    (actor.tipo_usuario === 'admin' || actor.tipo_usuario === 'secretario')
    && actor.escola_id === null
  ) {
    return
  }

  if (actor.escola_id !== scope.escola_id) {
    throw new AttendanceAuthError('SCHOOL_MISMATCH', 'Vivência de outra escola')
  }

  if (actor.tipo_usuario === 'professor' && actor.userId !== scope.professor_id) {
    throw new AttendanceAuthError('SESSION_NOT_OWNED', 'Vivência de outra turma')
  }
}

export function assertVivenciaWriteAccess(
  actor: AttendanceActor,
  turma: VivenciaTurma,
  scope: VivenciaScope,
  enrollment: VivenciaEnrollment,
): void {
  if (actor.tipo_usuario !== 'professor') {
    throw new AttendanceAuthError('FORBIDDEN_ROLE', 'Apenas professores podem registrar vivências')
  }
  if (turma.ativo === false) {
    throw new AttendanceAuthError('TURMA_INACTIVE', 'A turma está inativa')
  }
  if (actor.userId !== turma.professor_id || actor.userId !== scope.professor_id) {
    throw new AttendanceAuthError('TURMA_NOT_OWNED', 'Você só pode registrar vivências na sua turma')
  }
  if (actor.escola_id !== turma.escola_id || actor.escola_id !== scope.escola_id) {
    throw new AttendanceAuthError('SCHOOL_MISMATCH', 'Turma de outra escola')
  }
  if (enrollment.situacao !== 'ativa') {
    throw new AttendanceAuthError('MATRICULA_INACTIVE', 'A matrícula não está ativa nesta turma')
  }
}
