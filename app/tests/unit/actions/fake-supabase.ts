/**
 * In-memory fake of the Supabase SSR client for attendance action tests.
 *
 * Mirrors the subset of the postgrest-js query API the attendance server
 * actions use, against an in-memory row store. It does NOT simulate RLS:
 * the tests exercise the application-level authorization layer, which is the
 * contract under test (RLS stays defense in depth).
 */

export type FakeRow = Record<string, any>

export interface FakeAttendanceDbState {
  /** Session user returned by auth.getUser(); null = unauthenticated */
  user: { id: string } | null
  users: FakeRow[]
  sessions: FakeRow[]
  turmas: FakeRow[]
  matriculas: FakeRow[]
  /** Result of the is_session_editable RPC */
  isEditable: boolean
}

export interface FakeWriteCalls {
  upserts: FakeRow[]
  inserts: FakeRow[]
  updates: FakeRow[]
}

type Filter = { col: string; op: 'eq' | 'in' | 'neq'; value: any }

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
      case 'frequencia':
        return []
      default:
        return []
    }
  }

  const matches = (row: FakeRow, filters: Filter[]): boolean =>
    filters.every(({ col, op, value }) => {
      if (op === 'eq') return row[col] === value
      if (op === 'in') return Array.isArray(value) && value.includes(row[col])
      if (op === 'neq') return row[col] !== value
      return false
    })

  const buildQuery = (table: string) => {
    const filters: Filter[] = []
    let insertRow: FakeRow | null = null
    let updateRow: FakeRow | null = null

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
      order() {
        return q
      },
      limit() {
        return q
      },
      single() {
        if (insertRow) {
          return Promise.resolve({ data: { ...insertRow, id: 'new-row-id' }, error: null })
        }
        if (updateRow) {
          const updated = rowsOf(table).find(r => matches(r, filters))
          if (updated) {
            Object.assign(updated, updateRow)
            return Promise.resolve({ data: { ...updated }, error: null })
          }
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
        }
        const row = rowsOf(table).find(r => matches(r, filters))
        if (row) return Promise.resolve({ data: { ...row }, error: null })
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
      },
      maybeSingle() {
        return q.single()
      },
      upsert(row: FakeRow) {
        writes.upserts.push(row)
        insertRow = row
        return q
      },
      insert(row: FakeRow) {
        writes.inserts.push(row)
        insertRow = row
        return q
      },
      update(row: FakeRow) {
        writes.updates.push(row)
        updateRow = row
        return q
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
    rpc(fn: string) {
      if (fn === 'is_session_editable') {
        return Promise.resolve({ data: state.isEditable, error: null })
      }
      return Promise.resolve({ data: null, error: { message: `unknown rpc ${fn}` } })
    },
  }
}
