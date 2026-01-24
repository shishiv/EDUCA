'use client'

import { BaseApiService } from './base'
import { supabase } from '@/lib/supabase'
import { usersApi } from './users'
import { schoolsApi } from './schools'
import { logger } from '@/lib/logger'

export interface Report {
  id: string
  titulo: string
  tipo: 'alunos' | 'frequencia' | 'notas' | 'censo' | 'usuarios' | 'escolas'
  descricao: string
  data_geracao: string
  status: 'processando' | 'concluido' | 'erro'
  arquivo_url?: string
  dados?: any
}

/**
 * Turma (class) data for reports filtering
 */
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

/**
 * School data for reports filtering
 */
export interface ReportSchool {
  id: string
  nome: string
}

export class ReportsApiService extends BaseApiService {
  constructor() {
    super('reports') // This would be a future reports table
  }

  // Generate reports based on existing data
  async generateReport(tipo: Report['tipo'], parametros?: Record<string, any>): Promise<Report> {
    const reportId = crypto.randomUUID()
    const now = new Date().toISOString()

    try {
      let dados: any = {}
      let titulo = ''
      let descricao = ''

      switch (tipo) {
        case 'usuarios':
          const userStats = await usersApi.getUserStats()
          dados = userStats
          titulo = 'Relatório de Usuários'
          descricao = 'Estatísticas gerais dos usuários do sistema'
          break

        case 'escolas':
          const schoolsList = await schoolsApi.getAll() as { ativo: boolean; tipo: string }[]
          dados = {
            total: schoolsList.length,
            ativas: schoolsList.filter((s) => s.ativo).length,
            tipos: schoolsList.reduce((acc: Record<string, number>, school) => {
              acc[school.tipo] = (acc[school.tipo] || 0) + 1
              return acc
            }, {})
          }
          titulo = 'Relatório de Escolas'
          descricao = 'Estatísticas das unidades escolares'
          break

        case 'alunos':
          // Get student count from alunos table
          const { count: totalAlunos } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true })

          const { count: alunosAtivos } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .eq('ativo', true)

          dados = {
            total: totalAlunos || 0,
            ativos: alunosAtivos || 0,
            inativos: (totalAlunos || 0) - (alunosAtivos || 0)
          }
          titulo = 'Relatório de Alunos'
          descricao = 'Estatísticas dos alunos matriculados'
          break

        case 'frequencia':
          // Get attendance statistics
          const { count: totalFrequencia } = await supabase
            .from('frequencia')
            .select('*', { count: 'exact', head: true })

          const { count: presentes } = await supabase
            .from('frequencia')
            .select('*', { count: 'exact', head: true })
            .eq('presente', true)

          dados = {
            total: totalFrequencia || 0,
            presentes: presentes || 0,
            ausentes: (totalFrequencia || 0) - (presentes || 0),
            percentualPresenca: totalFrequencia ? ((presentes || 0) / totalFrequencia * 100).toFixed(2) : '0'
          }
          titulo = 'Relatório de Frequência'
          descricao = 'Estatísticas de presença dos alunos'
          break

        default:
          throw new Error(`Tipo de relatório não suportado: ${tipo}`)
      }

      const report: Report = {
        id: reportId,
        titulo,
        tipo,
        descricao,
        data_geracao: now,
        status: 'concluido',
        dados
      }

      return report
    } catch (error) {
      return {
        id: reportId,
        titulo: 'Erro na Geração',
        tipo,
        descricao: 'Erro ao processar o relatório',
        data_geracao: now,
        status: 'erro'
      }
    }
  }

  // Get all reports (would be stored in database in real implementation)
  // @ts-expect-error - Override return type from BaseApiService since reports table doesn't exist yet
  async getAll(): Promise<Report[]> {
    // For now, return some sample reports
    // In a real implementation, these would be stored in a reports table
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    return [
      {
        id: '1',
        titulo: 'Relatório Mensal de Usuários',
        tipo: 'usuarios',
        descricao: 'Relatório com estatísticas dos usuários do sistema',
        data_geracao: yesterday.toISOString(),
        status: 'concluido'
      },
      {
        id: '2',
        titulo: 'Relatório de Escolas Ativas',
        tipo: 'escolas',
        descricao: 'Lista de todas as unidades escolares ativas',
        data_geracao: now.toISOString(),
        status: 'concluido'
      }
    ]
  }

  // Download report data as JSON (in real implementation would generate PDF/Excel)
  async downloadReport(reportId: string): Promise<Blob> {
    // This is a placeholder - in real implementation would generate proper reports
    const mockData = { message: 'Relatório gerado com sucesso', reportId, timestamp: new Date().toISOString() }
    return new Blob([JSON.stringify(mockData, null, 2)], { type: 'application/json' })
  }

  // ============================================================================
  // Report Filtering Data Methods
  // ============================================================================

  /**
   * Get turmas (classes) for report filters
   * Used by frequencia and conteudo report pages
   */
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

      if (error) {
        logger.error('Error fetching turmas for filters', error, {
          feature: 'reports',
          action: 'get_turmas_for_filters'
        })
        throw error
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        nome: t.nome,
        serie: t.serie,
        ano_letivo: t.ano_letivo,
        escola_id: t.escola_id,
        escola: t.escolas ? { nome: t.escolas.nome } : undefined,
      }))
    } catch (error) {
      logger.error('Error in getTurmasForFilters', error as Error, {
        feature: 'reports',
        action: 'get_turmas_for_filters'
      })
      throw error
    }
  }

  /**
   * Get schools for report filters
   * Used by bolsa-familia report page
   */
  async getSchoolsForFilters(): Promise<ReportSchool[]> {
    try {
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome')
        .order('nome')

      if (error) {
        logger.error('Error fetching schools for filters', error, {
          feature: 'reports',
          action: 'get_schools_for_filters'
        })
        throw error
      }

      return (data || []) as ReportSchool[]
    } catch (error) {
      logger.error('Error in getSchoolsForFilters', error as Error, {
        feature: 'reports',
        action: 'get_schools_for_filters'
      })
      throw error
    }
  }

  /**
   * Get turmas by school for cascading filters
   * Used by bolsa-familia report page
   */
  async getTurmasBySchool(escolaId: string): Promise<ReportTurma[]> {
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome, serie, ano_letivo, escola_id')
        .eq('escola_id', escolaId)
        .order('serie')
        .order('nome')

      if (error) {
        logger.error('Error fetching turmas by school', error, {
          feature: 'reports',
          action: 'get_turmas_by_school',
          metadata: { escolaId }
        })
        throw error
      }

      return (data || []) as ReportTurma[]
    } catch (error) {
      logger.error('Error in getTurmasBySchool', error as Error, {
        feature: 'reports',
        action: 'get_turmas_by_school',
        metadata: { escolaId }
      })
      throw error
    }
  }
}

export const reportsApi = new ReportsApiService()