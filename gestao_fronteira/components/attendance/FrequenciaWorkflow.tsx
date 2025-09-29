'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BookOpen,
  Users,
  Play,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { AttendanceGrid } from './AttendanceGrid'
import { FecharAulaDialog } from './FecharAulaDialog'

interface Disciplina {
  id: string
  nome: string
}

interface Turma {
  id: string
  nome: string
  serie: string
  escola: {
    id: string
    nome: string
  }
  total_alunos: number
}

interface SessaoAtiva {
  id: string
  disciplina_id: string
  turma_id: string
  status: 'ABERTA'
  aberta_em: string
  disciplina_nome: string
  turma_nome: string
}

type WorkflowStep = 'disciplina' | 'turma' | 'aula-aberta' | 'presenca' | 'fechamento'

export function FrequenciaWorkflow() {
  const { userProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('disciplina')
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>('')
  const [selectedTurma, setSelectedTurma] = useState<string>('')
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoAtiva | null>(null)
  const [loading, setLoading] = useState(false)
  const [showFecharDialog, setShowFecharDialog] = useState(false)

  // Verificar se existe sessão ativa ao carregar
  useEffect(() => {
    if (!userProfile?.id) return

    const checkActiveSessions = async () => {
      try {
        const { data: sessaoData, error } = await supabase
          .from('sessoes_aula')
          .select(`
            id,
            disciplina_id,
            turma_id,
            status,
            aberta_em,
            disciplinas(nome),
            turmas(nome)
          `)
          .eq('professor_id', userProfile.id)
          .eq('status', 'ABERTA')
          .eq('data_aula', new Date().toISOString().split('T')[0])
          .single()

        if (sessaoData && !error) {
          setSessaoAtiva({
            id: sessaoData.id,
            disciplina_id: sessaoData.disciplina_id,
            turma_id: sessaoData.turma_id,
            status: 'ABERTA',
            aberta_em: sessaoData.aberta_em,
            disciplina_nome: sessaoData.disciplinas?.nome || '',
            turma_nome: sessaoData.turmas?.nome || ''
          })
          setCurrentStep('aula-aberta')
        }
      } catch (error) {
        console.log('Nenhuma sessão ativa encontrada')
      }
    }

    const loadDisciplinas = async () => {
      try {
        const { data, error } = await supabase
          .from('disciplinas')
          .select('id, nome')
          .order('nome')

        if (error) throw error
        setDisciplinas(data || [])
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error)
        toast.error('Erro ao carregar disciplinas')
      }
    }

    checkActiveSessions()
    loadDisciplinas()
  }, [userProfile?.id])


  const loadTurmas = async (professorId: string, escolaId?: string) => {
    try {
      let query = supabase
        .from('turmas')
        .select(`
          id,
          nome,
          serie,
          escola:escolas(id, nome),
          matriculas(id)
        `)

      // Filtrar por professor se não for admin
      if (userProfile?.tipo_usuario === 'professor') {
        query = query.eq('professor_id', professorId)
      } else if (userProfile?.tipo_usuario === 'diretor' && escolaId) {
        query = query.eq('escola_id', escolaId)
      }

      const { data, error } = await query.order('nome')

      if (error) throw error

      const turmasComAlunos = (data || []).map(turma => ({
        id: turma.id,
        nome: turma.nome,
        serie: turma.serie,
        escola: {
          id: turma.escola?.id || '',
          nome: turma.escola?.nome || ''
        },
        total_alunos: turma.matriculas?.length || 0
      }))

      setTurmas(turmasComAlunos)
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
      toast.error('Erro ao carregar turmas')
    }
  }

  const handleDisciplinaSelect = async (disciplinaId: string) => {
    setSelectedDisciplina(disciplinaId)
    setCurrentStep('turma')

    if (userProfile) {
      await loadTurmas(userProfile.id, userProfile.escola_id)
    }
  }

  const handleTurmaSelect = (turmaId: string) => {
    setSelectedTurma(turmaId)
  }

  const handleAbrirAula = async () => {
    if (!selectedDisciplina || !selectedTurma || !userProfile) return

    // Validar se o usuário tem escola_id
    if (!userProfile.escola_id) {
      console.error('Usuário não possui escola_id definida')
      alert('Erro: Professor deve estar vinculado a uma escola para abrir aulas')
      return
    }

    setLoading(true)
    try {
      // Primeiro verificar se já existe uma sessão para hoje
      const { data: sessaoExistente } = await supabase
        .from('sessoes_aula')
        .select('id, status')
        .eq('professor_id', userProfile.id)
        .eq('disciplina_id', selectedDisciplina)
        .eq('turma_id', selectedTurma)
        .eq('data_aula', new Date().toISOString().split('T')[0])
        .single()

      let sessaoData

      if (sessaoExistente) {
        // Atualizar sessão existente para ABERTA
        const { data, error } = await supabase
          .from('sessoes_aula')
          .update({
            status: 'ABERTA',
            aberta_em: new Date().toISOString(),
            auto_fechamento_agendado: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', sessaoExistente.id)
          .select(`
            id,
            disciplina_id,
            turma_id,
            status,
            aberta_em,
            disciplinas(nome),
            turmas(nome)
          `)
          .single()

        if (error) throw error
        sessaoData = data
      } else {
        // Criar nova sessão
        const { data, error } = await supabase
          .from('sessoes_aula')
          .insert({
            turma_id: selectedTurma,
            professor_id: userProfile.id,
            disciplina_id: selectedDisciplina,
            escola_id: userProfile.escola_id,
            data_aula: new Date().toISOString().split('T')[0],
            status: 'ABERTA',
            aberta_em: new Date().toISOString(),
            conteudo_programatico: 'Aula em andamento',
            objetivos_aprendizagem: 'Registro de frequência',
            duracao_minutos: 50,
            documento_oficial: true,
            auto_fechamento_agendado: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
          })
          .select(`
            id,
            disciplina_id,
            turma_id,
            status,
            aberta_em,
            disciplinas(nome),
            turmas(nome)
          `)
          .single()

        if (error) throw error
        sessaoData = data
      }

      setSessaoAtiva({
        id: sessaoData.id,
        disciplina_id: sessaoData.disciplina_id,
        turma_id: sessaoData.turma_id,
        status: 'ABERTA',
        aberta_em: sessaoData.aberta_em,
        disciplina_nome: sessaoData.disciplinas?.nome || '',
        turma_nome: sessaoData.turmas?.nome || ''
      })

      setCurrentStep('aula-aberta')
      toast.success('Aula aberta com sucesso! Pode iniciar a chamada.')
    } catch (error) {
      console.error('Erro ao abrir aula:', error)
      toast.error('Erro ao abrir aula')
    } finally {
      setLoading(false)
    }
  }

  const handleMarcarPresenca = () => {
    setCurrentStep('presenca')
  }

  const handleFecharAula = () => {
    setShowFecharDialog(true)
  }

  const handleAulaFechada = () => {
    setSessaoAtiva(null)
    setCurrentStep('disciplina')
    setSelectedDisciplina('')
    setSelectedTurma('')
    setShowFecharDialog(false)
    toast.success('Aula fechada com sucesso!')
  }

  const handleVoltarParaAula = () => {
    setCurrentStep('aula-aberta')
  }

  const resetWorkflow = () => {
    setCurrentStep('disciplina')
    setSelectedDisciplina('')
    setSelectedTurma('')
    setSessaoAtiva(null)
  }

  const renderStepIndicator = () => {
    const steps = [
      { key: 'disciplina', label: 'Disciplina' },
      { key: 'turma', label: 'Turma' },
      { key: 'aula-aberta', label: 'Aula Aberta' },
      { key: 'presenca', label: 'Presença' },
      { key: 'fechamento', label: 'Fechamento' }
    ]

    const getCurrentStepIndex = () => {
      return steps.findIndex(step => step.key === currentStep)
    }

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
          const isActive = step.key === currentStep
          const isCompleted = index < getCurrentStepIndex()

          return (
            <div key={step.key} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${isActive ? 'bg-blue-600 text-white' :
                  isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
              `}>
                {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-sm ${isActive ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-4" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Carregando dados do usuário...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Sessão Ativa Alert */}
      {sessaoAtiva && currentStep !== 'presenca' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Aula Ativa:</strong> {sessaoAtiva.disciplina_nome} - {sessaoAtiva.turma_nome}
            <br />
            Aberta em: {new Date(sessaoAtiva.aberta_em).toLocaleTimeString('pt-BR')}
          </AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {currentStep === 'disciplina' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Selecionar Disciplina
            </CardTitle>
            <CardDescription>
              Escolha a disciplina que será ministrada na aula
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedDisciplina} onValueChange={handleDisciplinaSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma disciplina" />
              </SelectTrigger>
              <SelectContent>
                {disciplinas.map((disciplina) => (
                  <SelectItem key={disciplina.id} value={disciplina.id}>
                    {disciplina.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {currentStep === 'turma' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Selecionar Turma
            </CardTitle>
            <CardDescription>
              Escolha a turma para a qual será ministrada a aula
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {turmas.map((turma) => (
              <div
                key={turma.id}
                className={`
                  p-4 border rounded-lg cursor-pointer transition-colors
                  ${selectedTurma === turma.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                `}
                onClick={() => handleTurmaSelect(turma.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{turma.nome} - {turma.serie}</h3>
                    <p className="text-sm text-gray-600">{turma.escola.nome}</p>
                    <p className="text-sm text-gray-500">{turma.total_alunos} alunos</p>
                  </div>
                  {selectedTurma === turma.id && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </div>
            ))}

            {selectedTurma && (
              <div className="pt-4 border-t">
                <Button onClick={handleAbrirAula} disabled={loading} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? 'Abrindo Aula...' : 'Abrir Aula'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 'aula-aberta' && sessaoAtiva && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2 text-green-600" />
              Aula Aberta
            </CardTitle>
            <CardDescription>
              {sessaoAtiva.disciplina_nome} - {sessaoAtiva.turma_nome}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Clock className="h-3 w-3 mr-1" />
                Aula em andamento
              </Badge>
              <span className="text-sm text-gray-500">
                Iniciada às {new Date(sessaoAtiva.aberta_em).toLocaleTimeString('pt-BR')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={handleMarcarPresenca} className="h-20">
                <div className="text-center">
                  <Users className="h-6 w-6 mx-auto mb-1" />
                  <div className="text-sm">Marcar Presença</div>
                </div>
              </Button>

              <Button variant="outline" onClick={handleFecharAula} className="h-20">
                <div className="text-center">
                  <CheckCircle className="h-6 w-6 mx-auto mb-1" />
                  <div className="text-sm">Fechar Aula</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'presenca' && sessaoAtiva && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Marcar Presença
                </span>
                <Button variant="outline" onClick={handleVoltarParaAula}>
                  Voltar para Aula
                </Button>
              </CardTitle>
              <CardDescription>
                {sessaoAtiva.disciplina_nome} - {sessaoAtiva.turma_nome}
              </CardDescription>
            </CardHeader>
          </Card>

          <AttendanceGrid
            sessionId={sessaoAtiva.id}
            turmaId={sessaoAtiva.turma_id}
            readonly={false}
          />
        </div>
      )}

      {/* Dialog de Fechar Aula */}
      {showFecharDialog && sessaoAtiva && (
        <FecharAulaDialog
          sessionId={sessaoAtiva.id}
          isOpen={showFecharDialog}
          onClose={() => setShowFecharDialog(false)}
          onSuccess={handleAulaFechada}
        />
      )}
    </div>
  )
}