'use client'

import { BaseApiService } from './base'

export interface Config {
  id: string
  chave: string
  valor: string
  descricao: string
  categoria: 'geral' | 'academico' | 'notificacoes' | 'seguranca'
}

export class ConfigsApiService extends BaseApiService {
  constructor() {
    super('configs') // This would be a future configs table
  }

  // Get all system configurations
  async getAll(): Promise<Config[]> {
    // For now, return predefined system configurations
    // In a real implementation, these would be stored in a configs table
    return [
      {
        id: '1',
        chave: 'sistema_nome',
        valor: 'Sistema de Gestão Escolar - Fronteira/MG',
        descricao: 'Nome do sistema exibido no cabeçalho',
        categoria: 'geral'
      },
      {
        id: '2',
        chave: 'ano_letivo_atual',
        valor: '2024',
        descricao: 'Ano letivo atualmente ativo',
        categoria: 'academico'
      },
      {
        id: '3',
        chave: 'frequencia_minima',
        valor: '75',
        descricao: 'Percentual mínimo de frequência exigido (%)',
        categoria: 'academico'
      },
      {
        id: '4',
        chave: 'nota_minima_aprovacao',
        valor: '6.0',
        descricao: 'Nota mínima para aprovação',
        categoria: 'academico'
      },
      {
        id: '5',
        chave: 'notificacoes_email',
        valor: 'true',
        descricao: 'Enviar notificações por email',
        categoria: 'notificacoes'
      },
      {
        id: '6',
        chave: 'backup_automatico',
        valor: 'true',
        descricao: 'Realizar backup automático diário',
        categoria: 'seguranca'
      },
      {
        id: '7',
        chave: 'sessao_timeout',
        valor: '30',
        descricao: 'Tempo limite da sessão (minutos)',
        categoria: 'seguranca'
      },
      {
        id: '8',
        chave: 'max_alunos_turma',
        valor: '30',
        descricao: 'Número máximo de alunos por turma',
        categoria: 'academico'
      }
    ]
  }

  // Update a configuration value
  async update(id: string, data: Partial<Config>): Promise<Config> {
    // In a real implementation, this would update the database
    // For now, we'll simulate the update
    const configs = await this.getAll()
    const config = configs.find(c => c.id === id)

    if (!config) {
      throw new Error('Configuração não encontrada')
    }

    const updatedConfig = { ...config, ...data }
    // console.log('Configuração atualizada:', updatedConfig)

    return updatedConfig
  }

  // Get configuration by key
  async getByKey(chave: string): Promise<Config | null> {
    const configs = await this.getAll()
    return configs.find(c => c.chave === chave) || null
  }

  // Reset to default values
  async resetToDefaults(): Promise<Config[]> {
    // console.log('Configurações resetadas para os valores padrão')
    return this.getAll()
  }

  // Validate configuration value
  validateConfigValue(chave: string, valor: string): boolean {
    switch (chave) {
      case 'ano_letivo_atual':
        const ano = parseInt(valor)
        return ano >= 2020 && ano <= 2030

      case 'frequencia_minima':
        const freq = parseInt(valor)
        return freq >= 50 && freq <= 100

      case 'nota_minima_aprovacao':
        const nota = parseFloat(valor)
        return nota >= 0 && nota <= 10

      case 'sessao_timeout':
        const timeout = parseInt(valor)
        return timeout >= 5 && timeout <= 120

      case 'max_alunos_turma':
        const max = parseInt(valor)
        return max >= 10 && max <= 50

      case 'notificacoes_email':
      case 'backup_automatico':
        return valor === 'true' || valor === 'false'

      default:
        return true
    }
  }
}

export const configsApi = new ConfigsApiService()