/**
 * Vivencias API Service
 * CRUD operations for early childhood education observations (vivencias)
 *
 * Follows the BNCC Campos de Experiencia framework.
 * Note: foto_url is deferred behind feature flag per CONTEXT.md (LGPD)
 *
 * @see types/diario-infantil.ts for Vivencia types
 * @see lib/api/base.ts for BaseApiService pattern
 */

import { BaseApiService } from './base'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Vivencia, CampoType } from '@/types/diario-infantil'

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateVivenciaInput {
  aluno_id: string
  turma_id: string
  professor_id: string
  data_vivencia: string // YYYY-MM-DD
  campos_experiencia: CampoType[]
  descricao: string
  observacoes?: string
  escopo?: 'individual' | 'coletiva'
}

export interface UpdateVivenciaInput {
  campos_experiencia?: CampoType[]
  descricao?: string
  observacoes?: string
}

// ============================================================================
// VIVENCIAS API SERVICE
// ============================================================================

export class VivenciasApiService extends BaseApiService {
  constructor() {
    super('vivencias')
  }

  /**
   * Get vivencias for a specific student
   * @param alunoId - Student ID
   * @param limit - Maximum number of records to return (default: 50)
   */
  async getByAluno(alunoId: string, limit: number = 50): Promise<Vivencia[]> {
    try {
      const { data, error } = await supabase
        .from('vivencias')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('data_vivencia', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error(`Error fetching vivencias for aluno ${alunoId}:`, error)
        throw error
      }

      return (data || []) as Vivencia[]
    } catch (error) {
      logger.error('Error in getByAluno for vivencias:', error)
      throw error
    }
  }

  /**
   * Get vivencias for a specific class within a date range
   * @param turmaId - Class ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  async getByTurma(
    turmaId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Vivencia[]> {
    try {
      let query = supabase
        .from('vivencias')
        .select('*')
        .eq('turma_id', turmaId)
        .order('data_vivencia', { ascending: false })

      if (startDate) {
        query = query.gte('data_vivencia', startDate)
      }
      if (endDate) {
        query = query.lte('data_vivencia', endDate)
      }

      const { data, error } = await query

      if (error) {
        logger.error(`Error fetching vivencias for turma ${turmaId}:`, error)
        throw error
      }

      return (data || []) as Vivencia[]
    } catch (error) {
      logger.error('Error in getByTurma for vivencias:', error)
      throw error
    }
  }

  /**
   * Get a single vivencia by ID
   * @param id - Vivencia ID
   */
  async getById(id: string): Promise<Vivencia | null> {
    try {
      const { data, error } = await supabase
        .from('vivencias')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        logger.error(`Error fetching vivencia by id ${id}:`, error)
        throw error
      }

      return data as Vivencia
    } catch (error) {
      logger.error('Error in getById for vivencias:', error)
      throw error
    }
  }

  /**
   * Create a new vivencia
   * @param data - Vivencia input data
   */
  async create(data: CreateVivenciaInput): Promise<Vivencia> {
    try {
      const now = new Date().toISOString()

      const { data: created, error } = await supabase
        .from('vivencias')
        .insert({
          aluno_id: data.aluno_id,
          turma_id: data.turma_id,
          professor_id: data.professor_id,
          data_vivencia: data.data_vivencia,
          campos_experiencia: data.campos_experiencia,
          descricao: data.descricao,
          observacoes: data.observacoes || null,
          created_at: now,
          updated_at: now
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating vivencia:', error)
        throw error
      }

      logger.info('Vivencia created successfully', {
        feature: 'diario-infantil',
        action: 'create_vivencia',
        metadata: {
          vivencia_id: created.id,
          aluno_id: data.aluno_id,
          turma_id: data.turma_id,
          campos: data.campos_experiencia
        }
      })

      return created as Vivencia
    } catch (error) {
      logger.error('Error in create for vivencias:', error)
      throw error
    }
  }

  /**
   * Update an existing vivencia
   * @param id - Vivencia ID
   * @param data - Fields to update
   */
  async update(id: string, data: UpdateVivenciaInput): Promise<Vivencia> {
    try {
      const { data: updated, error } = await supabase
        .from('vivencias')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error(`Error updating vivencia ${id}:`, error)
        throw error
      }

      logger.info('Vivencia updated successfully', {
        feature: 'diario-infantil',
        action: 'update_vivencia',
        metadata: {
          vivencia_id: id,
          updated_fields: Object.keys(data)
        }
      })

      return updated as Vivencia
    } catch (error) {
      logger.error('Error in update for vivencias:', error)
      throw error
    }
  }

  /**
   * Delete a vivencia
   * @param id - Vivencia ID
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vivencias')
        .delete()
        .eq('id', id)

      if (error) {
        logger.error(`Error deleting vivencia ${id}:`, error)
        throw error
      }

      logger.info('Vivencia deleted successfully', {
        feature: 'diario-infantil',
        action: 'delete_vivencia',
        metadata: { vivencia_id: id }
      })
    } catch (error) {
      logger.error('Error in delete for vivencias:', error)
      throw error
    }
  }
}

// Export singleton instance
export const vivenciasApi = new VivenciasApiService()
