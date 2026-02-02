/**
 * Feature Flags Type Definitions
 * Per-escola feature flag system for gradual module rollout
 *
 * @see supabase/migrations/20260119_create_feature_flags.sql
 */

/**
 * Flag definition from feature_flags table
 * Represents a toggleable feature/module in the system
 */
export interface FeatureFlag {
  id: string
  flag_name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Per-escola flag enablement from escola_feature_flags table
 * Tracks which flags are enabled for each school with audit metadata
 */
export interface EscolaFeatureFlag {
  id: string
  escola_id: string
  flag_id: string
  enabled: boolean
  updated_at: string
  updated_by: string | null
}

/**
 * Joined query result for admin UI
 * Combines flag definition with all escola statuses
 */
export interface FlagWithEscolaStatus extends FeatureFlag {
  escola_flags: Array<{
    escola_id: string
    escola_nome: string
    enabled: boolean
    updated_at: string
  }>
}

/**
 * Known flag names for type safety
 * Add new flags here as they are created via migrations
 */
export type KnownFlagName = 'nutricao' | 'estoque_escolar'

/**
 * Input type for toggling flags across multiple schools
 * Used by bulk toggle operations in admin UI
 */
export interface ToggleFlagInput {
  flag_id: string
  escola_ids: string[]
  enabled: boolean
}
