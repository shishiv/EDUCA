'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { classesApi } from '@/lib/api/classes'
import { attendanceApi } from '@/lib/api/attendance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { LoadingButton } from '@/components/ui/loading-states'
import {
  BookOpen,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  FileText,
  Timer,
  Lock,
  Unlock,
  Shield,
  Eye,
  AlertTriangle,
  Gavel,
  ClipboardCheck,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Enhanced schema with Brazilian educational compliance
const abrirAulaSchema = z.object({
  turma_id: z.string().uuid(),
  data_aula: z.date(),
  conteudo_programatico: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  metodologia: z.string().min(5, 'Metodologia é obrigatória'),
  recursos_utilizados: z.string().min(3, 'Recursos utilizados são obrigatórios'),
  observacoes: z.string().optional(),
  duracao_minutos: z.number().min(30, 'Aula deve ter pelo menos 30 minutos').max(240, 'Aula não pode exceder 4 horas'),
  objetivo_aula: z.string().min(10, 'Objetivo da aula é obrigatório'),
  atividade_avaliativa: z.boolean().default(false),
  conteudo_bncc: z.string().optional(),
  professor_confirmacao: z.boolean().refine(val => val === true, 'Confirmação do professor é obrigatória')
})

type AbrirAulaFormData = z.infer<typeof abrirAulaSchema>

interface SessionPhase {
  phase: 'preparation' | 'active' | 'closing' | 'locked'
  label: string
  description: string
  color: string
  icon: React.ReactNode
}

interface TimeConstraints {
  canStart: boolean
  canModify: boolean
  autoLockTime: Date
  timeRemaining: number
  warningThreshold: number
}

interface AbrirAulaWorkflowProps {
  classId: string
  teacherId: string
  onSessionOpened?: (sessionData: any) => void
  onCancel?: () => void
  className?: string
}

export function EnhancedAbrirAulaLegalWorkflow({
  classId,
  teacherId,
  onSessionOpened,
  onCancel,
  className
}: AbrirAulaWorkflowProps) {
  const [loading, setLoading] = useState(false)
  const [classData, setClassData] = useState<any>(null)
  const [existingSession, setExistingSession] = useState<any>(null)
  const [currentPhase, setCurrentPhase] = useState<SessionPhase['phase']>('preparation')
  const [timeConstraints, setTimeConstraints] = useState<TimeConstraints | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [legalAcknowledged, setLegalAcknowledged] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    trigger
  } = useForm<AbrirAulaFormData>({
    resolver: zodResolver(abrirAulaSchema),
    defaultValues: {
      turma_id: classId,
      data_aula: new Date(),
      conteudo_programatico: '',
      metodologia: '',
      recursos_utilizados: '',
      observacoes: '',
      duracao_minutos: 50,
      objetivo_aula: '',
      atividade_avaliativa: false,
      conteudo_bncc: '',
      professor_confirmacao: false
    }
  })

  const watchedData = watch()

  // Session phases configuration
  const sessionPhases: Record<SessionPhase['phase'], SessionPhase> = {
    preparation: {
      phase: 'preparation',
      label: 'Preparação',
      description: 'Planejamento da aula e preenchimento do plano',
      color: 'blue',
      icon: <BookOpen className="h-4 w-4" />
    },
    active: {
      phase: 'active',
      label: 'Aula Ativa',
      description: 'Aula em andamento, chamada disponível',
      color: 'green',
      icon: <Unlock className="h-4 w-4" />
    },
    closing: {
      phase: 'closing',
      label: 'Finalizando',
      description: 'Processo de fechamento da aula',
      color: 'orange',
      icon: <Timer className="h-4 w-4" />
    },
    locked: {
      phase: 'locked',
      label: 'Finalizada',
      description: 'Aula encerrada, registros bloqueados',
      color: 'red',
      icon: <Lock className="h-4 w-4" />
    }
  }

  // Calculate time constraints
  const calculateTimeConstraints = useCallback(() => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Brazilian educational time constraints
    const autoLockHour = 18 // 18:00 (6 PM)
    const autoLockTime = new Date()
    autoLockTime.setHours(autoLockHour, 0, 0, 0)

    // If past 18:00, set for next day
    if (currentHour >= autoLockHour) {
      autoLockTime.setDate(autoLockTime.getDate() + 1)
    }

    const timeRemaining = autoLockTime.getTime() - now.getTime()
    const warningThreshold = 30 * 60 * 1000 // 30 minutes in milliseconds

    const constraints: TimeConstraints = {
      canStart: currentHour >= 7 && currentHour < 18, // 7 AM to 6 PM
      canModify: currentHour < 18,
      autoLockTime,
      timeRemaining,
      warningThreshold
    }

    setTimeConstraints(constraints)
    return constraints
  }, [])

  // Real-time time monitoring
  useEffect(() => {
    calculateTimeConstraints()
    const interval = setInterval(() => {
      const constraints = calculateTimeConstraints()

      // Auto-lock check
      if (constraints.timeRemaining <= 0 && currentPhase !== 'locked') {
        handleAutoLock()
      }

      // Warning notifications
      if (constraints.timeRemaining <= constraints.warningThreshold &&
          constraints.timeRemaining > 0 &&
          currentPhase === 'active') {
        toast.warning('⚠️ Atenção: Sistema será bloqueado automaticamente às 18:00')
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [currentPhase])

  // Load class data and check existing session
  useEffect(() => {
    const loadData = async () => {
      try {
        const classInfo = await classesApi.getById(classId)
        setClassData(classInfo)

        // Check existing session
        const today = new Date().toISOString().split('T')[0]
        const session = await attendanceApi.getSessionByDate(classId, today)

        if (session) {
          setExistingSession(session)
          determineCurrentPhase(session)
        }
      } catch (error) {
        console.error('Error loading class data:', error)
        toast.error('Erro ao carregar dados da turma')
      }
    }

    loadData()
  }, [classId])

  const determineCurrentPhase = (session: any) => {
    if (session.status === 'finalizada' || session.bloqueado) {
      setCurrentPhase('locked')
    } else if (session.status === 'ativa') {
      setCurrentPhase('active')
      setSessionStarted(true)
    } else if (session.status === 'preparacao') {
      setCurrentPhase('preparation')
    }
  }

  const handleAutoLock = async () => {
    try {
      if (existingSession && currentPhase !== 'locked') {
        await attendanceApi.autoLockSession(existingSession.id, {
          reason: 'AUTO_LOCK_18H',
          timestamp: new Date().toISOString(),
          legal_compliance: true
        })

        setCurrentPhase('locked')
        toast.error('🔒 Sistema bloqueado automaticamente às 18:00 conforme legislação educacional')
      }
    } catch (error) {
      console.error('Auto-lock error:', error)
    }
  }

  const validateBrazilianEducationalCompliance = () => {
    const errors: string[] = []
    const now = new Date()

    // Time validation
    if (!timeConstraints?.canStart) {
      errors.push('Aulas só podem ser abertas entre 7:00 e 18:00')
    }

    // Content validation
    if (!watchedData.conteudo_programatico || watchedData.conteudo_programatico.length < 10) {
      errors.push('Conteúdo programático deve ter descrição detalhada')
    }

    if (!watchedData.metodologia || watchedData.metodologia.length < 5) {
      errors.push('Metodologia é obrigatória para conformidade BNCC')
    }

    if (!watchedData.objetivo_aula || watchedData.objetivo_aula.length < 10) {
      errors.push('Objetivo da aula é obrigatório para registro oficial')
    }

    // Legal acknowledgment
    if (!legalAcknowledged) {
      errors.push('Confirmação legal é obrigatória')
    }

    if (!watchedData.professor_confirmacao) {
      errors.push('Confirmação do professor é obrigatória')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const onSubmit = async (data: AbrirAulaFormData) => {
    setLoading(true)

    try {
      // Validate compliance
      if (!validateBrazilianEducationalCompliance()) {
        toast.error('Preencha todos os campos obrigatórios para conformidade legal')
        return
      }

      // Create session with enhanced data
      const sessionData = {
        ...data,
        data_aula: data.data_aula.toISOString().split('T')[0],
        professor_id: teacherId,
        status: 'ativa' as const,
        inicio_aula: new Date().toISOString(),
        fase: 'chamada',
        legal_compliance: {
          acknowledged_at: new Date().toISOString(),
          non_retroactive_principle: true,
          professor_confirmation: true,
          auto_lock_time: timeConstraints?.autoLockTime.toISOString(),
          creation_timestamp: new Date().toISOString()
        },
        metadata: {
          user_agent: navigator.userAgent,
          ip_timestamp: new Date().toISOString(),
          brazilian_timezone: 'America/Sao_Paulo'
        }
      }

      const createdSession = await attendanceApi.createSession(sessionData)
      setExistingSession(createdSession)
      setCurrentPhase('active')
      setSessionStarted(true)

      toast.success('✅ Aula aberta com sucesso! Agora você pode marcar a presença dos alunos.')

      // Create audit log entry
      await attendanceApi.createAuditLog({
        session_id: createdSession.id,
        action: 'SESSION_OPENED',
        details: 'Sessão de aula aberta conforme legislação educacional brasileira',
        timestamp: new Date().toISOString(),
        user_id: teacherId
      })

      onSessionOpened?.(sessionData)
    } catch (error) {
      console.error('Error opening class session:', error)
      toast.error('Erro ao abrir aula')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseSession = async () => {
    if (!existingSession) return

    setLoading(true)
    try {
      setCurrentPhase('closing')

      await attendanceApi.closeSession(existingSession.id, {
        closed_at: new Date().toISOString(),
        final_status: 'finalizada',
        professor_confirmation: true,
        legal_lock: true
      })

      setCurrentPhase('locked')
      toast.success('🔒 Aula finalizada com sucesso! Registros bloqueados permanentemente.')

      // Create audit log
      await attendanceApi.createAuditLog({
        session_id: existingSession.id,
        action: 'SESSION_CLOSED',
        details: 'Sessão encerrada pelo professor com bloqueio legal',
        timestamp: new Date().toISOString(),
        user_id: teacherId
      })
    } catch (error) {
      console.error('Error closing session:', error)
      setCurrentPhase('active') // Revert on error
      toast.error('Erro ao finalizar aula')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo'
    })
  }

  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (!classData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="h-8 w-8 mx-auto text-gray-400 mb-2 animate-pulse" />
              <p className="text-sm text-gray-500">Carregando dados da turma...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentPhaseInfo = sessionPhases[currentPhase]

  // Show active session interface
  if (currentPhase === 'active') {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Unlock className="h-5 w-5" />
              Aula em Andamento
            </CardTitle>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              <Timer className="h-3 w-3 mr-1" />
              {getCurrentTime()}
            </Badge>
          </div>
          <CardDescription>
            {classData.nome} - {getCurrentDate()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Phase Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso da Sessão</span>
              <span>Fase: Chamada Ativa</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>

          {/* Time Warning */}
          {timeConstraints && timeConstraints.timeRemaining <= timeConstraints.warningThreshold && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Aviso de Tempo:</strong> Sistema será bloqueado automaticamente às 18:00.
                Tempo restante: {formatTimeRemaining(timeConstraints.timeRemaining)}
              </AlertDescription>
            </Alert>
          )}

          {/* Session Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Sessão Ativa Confirmada</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-700">
                <div>
                  <strong>Conteúdo:</strong> {watchedData.conteudo_programatico}
                </div>
                <div>
                  <strong>Duração:</strong> {watchedData.duracao_minutos} minutos
                </div>
                <div>
                  <strong>Metodologia:</strong> {watchedData.metodologia}
                </div>
                <div>
                  <strong>Objetivo:</strong> {watchedData.objetivo_aula}
                </div>
              </div>
            </div>
          </div>

          {/* Legal Compliance Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-blue-800">Conformidade Legal Ativa</div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Princípio "não existe o esquecer" ativo
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Registro de auditoria criado
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Timestamp legal certificado
                  </li>
                  <li className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Bloqueio automático às 18:00
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onSessionOpened?.({ status: 'active' })}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              Marcar Presença
            </Button>

            <LoadingButton
              onClick={handleCloseSession}
              loading={loading}
              variant="default"
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Lock className="h-4 w-4 mr-2" />
              Finalizar Aula
            </LoadingButton>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show locked session status
  if (currentPhase === 'locked') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Lock className="h-5 w-5" />
            Aula Finalizada
          </CardTitle>
          <CardDescription>
            Sessão encerrada - {classData.nome} - {getCurrentDate()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">Sessão Permanentemente Encerrada</span>
            </div>
            <p className="text-sm text-red-700">
              A aula foi finalizada e os registros de presença estão bloqueados para alterações.
              Este é o documento oficial de frequência conforme legislação brasileira.
            </p>
          </div>

          <Alert>
            <Gavel className="h-4 w-4" />
            <AlertDescription>
              <strong>Documento Legal:</strong> O registro de presença desta aula
              está salvo permanentemente e serve como documento oficial conforme
              a legislação educacional brasileira e princípio "não existe o esquecer".
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Show form to open new session (preparation phase)
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Abrir Aula - {classData.nome}
            </CardTitle>
            <CardDescription>
              Planejamento e abertura de sessão legal de aula
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
            <currentPhaseInfo.icon />
            {currentPhaseInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Time Constraints Warning */}
        {timeConstraints && !timeConstraints.canStart && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Horário Não Permitido:</strong> Aulas só podem ser abertas entre 7:00 e 18:00
              conforme regulamentação educacional brasileira.
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Pendências para conformidade:</strong>
              <ul className="mt-1 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Session Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700">Turma:</span>
                <p className="text-blue-800">{classData.nome}</p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Data:</span>
                <p className="text-blue-800">{getCurrentDate()}</p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Horário:</span>
                <Badge variant="outline" className="bg-blue-100 border-blue-300 text-blue-700">
                  <Clock className="h-3 w-3 mr-1" />
                  {getCurrentTime()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Enhanced Educational Planning */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Plano de Aula Detalhado
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="objetivo_aula">
                  Objetivo da Aula *
                </Label>
                <Textarea
                  id="objetivo_aula"
                  {...register('objetivo_aula')}
                  placeholder="Objetivo específico da aula conforme BNCC..."
                  disabled={loading}
                  rows={2}
                  className="mt-1"
                />
                {errors.objetivo_aula && (
                  <p className="text-sm text-red-600 mt-1">{errors.objetivo_aula.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="conteudo_bncc">
                  Código BNCC (opcional)
                </Label>
                <Input
                  id="conteudo_bncc"
                  {...register('conteudo_bncc')}
                  placeholder="Ex: EF05LP01, EF05MA01"
                  disabled={loading}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="conteudo_programatico">
                Conteúdo Programático *
              </Label>
              <Textarea
                id="conteudo_programatico"
                {...register('conteudo_programatico')}
                placeholder="Descreva detalhadamente o conteúdo que será abordado..."
                disabled={loading}
                rows={3}
                className="mt-1"
                onChange={() => trigger('conteudo_programatico')}
              />
              {errors.conteudo_programatico && (
                <p className="text-sm text-red-600 mt-1">{errors.conteudo_programatico.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="metodologia">
                  Metodologia *
                </Label>
                <Input
                  id="metodologia"
                  {...register('metodologia')}
                  placeholder="Ex: Aula expositiva, atividade prática"
                  disabled={loading}
                  className="mt-1"
                  onChange={() => trigger('metodologia')}
                />
                {errors.metodologia && (
                  <p className="text-sm text-red-600 mt-1">{errors.metodologia.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="duracao_minutos">
                  Duração (minutos) *
                </Label>
                <Input
                  id="duracao_minutos"
                  type="number"
                  {...register('duracao_minutos', { valueAsNumber: true })}
                  min={30}
                  max={240}
                  disabled={loading}
                  className="mt-1"
                />
                {errors.duracao_minutos && (
                  <p className="text-sm text-red-600 mt-1">{errors.duracao_minutos.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="recursos_utilizados">
                Recursos Utilizados *
              </Label>
              <Input
                id="recursos_utilizados"
                {...register('recursos_utilizados')}
                placeholder="Ex: Quadro, livro didático, computador, projetor"
                disabled={loading}
                className="mt-1"
                onChange={() => trigger('recursos_utilizados')}
              />
              {errors.recursos_utilizados && (
                <p className="text-sm text-red-600 mt-1">{errors.recursos_utilizados.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="atividade_avaliativa"
                {...register('atividade_avaliativa')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="atividade_avaliativa" className="text-sm">
                Esta aula inclui atividade avaliativa
              </Label>
            </div>
          </div>

          <Separator />

          {/* Legal Compliance Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2 text-red-700">
              <Gavel className="h-4 w-4" />
              Conformidade Legal Obrigatória
            </Label>

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Legislação Educacional Brasileira:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• <strong>Princípio "não existe o esquecer":</strong> Registros não podem ser alterados após finalização</li>
                  <li>• <strong>Bloqueio automático:</strong> Sistema bloqueia automaticamente às 18:00</li>
                  <li>• <strong>Auditoria obrigatória:</strong> Todos os registros são auditados conforme LGPD</li>
                  <li>• <strong>Documento oficial:</strong> Registro constitui documento legal oficial</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="legal-acknowledgment"
                  checked={legalAcknowledged}
                  onChange={(e) => setLegalAcknowledged(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="legal-acknowledgment" className="text-sm font-medium">
                  Estou ciente das implicações legais e responsabilidades
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="professor_confirmacao"
                  {...register('professor_confirmacao')}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="professor_confirmacao" className="text-sm font-medium">
                  Confirmo que sou o professor responsável e autorizo a abertura da aula
                </Label>
              </div>
              {errors.professor_confirmacao && (
                <p className="text-sm text-red-600">{errors.professor_confirmacao.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <LoadingButton
              type="submit"
              loading={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={!timeConstraints?.canStart || !legalAcknowledged}
            >
              <Unlock className="h-4 w-4 mr-2" />
              Abrir Aula Oficialmente
            </LoadingButton>

            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>

          {/* Time Remaining Display */}
          {timeConstraints && timeConstraints.timeRemaining > 0 && (
            <div className="text-center text-sm text-gray-600">
              <Clock className="h-4 w-4 inline mr-1" />
              Tempo restante para bloqueio automático: {formatTimeRemaining(timeConstraints.timeRemaining)}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}