/**
 * Filter data for the concrete report routes.
 *
 * Report generation and downloads belong to their respective report routes.
 * This module only exposes the school and class filters shared by those
 * routes, so it cannot manufacture report history or placeholder files.
 */
'use client'

import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

export interface ReportTurma {
  id: string
  nome: string
  serie: string
  ano_letivo: number
  escola_id: string
  escola?: {
    nome: string
  }
}

export interface ReportSchool {
  id: string
  nome: string
}

function logReportFilterError(action: string, error: Error | string, metadata?: { escolaId: string }) {
  logger.error(
    `Error in ${action}`,
    error instanceof Error ? error : new Error(error),
    { feature: 'reports', action, metadata },
  )
}

function toReportTurma(turma: {
  id: string
  nome: string
  serie: string
  ano_letivo: number
  escola_id: string
  escolas: { nome: string } | { nome: string }[] | null
}): ReportTurma {
  const escola = Array.isArray(turma.escolas) ? turma.escolas[0] : turma.escolas

  return {
    id: turma.id,
    nome: turma.nome,
    serie: turma.serie,
    ano_letivo: turma.ano_letivo,
    escola_id: turma.escola_id,
    escola: escola ? { nome: escola.nome } : undefined,
  }
}

export class ReportsApiService {
  async getTurmasForFilters(): Promise<ReportTurma[]> {
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          serie,
          ano_letivo,
          escola_id,
          escolas (
            nome
          )
        `)
        .order('ano_letivo', { ascending: false })
        .order('serie', { ascending: true })
        .order('nome', { ascending: true })

      if (error) throw error

      return (data ?? []).map(toReportTurma)
    } catch (error) {
      logReportFilterError(
        'get_turmas_for_filters',
        error instanceof Error ? error : String(error),
      )
      throw error
    }
  }

  async getSchoolsForFilters(): Promise<ReportSchool[]> {
    try {
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome')
        .order('nome')

      if (error) throw error

      return data ?? []
    } catch (error) {
      logReportFilterError(
        'get_schools_for_filters',
        error instanceof Error ? error : String(error),
      )
      throw error
    }
  }

  async getTurmasBySchool(escolaId: string): Promise<ReportTurma[]> {
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome, serie, ano_letivo, escola_id')
        .eq('escola_id', escolaId)
        .order('serie')
        .order('nome')

      if (error) throw error

      return (data ?? []).map((turma) => ({
        id: turma.id,
        nome: turma.nome,
        serie: turma.serie,
        ano_letivo: turma.ano_letivo,
        escola_id: turma.escola_id,
      }))
    } catch (error) {
      logReportFilterError(
        'get_turmas_by_school',
        error instanceof Error ? error : String(error),
        { escolaId },
      )
      throw error
    }
  }
}

export const reportsApi = new ReportsApiService()
