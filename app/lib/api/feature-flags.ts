/**
 * Feature Flags API Service
 * CRUD operations for per-escola feature flags
 *
 * Provides:
 * - Flag status lookup for current escola
 * - List all active flags
 * - Admin matrix view (flags with escola status)
 * - Bulk toggle for multiple escolas
 *
 * @see types/feature-flags.ts for types
 * @see lib/api/vivencias.ts for pattern reference
 */

import { BaseApiService } from './base'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type {
  FeatureFlag,
  EscolaFeatureFlag,
  FlagWithEscolaStatus,
} from '@/types/feature-flags'

// ============================================================================
// FEATURE FLAGS API SERVICE
// ============================================================================

export class FeatureFlagsApiService extends BaseApiService {
  constructor() {
    super('feature_flags')
  }

  /**
   * Get flag status for a specific escola
   * Returns false if flag doesn't exist or is not enabled (safe default)
   *
   * @param flagName - The flag name to check (e.g., 'nutricao', 'estoque_escolar')
   * @param escolaId - The escola ID to check
   * @returns boolean - Whether the flag is enabled for this escola
   */
  async getFlagForEscola(flagName: string, escolaId: string): Promise<boolean> {
    try {
      // Query the join table to check enablement
      const { data, error } = await supabase
        .from('escola_feature_flags')
        .select(
          `
          enabled,
          feature_flags!inner (
            flag_name,
            is_active
          )
        `
        )
        .eq('escola_id', escolaId)
        .eq('feature_flags.flag_name', flagName)
        .eq('feature_flags.is_active', true)
        .maybeSingle()

      if (error) {
        logger.error('Error fetching flag for escola', error.message, {
          feature: 'feature-flags',
          action: 'get_flag',
          metadata: { flagName, escolaId },
        })
        return false // Safe default on error
      }

      // If no record found, flag is not enabled
      if (!data) {
        return false
      }

      return data.enabled === true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('Error in getFlagForEscola', errorMsg, {
        feature: 'feature-flags',
        action: 'get_flag',
        metadata: { flagName, escolaId },
      })
      return false // Safe default on error
    }
  }

  /**
   * Get all active flags
   * Used by admin UI to list available flags
   *
   * @returns Array of active feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('is_active', true)
        .order('flag_name')

      if (error) {
        logger.error('Error fetching all flags', error.message, {
          feature: 'feature-flags',
          action: 'get_all_flags',
        })
        throw error
      }

      logger.info('Fetched all active flags', {
        feature: 'feature-flags',
        action: 'get_all_flags',
        metadata: { count: data?.length || 0 },
      })

      return (data || []) as FeatureFlag[]
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('Error in getAllFlags', errorMsg, {
        feature: 'feature-flags',
        action: 'get_all_flags',
      })
      throw error
    }
  }

  /**
   * Get all flags with escola enablement status
   * Used by admin UI for matrix view
   *
   * @returns Array of flags with their escola statuses
   */
  async getFlagsWithEscolaStatus(): Promise<FlagWithEscolaStatus[]> {
    try {
      // First get all active flags
      const { data: flags, error: flagsError } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('is_active', true)
        .order('flag_name')

      if (flagsError) {
        logger.error('Error fetching flags for matrix', flagsError.message, {
          feature: 'feature-flags',
          action: 'get_flags_with_status',
        })
        throw flagsError
      }

      if (!flags || flags.length === 0) {
        return []
      }

      // Get all escola_feature_flags with escola info
      const flagIds = flags.map((f) => f.id)
      const { data: escolaFlags, error: escolaFlagsError } = await supabase
        .from('escola_feature_flags')
        .select(
          `
          flag_id,
          escola_id,
          enabled,
          updated_at,
          escolas (
            nome
          )
        `
        )
        .in('flag_id', flagIds)

      if (escolaFlagsError) {
        logger.error('Error fetching escola flags for matrix', escolaFlagsError.message, {
          feature: 'feature-flags',
          action: 'get_flags_with_status',
        })
        throw escolaFlagsError
      }

      // Build the result with escola statuses grouped by flag
      const result: FlagWithEscolaStatus[] = flags.map((flag) => {
        const flagEscolaRecords = (escolaFlags || []).filter(
          (ef) => ef.flag_id === flag.id
        )

        return {
          ...flag,
          escola_flags: flagEscolaRecords.map((ef) => ({
            escola_id: ef.escola_id,
            escola_nome:
              (ef.escolas as { nome: string } | null)?.nome || 'Escola',
            enabled: ef.enabled,
            updated_at: ef.updated_at,
          })),
        } as FlagWithEscolaStatus
      })

      logger.info('Fetched flags with escola status', {
        feature: 'feature-flags',
        action: 'get_flags_with_status',
        metadata: {
          flagCount: flags.length,
          escolaFlagCount: escolaFlags?.length || 0,
        },
      })

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('Error in getFlagsWithEscolaStatus', errorMsg, {
        feature: 'feature-flags',
        action: 'get_flags_with_status',
      })
      throw error
    }
  }

