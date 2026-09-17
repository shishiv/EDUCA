import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import { lessonContentFormSchema, parseBNNCCodes } from '@/lib/validation/lesson-content'
import {
  AttendanceAuthError,
  type AttendanceActor,
  assertCanRecordAttendance,
  assertSessionWriteAccess,
  assertTurmaWriteAccess,
  requireAttendanceActor,
} from './attendance-auth'
import { createAttendanceModule, type AttendanceSessionModuleOptions } from './attendance-module'

const diaryLessonSchema = z.object({
  turmaId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: lessonContentFormSchema,
}).strict()

export type DiaryLessonInput = z.input<typeof diaryLessonSchema>
export type DiaryLessonResult =
  | { success: true; sessionId: string }
  | { success: false; code: string; error: string }

/**
 * The diary owns lesson content. Session creation and temporal eligibility stay
 * with attendance, using the authenticated client and the database's lock RPC.
 * A content failure leaves its open session available for an explicit retry.
 */
export async function createDiaryLesson(
  supabase: SupabaseClient<Database>,
  input: DiaryLessonInput,
  options: AttendanceSessionModuleOptions = {},
): Promise<DiaryLessonResult> {
  const parsed = diaryLessonSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, code: 'LESSON_INVALID', error: 'Confira a turma, a data e o conteúdo da aula.' }
  }

  try {
    const actor = await requireAttendanceActor(supabase)
    assertCanRecordAttendance(actor)
    const { data: turma, error } = await supabase.from('turmas')
      .select('id, escola_id, professor_id, ativo').eq('id', parsed.data.turmaId).single()
    if (error || !turma) {
      return { success: false, code: 'TURMA_NOT_FOUND', error: 'Turma não encontrada.' }
    }
    assertTurmaWriteAccess(actor, turma)

    const session = await resolveLessonSession(supabase, parsed.data, actor, turma, options)
    if (!session.success) return session
    return await insertLessonContent(supabase, session.sessionId, actor.userId, parsed.data.content)
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return { success: false, code: error.code, error: error.message }
    }
    logger.error('DIARY_LESSON_CREATE_FAILED', error instanceof Error ? error : new Error('Falha ao registrar aula'))
    return { success: false, code: 'LESSON_CREATE_FAILED', error: 'Não foi possível registrar a aula. Tente novamente.' }
  }
}

type DiaryClass = Pick<Database['public']['Tables']['turmas']['Row'], 'id' | 'escola_id' | 'professor_id' | 'ativo'>

async function resolveLessonSession(
  supabase: SupabaseClient<Database>,
  input: z.output<typeof diaryLessonSchema>,
  actor: AttendanceActor,
  turma: DiaryClass,
  options: AttendanceSessionModuleOptions,
): Promise<DiaryLessonResult> {
  const attendance = createAttendanceModule(supabase, options)
  const sessions = await attendance.getSessionsForChamada(turma.id, input.date)
  const existing = sessions.find(session => session.status === 'ABERTA')
  if (existing) {
    assertSessionWriteAccess(actor, existing, turma)
    const lock = await attendance.checkLockStatus({ sessionIdOrTurmaId: existing.id })
    if (!lock.success || lock.isLocked) {
      return { success: false, code: lock.code ?? 'SESSION_LOCKED', error: lock.error ?? 'A aula está fora do prazo de edição autorizado.' }
    }
    return { success: true, sessionId: existing.id }
  }
  const opened = await attendance.openSession({
    turma_id: turma.id,
    data_aula: input.date,
    conteudo_programatico: input.content.tema,
  })
  if (!opened.success || !opened.session) {
    return { success: false, code: opened.code ?? 'SESSION_OPEN_FAILED', error: opened.error ?? 'Não foi possível abrir a aula.' }
  }
  return { success: true, sessionId: opened.session.id }
}

async function insertLessonContent(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  actorId: string,
  content: z.output<typeof lessonContentFormSchema>,
): Promise<DiaryLessonResult> {
  const { error } = await supabase.from('conteudo_aula').insert({
    sessao_id: sessionId,
    created_by: actorId,
    tema: content.tema.trim(),
    objetivo: content.objetivo.trim(),
    habilidades_bncc: parseBNNCCodes(content.habilidades_bncc_input),
    metodologia: content.metodologia?.trim() || null,
    recursos: content.recursos?.trim() || null,
    observacoes: content.observacoes?.trim() || null,
  })
  if (error?.code === '23505') {
    return { success: false, code: 'LESSON_ALREADY_EXISTS', error: 'Esta sessão já possui conteúdo. Abra a aula existente para consultá-lo.' }
  }
  if (error) {
    logger.error('DIARY_LESSON_CONTENT_FAILED', new Error(error.message), { metadata: { sessionId } })
    return { success: false, code: 'LESSON_CONTENT_FAILED', error: 'A sessão está disponível, mas o conteúdo não foi salvo. Tente novamente.' }
  }
  return { success: true, sessionId }
}
