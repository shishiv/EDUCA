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

type Expect<T extends true> = T

declare function acceptSessionInsert(payload: Inserts<'sessoes_aula'>): void

// 3. escola_id is NOT NULL in the schema: an insert that omits it must not
//    typecheck (the as-any escape previously accepted it).
// @ts-expect-error sessoes_aula.escola_id is required
acceptSessionInsert({ turma_id: 't', professor_id: 'p', conteudo_programatico: 'Chamada' })

// 4. Unknown columns must not typecheck (the as-any escape previously accepted
//    any key).
// @ts-expect-error sessoes_aula has no column named sala_inexistente
acceptSessionInsert({ turma_id: 't', professor_id: 'p', conteudo_programatico: 'Chamada', escola_id: 'e', sala_inexistente: 'x' })

// 6. ClassDiaryEntry.status mirrors the raw TEXT column; re-narrowing it to a
//    fixed union would hide real DB values such as 'planejada'.
type _statusIsRawText = Expect<'planejada' extends ClassDiaryEntry['status'] ? true : false>

export {}
