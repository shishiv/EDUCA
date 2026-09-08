/**
 * System Configs API - read/write per-escola and global configuration keys.
 * Demo sandbox applies in-memory overrides without persisting.
 */
'use client'

import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import type { Tables } from '@/types/database'

export type Config = Tables<'configs'>

const configSchema = z.object({
  id: z.string(),
  chave: z.string(),
  valor: z.string(),
  descricao: z.string(),
  categoria: z.string(),
  tipo_valor: z.string().nullable(),
  valor_padrao: z.string().nullable(),
  ativo: z.boolean().nullable(),
  escola_id: z.string().nullable(),
  criado_por: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
})
const demoConfigResponseSchema = z.object({
  error: z.string().optional(),
  config: configSchema.optional(),
})

const demoConfigOverrides = new Map<string, string>()
const configValidatorKeySchema = z.enum([
  'ano_letivo_atual',
  'frequencia_minima',
  'nota_minima_aprovacao',
  'sessao_timeout',
  'max_alunos_turma',
  'notificacoes_email',
  'backup_automatico',
  'bolsa_familia_visible_roles',
  'sistema_nome',
])
const configValidators = {
  ano_letivo_atual: (valor: string) => inRange(Number.parseInt(valor), 2020, 2030),
  frequencia_minima: (valor: string) => inRange(Number.parseInt(valor), 50, 100),
  nota_minima_aprovacao: (valor: string) => inRange(Number.parseFloat(valor), 0, 10),
  sessao_timeout: (valor: string) => inRange(Number.parseInt(valor), 5, 120),
  max_alunos_turma: (valor: string) => inRange(Number.parseInt(valor), 10, 50),
  notificacoes_email: isBooleanValue,
  backup_automatico: isBooleanValue,
  bolsa_familia_visible_roles: (valor: string) => /^(none|admin(,diretor)?(,secretario)?|diretor(,secretario)?|secretario)$/.test(valor),
  sistema_nome: (valor: string) => valor.length >= 5 && valor.length <= 100,
} satisfies Record<string, (valor: string) => boolean>

interface DemoConfigRequest {
  operation: 'demo.config.update' | 'demo.config.reset'
  configId: string
  value?: string
}

function inRange(value: number, minimum: number, maximum: number) {
  return !Number.isNaN(value) && value >= minimum && value <= maximum
}

function isBooleanValue(valor: string) {
  return valor === 'true' || valor === 'false'
}

function withDemoOverride(config: Config): Config {
  const override = demoConfigOverrides.get(config.id)
  return override === undefined ? config : { ...config, valor: override }
}

async function requestDemoConfig(input: DemoConfigRequest): Promise<Config> {
  const response = await fetch('/api/configs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  const result = demoConfigResponseSchema.parse(await response.json())
  if (!response.ok || !result.config) {
    throw new Error(result.error ?? 'DEMO_CONFIG_FAILED')
  }
  return result.config
}

export class ConfigsApiService {
  async getAll(): Promise<Config[]> {
    try {
      const { data, error } = await supabase
        .from('configs')
        .select('*')
        .eq('ativo', true)
        .order('categoria', { ascending: true })
        .order('chave', { ascending: true })

      if (error) throw error
      return (data ?? []).map(withDemoOverride)
    } catch (error) {
      logger.error('Erro na API getAll', error instanceof Error ? error.message : String(error))
      throw new Error('Erro ao carregar configurações do sistema')
    }
  }

  async update(id: string, data: Partial<Config>): Promise<Config> {
    try {
      return isDemoSandboxEnabled()
        ? await this.updateDemo(id, data)
        : await this.updateStored(id, data)
    } catch (error) {
      logger.error('Erro na API update', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  private async updateDemo(id: string, data: Partial<Config>): Promise<Config> {
    const existing = (await this.getAll()).find(config => config.id === id)
    if (!existing) throw new Error('Configuração não encontrada')
    const value = data.valor ?? existing.valor
    this.requireValidValue(existing.chave, value)
    const config = await requestDemoConfig({
      operation: 'demo.config.update',
      configId: id,
      value,
    })
    demoConfigOverrides.set(id, value)
    return config
  }

  private async updateStored(id: string, data: Partial<Config>): Promise<Config> {
    if (data.valor !== undefined && data.chave !== undefined) {
      this.requireValidValue(data.chave, data.valor)
    }
    const { data: updatedData, error } = await supabase
      .from('configs')
      .update({ valor: data.valor, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    if (!updatedData) throw new Error('Configuração não encontrada')
    return updatedData
  }

  async getByKey(chave: string): Promise<Config | null> {
    try {
      const { data, error } = await supabase
        .from('configs')
        .select('*')
        .eq('chave', chave)
        .eq('ativo', true)
        .single()

      if (error?.code === 'PGRST116') return null
      if (error) throw error
      return data ? withDemoOverride(data) : null
    } catch (error) {
      logger.error('Erro na API getByKey', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  async resetToDefault(id: string): Promise<Config> {
    try {
      return isDemoSandboxEnabled()
        ? await this.resetDemo(id)
        : await this.resetStored(id)
    } catch (error) {
      logger.error('Erro na API resetToDefault', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  private async resetDemo(id: string): Promise<Config> {
    const existing = (await this.getAll()).find(config => config.id === id)
    if (!existing) throw new Error('Configuração não encontrada')
    const value = existing.valor_padrao || existing.valor
    const config = await requestDemoConfig({ operation: 'demo.config.reset', configId: id })
    demoConfigOverrides.set(id, value)
    return config
  }

  private async resetStored(id: string): Promise<Config> {
    const { data: configData, error: fetchError } = await supabase
      .from('configs')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchError || !configData) throw new Error('Configuração não encontrada')

    const { data: updatedData, error } = await supabase
      .from('configs')
      .update({
        valor: configData.valor_padrao || configData.valor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return updatedData
  }

  async resetAllToDefaults(): Promise<Config[]> {
    try {
      return await Promise.all((await this.getAll()).map(config => this.resetToDefault(config.id)))
    } catch (error) {
      logger.error('Erro na API resetAllToDefaults', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  validateConfigValue(chave: string, valor: string): boolean {
    const knownKey = configValidatorKeySchema.safeParse(chave)
    return knownKey.success ? configValidators[knownKey.data](valor) : true
  }

  private requireValidValue(chave: string, valor: string): void {
    if (!this.validateConfigValue(chave, valor)) {
      throw new Error(`Valor inválido para configuração '${chave}'`)
    }
  }

  getValidationMessage(chave: string): string {
    switch (chave) {
      case 'ano_letivo_atual': return 'O ano letivo deve estar entre 2020 e 2030'
      case 'frequencia_minima': return 'A frequência mínima deve estar entre 50% e 100%'
      case 'nota_minima_aprovacao': return 'A nota mínima deve estar entre 0.0 e 10.0'
      case 'sessao_timeout': return 'O timeout da sessão deve estar entre 5 e 120 minutos'
      case 'max_alunos_turma': return 'O máximo de alunos deve estar entre 10 e 50'
      case 'sistema_nome': return 'O nome do sistema deve ter entre 5 e 100 caracteres'
      case 'bolsa_familia_visible_roles': return 'Use none ou uma lista ordenada de admin, diretor e secretario'
      default: return 'Valor inválido'
    }
  }
}

export const configsApi = new ConfigsApiService()

/** Clears client-only configuration overlays between isolated tests. */
export function resetDemoConfigOverrides(): void {
  demoConfigOverrides.clear()
}
