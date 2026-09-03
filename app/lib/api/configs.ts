/**
 * System Configs API - read/write per-escola and global configuration keys.  Demo sandbox applies in-memory overrides without persisting.
 */
'use client'

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'

export interface Config {
  id: string
  chave: string
  valor: string
  descricao: string
  categoria: string
  tipo_valor: string | null
  valor_padrao: string | null
  ativo: boolean | null
  escola_id?: string | null
  criado_por?: string | null
  created_at?: string | null
  updated_at?: string | null
}

const demoConfigOverrides = new Map<string, string>()

const configValidators: Record<string, (valor: string) => boolean> = {
  ano_letivo_atual: valor => inRange(parseInt(valor), 2020, 2030),
  frequencia_minima: valor => inRange(parseInt(valor), 50, 100),
  nota_minima_aprovacao: valor => inRange(parseFloat(valor), 0, 10),
  sessao_timeout: valor => inRange(parseInt(valor), 5, 120),
  max_alunos_turma: valor => inRange(parseInt(valor), 10, 50),
  notificacoes_email: isBooleanValue,
  backup_automatico: isBooleanValue,
  bolsa_familia_visible_roles: valor => /^(none|admin(,diretor)?(,secretario)?|diretor(,secretario)?|secretario)$/.test(valor),
  sistema_nome: valor => valor.length >= 5 && valor.length <= 100,
}

function inRange(value: number, minimum: number, maximum: number) {
  return !isNaN(value) && value >= minimum && value <= maximum
}

function isBooleanValue(valor: string) {
  return valor === 'true' || valor === 'false'
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
        logger.error('Erro ao buscar configurações', error)
        throw error
      }

      return (data || []).map(config => ({
        ...config,
        ...(demoConfigOverrides.has(config.id)
          ? { valor: demoConfigOverrides.get(config.id)! }
          : {}),
      }))
    } catch (error) {
      logger.error('Erro na API getAll', error as Error)
      throw new Error('Erro ao carregar configurações do sistema')
    }
  }

  // Update a configuration value
  async update(id: string, data: Partial<Config>): Promise<Config> {
    try {
      if (isDemoSandboxEnabled()) {
        const existing = (await this.getAll()).find(config => config.id === id)
        if (!existing) throw new Error('Configuração não encontrada')
        const value = data.valor ?? existing.valor
        if (!this.validateConfigValue(existing.chave, value)) {
          throw new Error(`Valor inválido para configuração '${existing.chave}'`)
        }

        const response = await fetch('/api/configs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ operation: 'demo.config.update', configId: id, value }),
        })
        const result = await response.json().catch(() => ({})) as { error?: string; config?: Config }
        if (!response.ok || !result.config) throw new Error(result.error ?? 'DEMO_CONFIG_FAILED')
        demoConfigOverrides.set(id, value)
        return result.config
      }

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
        logger.error('Erro ao atualizar configuração', error)
        throw error
      }

      if (!updatedData) {
        throw new Error('Configuração não encontrada')
      }

      return updatedData
    } catch (error) {
      logger.error('Erro na API update', error as Error)
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
        logger.error('Erro ao buscar configuração por chave', error)
        throw error
      }

      return data ? {
        ...data,
        ...(demoConfigOverrides.has(data.id)
          ? { valor: demoConfigOverrides.get(data.id)! }
          : {}),
      } : data
    } catch (error) {
      logger.error('Erro na API getByKey', error as Error)
      return null
    }
  }

  // Reset configuration to default value
  async resetToDefault(id: string): Promise<Config> {
    try {
      if (isDemoSandboxEnabled()) {
        const existing = (await this.getAll()).find(config => config.id === id)
        if (!existing) throw new Error('Configuração não encontrada')
        const value = existing.valor_padrao || existing.valor
        const response = await fetch('/api/configs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ operation: 'demo.config.reset', configId: id }),
        })
        const result = await response.json().catch(() => ({})) as { error?: string; config?: Config }
        if (!response.ok || !result.config) throw new Error(result.error ?? 'DEMO_CONFIG_FAILED')
        demoConfigOverrides.set(id, value)
        return result.config
      }

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
        logger.error('Erro ao resetar configuração', error)
        throw error
      }

      return updatedData
    } catch (error) {
      logger.error('Erro na API resetToDefault', error as Error)
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
      logger.error('Erro na API resetAllToDefaults', error as Error)
      throw error
    }
  }

  // Validate configuration value
  validateConfigValue(chave: string, valor: string): boolean {
    return configValidators[chave]?.(valor) ?? true
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
      case 'bolsa_familia_visible_roles':
        return 'Use none ou uma lista ordenada de admin, diretor e secretario'
      default:
        return 'Valor inválido'
    }
  }
}

export const configsApi = new ConfigsApiService()

/** Clears client-only configuration overlays between isolated tests. */
export function resetDemoConfigOverrides(): void {
  demoConfigOverrides.clear()
}
