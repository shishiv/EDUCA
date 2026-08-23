'use client'
import { useTranslations } from 'next-intl'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { classesApi } from '@/lib/api/classes'
import { schoolsApi } from '@/lib/api/schools'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { LoadingButton } from '@/components/ui/loading-states'
import {
  User,
  Users,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  UserPlus,
  UserMinus,
  School,
  Calendar,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface TeacherOption {
  id: string
  nome: string
  email: string | null
}

interface TeacherClassData {
  id: string
  nome: string
  serie: string
  turno: string
  ano_letivo: number
}

interface TeacherAssignmentProps {
  classId: string
  currentTeacherId?: string
  schoolId: string
  onAssignmentChange?: (teacherId: string | null) => void
  className?: string
}

export function TeacherAssignment({
  classId,
  currentTeacherId,
  schoolId,
  onAssignmentChange,
  className
}: TeacherAssignmentProps) {
  const t = useTranslations('registry')
  const [loading, setLoading] = useState(false)
  const [selectedTeacherId, setSelectedTeacherId] = useState(currentTeacherId || '')
  const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>([])
  const [classData, setClassData] = useState<TeacherClassData | null>(null)
  const [currentTeacher, setCurrentTeacher] = useState<TeacherOption | null>(null)
  const queryClient = useQueryClient()

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teachers, classInfo] = await Promise.all([
          schoolsApi.getAvailableTeachers(schoolId),
          classesApi.getById<TeacherClassData>(classId)
        ])

        setAvailableTeachers(teachers)
        setClassData(classInfo)

        // Find current teacher details
        if (currentTeacherId) {
          const teacher = teachers.find(t => t.id === currentTeacherId)
          setCurrentTeacher(teacher ?? null)
        }
      } catch (error) {
        toast.error(t('ui.erro-ao-carregar-dados'))
      }
    }

    loadData()
  }, [classId, schoolId, currentTeacherId, t])

  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) return

    setLoading(true)
    try {
      await classesApi.assignTeacher(classId, selectedTeacherId)

      const assignedTeacher = availableTeachers.find(t => t.id === selectedTeacherId)
      setCurrentTeacher(assignedTeacher ?? null)

      toast.success(`Professor titular ${assignedTeacher?.nome} definido com sucesso!`)

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      onAssignmentChange?.(selectedTeacherId)
    } catch (error) {
      toast.error(t('ui.erro-ao-atribuir-professor'))
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTeacher = async () => {
    setLoading(true)
    try {
      await classesApi.assignTeacher(classId, null)

      setCurrentTeacher(null)
      setSelectedTeacherId('')

      toast.success(t('ui.professor-titular-removido-da-turma-com-sucesso'))

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      onAssignmentChange?.(null)
    } catch (error) {
      toast.error(t('ui.erro-ao-remover-professor'))
    } finally {
      setLoading(false)
    }
  }

  const getSelectedTeacher = () => {
    return availableTeachers.find(t => t.id === selectedTeacherId)
  }

  if (!classData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <GraduationCap className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">{t('labels.carregando-dados-da-turma')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          {t('ui.professor-titular-da-turma')}
        </CardTitle>
        <CardDescription>
          {t('ui.defina-o-professor-titular-da-turma')} {classData?.nome}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Class Information */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <School className="h-4 w-4" />
            {t('labels.informacoes-da-turma')}
          </h4>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">{t('labels.nome')}</span>
                <p>{classData.nome}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('labels.serie-2')}</span>
                <p>{classData.serie}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('labels.turno-2')}</span>
                <Badge variant="outline" className="bg-blue-50 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {classData.turno}
                </Badge>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('labels.ano-letivo-3')}</span>
                <Badge variant="outline" className="bg-green-50 border-green-200">
                  <Calendar className="h-3 w-3 mr-1" />
                  {classData.ano_letivo}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Current Teacher Status */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('ui.professor-atual')}
          </h4>

          {currentTeacher ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">{t('labels.professor-titular-definido')}</span>
                  </div>
                  <div className="text-sm text-green-700">
                    <p className="font-medium">{currentTeacher.nome}</p>
                    <p>{currentTeacher.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveTeacher}
                  disabled={loading}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800">{t('labels.nenhum-professor-titular-definido')}</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                {t('ui.defina-um-professor-titular-para-abrir-e-registrar-a-chamada-desta-turma')}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Teacher Assignment */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            {currentTeacher ? t('ui.alterar-professor-titular') : t('ui.definir-professor-titular')}
          </h4>

          {availableTeachers.length > 0 ? (
            <div className="space-y-4">
              <Select
                value={selectedTeacherId}
                onValueChange={setSelectedTeacherId}
                disabled={loading}
              >
                <SelectTrigger id="professor" aria-label={t('labels.professor-titular')}>
                  <SelectValue placeholder={t('labels.selecione-um-professor')} />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      <div className="flex flex-col">
                        <span>{teacher.nome}</span>
                        <span className="text-xs text-gray-500">{teacher.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTeacherId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">{t('labels.professor-selecionado')}</span>{' '}
                    {getSelectedTeacher()?.nome}
                  </p>
                  <p className="text-sm text-blue-600">{getSelectedTeacher()?.email}</p>
                </div>
              )}

              <div className="flex gap-3">
                <LoadingButton
                  onClick={handleAssignTeacher}
                  loading={loading}
                  disabled={!selectedTeacherId || selectedTeacherId === currentTeacherId}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {currentTeacher ? t('ui.alterar-professor-titular') : t('ui.definir-professor-titular')}
                </LoadingButton>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('ui.nenhum-professor-disponivel-para-atribuicao-nesta-escola-cadastre-profes')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Assignment Guidelines */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">{t('labels.orientacoes')}</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>{t('labels.apenas-professores-cadastrados-na-mesma-escola-podem-ser-tit')}</p>
            <p>{t('labels.um-professor-pode-ser-titular-de-mais-de-uma-turma')}</p>
            <p>{t('labels.o-professor-titular-pode-abrir-e-registrar-a-chamada-da-turm')}</p>
            <p>{t('labels.a-turma-tem-um-unico-professor-titular-no-piloto')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
