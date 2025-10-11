/**
 * Server Action: Get Schools for Onboarding Wizard
 *
 * Fetches active schools using service role to bypass RLS
 * This is needed because users accessing the onboarding wizard
 * might not have proper authentication session yet
 */

'use server'

import { createClient } from '@/lib/supabase/server'

export interface Escola {
  id: string
  nome: string
  codigo: string
  tipo: 'creche' | 'pre_escola' | 'fundamental'
}

export interface GetSchoolsResult {
  success: boolean
  data?: Escola[]
  error?: string
}

export async function getSchools(): Promise<GetSchoolsResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('escolas')
      .select('id, nome, codigo, tipo')
      .eq('ativo', true)
      .order('tipo', { ascending: true })
      .order('nome', { ascending: true })

    if (error) {
      console.error('Error fetching schools:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data: data as Escola[],
    }
  } catch (err) {
    console.error('Unexpected error fetching schools:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }
  }
}
