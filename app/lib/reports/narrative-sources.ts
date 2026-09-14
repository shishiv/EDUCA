import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { schoolPeriodSchema } from '@/lib/services/school-periods'

export const narrativeSourceSchema = z.object({
  id: z.string().uuid(),
  escola_id: z.string().uuid(),
  aluno_id: z.string().uuid(),
  matricula_id: z.string().uuid(),
  turma_id: z.string().uuid(),
  professor_id: z.string().uuid(),
  data_vivencia: z.string().date(),
  campos_experiencia: z.array(z.enum(['eu', 'corpo', 'tracos', 'escuta', 'espacos'])).min(1),
  descricao: z.string(),
  observacoes: z.string().nullable(),
  escopo: z.enum(['individual', 'coletiva']),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
})
const capturedPeriodSchema = schoolPeriodSchema.extend({
  ano_letivo_id: z.string().uuid(), ano: z.number().int(), escola_id: z.string().uuid(),
})
export const narrativePreviewSchema = z.object({
  periodo: capturedPeriodSchema.nullable(), fontes: z.array(narrativeSourceSchema),
})
export const narrativeSnapshotSchema = narrativePreviewSchema.extend({
  periodo: capturedPeriodSchema,
  fontes: z.array(narrativeSourceSchema).min(1),
  versao: z.literal('vivencias-v1'),
  algoritmo: z.literal('SHA-256/postgresql-jsonb-v1'),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  capturado_por: z.string().uuid(),
  capturado_em: z.string(),
})
export type NarrativePreview = z.infer<typeof narrativePreviewSchema>
export type NarrativeSnapshot = z.infer<typeof narrativeSnapshotSchema>

/** One RLS-equivalent database query returns the full scoped selection, never a 50-row sample. */
export async function loadNarrativePreview(client: SupabaseClient<Database>, enrollmentId: string, year: number, semester: string): Promise<NarrativePreview> {
  const { data, error } = await client.rpc('preview_descriptive_report_sources', {
    p_matricula_id: enrollmentId, p_ano: year, p_semestre: semester,
  })
  if (error) throw error
  return narrativePreviewSchema.parse(data)
}
