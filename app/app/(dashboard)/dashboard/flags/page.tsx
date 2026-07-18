'use client'

import { useState, useEffect } from 'react'
import { useFeatureFlagsWithStatus, useToggleFlags, useToggleSingleFlag } from '@/hooks/use-feature-flag'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableLoading } from '@/components/ui/loading-states'
import { Flag, School, AlertCircle, Check, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { FlagWithEscolaStatus } from '@/types/feature-flags'

interface EscolaBasic {
  id: string
  nome: string
}

export default function FlagsPage() {
  const { userProfile, loading: authLoading } = useAuth()
  const { data: flagsWithStatus, isLoading: flagsLoading, error, refetch } = useFeatureFlagsWithStatus()
  const toggleFlagsMutation = useToggleFlags()
  const toggleSingleFlagMutation = useToggleSingleFlag()

  // Local state
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null)
  const [selectedEscolaIds, setSelectedEscolaIds] = useState<string[]>([])
  const [allEscolas, setAllEscolas] = useState<EscolaBasic[]>([])
  const [escolasLoading, setEscolasLoading] = useState(true)

  // Fetch all escolas on mount for the complete list
  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const { data, error } = await supabase
          .from('escolas')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome')

        if (error) throw error
        setAllEscolas(data || [])
      } catch (err) {
        toast.error('Erro ao carregar escolas')
      } finally {
        setEscolasLoading(false)
      }
    }
    fetchEscolas()
  }, [])

  // Access control - only admin and gestor_sme can access
  const canAccess = userProfile?.tipo_usuario === 'admin' || userProfile?.tipo_usuario === 'gestor_sme'

  // Get selected flag data
  const selectedFlag = flagsWithStatus?.find((f) => f.id === selectedFlagId) ?? null

  // Build escola status map for selected flag
  const getEscolaStatus = (escolaId: string): boolean => {
    if (!selectedFlag) return false
    const escolaFlag = selectedFlag.escola_flags.find((ef) => ef.escola_id === escolaId)
    return escolaFlag?.enabled ?? false
  }

  // Get enabled count for a flag
  const getEnabledCount = (flag: FlagWithEscolaStatus): number => {
    return flag.escola_flags.filter((ef) => ef.enabled).length
  }

  // Handle selecting/deselecting all escolas
  const handleSelectAll = () => {
    if (selectedEscolaIds.length === allEscolas.length) {
      setSelectedEscolaIds([])
    } else {
      setSelectedEscolaIds(allEscolas.map((e) => e.id))
    }
  }

  // Handle selecting a single escola for bulk action
  const handleSelectEscola = (escolaId: string) => {
    if (selectedEscolaIds.includes(escolaId)) {
      setSelectedEscolaIds(selectedEscolaIds.filter((id) => id !== escolaId))
    } else {
      setSelectedEscolaIds([...selectedEscolaIds, escolaId])
    }
  }

  // Handle single escola toggle
  const handleToggleSingle = async (escolaId: string, currentEnabled: boolean) => {
    if (!selectedFlagId) return

    try {
      await toggleSingleFlagMutation.mutateAsync({
        flagId: selectedFlagId,
        escolaId,
        enabled: !currentEnabled,
      })
    } catch (err) {
      // Error handled by mutation
    }
  }

  // Handle bulk enable
  const handleBulkEnable = async () => {
    if (!selectedFlagId || selectedEscolaIds.length === 0) return

    try {
      await toggleFlagsMutation.mutateAsync({
        flagId: selectedFlagId,
        escolaIds: selectedEscolaIds,
        enabled: true,
      })
      setSelectedEscolaIds([])
    } catch (err) {
      // Error handled by mutation
    }
  }

  // Handle bulk disable
  const handleBulkDisable = async () => {
    if (!selectedFlagId || selectedEscolaIds.length === 0) return

    try {
      await toggleFlagsMutation.mutateAsync({
        flagId: selectedFlagId,
        escolaIds: selectedEscolaIds,
        enabled: false,
      })
      setSelectedEscolaIds([])
    } catch (err) {
      // Error handled by mutation
    }
  }

  // Loading state
  if (authLoading || flagsLoading || escolasLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-600 mt-1">Gerencie módulos por escola</p>
        </div>
        <TableLoading rows={5} columns={4} />
      </div>
    )
  }

  // Access denied
  if (!canAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-600 mt-1">Gerencie módulos por escola</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>
              <p className="text-gray-600">
                Você não tem permissão para acessar esta página.
                <br />
                Apenas administradores podem gerenciar feature flags.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-600 mt-1">Gerencie módulos por escola</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar flags</h3>
              <p className="text-gray-600 mb-4">Ocorreu um erro ao buscar os feature flags.</p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
        <p className="text-gray-600 mt-1">Gerencie a ativação de módulos por escola</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Flag list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Módulos
              </CardTitle>
              <CardDescription>Selecione um módulo para gerenciar</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!flagsWithStatus || flagsWithStatus.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Flag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Nenhum flag cadastrado</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {flagsWithStatus.map((flag) => {
                    const enabledCount = getEnabledCount(flag)
                    const isSelected = selectedFlagId === flag.id

                    return (
                      <button
                        key={flag.id}
                        onClick={() => {
                          setSelectedFlagId(flag.id)
                          setSelectedEscolaIds([])
                        }}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{flag.flag_name}</div>
                            <div className="text-sm text-gray-600 mt-0.5">{flag.description}</div>
                          </div>
                          <Badge variant={enabledCount > 0 ? 'default' : 'secondary'}>
                            {enabledCount}/{allEscolas.length}
                          </Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Escola toggles */}
        <div className="lg:col-span-2">
          {!selectedFlagId ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione um flag</h3>
                  <p className="text-gray-600">
                    Escolha um módulo na lista à esquerda para gerenciar suas escolas.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <School className="h-5 w-5" />
                      {selectedFlag?.flag_name}
                    </CardTitle>
                    <CardDescription>{selectedFlag?.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {getEnabledCount(selectedFlag!)}/{allEscolas.length} ativas
                  </Badge>
                </div>
              </CardHeader>

              {/* Bulk actions bar */}
              {selectedEscolaIds.length > 0 && (
                <div className="border-b border-blue-200 bg-blue-50 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedEscolaIds.length} escola(s) selecionada(s)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkEnable}
                        disabled={toggleFlagsMutation.isPending}
                        className="text-green-700 border-green-300 hover:bg-green-50"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Ativar Selecionadas
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkDisable}
                        disabled={toggleFlagsMutation.isPending}
                        className="text-red-700 border-red-300 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Desativar Selecionadas
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedEscolaIds([])}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                {allEscolas.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <School className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Nenhuma escola cadastrada</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {/* Header row */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 font-medium text-sm text-gray-700">
                      <Checkbox
                        checked={selectedEscolaIds.length === allEscolas.length && allEscolas.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Selecionar todas"
                      />
                      <div className="flex-1">Escola</div>
                      <div className="w-24 text-center">Status</div>
                    </div>

                    {/* Escola rows */}
                    {allEscolas.map((escola) => {
                      const isEnabled = getEscolaStatus(escola.id)
                      const isSelected = selectedEscolaIds.includes(escola.id)

                      return (
                        <div
                          key={escola.id}
                          className={`flex items-center gap-4 p-4 hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectEscola(escola.id)}
                            aria-label={`Selecionar ${escola.nome}`}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{escola.nome}</div>
                          </div>
                          <div className="w-24 flex justify-center">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => handleToggleSingle(escola.id, isEnabled)}
                              disabled={toggleSingleFlagMutation.isPending}
                              aria-label={`${isEnabled ? 'Desativar' : 'Ativar'} ${selectedFlag?.flag_name} para ${escola.nome}`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
