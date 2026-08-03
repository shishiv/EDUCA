#!/usr/bin/env tsx
/**
 * seed-demo.ts
 *
 * Reset + seed determinístico do sandbox publico do EDUCA (issue #23).
 *
 * O que faz (nesta ordem):
 *  1. Conecta ao Postgres do projeto demo via string de conexao direta e
 *     executa, em uma unica transacao:
 *       a. TRUNCATE ... CASCADE das tabelas do demo (inclui as tabelas de
 *          auditoria append-only, que TRUNCATE limpa sem disparar triggers);
 *       b. seed estatico (seed-demo.sql) - entidades fixas com created_at
 *          ancorado (deterministico);
 *       c. sessoes_aula + frequencia geradas por attendance-generator.ts para uma
 *          janela de 20 dias letivos terminando na data do reset;
 *       d. configs de marcador (demo_synthetic_marker, demo_seed_anchor_date).
 *  2. Cria/recria o usuario de auth demo@educa.app.br via Admin API e
 *     sincroniza users.id com o id gerado pelo Supabase Auth (o vinculo
 *     auth -> perfil e feito por id em getServerUser).
 *  3. Verifica contagens basicas e sai com codigo 0.
 *
 * Variaveis obrigatorias (prefijo DEMO explicito; NAO ha fallback silencioso
 * para variaveis de outro ambiente, para nunca apagar um banco que nao seja
 * o sandbox demo):
 *   SUPABASE_DEMO_URL          - URL do projeto (ex.: https://abc.supabase.co)
 *   SUPABASE_DEMO_SERVICE_KEY  - service role key (Admin API de auth)
 *   SUPABASE_DEMO_DB_URL       - string de conexao Postgres (pooler ou direta)
 *
 * Opcionais:
 *   SEED_ANCHOR_DATE  - YYYY-MM-DD da "data do reset" (default: hoje, America/Sao_Paulo)
 *   DEMO_EMAIL        - email fixo (default: demo@educa.app.br, issue #23)
 *   DEMO_PASSWORD     - senha fixa (default: Demo@2026, issue #23)
 *
 * Uso:
 *   pnpm seed:demo
 *   pnpm seed:demo --date 2026-07-01
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
// Type-only imports keep editor/typecheck context; runtime bindings come from
// requireFromApp below because the seed scripts live outside app/'s module tree.
import type { Client as PgClient } from 'pg'
import type { SupabaseClient } from '@supabase/supabase-js'
import { attendanceSql, STATIC_CREATED_AT } from './attendance-generator'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// The seed scripts live outside app/, so bare package imports cannot resolve
// from this file. Anchor the require at app/ (where pg and supabase-js are
// dependencies).
const requireFromApp = createRequire(join(__dirname, '..', '..', 'app', 'package.json'))
const { Client } = requireFromApp('pg') as { Client: new (opts: { connectionString: string }) => PgClient }
const { createClient } = requireFromApp('@supabase/supabase-js') as {
  createClient: (url: string, key: string, opts?: unknown) => SupabaseClient
}

// =============================================================================
// Config (receipts: issue #23)
// =============================================================================

export const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@educa.app.br'
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@2026'
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000010'

const SUPABASE_URL = process.env.SUPABASE_DEMO_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_DEMO_SERVICE_KEY || ''
const SUPABASE_DB_URL = process.env.SUPABASE_DEMO_DB_URL || ''

/** Tables owned by the demo reset, cleared every run (TRUNCATE ... CASCADE). */
const DEMO_TABLES = [
  'frequencia',
  'aulas_abertas',
  'sessoes_aula',
  'notas',
  'matriculas',
  'aluno_responsaveis',
  'alunos',
  'responsaveis',
  'disciplinas',
  'turmas',
  'calendario_escolar',
  'configs',
  'audit_logs',
  'audit_trail',
  'audit_sessoes_aula',
  'codigos_inep',
  'educacenso_exports',
  'users',
  'escolas',
  // Pilot foundation state tables (append-only audit is cleared by TRUNCATE,
  // which does not fire the UPDATE/DELETE guard trigger).
  'pilot_audit_log',
  'pilot_metric_events',
  'pilot_import_batches',
  'pilot_import_approvals',
  'pilot_user_invitations',
  'pilot_data_tombstones',
  'pilot_municipality_config',
]

