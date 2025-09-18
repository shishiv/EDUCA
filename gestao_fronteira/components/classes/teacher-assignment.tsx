'use client'

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
  const [loading, setLoading] = useState(false)
  const [selectedTeacherId, setSelectedTeacherId] = useState(currentTeacherId || '')
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([])
  const [classData, setClassData] = useState<any>(null)
  const [currentTeacher, setCurrentTeacher] = useState<any>(null)
  const queryClient = useQueryClient()

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teachers, classInfo] = await Promise.all([
          schoolsApi.getAvailableTeachers(schoolId),
          classesApi.getById(classId)
        ])

        setAvailableTeachers(teachers)
        setClassData(classInfo)

        // Find current teacher details
        if (currentTeacherId) {
          const teacher = teachers.find(t => t.id === currentTeacherId)
          setCurrentTeacher(teacher)
        }
      } catch (error) {
        // console.error('Error loading data:', error)
        toast.error('Erro ao carregar dados')
      }
    }

    loadData()
  }, [classId, schoolId, currentTeacherId])

  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) return

    setLoading(true)
    try {
      await classesApi.assignTeacher(classId, selectedTeacherId)

      const assignedTeacher = availableTeachers.find(t => t.id === selectedTeacherId)
      setCurrentTeacher(assignedTeacher)

      toast.success(`Professor ${assignedTeacher?.nome} atribuído com sucesso!`)

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      onAssignmentChange?.(selectedTeacherId)
    } catch (error) {
      // console.error('Error assigning teacher:', error)
      toast.error('Erro ao atribuir professor')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTeacher = async () => {
    setLoading(true)
    try {
      await classesApi.assignTeacher(classId, '')

      setCurrentTeacher(null)
      setSelectedTeacherId('')

      toast.success('Professor removido da turma com sucesso!')

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      onAssignmentChange?.(null)
    } catch (error) {
      // console.error('Error removing teacher:', error)
      toast.error('Erro ao remover professor')
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
              <p className="text-sm text-gray-500">Carregando dados da turma...</p>
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
          Atribuição de Professor
        </CardTitle>
        <CardDescription>
          Gerencie a atribuição de professor para a turma {classData?.nome}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Class Information */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <School className="h-4 w-4" />
            Informações da Turma
          </h4>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Nome:</span>
                <p>{classData.nome}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Série:</span>
                <p>{classData.serie}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Turno:</span>
                <Badge variant="outline" className="bg-blue-50 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {classData.turno}
                </Badge>
              </div>
              <div>
                <span className="font-medium text-gray-700">Ano Letivo:</span>
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
            Professor Atual
          </h4>

          {currentTeacher ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Professor Atribuído</span>
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
                <span className="font-medium text-amber-800">Nenhum professor atribuído</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Esta turma precisa de um professor para começar as atividades educacionais.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Teacher Assignment */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            {currentTeacher ? 'Alterar Professor' : 'Atribuir Professor'}
          </h4>

          {availableTeachers.length > 0 ? (
            <div className="space-y-4">
              <Select
                value={selectedTeacherId}
                onValueChange={setSelectedTeacherId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um professor" />
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
                    <span className="font-medium">Professor selecionado:</span>{' '}
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
                  {currentTeacher ? 'Alterar Professor' : 'Atribuir Professor'}
                </LoadingButton>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum professor disponível para atribuição nesta escola.
                Cadastre professores no painel de usuários primeiro.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Assignment Guidelines */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Orientações</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• Apenas professores cadastrados na mesma escola podem ser atribuídos</p>
            <p>• Um professor pode ser responsável por múltiplas turmas</p>
            <p>• A atribuição é necessária para marcar presença e lançar notas</p>
            <p>• Alterações de professor são registradas no histórico da turma</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}