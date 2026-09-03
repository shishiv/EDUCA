/**
 * Typed seam for the canonical attendance conditionality RPC.
 *
 * This module keeps a narrow contract for the sensitive conditionality RPC.
 */

/** Filters for the canonical attendance conditionality read model. */
export interface AttendanceConditionalityFilters {
  startDate: string
  endDate: string
  escolaId?: string
  turmaId?: string
}

/** One enrollment row resolved by legal rules and persisted municipality margins. */
export interface AttendanceConditionalityRow {
  matricula_id: string
  aluno_id: string
  aluno_nome: string
  nis: string | null
  is_bolsa_familia: boolean
  data_nascimento: string
  idade_anos: number
  educacao_basica_concluida: boolean
  turma_id: string
  turma_nome: string
  turma_serie: string
  etapa_ensino: string | null
  escola_id: string
  escola_nome: string
  municipio_id: string
  total_aulas: number
  presencas: number
  faltas: number
  atestados: number
  percentual_frequencia: number
  tem_dados_frequencia: boolean
  condicionalidade_legal: string | null
  piso_legal_percent: number | null
  condicionalidade_legal_status: string
  margem_municipal_id: string | null
  margem_municipal_critica_percent: number | null
  margem_municipal_alerta_percent: number | null
  margem_municipal_status: string
  margem_municipal_precedencia: number | null
  margem_municipal_origem: string | null
  margem_municipal_definida_por: string | null
  margem_municipal_definida_em: string | null
  margem_municipal_fallback: boolean | null
  margem_municipal_fallback_motivo: string | null
  margem_municipal_vigencia_inicio: string | null
  margem_municipal_vigencia_fim: string | null
}

interface AttendanceConditionalityRpcClient {
  rpc(
    functionName: 'get_attendance_conditionality',
    args: {
      p_start_date: string
      p_end_date: string
      p_escola_id?: string
      p_turma_id?: string
    },
  ): Promise<{
    data: AttendanceConditionalityRow[] | null
    error: { message: string } | null
  }>
}

interface StudentBolsaFamiliaRpcClient {
  rpc(
    functionName: 'get_student_bolsa_familia',
    args: { p_student_id: string },
  ): Promise<{
    data: boolean | null
    error: { message: string } | null
  }>
}

/** Narrows a real client to the conditionality RPC contract. */
export function asAttendanceConditionalityClient(client: unknown): AttendanceConditionalityRpcClient {
  return client as AttendanceConditionalityRpcClient
}

export async function getStudentBolsaFamilia(
  client: unknown,
  studentId: string,
): Promise<boolean | null> {
  const { data, error } = await (client as StudentBolsaFamiliaRpcClient).rpc(
    'get_student_bolsa_familia',
    { p_student_id: studentId },
  )
  return error ? null : data
}

/** Result returned by the canonical attendance conditionality query. */
export interface AttendanceConditionalityResult {
  data: AttendanceConditionalityRow[]
  error: string | null
}

/**
 * Reads attendance, legal conditionality, education completion, and municipal
 * margin resolution from one PostgreSQL read model. Callers must not query
 * frequencia directly for Bolsa Família alerts or reports.
 */
export async function getAttendanceConditionality(
  supabase: unknown,
  filters: AttendanceConditionalityFilters,
): Promise<AttendanceConditionalityResult> {
  const { data, error } = await asAttendanceConditionalityClient(supabase).rpc(
    'get_attendance_conditionality',
    {
      p_start_date: filters.startDate,
      p_end_date: filters.endDate,
      ...(filters.escolaId ? { p_escola_id: filters.escolaId } : {}),
      ...(filters.turmaId ? { p_turma_id: filters.turmaId } : {}),
    },
  )

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data ?? [], error: null }
}

/** Returns the rows that represent Bolsa Família conditionality records. */
export function filterBolsaFamiliaConditionality(
  rows: AttendanceConditionalityRow[],
): AttendanceConditionalityRow[] {
  return rows.filter((row) => row.is_bolsa_familia)
}

/** Returns true when a row is below its resolved municipal early-warning margin. */
export function isMunicipalAttendanceRisk(row: AttendanceConditionalityRow): boolean {
  return row.margem_municipal_status === 'ALERTA'
    || row.margem_municipal_status === 'CRITICO'
    || row.margem_municipal_status === 'NAO_CONFIGURADA'
}

/** Returns true when a row fails its age-specific legal conditionality. */
export function isLegalAttendanceRisk(row: AttendanceConditionalityRow): boolean {
  return row.condicionalidade_legal_status === 'CRITICO'
}