  /**
   * Bulk toggle flags for multiple escolas
   * Uses upsert for ON CONFLICT behavior
   *
   * @param flagId - The flag ID to toggle
   * @param escolaIds - Array of escola IDs to update
   * @param enabled - The new enabled state
   * @param userId - The user making the change (for audit trail)
   */
  async toggleFlagsForEscolas(
    flagId: string,
    escolaIds: string[],
    enabled: boolean,
    userId: string
  ): Promise<void> {
    try {
      if (escolaIds.length === 0) {
        return // Nothing to do
      }

      const now = new Date().toISOString()

      // Build upsert records
      const records = escolaIds.map((escolaId) => ({
        escola_id: escolaId,
        flag_id: flagId,
        enabled,
        updated_at: now,
        updated_by: userId,
      }))

      const { error } = await supabase
        .from('escola_feature_flags')
        .upsert(records, {
          onConflict: 'escola_id,flag_id',
        })

      if (error) {
        logger.error('Error toggling flags for escolas', error.message, {
          feature: 'feature-flags',
          action: 'toggle_flags',
          metadata: {
            flagId,
            escolaCount: escolaIds.length,
            enabled,
          },
        })
        throw error
      }

      logger.info('Toggled flags for escolas', {
        feature: 'feature-flags',
        action: 'toggle_flags',
        metadata: {
          flagId,
          escolaIds,
          enabled,
          updatedBy: userId,
        },
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('Error in toggleFlagsForEscolas', errorMsg, {
        feature: 'feature-flags',
        action: 'toggle_flags',
        metadata: { flagId, escolaIds, enabled },
      })
      throw error
    }
  }

  /**
   * Toggle a single flag for a single escola
   * Convenience method that calls toggleFlagsForEscolas
   *
   * @param flagId - The flag ID to toggle
   * @param escolaId - The escola ID to update
   * @param enabled - The new enabled state
   * @param userId - The user making the change (for audit trail)
   */
  async toggleSingleFlag(
    flagId: string,
    escolaId: string,
    enabled: boolean,
    userId: string
  ): Promise<void> {
    return this.toggleFlagsForEscolas(flagId, [escolaId], enabled, userId)
  }

  /**
   * Get a flag by name
   * Used to get flag ID from name for toggle operations
   *
   * @param flagName - The flag name to lookup
   * @returns The flag if found, null otherwise
   */
  async getFlagByName(flagName: string): Promise<FeatureFlag | null> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('flag_name', flagName)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        logger.error('Error fetching flag by name', error.message, {
          feature: 'feature-flags',
          action: 'get_flag_by_name',
          metadata: { flagName },
        })
        throw error
      }

      return data as FeatureFlag | null
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('Error in getFlagByName', errorMsg, {
        feature: 'feature-flags',
        action: 'get_flag_by_name',
        metadata: { flagName },
      })
      throw error
    }
  }
}

// Export singleton instance
export const featureFlagsApi = new FeatureFlagsApiService()
