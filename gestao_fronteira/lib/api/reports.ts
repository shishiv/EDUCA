'use client'

import { BaseApiService } from './base'
import { supabase } from '@/lib/supabase'
import { usersApi } from './users'
import { schoolsApi } from './schools'

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
          const schools = await schoolsApi.getAll()
          dados = {
            total: schools.length,
            ativas: schools.filter(s => s.ativo).length,
            tipos: schools.reduce((acc: Record<string, number>, school) => {
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
      // console.error('Erro ao gerar relatório:', error)
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
}

export const reportsApi = new ReportsApiService()