'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, GraduationCap, Users, School } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useEscola } from '@/contexts/escola-context'

interface EscolaOption {
  id: string
  nome: string
  tipo: string | null
}

interface ProfessorOption {
  id: string
  nome: string
}

const SERIES_BY_TIPO: Record<string, string[]> = {
  creche: ['Berçário I', 'Berçário II', 'Maternal I', 'Maternal II'],
  pre_escola: ['Pré I', 'Pré II'],
  fundamental: [
    '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano',
    '6º Ano', '7º Ano', '8º Ano', '9º Ano',
  ],
}

export default function NovaTurmaPage() {
  const router = useRouter()
  const { selectedEscolaId, shouldShowSelector } = useEscola()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [escolas, setEscolas] = useState<EscolaOption[]>([])
  const [professores, setProfessores] = useState<ProfessorOption[]>([])

  const [formData, setFormData] = useState({
    nome: '',
    serie: '',
    ano_letivo: new Date().getFullYear(),
    escola_id: '',
    professor_id: '',
    capacidade: 25,
    turno: '',
    observacoes: '',
    ativo: true,
  })

  // Load schools on mount
  useEffect(() => {
    async function loadEscolas() {
      try {
        const { data, error } = await supabase
          .from('escolas')
          .select('id, nome, tipo')
          .eq('ativo', true)
          .order('nome')
        if (error) throw error
        setEscolas(data || [])
        // Pre-select escola from context when the admin already picked one
        if (selectedEscolaId && !formData.escola_id) {
          setFormData(prev => ({ ...prev, escola_id: selectedEscolaId }))
        }
      } catch (err) {
        logger.error('Error loading escolas for nova turma', err as Error, {
          feature: 'turmas',
          action: 'load_escolas',
        })
        toast.error('Erro ao carregar escolas')
      } finally {
        setLoadingData(false)
      }
    }
    loadEscolas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEscolaId])

  // Load teachers whenever the selected school changes
  useEffect(() => {
    if (!formData.escola_id) {
      setProfessores([])
      return
    }
    async function loadProfessores() {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome')
        .eq('tipo_usuario', 'professor')
        .eq('escola_id', formData.escola_id)
        .eq('ativo', true)
        .order('nome')
      if (error) {
        logger.error('Error loading professores', error, {
          feature: 'turmas',
          action: 'load_professores',
        })
        return
      }
      setProfessores(data || [])
    }
    loadProfessores()
  }, [formData.escola_id])

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getEscolaTipo = (): string => {
    return escolas.find(e => e.id === formData.escola_id)?.tipo ?? ''
  }

  const getSeriesPorTipo = (): string[] => {
    return SERIES_BY_TIPO[getEscolaTipo()] ?? []
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.escola_id) {
      toast.error('Selecione uma escola')
      return
    }
    if (!formData.nome.trim()) {
      toast.error('Informe o nome da turma')
      return
    }
    if (!formData.serie) {
      toast.error('Selecione a série')
      return
    }
    if (!formData.turno) {
      toast.error('Selecione o turno')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('turmas').insert({
        nome: formData.nome.trim(),
        serie: formData.serie,
        ano_letivo: formData.ano_letivo,
        escola_id: formData.escola_id,
        professor_id: formData.professor_id || null,
        capacidade: formData.capacidade,
        turno: formData.turno,
        ativo: formData.ativo,
      })

      if (error) throw error

      toast.success('Turma criada com sucesso!')
      router.push('/dashboard/turmas')
    } catch (err) {
      logger.error('Error creating turma', err as Error, {
        feature: 'turmas',
        action: 'create_turma',
      })
      toast.error('Erro ao criar turma. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/turmas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nova Turma</h1>
          <p className="text-gray-600 mt-1">Crie uma nova turma no sistema</p>
        </div>
      </div>

      {shouldShowSelector && !formData.escola_id && (
        <Alert variant="destructive">
          <AlertDescription>
            Selecione uma escola no menu lateral ou no formulário abaixo antes de criar uma turma.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>Dados da Turma</span>
              </CardTitle>
              <CardDescription>
                Preencha as informações básicas da turma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome da Turma *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      placeholder="Ex: 5º Ano A"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ano_letivo">Ano Letivo *</Label>
                    <Input
                      id="ano_letivo"
                      type="number"
                      value={formData.ano_letivo}
                      onChange={(e) => handleInputChange('ano_letivo', parseInt(e.target.value))}
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="escola_id">Escola *</Label>
                  <Select
                    value={formData.escola_id}
                    onValueChange={(value) => {
                      handleInputChange('escola_id', value)
                      handleInputChange('professor_id', '')
                      handleInputChange('serie', '')
                    }}
                    disabled={loadingData}
                  >
                    <SelectTrigger id="escola_id">
                      <SelectValue placeholder={loadingData ? 'Carregando…' : 'Selecione a escola'} />
                    </SelectTrigger>
                    <SelectContent>
                      {escolas.map((escola) => (
                        <SelectItem key={escola.id} value={escola.id}>
                          {escola.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serie">Série *</Label>
                    <Select
                      value={formData.serie}
                      onValueChange={(value) => handleInputChange('serie', value)}
                      disabled={!formData.escola_id}
                    >
                      <SelectTrigger id="serie">
                        <SelectValue placeholder="Selecione a série" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSeriesPorTipo().map((serie) => (
                          <SelectItem key={serie} value={serie}>
                            {serie}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="turno">Turno *</Label>
                    <Select
                      value={formData.turno}
                      onValueChange={(value) => handleInputChange('turno', value)}
                    >
                      <SelectTrigger id="turno">
                        <SelectValue placeholder="Selecione o turno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="matutino">Matutino</SelectItem>
                        <SelectItem value="vespertino">Vespertino</SelectItem>
                        <SelectItem value="integral">Integral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="professor_id">Professor Responsável</Label>
                    <Select
                      value={formData.professor_id}
                      onValueChange={(value) => handleInputChange('professor_id', value)}
                      disabled={!formData.escola_id}
                    >
                      <SelectTrigger id="professor_id">
                        <SelectValue placeholder="Selecione o professor" />
                      </SelectTrigger>
                      <SelectContent>
                        {professores.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.nome}
                          </SelectItem>
                        ))}
                        {professores.length === 0 && formData.escola_id && (
                          <SelectItem value="__none" disabled>
                            Nenhum professor nesta escola
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacidade">Capacidade Máxima *</Label>
                    <Input
                      id="capacidade"
                      type="number"
                      value={formData.capacidade}
                      onChange={(e) => handleInputChange('capacidade', parseInt(e.target.value))}
                      min="1"
                      max="50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    placeholder="Observações adicionais sobre a turma"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                  />
                  <Label htmlFor="ativo">Turma ativa</Label>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/turmas">Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={loading || loadingData}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Salvando…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Criar Turma
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <School className="h-5 w-5" />
                <span>Informações da Escola</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.escola_id ? (
                <div className="space-y-3 text-sm text-gray-700">
                  <p className="font-medium">
                    {escolas.find(e => e.id === formData.escola_id)?.nome}
                  </p>
                  {getEscolaTipo() && (
                    <p className="capitalize text-gray-500">
                      {getEscolaTipo().replace('_', ' ')}
                    </p>
                  )}
                  <p>
                    <span className="text-gray-500">Professores disponíveis: </span>
                    {professores.length}
                  </p>
                  <p>
                    <span className="text-gray-500">Séries disponíveis: </span>
                    {getSeriesPorTipo().length}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Selecione uma escola para ver as informações
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Capacidade</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-bold text-blue-600">{formData.capacidade} alunos</p>
              <p className="text-sm text-gray-600">Capacidade máxima da turma</p>
              <p className="text-sm font-medium text-gray-700">Recomendações</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Berçário/Maternal: 15-20 alunos</li>
                <li>• Pré-escola: 20-25 alunos</li>
                <li>• Fundamental: 25-30 alunos</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
