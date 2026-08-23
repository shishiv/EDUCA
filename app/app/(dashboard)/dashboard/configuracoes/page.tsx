'use client'

import { useTranslations } from 'next-intl'

import { useEffect, useState } from 'react'
import { configsApi, Config } from '@/lib/api/configs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  Bell,
  GraduationCap,
  Building
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

export default function ConfiguracoesPage() {
  const t = useTranslations('platform')
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const data = await configsApi.getAll()
      setConfigs(data)

      // Inicializar valores
      const values: Record<string, string> = {}
      data.forEach(config => {
        values[config.chave] = config.valor
      })
      setConfigValues(values)
    } catch (error) {
      // logger.error('Erro ao carregar configurações:', error)
      toast.error(t('settings.errorLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    let hasErrors = false
    let savedCount = 0

    try {
      // Validate all changes first
      for (const config of configs) {
        const newValue = configValues[config.chave]
        if (newValue !== config.valor) {
          if (!configsApi.validateConfigValue(config.chave, newValue)) {
            toast.error(`${config.descricao}: ${configsApi.getValidationMessage(config.chave)}`)
            hasErrors = true
          }
        }
      }

      if (hasErrors) {
        return
      }

      // Save all valid changes
      for (const config of configs) {
        const newValue = configValues[config.chave]
        if (newValue !== config.valor) {
          await configsApi.update(config.id, {
            valor: newValue
          })
          savedCount++
        }
      }

      if (savedCount > 0) {
        toast.success(t('settings.savedCount', { count: savedCount }))
        // Reload configs to reflect changes
        await loadConfigs()
      } else {
        toast.info(t('settings.noChanges'))
      }
    } catch (error: any) {
      logger.error('Erro ao salvar configurações:', error)
      toast.error(error.message || t('settings.loadErrorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  const handleConfigChange = (chave: string, valor: string) => {
    setConfigValues(prev => ({ ...prev, [chave]: valor }))
  }

  const getConfigsByCategory = (categoria: string) => {
    return configs.filter(config => config.categoria === categoria)
  }

  const handleResetToDefault = async (config: Config) => {
    try {
      await configsApi.resetToDefault(config.id)
      toast.success(t('settings.resetSuccess', { description: config.descricao }))
      await loadConfigs()
    } catch (error: any) {
      logger.error('Erro ao resetar configuração:', error)
      toast.error(t('settings.resetError'))
    }
  }

  const isConfigChanged = (config: Config): boolean => {
    return configValues[config.chave] !== config.valor
  }

  const isConfigValid = (config: Config): boolean => {
    const value = configValues[config.chave]
    return configsApi.validateConfigValue(config.chave, value)
  }

  const renderConfigInput = (config: Config) => {
    const value = configValues[config.chave] || config.valor
    const isChanged = isConfigChanged(config)
    const isValid = isConfigValid(config)

    // Boolean configs (switches)
    if (config.tipo_valor === 'boolean' || config.chave.includes('email_') || config.chave.includes('backup_') || config.chave.includes('_ativo')) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              checked={value === 'true'}
              onCheckedChange={(checked) => handleConfigChange(config.chave, checked ? 'true' : 'false')}
            />
            <Label>{value === 'true' ? 'Ativado' : 'Desativado'}</Label>
          </div>
          {isChanged && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">{t('settings.changed')}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResetToDefault(config)}
                className="h-8 px-2"
              >
                {t('settings.reset')}
              </Button>
            </div>
          )}
        </div>
      )
    }

    // Text/Number inputs
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Input
            value={value}
            onChange={(e) => handleConfigChange(config.chave, e.target.value)}
            placeholder={config.descricao}
            className={cn(
              !isValid && "border-red-500 focus-visible:ring-red-500",
              isChanged && isValid && "border-orange-500 focus-visible:ring-orange-500"
            )}
          />
          {isChanged && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResetToDefault(config)}
              className="h-8 px-2 text-xs"
            >
              {t('settings.reset')}
            </Button>
          )}
        </div>
        {!isValid && (
          <p className="text-sm text-red-600">
            {configsApi.getValidationMessage(config.chave)}
          </p>
        )}
        {isChanged && isValid && (
          <p className="text-sm text-orange-600">{t('settings.unsaved')}</p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadConfigs}>
            <RefreshCw className="h-4 w-4 mr-2" />{t('settings.reload')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('profile.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('settings.save')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Configurações por Categoria */}
      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>{t('settings.general')}</span>
          </TabsTrigger>
          <TabsTrigger value="academico" className="flex items-center space-x-2">
            <GraduationCap className="h-4 w-4" />
            <span>{t('settings.academic')}</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>{t('settings.notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
                <span>{t('settings.security')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>{t('settings.generalTitle')}</span>
              </CardTitle>
              <CardDescription>{t('settings.generalDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {getConfigsByCategory('geral').map((config) => (
                <div key={config.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={config.chave} className="font-medium">
                      {config.descricao}
                    </Label>
                    <Badge variant="outline">{config.chave}</Badge>
                  </div>
                  {renderConfigInput(config)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academico">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>{t('settings.academicTitle')}</span>
              </CardTitle>
              <CardDescription>{t('settings.academicDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {getConfigsByCategory('academico').map((config) => (
                <div key={config.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={config.chave} className="font-medium">
                      {config.descricao}
                    </Label>
                    <Badge variant="outline">{config.chave}</Badge>
                  </div>
                  {renderConfigInput(config)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>{t('settings.notificationsTitle')}</span>
              </CardTitle>
              <CardDescription>{t('settings.notificationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {getConfigsByCategory('notificacoes').map((config) => (
                <div key={config.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={config.chave} className="font-medium">
                      {config.descricao}
                    </Label>
                    <Badge variant="outline">{config.chave}</Badge>
                  </div>
                  {renderConfigInput(config)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>{t('settings.securityTitle')}</span>
              </CardTitle>
              <CardDescription>{t('settings.securityDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {getConfigsByCategory('seguranca').map((config) => (
                <div key={config.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={config.chave} className="font-medium">
                      {config.descricao}
                    </Label>
                    <Badge variant="outline">{config.chave}</Badge>
                  </div>
                  {renderConfigInput(config)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>{t('settings.systemInfo')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500">{t('settings.version')}</Label>
              <div className="text-lg font-semibold">v1.0.0</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500">{t('settings.lastUpdate')}</Label>
              <div className="text-lg font-semibold">28/01/2024</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500">{t('settings.environment')}</Label>
              <div className="text-lg font-semibold">
                <Badge variant="secondary">{t('settings.development')}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
