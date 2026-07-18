'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Play, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { AttendanceGrid } from './AttendanceGrid'
import { FecharAulaDialog } from './FecharAulaDialog'
import { WorkflowStepIndicator } from './WorkflowStepIndicator'
import { DisciplinaSelector, type Disciplina } from './DisciplinaSelector'
import { TurmaSelector, type Turma } from './TurmaSelector'
import { logger } from '@/lib/logger'

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
            disciplina_id: sessaoData.disciplina_id || '',
            turma_id: sessaoData.turma_id,
            status: 'ABERTA',
            aberta_em: sessaoData.aberta_em || new Date().toISOString(),
            disciplina_nome: (sessaoData.disciplinas as { nome?: string })?.nome || '',
            turma_nome: (sessaoData.turmas as { nome?: string })?.nome || ''
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
        logger.error('Erro ao carregar disciplinas', error as Error, { feature: 'frequencia', action: 'load_disciplinas' })
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
      logger.error('Erro ao carregar turmas', error as Error, { feature: 'frequencia', action: 'load_turmas' })
      toast.error('Erro ao carregar turmas')
    }
  }

  const handleDisciplinaSelect = async (disciplinaId: string) => {
    setSelectedDisciplina(disciplinaId)
    setCurrentStep('turma')

    if (userProfile) {
      await loadTurmas(userProfile.id, userProfile.escola_id || undefined)
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
        disciplina_id: sessaoData.disciplina_id || '',
        turma_id: sessaoData.turma_id,
        status: 'ABERTA',
        aberta_em: sessaoData.aberta_em || new Date().toISOString(),
        disciplina_nome: (sessaoData.disciplinas as { nome?: string })?.nome || '',
        turma_nome: (sessaoData.turmas as { nome?: string })?.nome || ''
      })

      setCurrentStep('aula-aberta')
      toast.success('Aula aberta com sucesso! Pode iniciar a chamada.')
    } catch (error) {
      logger.error('Erro ao abrir aula', error as Error, { feature: 'frequencia', action: 'abrir_aula' })
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

  // Workflow step definitions
  const workflowSteps = [
    { key: 'disciplina', label: 'Disciplina' },
    { key: 'turma', label: 'Turma' },
    { key: 'aula-aberta', label: 'Aula Aberta' },
    { key: 'presenca', label: 'Presença' },
    { key: 'fechamento', label: 'Fechamento' }
  ]

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
      <WorkflowStepIndicator
        steps={workflowSteps}
        currentStepKey={currentStep}
      />

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
        <DisciplinaSelector
          disciplinas={disciplinas}
          selectedDisciplina={selectedDisciplina}
          onSelect={handleDisciplinaSelect}
          isProfessor={userProfile?.tipo_usuario === 'professor'}
        />
      )}

      {currentStep === 'turma' && (
        <TurmaSelector
          turmas={turmas}
          selectedTurma={selectedTurma}
          onSelect={handleTurmaSelect}
          onAbrirAula={handleAbrirAula}
          loading={loading}
        />
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