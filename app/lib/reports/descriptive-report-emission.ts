import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'
import {
  PILOT_DESCRIPTIVE_SEED_MARKER, PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
  PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY, PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY,
  PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT, PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY,
  requirePilotDescriptiveReleaseRevision, PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
} from '@/lib/pilot/descriptive-report-demo-contract'
import type { PilotActor } from '@/lib/pilot/pilot-server-auth'
import { EXPERIENCE_FIELDS_CONFIG } from '@/types/descriptive-report'
import { narrativeSnapshotSchema, type NarrativeSnapshot } from './narrative-sources'

export class DescriptiveReportEmissionError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code)
    this.name = 'DescriptiveReportEmissionError'
  }
}

type Report = Tables<'relatorios_descritivos'>
export interface DescriptiveReportEmissionSource {
  report: Report
  snapshot: NarrativeSnapshot
  student: Pick<Tables<'alunos'>, 'id' | 'nome_completo' | 'data_nascimento'>
  turma: Pick<Tables<'turmas'>, 'id' | 'nome' | 'serie'>
  escola: Pick<Tables<'escolas'>, 'id' | 'nome' | 'codigo'>
  professor: Pick<Tables<'users'>, 'id' | 'nome'>
  releaseRevision: string
  actor: PilotActor
}

export function buildDescriptiveReportEmissionData(source: DescriptiveReportEmissionSource) {
  const { report, snapshot } = source
  return {
    report: {
      id: report.id, anoLetivo: report.ano_letivo, semestre: report.semestre,
      observacoesGerais: report.observacoes_gerais?.trim() || null,
      fields: EXPERIENCE_FIELDS_CONFIG.map(field => ({ label: field.fullName, value: report[field.key]?.trim() ?? '' })),
    },
    student: { id: source.student.id, nome: source.student.nome_completo, dataNascimento: source.student.data_nascimento },
    turma: source.turma,
    escola: source.escola,
    professor: source.professor,
    periodo: { inicio: snapshot.periodo.data_inicio, fim: snapshot.periodo.data_fim, label: snapshot.periodo.nome },
    vivencias: snapshot.fontes,
    provenance: {
      releaseRevision: source.releaseRevision,
      environment: PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
      canonicalSource: PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
      fingerprintAlgorithm: snapshot.algoritmo,
      snapshotVersion: snapshot.versao,
      capturedAt: snapshot.capturado_em,
      capturedBy: snapshot.capturado_por,
      canonicalRowCount: snapshot.fontes.length,
      canonicalContentFingerprint: snapshot.fingerprint,
    },
    issuer: {
      actorId: source.actor.id, actorName: source.actor.name, actorRole: source.actor.role,
      actorEmail: source.actor.email, reportId: report.id, reportProfessorId: report.professor_id,
    },
  }
}
export type DescriptiveReportEmissionData = ReturnType<typeof buildDescriptiveReportEmissionData>

async function requireDescriptiveReportSeed(client: SupabaseClient<Database>, releaseRevision: string) {
  const { data, error } = await client.from('configs').select('chave,valor').in('chave', [
    PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY, PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY,
    PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY, PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY,
  ])
  if (error) throw error
  const configs = new Map((data ?? []).map(config => [config.chave, config.valor]))
  if (configs.get(PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY) !== PILOT_DESCRIPTIVE_SEED_MARKER) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_SYNTHETIC_SEED_REQUIRED', 403)
  if (configs.get(PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY) !== releaseRevision) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_RELEASE_REVISION_MISMATCH', 409)
  if (configs.get(PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY) !== PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_ENVIRONMENT_INVALID', 403)
  if (configs.get(PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY) !== PILOT_DESCRIPTIVE_CANONICAL_SOURCE) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CANONICAL_SOURCE_INVALID', 409)
}

export function requireNarrativeSnapshot(report: Report): NarrativeSnapshot {
  if (report.status !== 'finalizado') throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_NOT_FINALIZED', 409)
  if (report.fontes_snapshot === null) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_SNAPSHOT_MISSING', 422)
  const parsed = narrativeSnapshotSchema.safeParse(report.fontes_snapshot)
  if (!parsed.success) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_SNAPSHOT_INVALID', 422)
  return parsed.data
}

function requireRow<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw error
  if (!data) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CONTEXT_MISSING', 422)
  return data
}

/** Emits only captured narrative evidence using the caller's real RLS client. */
export async function loadDescriptiveReportEmissionData(client: SupabaseClient<Database>, reportId: string, actor: PilotActor): Promise<DescriptiveReportEmissionData> {
  const releaseRevision = requirePilotDescriptiveReleaseRevision()
  await requireDescriptiveReportSeed(client, releaseRevision)
  const reportResult = await client.from('relatorios_descritivos').select('*').eq('id', reportId).maybeSingle()
  if (reportResult.error) throw reportResult.error
  if (!reportResult.data) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_NOT_FOUND', 404)
  const report = reportResult.data
  const snapshot = requireNarrativeSnapshot(report)
  const enrollmentResult = await client.from('matriculas').select('aluno_id,turma_id').eq('id', report.matricula_id).maybeSingle()
  const enrollment = requireRow(enrollmentResult.data, enrollmentResult.error)
  if (enrollment.turma_id !== report.turma_id) throw new DescriptiveReportEmissionError('DESCRIPTIVE_REPORT_CONTEXT_MISSING', 422)
  const [studentResult, turmaResult, teacherResult] = await Promise.all([
    client.from('alunos').select('id,nome_completo,data_nascimento').eq('id', enrollment.aluno_id).maybeSingle(),
    client.from('turmas').select('id,nome,serie,escola_id').eq('id', report.turma_id).maybeSingle(),
    client.from('users').select('id,nome').eq('id', report.professor_id).maybeSingle(),
  ])
  const student = requireRow(studentResult.data, studentResult.error)
  const turma = requireRow(turmaResult.data, turmaResult.error)
  const professor = requireRow(teacherResult.data, teacherResult.error)
  const schoolResult = await client.from('escolas').select('id,nome,codigo').eq('id', turma.escola_id).maybeSingle()
  const escola = requireRow(schoolResult.data, schoolResult.error)
  return buildDescriptiveReportEmissionData({ report, snapshot, student, turma, professor, escola, releaseRevision, actor })
}
