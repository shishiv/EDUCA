'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { classesApi } from '@/lib/api/classes'
import { AbrirAulaWorkflow } from '@/components/attendance/abrir-aula-workflow'
import { AbrirAulaButton } from '@/components/attendance/abrir-aula-button'
import { AulaStatusIndicatorEnhanced as AulaStatusIndicator } from '@/components/attendance/aula-status-indicator-enhanced'
import { AttendanceMarkingMobile } from '@/components/attendance/attendance-marking-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Search
} from 'lucide-react'
import { toast } from 'sonner'

interface AttendancePageState {
  step: 'class-selection' | 'workflow' | 'marking' | 'completed'
  selectedClass?: any
  sessionData?: any
  attendanceRecords?: any[]
}

interface ClassInfo {
  id: string
  nome: string
  serie: string
  escola?: {
    id: string
    nome: string
  }
  professor?: {
    id: string
    nome: string
  }
  total_alunos: number
}

export default function FrequenciaPage() {
  const { user } = useAuth()
  const [pageState, setPageState] = useState<AttendancePageState>({
    step: 'class-selection'
  })
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadTeacherClasses()
  }, [])

  const loadTeacherClasses = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get classes assigned to the current teacher
      const teacherClasses = await classesApi.getClassesByTeacher(user.id)
      const formattedClasses: ClassInfo[] = teacherClasses.map(tc => ({
        id: (tc as any).id ?? '',
        nome: (tc as any).nome ?? '',
        serie: (tc as any).serie ?? '',
        escola: tc.escola ? {
          id: tc.escola.id,
          nome: tc.escola.nome
        } : undefined,
        professor: tc.professor ? {
          id: tc.professor.id,
          nome: tc.professor.nome
        } : undefined,
        total_alunos: tc._count?.students || 0
      }))
      setClasses(formattedClasses)
    } catch (error) {
      // console.error('Error loading teacher classes:', error)
      toast.error('Erro ao carregar suas turmas')
    } finally {
      setLoading(false)
    }
  }

  const handleClassSelection = (classInfo: ClassInfo) => {
    setPageState({
      step: 'workflow',
      selectedClass: classInfo
    })
  }

  const handleAulaOpened = (sessionData: any, classInfo: ClassInfo) => {
    setPageState({
      step: 'marking',
      selectedClass: classInfo,
      sessionData
    })
  }

  const handleSessionOpened = (sessionData: any) => {
    setPageState({
      ...pageState,
      step: 'marking',
      sessionData
    })
  }

  const handleAttendanceSaved = (records: any[]) => {
    setPageState({
      ...pageState,
      step: 'completed',
      attendanceRecords: records
    })
  }

  const handleGoBack = () => {
    if (pageState.step === 'workflow') {
      setPageState({ step: 'class-selection' })
    } else if (pageState.step === 'marking') {
      setPageState({
        step: 'workflow',
        selectedClass: pageState.selectedClass
      })
    } else if (pageState.step === 'completed') {
      setPageState({ step: 'class-selection' })
    }
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

  const filteredClasses = classes.filter(classInfo => {
    const matchesSearch = classInfo.nome.toLowerCase().includes(search.toLowerCase()) ||
                         classInfo.escola?.nome.toLowerCase().includes(search.toLowerCase()) ||
                         classInfo.professor?.nome.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Workflow step: Abrir Aula
  if (pageState.step === 'workflow' && pageState.selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Frequência - {pageState.selectedClass.nome}
            </h1>
            <p className="text-gray-600">
              {pageState.selectedClass.escola.nome} • {getCurrentDate()}
            </p>
          </div>
        </div>

        {/* Status da aula em tempo real */}
        <AulaStatusIndicator
          turmaId={pageState.selectedClass.id}
          professorId={user?.id || ''}
          className="mb-6"
        />

        <AbrirAulaWorkflow
          classId={pageState.selectedClass.id}
          teacherId={user?.id || ''}
          onSessionOpened={handleSessionOpened}
          onCancel={handleGoBack}
        />
      </div>
    )
  }

  // Marking step: Mark Attendance
  if (pageState.step === 'marking' && pageState.selectedClass && pageState.sessionData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Plano de Aula
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Marcar Presença - {pageState.selectedClass.nome}
            </h1>
            <p className="text-gray-600">
              {pageState.selectedClass.escola.nome} • {getCurrentDate()}
            </p>
          </div>
        </div>

        <AttendanceMarkingMobile
          classId={pageState.selectedClass.id}
          sessionId={pageState.sessionData.id || 'mock-session'}
          sessionDate={new Date().toISOString().split('T')[0]}
          onSave={handleAttendanceSaved}
          onCancel={handleGoBack}
        />
      </div>
    )
  }

  // Completed step: Show success
  if (pageState.step === 'completed') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Frequência Registrada com Sucesso!
          </h1>
          <p className="text-gray-600 mb-6">
            A presença foi salva e os registros estão bloqueados para alterações.
          </p>
          <Button onClick={() => setPageState({ step: 'class-selection' })}>
            <Calendar className="h-4 w-4 mr-2" />
            Registrar Nova Frequência
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Documento Legal:</strong> Este registro de frequência serve como documento oficial
            conforme a legislação educacional brasileira e não pode mais ser alterado.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Class selection step (default)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle de Frequência</h1>
          <p className="text-gray-600 mt-1">
            Selecione uma turma para iniciar o registro de presença
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>{getCurrentDate()}</span>
        </div>
      </div>

      {/* Legal Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Processo de Frequência:</strong> Você irá primeiro abrir a aula com o plano de conteúdo,
          depois marcar a presença dos alunos. Após salvar, os registros ficam imutáveis por lei.
        </AlertDescription>
      </Alert>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Turmas</CardTitle>
          <CardDescription>
            Turmas atribuídas para você lecionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por turma, escola..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Classes List */}
      <div className="grid gap-4">
        {filteredClasses.map((classInfo) => (
          <Card key={classInfo.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header da turma */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {classInfo.nome} - {classInfo.serie}
                      </h3>
                      <p className="text-gray-600">{classInfo.escola?.nome}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {classInfo.total_alunos} alunos
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleClassSelection(classInfo)}
                    className="shrink-0"
                  >
                    Ver Detalhes
                  </Button>
                </div>

                {/* Status da aula em tempo real */}
                <AulaStatusIndicator
                  turmaId={classInfo.id}
                  professorId={user?.id || ''}
                  className="mb-2"
                />

                {/* Botão para abrir aula diretamente */}
                <div className="flex items-center gap-3">
                  <AbrirAulaButton
                    turmaId={classInfo.id}
                    professorId={user?.id || ''}
                    turmaNome={`${classInfo.nome} - ${classInfo.serie}`}
                    onSuccess={(sessionData) => handleAulaOpened(sessionData, classInfo)}
                    onError={(error) => {
                      console.error('Erro ao abrir aula:', error)
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredClasses.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {classes.length === 0
                  ? 'Nenhuma turma atribuída para você'
                  : 'Nenhuma turma encontrada para os filtros aplicados'
                }
              </p>
              <p className="text-sm text-gray-400">
                {classes.length === 0
                  ? 'Entre em contato com a coordenação para atribuição de turmas'
                  : 'Tente ajustar os filtros de busca'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}