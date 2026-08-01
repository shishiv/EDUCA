#!/usr/bin/env tsx
/**
 * emit-verify.ts
 *
 * Helper de verificacao offline (sem Supabase). Emite para stdout:
 *   1. o SQL de frequencia/aulas para uma data de ancoragem fixa
 *      (attendance-generator.ts);
 *   2. um bloco DO com ASSERTs que conferem a presenca esperada por matricula
 *      (determinismo: o banco deve reproduzir exatamente o padrao gerado).
 *
 * Usado por supabase/seed-demo/verify-sql.sh, que aplica o seed estatico +
 * esta saida em um cluster PostgreSQL descartavel e depois executa
 * supabase/seed-demo/seed_demo_validation.sql.
 *
 * Uso:
 *   tsx supabase/seed-demo/emit-verify.ts --date 2026-07-01 > /tmp/attendance.sql
 */

import { attendanceSql, isPresentOn, MATRICULAS, schoolDaysEndingOn, DEMO_SCHOOL_DAYS } from './attendance-generator'

function parseArgs(argv: string[]): string {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--date' && argv[i + 1]) return argv[i + 1]
  }
  throw new Error('--date YYYY-MM-DD e obrigatorio')
}

const anchorDate = parseArgs(process.argv.slice(2))
const days = schoolDaysEndingOn(anchorDate, DEMO_SCHOOL_DAYS)

const presenceAssertions = MATRICULAS.map(matricula => {
  let expected = 0
  days.forEach((day, dayIndex) => {
    if (isPresentOn(matricula.id, day, dayIndex)) expected += 1
  })
  return `  IF (SELECT count(*) FILTER (WHERE presente) FROM frequencia WHERE matricula_id = '${matricula.id}') <> ${expected} THEN
    RAISE EXCEPTION 'presenca esperada para matricula ${matricula.id} e ${expected}';
  END IF;`
}).join('\n')

const output = [
  attendanceSql({ anchorDate }),
  '',
  '-- Determinismo: presenca por matricula conforme o gerador para a ancora fixa',
  `DO $$`,
  `BEGIN`,
  presenceAssertions,
  `END $$;`,
  '',
].join('\n')

process.stdout.write(output)
