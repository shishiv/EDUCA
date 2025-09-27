/**
 * Enhanced Abrir Aula Workflow Component
 * Three-phase attendance workflow with integrated tutorial system
 * Optimized for tablet use in Brazilian educational context
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  XCircle,
  HelpCircle,
  BookOpen,
  Timer,
  Shield,
  Smartphone
} from 'lucide-react'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { AttendanceGrid } from './AttendanceGrid'
import { TutorialOverlay } from '../tutorial/TutorialOverlay'
import { HelpSystem } from '../help/HelpSystem'

interface Session {
  id: string
  turma_id: string
  professor_id: string
  disciplina_id?: string
  data_aula: string
  status: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'
  criada_em: string
  aberta_em?: string
  fechada_em?: string
  cancelada_em?: string
  conteudo_ministrado?: string
  observacoes_fechamento?: string
  hash_legal?: string
  tempo_total_aula?: string
  auto_fechamento_agendado: string
  turmas: {
    id: string
    nome: string
    ano_letivo: string
  }
  disciplinas?: {
    id: string
    nome: string
    codigo: string
  }
}

interface AbrirAulaWorkflowProps {
  turmaId: string
  professorId: string
  dataAula?: string
  showTutorial?: boolean
  onSessionChange?: (session: Session | null) => void
}

export function AbrirAulaWorkflow({
  turmaId,
  professorId,
  dataAula = new Date().toISOString().split('T')[0],
  showTutorial = false,
  onSessionChange
}: AbrirAulaWorkflowProps) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [timeUntilClosure, setTimeUntilClosure] = useState<string>('')
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [conteudoMinistrado, setConteudoMinistrado] = useState('')
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [tutorialActive, setTutorialActive] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [autoSaveContent, setAutoSaveContent] = useState('')

  const timerRef = useRef<NodeJS.Timeout>()
  const autoSaveRef = useRef<NodeJS.Timeout>()

  // Load session data
  const loadSession = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sessoes_aula')
        .select(`
          *,
          turmas:turma_id (
            id,
            nome,
            ano_letivo
          ),
          disciplinas:disciplina_id (
            id,
            nome,
            codigo
          )
        `)
        .eq('turma_id', turmaId)
        .eq('data_aula', dataAula)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found is okay
        throw error
      }

      setSession(data || null)
      onSessionChange?.(data || null)

      // Load saved content for auto-restore
      const savedContent = localStorage.getItem(`content_${turmaId}_${dataAula}`)
      if (savedContent && !data?.conteudo_ministrado) {
        setAutoSaveContent(savedContent)
      }

    } catch (error) {
      console.error('Erro ao carregar sessão:', error)
      toast.error('Erro ao carregar dados da sessão')
    } finally {
      setLoading(false)
    }
  }, [turmaId, dataAula, onSessionChange])

  // Calculate time until auto-closure
  const updateTimeUntilClosure = useCallback(() => {
    if (!session?.auto_fechamento_agendado) return

    const closureTime = new Date(session.auto_fechamento_agendado)
    const now = new Date()
    const diffMs = closureTime.getTime() - now.getTime()

    if (diffMs <= 0) {
      setTimeUntilClosure('Sessão deve ser fechada (passou das 18h)')
      return
    }

    setTimeUntilClosure(formatDistanceToNow(closureTime, {
      locale: ptBR,
      addSuffix: true
    }))
  }, [session?.auto_fechamento_agendado])

  // Check for tutorial on first load
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('abrir_aula_tutorial_completed')
    if (!tutorialCompleted || showTutorial) {
      setTutorialActive(true)
    }
  }, [showTutorial])

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel(`session_${turmaId}_${dataAula}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessoes_aula',
        filter: `turma_id=eq.${turmaId}`
      }, (payload) => {
        if (payload.new && (payload.new as any).data_aula === dataAula) {
          setSession(payload.new as Session)
          onSessionChange?.(payload.new as Session)
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [turmaId, dataAula, onSessionChange])

  // Set up countdown timer
  useEffect(() => {
    updateTimeUntilClosure()
    timerRef.current = setInterval(updateTimeUntilClosure, 30000) // Update every 30 seconds

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [updateTimeUntilClosure])

  // Auto-save content
  const saveContentLocally = useCallback((content: string) => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current)
    }

    autoSaveRef.current = setTimeout(() => {
      localStorage.setItem(`content_${turmaId}_${dataAula}`, content)
      setAutoSaveContent(content)
    }, 2000) // Save after 2 seconds of no typing
  }, [turmaId, dataAula])

  // Load session on component mount
  useEffect(() => {
    loadSession()
  }, [loadSession])

  // Create new session
  const createSession = async () => {
    try {
      setActionLoading(true)

      const response = await fetch('/api/sessoes-aula/abrir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turma_id: turmaId,
          professor_id: professorId,
          data_aula: dataAula
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar sessão')
      }

      setSession(result.session)
      onSessionChange?.(result.session)
      toast.success('Sessão criada com sucesso!')

    } catch (error) {
      console.error('Erro ao criar sessão:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar sessão')
    } finally {
      setActionLoading(false)
    }
  }

  // Open session (PLANEJADA -> ABERTA)
  const openSession = async () => {
    if (!session) return

    try {
      setActionLoading(true)

      const response = await fetch(`/api/sessoes-aula/${session.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'ABERTA'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao abrir sessão')
      }

      setSession(result.session)
      onSessionChange?.(result.session)
      toast.success('Aula aberta! A chamada pode ser realizada.')

    } catch (error) {
      console.error('Erro ao abrir sessão:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao abrir sessão')
    } finally {
      setActionLoading(false)
    }
  }

  // Close session (ABERTA -> FECHADA)
  const closeSession = async () => {
    if (!session || !conteudoMinistrado.trim()) return

    try {
      setActionLoading(true)

      const response = await fetch(`/api/sessoes-aula/${session.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'FECHADA',
          conteudo_ministrado: conteudoMinistrado.trim()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao fechar sessão')
      }

      setSession(result.session)
      onSessionChange?.(result.session)
      setShowCloseDialog(false)
      setConteudoMinistrado('')

      // Clear saved content
      localStorage.removeItem(`content_${turmaId}_${dataAula}`)
      setAutoSaveContent('')

      toast.success('Aula fechada com sucesso! Registro legal criado.')

    } catch (error) {
      console.error('Erro ao fechar sessão:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao fechar sessão')
    } finally {
      setActionLoading(false)
    }
  }

  // Cancel session
  const cancelSession = async () => {
    if (!session || !motivoCancelamento.trim()) return

    try {
      setActionLoading(true)

      const response = await fetch(`/api/sessoes-aula/${session.id}/cancelar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          motivo_cancelamento: motivoCancelamento.trim()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cancelar sessão')
      }

      setSession(result.session)
      onSessionChange?.(result.session)
      setShowCancelDialog(false)
      setMotivoCancelamento('')

      toast.success('Sessão cancelada com sucesso.')

    } catch (error) {
      console.error('Erro ao cancelar sessão:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar sessão')
    } finally {
      setActionLoading(false)
    }
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PLANEJADA': return 'secondary'
      case 'ABERTA': return 'default'
      case 'FECHADA': return 'default'
      case 'CANCELADA': return 'destructive'
      default: return 'secondary'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PLANEJADA': return <Clock className="h-4 w-4" />
      case 'ABERTA': return <Play className="h-4 w-4" />
      case 'FECHADA': return <CheckCircle className="h-4 w-4" />
      case 'CANCELADA': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Tutorial steps configuration
  const tutorialSteps = [
    {
      target: '[data-tutorial="workflow-card"]',
      content: {
        title: 'Bem-vindo ao Sistema de Frequência!',
        description: 'Este é o painel de controle da sua aula. Aqui você gerencia todo o processo de chamada de acordo com as normas educacionais brasileiras.',
        position: 'bottom' as const
      }
    },
    {
      target: '[data-tutorial="create-session"]',
      content: {
        title: 'Criar Nova Sessão',
        description: 'Clique aqui para criar uma nova sessão de aula. Cada turma pode ter apenas uma sessão por dia.',
        position: 'bottom' as const
      }
    },
    {
      target: '[data-tutorial="open-session"]',
      content: {
        title: 'Abrir Aula',
        description: 'Depois de criar a sessão, abra a aula para começar a chamada. A aula será fechada automaticamente às 18h (horário de São Paulo).',
        position: 'bottom' as const
      }
    },
    {
      target: '[data-tutorial="attendance-grid"]',
      content: {
        title: 'Chamada dos Alunos',
        description: 'Use esta área para marcar presença ou falta dos alunos. Os botões são otimizados para tablets e dispositivos móveis.',
        position: 'top' as const
      }
    },
    {
      target: '[data-tutorial="close-session"]',
      content: {
        title: 'Fechar Aula',
        description: 'Ao final da aula, feche a sessão informando o conteúdo ministrado. Isso gerará um registro legal imutável.',
        position: 'top' as const
      }
    },
    {
      target: '[data-tutorial="help-button"]',
      content: {
        title: 'Ajuda Sempre Disponível',
        description: 'Clique no botão de ajuda para acessar documentação completa, tutoriais em vídeo e suporte.',
        position: 'left' as const
      }
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando dados da sessão...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* Tutorial Overlay */}
      {tutorialActive && (
        <TutorialOverlay
          steps={tutorialSteps}
          onComplete={() => {
            setTutorialActive(false)
            localStorage.setItem('abrir_aula_tutorial_completed', 'true')
          }}
          onSkip={() => {
            setTutorialActive(false)
            localStorage.setItem('abrir_aula_tutorial_completed', 'true')
          }}
        />
      )}

      {/* Help System */}
      {showHelp && (
        <HelpSystem
          onClose={() => setShowHelp(false)}
          initialSection="abrir-aula"
        />
      )}

      {/* Main Workflow Card */}
      <Card data-tutorial="workflow-card" className="border-2 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl font-bold">
                    {session?.turmas?.nome || 'Carregando...'}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(dataAula), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {session?.disciplinas && ` • ${session.disciplinas.nome}`}
                  </CardDescription>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {session && (
                <Badge variant={getStatusBadgeVariant(session.status)} className="flex items-center space-x-1 px-3 py-1">
                  {getStatusIcon(session.status)}
                  <span>{session.status}</span>
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(true)}
                data-tutorial="help-button"
                className="text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Auto-restore content notification */}
          {autoSaveContent && !session?.conteudo_ministrado && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Conteúdo Recuperado</AlertTitle>
              <AlertDescription>
                Encontramos conteúdo salvo automaticamente.
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => setConteudoMinistrado(autoSaveContent)}
                >
                  Clique aqui para restaurar.
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* No Session State */}
          {!session && (
            <div className="text-center py-8 space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <Clock className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Nenhuma sessão criada</h3>
                <p className="text-muted-foreground">
                  Crie uma nova sessão para começar a chamada desta turma.
                </p>
              </div>

              <Button
                onClick={createSession}
                disabled={actionLoading}
                size="lg"
                data-tutorial="create-session"
                className="min-h-[44px] px-8" // Touch-friendly size
              >
                {actionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando Sessão...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Criar Nova Sessão
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Session Exists */}
          {session && (
            <div className="space-y-6">
              {/* Session Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Criada em</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.criada_em), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {session.aberta_em && (
                  <div className="flex items-center space-x-2">
                    <Play className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Aberta em</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.aberta_em), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}

                {session.fechada_em && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Fechada em</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.fechada_em), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-closure warning */}
              {session.status === 'ABERTA' && timeUntilClosure && (
                <Alert variant={timeUntilClosure.includes('passou') ? 'destructive' : 'default'}>
                  <Timer className="h-4 w-4" />
                  <AlertTitle>Fechamento Automático</AlertTitle>
                  <AlertDescription>
                    {timeUntilClosure.includes('passou')
                      ? 'Esta aula deveria ter sido fechada às 18h. Feche-a o quanto antes para manter a conformidade legal.'
                      : `Esta aula será fechada automaticamente ${timeUntilClosure} (18h horário de São Paulo).`
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Legal compliance info */}
              {session.status === 'FECHADA' && session.hash_legal && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Registro Legal Criado</AlertTitle>
                  <AlertDescription>
                    Esta sessão foi fechada e possui hash de integridade legal.
                    Os registros não podem mais ser modificados (princípio "não existe o esquecer").
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {session.status === 'PLANEJADA' && (
                  <>
                    <Button
                      onClick={openSession}
                      disabled={actionLoading}
                      size="lg"
                      data-tutorial="open-session"
                      className="min-h-[44px] flex-1 min-w-[200px]"
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Abrindo...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Abrir Aula
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowCancelDialog(true)}
                      size="lg"
                      className="min-h-[44px]"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </>
                )}

                {session.status === 'ABERTA' && (
                  <>
                    <Button
                      onClick={() => setShowCloseDialog(true)}
                      disabled={actionLoading}
                      size="lg"
                      data-tutorial="close-session"
                      className="min-h-[44px] flex-1 min-w-[200px]"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Fechar Aula
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowCancelDialog(true)}
                      size="lg"
                      className="min-h-[44px]"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </>
                )}

                {(session.status === 'FECHADA' || session.status === 'CANCELADA') && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    <span>Sessão finalizada - Nenhuma ação disponível</span>
                  </div>
                )}
              </div>

              {/* Attendance Grid */}
              {session.status === 'ABERTA' && (
                <div data-tutorial="attendance-grid">
                  <AttendanceGrid
                    sessionId={session.id}
                    turmaId={turmaId}
                    onAttendanceChange={() => {
                      // Refresh session data when attendance changes
                      loadSession()
                    }}
                  />
                </div>
              )}

              {/* Show content if session is closed */}
              {session.conteudo_ministrado && session.status === 'FECHADA' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Conteúdo Ministrado:</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {session.conteudo_ministrado}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close Session Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Fechar Aula</DialogTitle>
            <DialogDescription>
              Informe o conteúdo ministrado nesta aula. Este registro será permanente e não poderá ser alterado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="conteudo">Conteúdo Ministrado *</Label>
              <Textarea
                id="conteudo"
                placeholder="Descreva o conteúdo ministrado nesta aula..."
                value={conteudoMinistrado}
                onChange={(e) => {
                  setConteudoMinistrado(e.target.value)
                  saveContentLocally(e.target.value)
                }}
                className="min-h-[100px] mt-2"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {conteudoMinistrado.length}/1000 caracteres
              </p>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Importante</AlertTitle>
              <AlertDescription>
                Após fechar a aula, os registros não poderão ser modificados conforme a legislação educacional brasileira.
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCloseDialog(false)
                setConteudoMinistrado('')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={closeSession}
              disabled={!conteudoMinistrado.trim() || actionLoading}
            >
              {actionLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Fechando...
                </>
              ) : (
                'Fechar Aula'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Session Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancelar Sessão</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento desta sessão de aula.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
              <Textarea
                id="motivo"
                placeholder="Ex: Reunião pedagógica, falta do professor, problema técnico..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="min-h-[80px] mt-2"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {motivoCancelamento.length}/500 caracteres
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setMotivoCancelamento('')
              }}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={cancelSession}
              disabled={!motivoCancelamento.trim() || actionLoading}
            >
              {actionLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cancelando...
                </>
              ) : (
                'Cancelar Sessão'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}