/**
 * In-memory fake of the Supabase SSR client for attendance tests.
 *
 * It mirrors the subset of the postgrest-js query API used by the canonical
 * Attendance session module. It does not simulate RLS: application auth tests
 * and local Supabase tests cover those two seams separately.
 */

export type FakeRow = Record<string, any>

export interface FakeAttendanceDbState {
  /** Session user returned by auth.getUser(); null = unauthenticated */
  user: { id: string } | null
  users: FakeRow[]
  sessions: FakeRow[]
  turmas: FakeRow[]
  matriculas: FakeRow[]
  alunos?: FakeRow[]
  attendance?: FakeRow[]
  /** Result of the is_session_editable RPC */
  isEditable: boolean
}

export type FakeWriteCall = FakeRow & FakeRow[]

export interface FakeWriteCalls {
  upserts: FakeWriteCall[]
  inserts: FakeWriteCall[]
  updates: FakeRow[]
}

type Filter = { col: string; op: 'eq' | 'in' | 'neq' | 'gte' | 'lte'; value: any }

export function createFakeSupabase(initial: FakeAttendanceDbState) {
  const state: FakeAttendanceDbState = structuredClone(initial)
  const writes: FakeWriteCalls = { upserts: [], inserts: [], updates: [] }

  const rowsOf = (table: string): FakeRow[] => {
    switch (table) {
      case 'users':
        return state.users
      case 'sessoes_aula':
        return state.sessions
      case 'turmas':
        return state.turmas
      case 'matriculas':
        return state.matriculas
      case 'alunos':
        return state.alunos ?? []
      case 'frequencia':
        return state.attendance ?? []
      default:
        return []
    }
  }

  const matches = (row: FakeRow, filters: Filter[]): boolean =>
    filters.every(({ col, op, value }) => {
      if (op === 'eq') return row[col] === value
      if (op === 'in') return Array.isArray(value) && value.includes(row[col])
      if (op === 'neq') return row[col] !== value
      if (op === 'gte') return row[col] >= value
      if (op === 'lte') return row[col] <= value
      return false
    })

  const buildQuery = (table: string) => {
    const filters: Filter[] = []
    let insertRow: FakeRow | FakeRow[] | null = null
    let updateRow: FakeRow | null = null
    let rowLimit: number | null = null

    const q = {
      select(_cols?: string) {
        return q
      },
      eq(col: string, value: any) {
        filters.push({ col, op: 'eq', value })
        return q
      },
      in(col: string, values: any[]) {
        filters.push({ col, op: 'in', value: values })
        return q
      },
      neq(col: string, value: any) {
        filters.push({ col, op: 'neq', value })
        return q
      },
      gte(col: string, value: any) {
        filters.push({ col, op: 'gte', value })
        return q
      },
      lte(col: string, value: any) {
        filters.push({ col, op: 'lte', value })
        return q
      },
      order() {
        return q
      },
      limit(value: number) {
        rowLimit = value
        return q
      },
      single() {
        if (insertRow) {
          const row = Array.isArray(insertRow) ? insertRow[0] : insertRow
          return Promise.resolve({ data: { ...row, id: row.id ?? 'new-row-id' }, error: null })
        }
        if (updateRow) {
          const updated = rowsOf(table).find(row => matches(row, filters))
          if (updated) {
            Object.assign(updated, updateRow)
            return Promise.resolve({ data: { ...updated }, error: null })
          }
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
        }
        const row = rowsOf(table).find(row => matches(row, filters))
        if (row) return Promise.resolve({ data: { ...row }, error: null })
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
      },
      maybeSingle() {
        return q.single()
      },
      upsert(row: FakeRow | FakeRow[]) {
        writes.upserts.push(row as FakeWriteCall)
        insertRow = row
        return q
      },
      insert(row: FakeRow | FakeRow[]) {
        writes.inserts.push(row as FakeWriteCall)
        insertRow = row
        return q
      },
      update(row: FakeRow) {
        writes.updates.push(row)
        updateRow = row
        return q
      },
      then<TResult1 = { data: FakeRow[]; error: FakeRow | null }, TResult2 = never>(
        onfulfilled?: ((value: { data: FakeRow[]; error: FakeRow | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        const matchingRows = rowsOf(table).filter(row => matches(row, filters))
        const limitedRows = rowLimit === null ? matchingRows : matchingRows.slice(0, rowLimit)
        return Promise.resolve({ data: limitedRows.map(row => ({ ...row })), error: null }).then(onfulfilled, onrejected)
      },
    }

    return q
  }

  return {
    state,
    writes,
    auth: {
      getUser() {
        if (!state.user) {
          return Promise.resolve({ data: { user: null }, error: null })
        }
        return Promise.resolve({ data: { user: state.user }, error: null })
      },
    },
    from(table: string) {
      return buildQuery(table)
    },
    rpc(fn: string, _args?: Record<string, unknown>) {
      if (fn === 'is_session_editable') {
        return Promise.resolve({ data: state.isEditable, error: null })
      }
      return Promise.resolve({ data: null, error: { message: `unknown rpc ${fn}` } })
    },
  }
}
