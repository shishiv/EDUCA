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
  AlertCircle,
  Calculator,
  Palette,
  FlaskConical,
  MapPin,
  Landmark,
  Languages,
  Dumbbell
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { AttendanceGrid } from './AttendanceGrid'
import { FecharAulaDialog } from './FecharAulaDialog'
import { logger } from '@/lib/logger'

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

// Mapear disciplinas para ícones e cores
const getDisciplinaIcon = (nome: string) => {
  const iconMap: Record<string, { icon: any; color: string; bgColor: string }> = {
    'Matemática': { icon: Calculator, color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100' },
    'Língua Portuguesa': { icon: BookOpen, color: 'text-green-600', bgColor: 'bg-green-50 hover:bg-green-100' },
    'Arte': { icon: Palette, color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100' },
    'Ciências': { icon: FlaskConical, color: 'text-cyan-600', bgColor: 'bg-cyan-50 hover:bg-cyan-100' },
    'Geografia': { icon: MapPin, color: 'text-emerald-600', bgColor: 'bg-emerald-50 hover:bg-emerald-100' },
    'História': { icon: Landmark, color: 'text-amber-600', bgColor: 'bg-amber-50 hover:bg-amber-100' },
    'Inglês': { icon: Languages, color: 'text-rose-600', bgColor: 'bg-rose-50 hover:bg-rose-100' },
    'Educação Física': { icon: Dumbbell, color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100' },
  }

  return iconMap[nome] || { icon: BookOpen, color: 'text-gray-600', bgColor: 'bg-gray-50 hover:bg-gray-100' }
}

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
        logger.info('Nenhuma sessão ativa encontrada')
      }
    }

    const loadDisciplinas = async () => {
      try {
        // Se for professor, buscar apenas disciplinas que ele já ministrou ou está ministrando
        if (userProfile.tipo_usuario === 'professor') {
          const { data: sessoesData, error: sessoesError } = await supabase
            .from('sessoes_aula')
            .select('disciplina_id, disciplinas(id, nome)')
            .eq('professor_id', userProfile.id)

          if (sessoesError) throw sessoesError

          // Extrair disciplinas únicas
          const disciplinasUnicas = new Map()
          sessoesData?.forEach((sessao: any) => {
            if (sessao.disciplinas) {
              disciplinasUnicas.set(sessao.disciplinas.id, {
                id: sessao.disciplinas.id,
                nome: sessao.disciplinas.nome
              })
            }
          })

          const disciplinasArray = Array.from(disciplinasUnicas.values())
          setDisciplinas(disciplinasArray.sort((a, b) => a.nome.localeCompare(b.nome)))
        } else {
          // Admin ou diretor vê todas as disciplinas
          const { data, error } = await supabase
            .from('disciplinas')
            .select('id, nome')
            .eq('ativa', true)
            .order('nome')

          if (error) throw error
          setDisciplinas(data || [])
        }
      } catch (error) {
        logger.error('Erro ao carregar disciplinas:', { error: error })
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
      logger.error('Erro ao carregar turmas:', { error: error })
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
      logger.error('Usuário não possui escola_id definida')
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
      logger.error('Erro ao abrir aula:', { error: error })
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {disciplinas.map((disciplina) => {
                const { icon: Icon, color, bgColor } = getDisciplinaIcon(disciplina.nome)
                const isSelected = selectedDisciplina === disciplina.id

                return (
                  <button
                    key={disciplina.id}
                    onClick={() => handleDisciplinaSelect(disciplina.id)}
                    className={`
                      relative p-6 rounded-lg border-2 transition-all duration-200
                      flex flex-col items-center justify-center gap-3
                      min-h-[140px] group
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                        : `border-gray-200 ${bgColor} hover:shadow-md`
                      }
                    `}
                  >
                    {/* Ícone */}
                    <div className={`
                      p-3 rounded-full transition-transform duration-200
                      ${isSelected ? 'bg-blue-100 scale-110' : 'bg-white group-hover:scale-110'}
                    `}>
                      <Icon className={`h-8 w-8 ${isSelected ? 'text-blue-600' : color}`} />
                    </div>

                    {/* Nome da Disciplina */}
                    <span className={`
                      text-sm font-medium text-center
                      ${isSelected ? 'text-blue-900' : 'text-gray-700'}
                    `}>
                      {disciplina.nome}
                    </span>

                    {/* Indicador de Seleção */}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Mensagem quando não há disciplinas */}
            {disciplinas.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Nenhuma disciplina disponível.
                  {userProfile?.tipo_usuario === 'professor' && (
                    <span className="block mt-2 text-sm">
                      Você precisa ministrar pelo menos uma aula antes de ver disciplinas aqui.
                    </span>
                  )}
                </p>
              </div>
            )}
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
          sessaoId={sessaoAtiva.id}
          open={showFecharDialog}
          onOpenChange={setShowFecharDialog}
          onConfirm={async () => await handleAulaFechada()}
        />
      )}
    </div>
  )
}