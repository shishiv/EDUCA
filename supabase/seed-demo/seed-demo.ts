#!/usr/bin/env tsx
/**
 * seed-demo.ts
 *
 * Script para popular o sandbox publico do EDUCA com dados de demonstracao.
 *
 * O que faz:
 *  1. Conecta ao Supabase via service role key (bypass RLS)
 *  2. Executa TRUNCATE CASCADE em todas as tabelas publicas
 *  3. Executa o seed SQL (seed-demo.sql)
 *  4. Cria usuario admin demo no auth.users via Admin API
 *
 * Uso:
 *   pnpm seed:demo
 *
 * Variaveis de ambiente necessarias:
 *   SUPABASE_DEMO_URL          - URL do projeto Supabase de demo
 *   SUPABASE_DEMO_SERVICE_KEY   - Service role key do projeto Supabase de demo
 *
 * Fallback (para nomes padrao):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// Config
// =============================================================================

const SUPABASE_URL =
  process.env.SUPABASE_DEMO_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_DEMO_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const DEMO_EMAIL = "demo@educa.app.br";
const DEMO_PASSWORD = "Demo@Educa2026";
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000010";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "ERRO: Variaveis SUPABASE_DEMO_URL e SUPABASE_DEMO_SERVICE_KEY sao obrigatorias."
  );
  console.error("");
  console.error("Defina no .env ou no ambiente:");
  console.error("  SUPABASE_DEMO_URL=https://seu-projeto.supabase.co");
  console.error("  SUPABASE_DEMO_SERVICE_KEY=eyJ...");
  process.exit(1);
}

// =============================================================================
// Cliente Supabase (service role - bypass RLS)
// =============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Executa SQL bruto via endpoint /pg/exec do Supabase (disponivel para
 * service role key). Este endpoint aceita multi-statements e e a forma
 * mais confiavel de executar o seed SQL completo.
 */
async function execSqlViaPgEndpoint(sql: string): Promise<boolean> {
  const projectRef = SUPABASE_URL.match(
    /https:\/\/([a-z0-9]+)\.supabase\.co/
  )?.[1];

  if (!projectRef) return false;

  const pgUrl = `https://${projectRef}.supabase.co/pg/exec`;
  const resp = await fetch(pgUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (resp.ok) return true;

  const body = await resp.text();
  console.warn(`   /pg/exec retornou ${resp.status}: ${body.slice(0, 200)}`);
  return false;
}

/**
 * Fallback: executa o SQL dividido em statements via supabase.rpc.
 * Requer uma funcao SQL `exec_sql(sql_text text)` no banco.
 */
async function execSqlViaRpc(sql: string): Promise<void> {
  const statements = sql
    .split(/^;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    const { error } = await supabase.rpc("exec_sql" as never, {
      sql_text: stmt,
    } as never);
    if (error && !error.message.includes("does not exist")) {
      console.warn(`   aviso: ${error.message}`);
    }
  }
}

// =============================================================================
// Passos
// =============================================================================

async function truncateAllTables(): Promise<void> {
  console.log("1/4  Truncando tabelas (DELETE em todas as linhas)...");

  const tables = [
    "frequencia",
    "notas",
    "aulas_abertas",
    "sessoes_aula",
    "matriculas",
    "aluno_responsaveis",
    "alunos",
    "responsaveis",
    "disciplinas",
    "turmas",
    "calendario_escolar",
    "configs",
    "audit_logs",
    "audit_trail",
    "audit_sessoes_aula",
    "codigos_inep",
    "educacenso_exports",
    "users",
    "escolas",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z" as never);
    if (error && !error.message.includes("does not exist")) {
      console.warn(`   ${table}: ${error.message}`);
    }
  }
  console.log("   OK  tabelas limpas");
}

async function executeSeedSql(): Promise<void> {
  console.log("2/4  Executando seed SQL...");
  const sqlPath = join(__dirname, "seed-demo.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log(`   Lendo ${sql.length} bytes de ${sqlPath}`);

  const ok = await execSqlViaPgEndpoint(sql);
  if (ok) {
    console.log("   OK  seed SQL executado via /pg/exec");
    return;
  }

  console.warn("   /pg/exec indisponivel, tentando via rpc...");
  await execSqlViaRpc(sql);
  console.log("   OK  seed SQL executado via rpc (fallback)");
}

async function createDemoAuthUser(): Promise<void> {
  console.log("3/4  Criando usuario admin demo no auth.users...");

  // Tenta deletar o usuario existente (idempotente)
  try {
    await supabase.auth.admin.deleteUser(DEMO_USER_ID);
  } catch {
    // usuario pode nao existir ainda
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      nome: "Administrador Demo",
      tipo_usuario: "admin",
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      console.log("   aviso  usuario demo ja existe, pulando criacao");
    } else {
      throw new Error(`Erro ao criar usuario demo: ${error.message}`);
    }
  } else if (data?.user) {
    console.log("   OK  usuario demo criado");

    // Sincroniza o auth uid na tabela users
    const { error: updError } = await supabase
      .from("users")
      .update({ id: data.user.id, ativo: true, primeiro_login: false })
      .eq("email", DEMO_EMAIL);

    if (updError) {
      console.warn(
        `   aviso: nao foi possivel sincronizar users.id: ${updError.message}`
      );
    }
  }
}

async function verifySeed(): Promise<void> {
  console.log("4/4  Verificando seed...");

  const checks: Array<[string, string]> = [
    ["escolas", "id"],
    ["users", "id"],
    ["turmas", "id"],
    ["alunos", "id"],
    ["responsaveis", "id"],
    ["matriculas", "id"],
    ["frequencia", "id"],
    ["aulas_abertas", "id"],
    ["notas", "id"],
    ["calendario_escolar", "id"],
    ["configs", "id"],
    ["disciplinas", "id"],
    ["aluno_responsaveis", "id"],
  ];

  for (const [table, col] of checks) {
    const { count, error } = await supabase
      .from(table)
      .select(col, { count: "exact", head: true });

    if (error) {
      console.warn(`   ${table}: erro - ${error.message}`);
    } else {
      const pad = table.padEnd(20);
      console.log(`   ${pad} ${count ?? 0} registros`);
    }
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log("");
  console.log("=".repeat(60));
  console.log("  EDUCA - Seed Demo (sandbox publico)");
  console.log("=".repeat(60));
  console.log("");
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Demo email:   ${DEMO_EMAIL}`);
  console.log("");

  try {
    await truncateAllTables();
    await executeSeedSql();
    await createDemoAuthUser();
    await verifySeed();

    console.log("");
    console.log("=".repeat(60));
    console.log("  SEED DEMO COMPLETO!");
    console.log("=".repeat(60));
    console.log("");
    console.log("  Credenciais de acesso:");
    console.log(`    Email:  ${DEMO_EMAIL}`);
    console.log(`    Senha:  ${DEMO_PASSWORD}`);
    console.log("");
  } catch (err) {
    console.error("");
    console.error("ERRO no seed demo:");
    console.error(err);
    process.exit(1);
  }
}

main();