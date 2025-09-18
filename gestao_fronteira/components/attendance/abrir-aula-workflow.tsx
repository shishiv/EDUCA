'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { classesApi } from '@/lib/api/classes'
import { attendanceApi } from '@/lib/api/attendance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
  GraduationCap,
  Timer,
  Lock,
  Unlock
} from 'lucide-react'
import { toast } from 'sonner'

// Schema for opening a class session
const abrirAulaSchema = z.object({
  turma_id: z.string().uuid(),
  data_aula: z.date(),
  conteudo_programatico: z.string().min(5, 'Conteúdo deve ter pelo menos 5 caracteres'),
  metodologia: z.string().optional(),
  recursos_utilizados: z.string().optional(),
  observacoes: z.string().optional(),
  duracao_minutos: z.number().min(30, 'Aula deve ter pelo menos 30 minutos').max(240, 'Aula não pode exceder 4 horas'),
})

type AbrirAulaFormData = z.infer<typeof abrirAulaSchema>

interface AbrirAulaWorkflowProps {
  classId: string
  teacherId: string
  onSessionOpened?: (sessionData: any) => void
  onCancel?: () => void
  className?: string
}

export function AbrirAulaWorkflow({
  classId,
  teacherId,
  onSessionOpened,
  onCancel,
  className
}: AbrirAulaWorkflowProps) {
  const [loading, setLoading] = useState(false)
  const [classData, setClassData] = useState<any>(null)
  const [existingSession, setExistingSession] = useState<any>(null)
  const [sessionStatus, setSessionStatus] = useState<'none' | 'open' | 'closed'>('none')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<AbrirAulaFormData>({
    resolver: zodResolver(abrirAulaSchema),
    defaultValues: {
      turma_id: classId,
      data_aula: new Date(),
      conteudo_programatico: '',
      metodologia: '',
      recursos_utilizados: '',
      observacoes: '',
      duracao_minutos: 50, // Default 50-minute class
    }
  })

  const watchedData = watch()

  // Load class data and check for existing session
  useEffect(() => {
    const loadData = async () => {
      try {
        const classInfo = await classesApi.getById(classId)
        setClassData(classInfo)

        // Check if there's an existing session for today
        const today = new Date().toISOString().split('T')[0]
        const session = await attendanceApi.getSessionByDate(classId, today)

        if (session) {
          setExistingSession(session)
          setSessionStatus(session.status === 'aberta' ? 'open' : session.status === 'fechada' ? 'closed' : 'none')
        }
      } catch (error) {
        // console.error('Error loading class data:', error)
        toast.error('Erro ao carregar dados da turma')
      }
    }

    loadData()
  }, [classId])

  const onSubmit = async (data: AbrirAulaFormData) => {
    setLoading(true)
    try {
      // Create attendance session
      const sessionData = {
        ...data,
        data_aula: data.data_aula.toISOString().split('T')[0],
        professor_id: teacherId,
        status: 'aberta' as const,
        inicio_aula: new Date().toISOString()
      }

      const createdSession = await attendanceApi.createSession(sessionData)
      setExistingSession(createdSession)

      setSessionStatus('open')
      toast.success('Aula aberta com sucesso! Agora você pode marcar a presença dos alunos.')

      onSessionOpened?.(sessionData)
    } catch (error) {
      // console.error('Error opening class session:', error)
      toast.error('Erro ao abrir aula')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseSession = async () => {
    setLoading(true)
    try {
      if (existingSession) {
        await attendanceApi.closeSession(existingSession.id)
        setSessionStatus('closed')
        toast.success('Aula finalizada com sucesso!')
      }
    } catch (error) {
      // console.error('Error closing session:', error)
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

  if (!classData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Carregando dados da turma...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show session status if already opened
  if (sessionStatus === 'open') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Unlock className="h-5 w-5" />
            Aula em Andamento
          </CardTitle>
          <CardDescription>
            Aula aberta para {classData.nome} - {getCurrentDate()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Sessão Ativa</span>
                  <Badge variant="outline" className="bg-green-100 border-green-300 text-green-700">
                    <Timer className="h-3 w-3 mr-1" />
                    {getCurrentTime()}
                  </Badge>
                </div>
                <div className="text-sm text-green-700">
                  <p><strong>Conteúdo:</strong> {watchedData.conteudo_programatico}</p>
                  <p><strong>Duração prevista:</strong> {watchedData.duracao_minutos} minutos</p>
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>IMPORTANTE:</strong> Agora você pode proceder com a marcação de presença.
              Após marcar a presença de todos os alunos, finalize a aula para completar o processo.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onSessionOpened?.({ status: 'open' })}
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

  // Show closed session status
  if (sessionStatus === 'closed') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Lock className="h-5 w-5" />
            Aula Finalizada
          </CardTitle>
          <CardDescription>
            Sessão encerrada para {classData.nome} - {getCurrentDate()}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">Sessão Encerrada</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              A aula foi finalizada e os registros de presença estão bloqueados para alterações.
              Este é o documento oficial de frequência.
            </p>
          </div>

          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Comprovante Legal:</strong> O registro de presença desta aula
              está salvo permanentemente e serve como documento oficial conforme
              a legislação educacional brasileira.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Show form to open new session
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Abrir Aula - {classData.nome}
        </CardTitle>
        <CardDescription>
          Inicie uma nova sessão de aula para marcar presença dos alunos
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Session Information */}
          <div className="space-y-4">
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
          </div>

          {/* Class Content */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Plano de Aula
            </Label>

            <div className="space-y-4">
              <div>
                <Label htmlFor="conteudo_programatico">
                  Conteúdo Programático *
                </Label>
                <Textarea
                  id="conteudo_programatico"
                  {...register('conteudo_programatico')}
                  placeholder="Descreva o conteúdo que será abordado nesta aula..."
                  disabled={loading}
                  rows={3}
                  className="mt-1"
                />
                {errors.conteudo_programatico && (
                  <p className="text-sm text-red-600 mt-1">{errors.conteudo_programatico.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="metodologia">
                    Metodologia
                  </Label>
                  <Input
                    id="metodologia"
                    {...register('metodologia')}
                    placeholder="Ex: Aula expositiva, atividade prática"
                    disabled={loading}
                    className="mt-1"
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
                  Recursos Utilizados
                </Label>
                <Input
                  id="recursos_utilizados"
                  {...register('recursos_utilizados')}
                  placeholder="Ex: Quadro, livro didático, computador, projetor"
                  disabled={loading}
                  className="mt-1"
                />
                {errors.recursos_utilizados && (
                  <p className="text-sm text-red-600 mt-1">{errors.recursos_utilizados.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="observacoes">
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  {...register('observacoes')}
                  placeholder="Anotações adicionais sobre a aula (opcional)"
                  disabled={loading}
                  rows={2}
                  className="mt-1"
                />
                {errors.observacoes && (
                  <p className="text-sm text-red-600 mt-1">{errors.observacoes.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Legal Compliance Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>IMPORTANTE - Conformidade Legal:</strong><br />
              • Ao abrir esta aula, você iniciará o processo de registro oficial de presença<br />
              • Os dados inseridos farão parte do diário de classe oficial<br />
              • Após finalizar a aula, os registros não poderão ser alterados (não existe o "esquecer")<br />
              • Este processo atende às exigências da legislação educacional brasileira
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <LoadingButton
              type="submit"
              loading={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Unlock className="h-4 w-4 mr-2" />
              Abrir Aula
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
        </form>
      </CardContent>
    </Card>
  )
}