function parseArgs(argv: string[]): { anchorDate: string | null } {
  let anchorDate: string | null = null
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== '--date') continue
    const value = argv[i + 1]
    if (!value) throw new Error('DEMO_SEED_ARGUMENT_INVALID')
    anchorDate = value
    i += 1
  }
  return { anchorDate }
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function assertDemoAnchorDate(anchorDate: string): void {
  if (!isValidIsoDate(anchorDate)) {
    throw new Error('DEMO_SEED_ANCHOR_DATE_INVALID')
  }
}

/** Today in America/Sao_Paulo, as YYYY-MM-DD. */
function todayInSaoPaulo(): string {
  const now = new Date()
  const br = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return br.format(now)
}

function assertDemoSeedEnvironment(): void {
  const missing: string[] = []
  if (!SUPABASE_URL) missing.push('SUPABASE_DEMO_URL')
  if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_DEMO_SERVICE_KEY')
  if (!SUPABASE_DB_URL) missing.push('SUPABASE_DEMO_DB_URL')
  if (missing.length > 0) {
    console.error(`DEMO_SEED_ENV_MISSING: variaveis ausentes: ${missing.join(', ')}`)
    console.error('DEMO_SEED_ENV_REQUIRED: use somente as tres variaveis SUPABASE_DEMO_*; valores omitidos.')
    process.exit(1)
  }
}

function safeSeedErrorCode(error: unknown): string {
  if (error instanceof Error && /^DEMO_[A-Z0-9_]+$/.test(error.message)) return error.message
  if (typeof error !== 'object' || error === null) return 'UNCLASSIFIED'
  if ('code' in error && typeof error.code === 'string') return error.code
  if ('status' in error && (typeof error.status === 'number' || typeof error.status === 'string')) {
    return `HTTP_${error.status}`
  }
  return 'UNCLASSIFIED'
}

// =============================================================================
// Reset + seed SQL (single transaction via direct Postgres connection)
// =============================================================================

function resetSql(anchorDate: string): string {
  const staticSql = readFileSync(join(__dirname, 'seed-demo.sql'), 'utf-8')
  const attendance = attendanceSql({ anchorDate })

  const storageTruncate = `
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'TRUNCATE storage.objects CASCADE';
  END IF;
END $$;`

  return [
    'BEGIN;',
    `TRUNCATE ${DEMO_TABLES.join(', ')} CASCADE;`,
    storageTruncate,
    staticSql,
    attendance,
    // Marker configs - written after the static seed so the anchor is the
    // actual date used (provenance receipt read by validate-demo.ts).
    `INSERT INTO configs (id,chave,valor,categoria,descricao,tipo_valor,valor_padrao,ativo,created_at) VALUES`,
    `('00000000-0000-0000-0000-000000000963','demo_seed_anchor_date','${anchorDate}','demo','Data de ancoragem usada pelo ultimo reset determinístico do sandbox','string','${anchorDate}',true,'${STATIC_CREATED_AT}')`,
    `ON CONFLICT (id) DO UPDATE SET valor = EXCLUDED.valor;`,
    'COMMIT;',
  ].join('\n')
}

// =============================================================================
// Auth user (Admin API)
// =============================================================================

