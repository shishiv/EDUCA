'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createDiaryLesson, type DiaryLessonInput, type DiaryLessonResult } from '@/lib/services/diary-lesson'

export async function createDiaryLessonAction(input: DiaryLessonInput): Promise<DiaryLessonResult> {
  const result = await createDiaryLesson(await createClient(), input)
  if (result.success) {
    revalidatePath('/diario')
    revalidatePath(`/dashboard/turmas/${input.turmaId}/chamada`)
  }
  return result
}
