#!/usr/bin/env tsx
/**
 * Seeds the isolated local rehearsal for bounded descriptive-report PDF emission.
 * Every row is synthetic and the two conteudo_aula records are the only source
 * that the emitted report may use as taught-content evidence.
 */
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { assertPilotDescriptiveReportDemoSafety } from '../lib/pilot/descriptive-report-demo-safety'
import {
  PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
  PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_ID,
  PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY,
  PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_ID,
  PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY,
  PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
  PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_ID,
  PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY,
  requirePilotDescriptiveReleaseRevision,
} from '../lib/pilot/descriptive-report-demo-contract'
import {
  PILOT_DESCRIPTIVE_AUTH_EMAIL,
  PILOT_DESCRIPTIVE_AUTH_PASSWORD,
  PILOT_DESCRIPTIVE_CLASS_ID,
  PILOT_DESCRIPTIVE_CONTENT_IDS,
  PILOT_DESCRIPTIVE_DISCIPLINE_ID,
  PILOT_DESCRIPTIVE_ENROLLMENT_ID,
  PILOT_DESCRIPTIVE_EXPECTED_COUNTS,
  PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS,
  PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD,
  PILOT_DESCRIPTIVE_MARKER_CONFIG_ID,
  PILOT_DESCRIPTIVE_REPORT_ID,
  PILOT_DESCRIPTIVE_SCHOOL_ID,
  PILOT_DESCRIPTIVE_SEED_CREATED_AT,
  PILOT_DESCRIPTIVE_SEED_MARKER,
  PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
  PILOT_DESCRIPTIVE_SESSION_IDS,
  PILOT_DESCRIPTIVE_STUDENT_ID,
} from '../../supabase/seed-pilot-descriptive/pilot-descriptive-contract'

assertPilotDescriptiveReportDemoSafety()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || ''
const RELEASE_REVISION = requirePilotDescriptiveReleaseRevision()

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function assertDescriptiveSeedEnvironment(): void {
  if (!SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_')) {
    throw new Error('PILOT_DESCRIPTIVE_SEED_SERVICE_KEY_REQUIRED: local sb_secret key is required')
  }
  if (!SUPABASE_DB_URL) {
    throw new Error('PILOT_DESCRIPTIVE_SEED_DB_URL_REQUIRED: SUPABASE_DB_URL or DATABASE_URL is required')
  }
}