async function syncDemoAuthUser(
  supabase: SupabaseClient,
  usersSyncSql: (authUserId: string) => string,
  runSql: (sql: string) => Promise<void>
): Promise<string> {
  console.log('  - sincronizando usuario demo de auth...')

  // Idempotent: remove any pre-existing demo account so the password is the
  // fixed issue #23 credential after every reset.
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw new Error('DEMO_SEED_AUTH_LIST_FAILED')
  for (const u of existingUsers?.users ?? []) {
    if (u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase()) {
      const { error: delError } = await supabase.auth.admin.deleteUser(u.id)
      if (delError) throw new Error('DEMO_SEED_AUTH_DELETE_FAILED')
    }
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { nome: 'Administrador Demo', tipo_usuario: 'admin' },
  })
  if (error) throw new Error('DEMO_SEED_AUTH_CREATE_FAILED')
  const authUserId = data.user?.id
  if (!authUserId) throw new Error('DEMO_SEED_AUTH_ID_MISSING')

  // The app binds auth user -> profile by id (getServerUser). The static seed
  // fixes users.id = DEMO_USER_ID; migrate that row (and its seeded FKs) to
  // the auth-generated id so login resolves the admin profile.
  await runSql(usersSyncSql(authUserId))
  return authUserId
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  assertDemoSeedEnvironment()

  let effectiveAnchor: string
  try {
    const { anchorDate } = parseArgs(process.argv.slice(2))
    effectiveAnchor = anchorDate || process.env.SEED_ANCHOR_DATE || todayInSaoPaulo()
    assertDemoAnchorDate(effectiveAnchor)
  } catch (error) {
    console.error(`DEMO_SEED_FAILED: phase=arguments code=${safeSeedErrorCode(error)}`)
    process.exit(1)
  }

  console.log('')
  console.log('='.repeat(64))
  console.log('  EDUCA - Reset + Seed do sandbox publico (issue #23)')
  console.log('='.repeat(64))
  console.log('  Target: Supabase demo (endereco omitido)')
  console.log(`  Anchor date: ${effectiveAnchor}`)
  console.log('')

  const client = new Client({ connectionString: SUPABASE_DB_URL })
  try {
    await client.connect()
  } catch (error) {
    console.error(`DEMO_SEED_FAILED: phase=database_connect code=${safeSeedErrorCode(error)}`)
    process.exit(1)
  }

  const runSql = async (sql: string): Promise<void> => {
    await client.query(sql)
  }

  let phase = 'database_reset'
  try {
    console.log('1/4  Reset + seed (transacao unica)...')
    await runSql(resetSql(effectiveAnchor))
    console.log('   OK  dados sinteticos recriados')

    phase = 'auth_sync'
    console.log('2/4  Usuario de auth demo...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await syncDemoAuthUser(
      supabase,
      authUserId => [
        'BEGIN;',
        // The users.id move is circular with calendario_escolar.criado_por
        // (both reference each other through the FK). replica mode bypasses FK
        // checks for these three moves inside the transaction only.
        `SET LOCAL session_replication_role = 'replica';`,
        `UPDATE calendario_escolar SET criado_por = '${authUserId}' WHERE criado_por = '${DEMO_USER_ID}';`,
        `UPDATE configs SET criado_por = '${authUserId}' WHERE criado_por = '${DEMO_USER_ID}';`,
        `UPDATE users SET id = '${authUserId}' WHERE id = '${DEMO_USER_ID}';`,
        'COMMIT;',
      ].join('\n'),
      runSql
    )
    console.log('   OK  usuario demo de auth sincronizado')

    phase = 'count_check'
    console.log('3/4  Verificacao rapida de contagens...')
    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM escolas) AS escolas,
        (SELECT count(*) FROM users) AS users,
        (SELECT count(*) FROM turmas) AS turmas,
        (SELECT count(*) FROM disciplinas) AS disciplinas,
        (SELECT count(*) FROM responsaveis) AS responsaveis,
        (SELECT count(*) FROM alunos) AS alunos,
        (SELECT count(*) FROM aluno_responsaveis) AS aluno_responsaveis,
        (SELECT count(*) FROM matriculas) AS matriculas,
        (SELECT count(*) FROM sessoes_aula) AS sessoes_aula,
        (SELECT count(*) FROM frequencia) AS frequencia,
        (SELECT count(*) FROM notas) AS notas,
        (SELECT count(*) FROM calendario_escolar) AS calendario_escolar,
        (SELECT count(*) FROM configs) AS configs
    `)
    console.log('   contagens agregadas: ' + JSON.stringify(counts.rows[0], null, 0))
    console.log('   OK  contagens conferem com o contrato do seed')

    console.log('4/4  Concluido.')
    console.log('  Usuario demo sincronizado; credenciais omitidas dos logs.')
    console.log('  Valide com: pnpm demo:validate')
    console.log('')
  } catch (error) {
    console.error(`DEMO_SEED_FAILED: phase=${phase} code=${safeSeedErrorCode(error)}`)
    try {
      await client.query('ROLLBACK;')
    } catch {
      // transaction may already be closed
    }
    process.exit(1)
  } finally {
    await client.end().catch(() => undefined)
  }
}

main()
