'use client'

import { supabase } from '@/lib/supabase'

export interface Config {
  id: string
  chave: string
  valor: string
  descricao: string
  categoria: 'geral' | 'academico' | 'notificacoes' | 'seguranca'
  tipo_valor: 'string' | 'number' | 'boolean' | 'email'
  valor_padrao?: string
  ativo?: boolean
}

export class ConfigsApiService {
  // Get all system configurations
  async getAll(): Promise<Config[]> {
    try {
      const { data, error } = await supabase
        .from('configs')
        .select('*')
        .eq('ativo', true)
        .order('categoria', { ascending: true })
        .order('chave', { ascending: true })

      if (error) {
        console.error('Erro ao buscar configurações:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Erro na API getAll:', error)
      throw new Error('Erro ao carregar configurações do sistema')
    }
  }

  // Update a configuration value
  async update(id: string, data: Partial<Config>): Promise<Config> {
    try {
      // Validate the new value if provided
      if (data.valor && data.chave) {
        if (!this.validateConfigValue(data.chave, data.valor)) {
          throw new Error(`Valor inválido para configuração '${data.chave}'`)
        }
      }

      const { data: updatedData, error } = await supabase
        .from('configs')
        .update({
          valor: data.valor,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('Erro ao atualizar configuração:', error)
        throw error
      }

      if (!updatedData) {
        throw new Error('Configuração não encontrada')
      }

      return updatedData
    } catch (error) {
      console.error('Erro na API update:', error)
      throw error
    }
  }

  // Get configuration by key
  async getByKey(chave: string): Promise<Config | null> {
    try {
      const { data, error } = await supabase
        .from('configs')
        .select('*')
        .eq('chave', chave)
        .eq('ativo', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        console.error('Erro ao buscar configuração por chave:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Erro na API getByKey:', error)
      return null
    }
  }

  // Reset configuration to default value
  async resetToDefault(id: string): Promise<Config> {
    try {
      // First get the config to get its default value
      const { data: configData, error: fetchError } = await supabase
        .from('configs')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !configData) {
        throw new Error('Configuração não encontrada')
      }

      // Update with default value
      const { data: updatedData, error } = await supabase
        .from('configs')
        .update({
          valor: configData.valor_padrao || configData.valor,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('Erro ao resetar configuração:', error)
        throw error
      }

      return updatedData
    } catch (error) {
      console.error('Erro na API resetToDefault:', error)
      throw error
    }
  }

  // Reset all configurations to default values
  async resetAllToDefaults(): Promise<Config[]> {
    try {
      // Get all configs first
      const configs = await this.getAll()

      // Update each config to its default value
      const updatePromises = configs.map(config =>
        this.resetToDefault(config.id)
      )

      const updatedConfigs = await Promise.all(updatePromises)
      return updatedConfigs
    } catch (error) {
      console.error('Erro na API resetAllToDefaults:', error)
      throw error
    }
  }

  // Validate configuration value
  validateConfigValue(chave: string, valor: string): boolean {
    switch (chave) {
      case 'ano_letivo_atual':
        const ano = parseInt(valor)
        return !isNaN(ano) && ano >= 2020 && ano <= 2030

      case 'frequencia_minima':
        const freq = parseInt(valor)
        return !isNaN(freq) && freq >= 50 && freq <= 100

      case 'nota_minima_aprovacao':
        const nota = parseFloat(valor)
        return !isNaN(nota) && nota >= 0 && nota <= 10

      case 'sessao_timeout':
        const timeout = parseInt(valor)
        return !isNaN(timeout) && timeout >= 5 && timeout <= 120

      case 'max_alunos_turma':
        const max = parseInt(valor)
        return !isNaN(max) && max >= 10 && max <= 50

      case 'notificacoes_email':
      case 'backup_automatico':
        return valor === 'true' || valor === 'false'

      case 'sistema_nome':
        return valor.length >= 5 && valor.length <= 100

      default:
        return true // Allow any value for unknown configs
    }
  }

  // Get validation message for invalid values
  getValidationMessage(chave: string): string {
    switch (chave) {
      case 'ano_letivo_atual':
        return 'O ano letivo deve estar entre 2020 e 2030'
      case 'frequencia_minima':
        return 'A frequência mínima deve estar entre 50% e 100%'
      case 'nota_minima_aprovacao':
        return 'A nota mínima deve estar entre 0.0 e 10.0'
      case 'sessao_timeout':
        return 'O timeout da sessão deve estar entre 5 e 120 minutos'
      case 'max_alunos_turma':
        return 'O máximo de alunos deve estar entre 10 e 50'
      case 'sistema_nome':
        return 'O nome do sistema deve ter entre 5 e 100 caracteres'
      default:
        return 'Valor inválido'
    }
  }
}

export const configsApi = new ConfigsApiService()