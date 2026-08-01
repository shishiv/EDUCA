/**
 * Compile-time regressions for the API layer type escapes.
 *
 * This file is type-only: `pnpm typecheck` (tsc) checks it, and vitest does not
 * execute it (its include only matches `*.test.ts`). Each assertion pins an
 * invariant that the old `as any` escapes could silently break - if the schema
 * or the helpers drift, typecheck fails here first.
 */
import type { Inserts } from '@/lib/supabase'
import type { ClassDiaryEntry } from '@/lib/api/class-diary'
import type { buildChamadaSessionInsert } from '@/lib/api/attendance'
import type { buildSessionInsert as buildEnhancedSessionInsert } from '@/lib/api/enhanced-attendance'

type Expect<T extends true> = T
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

declare function acceptSessionInsert(payload: Inserts<'sessoes_aula'>): void

// 1. The chamada payload builder returns exactly the sessoes_aula Insert type,
//    so the saveChamada insert cannot silently drop NOT NULL columns.
type _chamadaInsertIsTyped = Expect<Equal<ReturnType<typeof buildChamadaSessionInsert>, Inserts<'sessoes_aula'>>>

// 2. The enhanced session payload builder returns exactly the sessoes_aula
//    Insert type.
type _sessionInsertIsTyped = Expect<Equal<ReturnType<typeof buildEnhancedSessionInsert>, Inserts<'sessoes_aula'>>>

// 3. escola_id is NOT NULL in the schema: an insert that omits it must not
//    typecheck (the as-any escape previously accepted it).
// @ts-expect-error sessoes_aula.escola_id is required
acceptSessionInsert({ turma_id: 't', professor_id: 'p', conteudo_programatico: 'Chamada' })

// 4. Unknown columns must not typecheck (the as-any escape previously accepted
//    any key).
// @ts-expect-error sessoes_aula has no column named sala_inexistente
acceptSessionInsert({ turma_id: 't', professor_id: 'p', conteudo_programatico: 'Chamada', escola_id: 'e', sala_inexistente: 'x' })

// 5. The chamada builder requires the NOT NULL values resolved: passing a
//    nullable escolaId must not typecheck (saveChamada now guards this before
//    building the payload).
declare const buildChamadaTyped: typeof buildChamadaSessionInsert
// @ts-expect-error escolaId must be a resolved string, not null
const _nullableEscolaId: ReturnType<typeof buildChamadaTyped> = buildChamadaTyped({ turmaId: 't', dateStr: '2026-02-01', professorId: 'p', escolaId: null })

// 6. ClassDiaryEntry.status mirrors the raw TEXT column; re-narrowing it to a
//    fixed union would hide real DB values such as 'planejada'.
type _statusIsRawText = Expect<'planejada' extends ClassDiaryEntry['status'] ? true : false>

export {}
