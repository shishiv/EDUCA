/**
 * Vivencias API Service
 *
 * STUBBED: The vivencias table does not exist in the production database yet.
 * All methods return stub responses indicating the feature is not available.
 *
 * TODO: Create vivencias migration when ready to enable this feature
 * @see types/diario-infantil.ts for planned Vivencia types
 */

import { logger } from '@/lib/logger'
import type { CampoType } from '@/types/diario-infantil'

// ============================================================================
// INPUT TYPES (preserved for future implementation)
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
// STUB ERROR
// ============================================================================

const FEATURE_NOT_AVAILABLE = new Error('Vivencias feature not available: table does not exist in database')

// ============================================================================
// VIVENCIAS API SERVICE (STUBBED)
// ============================================================================

/**
 * Stubbed VivenciasApiService
 *
 * All methods log a warning and return appropriate stub responses.
 * This allows the code to compile without the database table existing.
 */
export class VivenciasApiService {
  private readonly feature = 'vivencias'

  private logStubWarning(method: string) {
    logger.warn(`VivenciasApiService.${method} called but vivencias table does not exist`, {
      feature: this.feature,
      action: 'stub_method_called',
      metadata: { method }
    })
  }

  /**
   * Get vivencias for a specific student
   * STUBBED - Returns empty array
   */
  async getByAluno(_alunoId: string, _limit: number = 50): Promise<never[]> {
    this.logStubWarning('getByAluno')
    return []
  }

  /**
   * Get vivencias for a specific class within a date range
   * STUBBED - Returns empty array
   */
  async getByTurma(
    _turmaId: string,
    _startDate?: string,
    _endDate?: string
  ): Promise<never[]> {
    this.logStubWarning('getByTurma')
    return []
  }

  /**
   * Get a single vivencia by ID
   * STUBBED - Returns null
   */
  async getById(_id: string): Promise<null> {
    this.logStubWarning('getById')
    return null
  }

  /**
   * Create a new vivencia
   * STUBBED - Throws error
   */
  async create(_data: CreateVivenciaInput): Promise<never> {
    this.logStubWarning('create')
    throw FEATURE_NOT_AVAILABLE
  }

  /**
   * Update an existing vivencia
   * STUBBED - Throws error
   */
  async update(_id: string, _data: UpdateVivenciaInput): Promise<never> {
    this.logStubWarning('update')
    throw FEATURE_NOT_AVAILABLE
  }

  /**
   * Delete a vivencia
   * STUBBED - Throws error
   */
  async delete(_id: string): Promise<never> {
    this.logStubWarning('delete')
    throw FEATURE_NOT_AVAILABLE
  }
}

// Export singleton instance
export const vivenciasApi = new VivenciasApiService()
