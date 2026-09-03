import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'
import { logger } from '@/lib/logger'
import type { CampoType, Vivencia } from '@/types/diario-infantil'

type VivenciaRow = Tables<'vivencias'>
type VivenciaUpdate = Database['public']['Tables']['vivencias']['Update']

const VIVENCIA_COLUMNS = 'id, escola_id, aluno_id, matricula_id, turma_id, professor_id, data_vivencia, campos_experiencia, descricao, observacoes, escopo, created_by, updated_by, created_at, updated_at'

const CAMPOS = new Set<CampoType>(['eu', 'corpo', 'tracos', 'escuta', 'espacos'])

export interface CreateVivenciaInput {
  escola_id: string
  aluno_id: string
  matricula_id: string
  turma_id: string
  professor_id: string
  data_vivencia: string
  campos_experiencia: CampoType[]
  descricao: string
  observacoes?: string | null
  escopo?: 'individual' | 'coletiva'
  created_by: string
}

export interface UpdateVivenciaInput {
  campos_experiencia?: CampoType[]
  descricao?: string
  observacoes?: string | null
  updated_by: string
}

function toCampos(values: string[]): CampoType[] {
  const campos = values.filter((value): value is CampoType => CAMPOS.has(value as CampoType))
  if (campos.length !== values.length) throw new Error('VIVENCIA_INVALID_CAMPO')
  return campos
}

function toVivencia(row: VivenciaRow): Vivencia {
  return {
    id: row.id,
    escola_id: row.escola_id,
    aluno_id: row.aluno_id,
    matricula_id: row.matricula_id,
    turma_id: row.turma_id,
    professor_id: row.professor_id,
    data_vivencia: row.data_vivencia,
    campos_experiencia: toCampos(row.campos_experiencia),
    descricao: row.descricao,
    observacoes: row.observacoes,
    escopo: row.escopo === 'coletiva' ? 'coletiva' : 'individual',
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export class VivenciasApiService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getByAluno(alunoId: string, limit = 50): Promise<Vivencia[]> {
    const { data, error } = await this.supabase
      .from('vivencias')
      .select(VIVENCIA_COLUMNS)
      .eq('aluno_id', alunoId)
      .order('data_vivencia', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Error fetching vivencias by student', error, { feature: 'vivencias', action: 'list_by_aluno' })
      throw error
    }

    return (data ?? []).map(toVivencia)
  }

  async getByTurma(turmaId: string, startDate?: string, endDate?: string): Promise<Vivencia[]> {
    let query = this.supabase
      .from('vivencias')
      .select(VIVENCIA_COLUMNS)
      .eq('turma_id', turmaId)
      .order('data_vivencia', { ascending: false })
      .order('created_at', { ascending: false })

    if (startDate) query = query.gte('data_vivencia', startDate)
    if (endDate) query = query.lte('data_vivencia', endDate)

    const { data, error } = await query
    if (error) {
      logger.error('Error fetching vivencias by class', error, { feature: 'vivencias', action: 'list_by_turma' })
      throw error
    }

    return (data ?? []).map(toVivencia)
  }

  async getByReport(reportId: string): Promise<Vivencia[]> {
    const { data: sources, error: sourceError } = await this.supabase
      .from('relatorios_descritivos_vivencias')
      .select('vivencia_id')
      .eq('relatorio_id', reportId)

    if (sourceError) {
      logger.error('Error fetching vivencia report sources', sourceError, { feature: 'vivencias', action: 'list_report_sources' })
      throw sourceError
    }

    const vivenciaIds = (sources ?? []).map((source) => source.vivencia_id)
    if (vivenciaIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('vivencias')
      .select(VIVENCIA_COLUMNS)
      .in('id', vivenciaIds)
      .order('data_vivencia', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching report vivencias', error, { feature: 'vivencias', action: 'list_report_vivencias' })
      throw error
    }

    return (data ?? []).map(toVivencia)
  }

  async getById(id: string): Promise<Vivencia | null> {
    const { data, error } = await this.supabase
      .from('vivencias')
      .select(VIVENCIA_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logger.error('Error fetching vivencia', error, { feature: 'vivencias', action: 'get' })
      throw error
    }

    return data ? toVivencia(data) : null
  }

  async create(input: CreateVivenciaInput): Promise<Vivencia> {
    const payload: Database['public']['Tables']['vivencias']['Insert'] = {
      escola_id: input.escola_id,
      aluno_id: input.aluno_id,
      matricula_id: input.matricula_id,
      turma_id: input.turma_id,
      professor_id: input.professor_id,
      data_vivencia: input.data_vivencia,
      campos_experiencia: input.campos_experiencia,
      descricao: input.descricao,
      observacoes: input.observacoes ?? null,
      escopo: input.escopo ?? 'individual',
      created_by: input.created_by,
      updated_by: input.created_by,
    }

    const { data, error } = await this.supabase
      .from('vivencias')
      .insert(payload)
      .select(VIVENCIA_COLUMNS)
      .single()

    if (error) {
      logger.error('Error creating vivencia', error, { feature: 'vivencias', action: 'create' })
      throw error
    }

    return toVivencia(data)
  }

  async update(id: string, input: UpdateVivenciaInput): Promise<Vivencia> {
    const payload: VivenciaUpdate = {
      updated_by: input.updated_by,
      updated_at: new Date().toISOString(),
    }

    if (input.campos_experiencia !== undefined) payload.campos_experiencia = input.campos_experiencia
    if (input.descricao !== undefined) payload.descricao = input.descricao
    if (input.observacoes !== undefined) payload.observacoes = input.observacoes

    const { data, error } = await this.supabase
      .from('vivencias')
      .update(payload)
      .eq('id', id)
      .select(VIVENCIA_COLUMNS)
      .single()

    if (error) {
      logger.error('Error updating vivencia', error, { feature: 'vivencias', action: 'update' })
      throw error
    }

    return toVivencia(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('vivencias')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Error deleting vivencia', error, { feature: 'vivencias', action: 'delete' })
      throw error
    }
  }
}
