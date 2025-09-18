'use client'

import { useEffect, useState } from 'react'
import { configsApi, Config } from '@/lib/api/configs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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

export default function ConfiguracoesPage() {
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
      // console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Simular salvamento das configurações
      for (const config of configs) {
        if (configValues[config.chave] !== config.valor) {
          await configsApi.update(config.id, {
            ...config,
            valor: configValues[config.chave]
          })
        }
      }
      
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar configurações')
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

  const renderConfigInput = (config: Config) => {
    const value = configValues[config.chave] || config.valor

    if (config.chave.includes('email_') || config.chave.includes('backup_') || config.chave.includes('_ativo')) {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => handleConfigChange(config.chave, checked ? 'true' : 'false')}
          />
          <Label>{value === 'true' ? 'Ativado' : 'Desativado'}</Label>
        </div>
      )
    }

    return (
      <Input
        value={value}
        onChange={(e) => handleConfigChange(config.chave, e.target.value)}
        placeholder={config.descricao}
      />
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
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as configurações gerais do sistema
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadConfigs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
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
            <span>Geral</span>
          </TabsTrigger>
          <TabsTrigger value="academico" className="flex items-center space-x-2">
            <GraduationCap className="h-4 w-4" />
            <span>Acadêmico</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Segurança</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Configurações Gerais</span>
              </CardTitle>
              <CardDescription>
                Configurações básicas do sistema e da instituição
              </CardDescription>
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
                <span>Configurações Acadêmicas</span>
              </CardTitle>
              <CardDescription>
                Parâmetros relacionados ao ensino e avaliação
              </CardDescription>
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
                <span>Configurações de Notificações</span>
              </CardTitle>
              <CardDescription>
                Gerencie como e quando as notificações são enviadas
              </CardDescription>
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
                <span>Configurações de Segurança</span>
              </CardTitle>
              <CardDescription>
                Configurações relacionadas à segurança e backup do sistema
              </CardDescription>
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
            <span>Informações do Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500">Versão do Sistema</Label>
              <div className="text-lg font-semibold">v1.0.0</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500">Última Atualização</Label>
              <div className="text-lg font-semibold">28/01/2024</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500">Ambiente</Label>
              <div className="text-lg font-semibold">
                <Badge variant="secondary">Desenvolvimento</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}