async function ensureDescriptiveTeacherAuthUser(): Promise<string> {
  const { data: listed, error: listError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw new Error(`PILOT_DESCRIPTIVE_SEED_AUTH_LIST_FAILED: ${listError.message}`)

  const existing = listed.users.find(user => user.email?.toLowerCase() === PILOT_DESCRIPTIVE_AUTH_EMAIL)
  if (existing) {
    const { data, error } = await service.auth.admin.updateUserById(existing.id, {
      password: PILOT_DESCRIPTIVE_AUTH_PASSWORD,
      email_confirm: true,
      user_metadata: { synthetic: true, pilot_role: 'professor' },
    })
    if (error || !data.user) throw new Error('PILOT_DESCRIPTIVE_SEED_AUTH_UPDATE_FAILED: teacher account')
    return data.user.id
  }

  const { data, error } = await service.auth.admin.createUser({
    email: PILOT_DESCRIPTIVE_AUTH_EMAIL,
    password: PILOT_DESCRIPTIVE_AUTH_PASSWORD,
    email_confirm: true,
    user_metadata: { synthetic: true, pilot_role: 'professor' },
  })
  if (error || !data.user) throw new Error('PILOT_DESCRIPTIVE_SEED_AUTH_CREATE_FAILED: teacher account')
  return data.user.id
}

async function writeDescriptiveSeed(client: Client, professorId: string): Promise<void> {
  await client.query('BEGIN')

  try {
    await client.query(
      `INSERT INTO public.escolas (id,codigo,nome,tipo,ativo,created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [PILOT_DESCRIPTIVE_SCHOOL_ID, 'PILOT-DESC', 'Escola Descritiva Sintética', 'pre_escola', true, PILOT_DESCRIPTIVE_SEED_CREATED_AT]
    )
    await client.query(
      `INSERT INTO public.users (id,nome,email,tipo_usuario,escola_id,ativo,primeiro_login,senha_padrao,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [professorId, 'Professora Descritiva Sintética', PILOT_DESCRIPTIVE_AUTH_EMAIL, 'professor', PILOT_DESCRIPTIVE_SCHOOL_ID, true, false, false, PILOT_DESCRIPTIVE_SEED_CREATED_AT]
    )
    await client.query(
      `INSERT INTO public.turmas (id,import_source_id,nome,serie,turno,ano_letivo,capacidade,escola_id,professor_id,ativo,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [PILOT_DESCRIPTIVE_CLASS_ID, 'pilot-descriptive:class:001', 'Pré II Sintético', 'Pré II', 'matutino', 2026, 1, PILOT_DESCRIPTIVE_SCHOOL_ID, professorId, true, PILOT_DESCRIPTIVE_SEED_CREATED_AT]
    )
    await client.query(
      `INSERT INTO public.alunos (id,escola_id,import_source_id,nome_completo,data_nascimento,sexo,ativo,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [PILOT_DESCRIPTIVE_STUDENT_ID, PILOT_DESCRIPTIVE_SCHOOL_ID, 'pilot-descriptive:student:001', 'Criança Descritiva Sintética', '2021-03-21', 'F', true, PILOT_DESCRIPTIVE_SEED_CREATED_AT]
    )
    await client.query(
      `INSERT INTO public.matriculas (id,aluno_id,turma_id,ano_letivo,data_matricula,situacao,observacoes,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [PILOT_DESCRIPTIVE_ENROLLMENT_ID, PILOT_DESCRIPTIVE_STUDENT_ID, PILOT_DESCRIPTIVE_CLASS_ID, 2026, '2026-02-02', 'ativa', 'synthetic descriptive rehearsal', PILOT_DESCRIPTIVE_SEED_CREATED_AT]
    )
    await client.query(
      `INSERT INTO public.disciplinas (id,codigo,nome,escola_id,ativa,created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [PILOT_DESCRIPTIVE_DISCIPLINE_ID, 'INF', 'Educação Infantil', PILOT_DESCRIPTIVE_SCHOOL_ID, true, PILOT_DESCRIPTIVE_SEED_CREATED_AT]
    )
    await client.query(
      `INSERT INTO public.sessoes_aula (
         id,turma_id,escola_id,professor_id,disciplina_id,data_aula,inicio_aula,fim_aula,duracao_minutos,
         conteudo_programatico,objetivos_aprendizagem,metodologia,recursos_utilizados,status,documento_oficial,
         aberta_em,fechada_em,travada_em,created_at,updated_at
       ) VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20),
         ($21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40)`,
      [
        PILOT_DESCRIPTIVE_SESSION_IDS[0], PILOT_DESCRIPTIVE_CLASS_ID, PILOT_DESCRIPTIVE_SCHOOL_ID, professorId, PILOT_DESCRIPTIVE_DISCIPLINE_ID, '2026-03-10', '08:00:00', '08:50:00', 50,
        'Círculo de conversa e escuta coletiva', 'Ampliar a escuta e a participação em grupo', 'Roda de conversa mediada', 'Cartões de fala e tapete', 'FECHADA', false,
        '2026-03-10T08:00:00.000Z', '2026-03-10T08:50:00.000Z', '2026-03-10T08:50:00.000Z', PILOT_DESCRIPTIVE_SEED_CREATED_AT, PILOT_DESCRIPTIVE_SEED_CREATED_AT,
        PILOT_DESCRIPTIVE_SESSION_IDS[1], PILOT_DESCRIPTIVE_CLASS_ID, PILOT_DESCRIPTIVE_SCHOOL_ID, professorId, PILOT_DESCRIPTIVE_DISCIPLINE_ID, '2026-05-15', '08:00:00', '08:50:00', 50,
        'Exploração de sons, cores e movimentos', 'Expressar ideias com materiais sonoros e visuais', 'Ateliê em pequenos grupos', 'Tintas, instrumentos e papel', 'FECHADA', false,
        '2026-05-15T08:00:00.000Z', '2026-05-15T08:50:00.000Z', '2026-05-15T08:50:00.000Z', PILOT_DESCRIPTIVE_SEED_CREATED_AT, PILOT_DESCRIPTIVE_SEED_CREATED_AT,
      ]
    )
    await client.query(
      `INSERT INTO public.conteudo_aula (id,sessao_id,tema,objetivo,habilidades_bncc,metodologia,recursos,observacoes,created_by,created_at,updated_at)
       VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11),
         ($12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        PILOT_DESCRIPTIVE_CONTENT_IDS[0], PILOT_DESCRIPTIVE_SESSION_IDS[0], 'Círculo de conversa e escuta coletiva', 'Ampliar a escuta e a participação em grupo', ['EI03EO04'], 'Roda de conversa mediada', 'Cartões de fala e tapete', 'Registro sintético de conteúdo ministrado', professorId, PILOT_DESCRIPTIVE_SEED_CREATED_AT, PILOT_DESCRIPTIVE_SEED_CREATED_AT,
        PILOT_DESCRIPTIVE_CONTENT_IDS[1], PILOT_DESCRIPTIVE_SESSION_IDS[1], 'Exploração de sons, cores e movimentos', 'Expressar ideias com materiais sonoros e visuais', ['EI03TS02', 'EI03CG05'], 'Ateliê em pequenos grupos', 'Tintas, instrumentos e papel', 'Registro sintético de conteúdo ministrado', professorId, PILOT_DESCRIPTIVE_SEED_CREATED_AT, PILOT_DESCRIPTIVE_SEED_CREATED_AT,
      ]
    )
    await client.query(
      `INSERT INTO public.relatorios_descritivos (
         id,matricula_id,turma_id,professor_id,ano_letivo,semestre,status,
         campo_eu_outro_nos,campo_corpo_gestos,campo_tracos_sons,campo_escuta_fala,campo_espacos_tempos,
         observacoes_gerais,created_at,updated_at,created_by,finalizado_em,finalizado_por
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
       )`,
      [
        PILOT_DESCRIPTIVE_REPORT_ID, PILOT_DESCRIPTIVE_ENROLLMENT_ID, PILOT_DESCRIPTIVE_CLASS_ID, professorId, 2026, 'primeiro', 'finalizado',
        'A criança sintética participa das rodas de conversa, reconhece colegas e demonstra autonomia progressiva nas interações cotidianas.',
        'A criança sintética explora trajetos, movimentos e jogos corporais com curiosidade, respeitando os combinados do grupo.',
        'A criança sintética combina traços, cores e sons para comunicar ideias, experimentando materiais com interesse e cuidado.',
        'A criança sintética amplia a escuta, organiza relatos e cria hipóteses durante conversas, histórias e brincadeiras.',
        'A criança sintética compara quantidades, observa transformações e usa referências de espaço e tempo em situações de investigação.',
        'Registro integralmente sintético para o ensaio local de emissão bounded do relatório descritivo.',
        PILOT_DESCRIPTIVE_SEED_CREATED_AT, PILOT_DESCRIPTIVE_SEED_CREATED_AT, professorId, PILOT_DESCRIPTIVE_SEED_CREATED_AT, professorId,
      ]
    )
    await client.query(
      `INSERT INTO public.configs (id,chave,valor,categoria,descricao,tipo_valor,valor_padrao,ativo,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [PILOT_DESCRIPTIVE_MARKER_CONFIG_ID, PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY, PILOT_DESCRIPTIVE_SEED_MARKER, 'pilot', 'Marker for the bounded descriptive-report rehearsal', 'string', PILOT_DESCRIPTIVE_SEED_MARKER, true, PILOT_DESCRIPTIVE_SEED_CREATED_AT]
    )
    await client.query(
      `INSERT INTO public.configs (id,chave,valor,categoria,descricao,tipo_valor,valor_padrao,ativo,created_at)
       VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9),
         ($10,$11,$12,$13,$14,$15,$16,$17,$18),
         ($19,$20,$21,$22,$23,$24,$25,$26,$27)`,
      [
        PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_ID,
        PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY,
        RELEASE_REVISION,
        'pilot',
        'Source revision used by the bounded descriptive-report rehearsal',
        'string',
        RELEASE_REVISION,
        true,
        PILOT_DESCRIPTIVE_SEED_CREATED_AT,
        PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_ID,
        PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY,
        PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
        'pilot',
        'Environment used by the bounded descriptive-report rehearsal',
        'string',
        PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
        true,
        PILOT_DESCRIPTIVE_SEED_CREATED_AT,
        PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_ID,
        PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY,
        PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
        'pilot',
        'Canonical source used by the bounded descriptive-report rehearsal',
        'string',
        PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
        true,
        PILOT_DESCRIPTIVE_SEED_CREATED_AT,
      ]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

async function readDescriptiveSeedReceipt(client: Client): Promise<Record<string, unknown>> {
  const { rows } = await client.query(
    `SELECT
      (SELECT count(*) FROM public.escolas WHERE id = $1) AS schools,
      (SELECT count(*) FROM public.turmas WHERE id = $2) AS classes,
      (SELECT count(*) FROM public.alunos WHERE id = $3) AS students,
      (SELECT count(*) FROM public.matriculas WHERE id = $4) AS enrollments,
      (SELECT count(*) FROM public.relatorios_descritivos WHERE id = $5) AS reports,
      (SELECT count(*) FROM public.sessoes_aula WHERE id = ANY($6::uuid[])) AS sessions,
      (SELECT count(*) FROM public.conteudo_aula c
        JOIN public.sessoes_aula s ON s.id = c.sessao_id
        WHERE s.turma_id = $2
          AND s.data_aula >= $10::date
          AND s.data_aula <= $11::date) AS canonical_content,
      (SELECT md5(string_agg(line, '|' ORDER BY line)) FROM (
        SELECT concat_ws('|', c.id::text, c.sessao_id::text, s.data_aula::text, c.tema, c.objetivo,
          array_to_string(c.habilidades_bncc, ','), COALESCE(c.metodologia, ''),
          COALESCE(c.recursos, ''), COALESCE(c.observacoes, '')) AS line
        FROM public.conteudo_aula c
        JOIN public.sessoes_aula s ON s.id = c.sessao_id
        WHERE s.turma_id = $2
          AND s.data_aula >= $10::date
          AND s.data_aula <= $11::date
      ) content_rows) AS canonical_content_fingerprint,
      (SELECT md5(string_agg(line, '|' ORDER BY line)) FROM (
        SELECT concat_ws('|', r.id::text, r.matricula_id::text, r.turma_id::text, r.status, r.ano_letivo::text, r.semestre) AS line
        FROM public.relatorios_descritivos r WHERE r.id = $5
      ) report_rows) AS descriptive_report_fingerprint,
      (SELECT valor FROM public.configs WHERE chave = $7) AS release_revision,
      (SELECT valor FROM public.configs WHERE chave = $8) AS rehearsal_environment,
      (SELECT valor FROM public.configs WHERE chave = $9) AS canonical_source`,
    [
      PILOT_DESCRIPTIVE_SCHOOL_ID,
      PILOT_DESCRIPTIVE_CLASS_ID,
      PILOT_DESCRIPTIVE_STUDENT_ID,
      PILOT_DESCRIPTIVE_ENROLLMENT_ID,
      PILOT_DESCRIPTIVE_REPORT_ID,
      PILOT_DESCRIPTIVE_SESSION_IDS,
      PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY,
      PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY,
      PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY,
      PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.start,
      PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.end,
    ]
  )
  return rows[0] ?? {}
}

export async function seedPilotDescriptive(): Promise<void> {
  assertDescriptiveSeedEnvironment()
  const professorId = await ensureDescriptiveTeacherAuthUser()
  const client = new Client({ connectionString: SUPABASE_DB_URL })
  await client.connect()

  try {
    await writeDescriptiveSeed(client, professorId)
    const receipt = await readDescriptiveSeedReceipt(client)
    console.info(`PILOT_DESCRIPTIVE_SEED_RECEIPT: ${JSON.stringify({
      marker: PILOT_DESCRIPTIVE_SEED_MARKER,
      provenance: {
        releaseRevision: RELEASE_REVISION,
        environment: PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
        canonicalSource: PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
      },
      expected: {
        counts: PILOT_DESCRIPTIVE_EXPECTED_COUNTS,
        fingerprints: PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS,
      },
      actual: Object.fromEntries(Object.entries(receipt).map(([key, value]) => [key, typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value])),
    })}`)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  seedPilotDescriptive().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
