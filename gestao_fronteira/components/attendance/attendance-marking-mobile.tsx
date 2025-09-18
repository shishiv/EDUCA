'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { studentsApi } from '@/lib/api/students'
import { attendanceApi } from '@/lib/api/attendance'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingButton } from '@/components/ui/loading-states'
import {
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Save,
  RotateCcw,
  FileCheck,
  HeartHandshake,
  Stethoscope
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AttendanceRecord {
  student_id: string
  status: 'presente' | 'falta' | 'justificada' | 'atestado'
}

interface AttendanceMarkingMobileProps {
  classId: string
  sessionId: string
  sessionDate: string
  onSave?: (records: AttendanceRecord[]) => void
  onCancel?: () => void
  className?: string
}

export function AttendanceMarkingMobile({
  classId,
  sessionId,
  sessionDate,
  onSave,
  onCancel,
  className
}: AttendanceMarkingMobileProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord['status']>>({})
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Load enrolled students
  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true)
      try {
        // Get students enrolled in this class
        const classStudents = await studentsApi.getStudentsByClass(classId)

        setStudents(classStudents)

        // Initialize all students as absent (falta) by default
        const initialRecords: Record<string, AttendanceRecord['status']> = {}
        classStudents.forEach(student => {
          initialRecords[student.id] = 'falta'
        })
        setAttendanceRecords(initialRecords)

      } catch (error) {
        // console.error('Error loading students:', error)
        toast.error('Erro ao carregar lista de alunos. Verifique a conexão e tente novamente.')

        // No fallback to mock data in production - show empty state
        setStudents([])
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [classId])

  const handleStatusChange = (studentId: string, status: AttendanceRecord['status']) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }))

    // Auto-collapse expanded view after selection
    if (expandedStudent === studentId) {
      setTimeout(() => setExpandedStudent(null), 500)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const records: AttendanceRecord[] = Object.entries(attendanceRecords).map(([student_id, status]) => ({
        student_id,
        status
      }))

      // Save attendance records
      await attendanceApi.saveAttendanceRecords(
        sessionId,
        classId,
        sessionDate,
        records
      )

      toast.success('Presença salva com sucesso! A sessão foi automaticamente finalizada.')

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['attendance'] })

      onSave?.(records)
    } catch (error) {
      // console.error('Error saving attendance:', error)

      // Handle immutability errors specifically
      if (error instanceof Error && error.message.includes('ERRO_IMUTABILIDADE')) {
        toast.error('Atenção: ' + error.message.replace('ERRO_IMUTABILIDADE: ', ''))
      } else {
        toast.error('Erro ao salvar presença. Tente novamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const initialRecords: Record<string, AttendanceRecord['status']> = {}
    students.forEach(student => {
      initialRecords[student.id] = 'falta'
    })
    setAttendanceRecords(initialRecords)
    toast.info('Presença resetada - todos marcados como falta')
  }

  const getStatusIcon = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'presente':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'falta':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'justificada':
        return <HeartHandshake className="h-4 w-4 text-blue-600" />
      case 'atestado':
        return <Stethoscope className="h-4 w-4 text-purple-600" />
    }
  }

  const getStatusLabel = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'presente':
        return 'Presente'
      case 'falta':
        return 'Falta'
      case 'justificada':
        return 'Falta Justificada'
      case 'atestado':
        return 'Atestado Médico'
    }
  }

  const getStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'presente':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'falta':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'justificada':
        return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'atestado':
        return 'bg-purple-50 border-purple-200 text-purple-700'
    }
  }

  const getSummary = () => {
    const counts = {
      presente: 0,
      falta: 0,
      justificada: 0,
      atestado: 0
    }

    Object.values(attendanceRecords).forEach(status => {
      counts[status]++
    })

    return counts
  }

  const getStudentAge = (birthDate: string) => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const summary = getSummary()

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Carregando lista de alunos...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Marcar Presença
        </CardTitle>
        <CardDescription>
          {new Date(sessionDate).toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{summary.presente}</div>
              <div className="text-xs text-gray-600">Presentes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{summary.falta}</div>
              <div className="text-xs text-gray-600">Faltas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{summary.justificada}</div>
              <div className="text-xs text-gray-600">Justificadas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{summary.atestado}</div>
              <div className="text-xs text-gray-600">Atestados</div>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="space-y-3">
          {students.map((student) => {
            const currentStatus = attendanceRecords[student.id] || 'falta'
            const isExpanded = expandedStudent === student.id

            return (
              <div
                key={student.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Student Header */}
                <div
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    getStatusColor(currentStatus)
                  )}
                  onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.foto_url} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{student.nome_completo}</div>
                        <div className="text-sm opacity-75">
                          {getStudentAge(student.data_nascimento)} anos
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(currentStatus)}
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(currentStatus)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Status Selection (Expanded) */}
                {isExpanded && (
                  <div className="bg-white border-t p-4 space-y-2">
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      Selecione o status:
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { status: 'presente' as const, label: 'Presente', icon: CheckCircle, color: 'green' },
                        { status: 'falta' as const, label: 'Falta', icon: XCircle, color: 'red' },
                        { status: 'justificada' as const, label: 'Falta Justificada', icon: HeartHandshake, color: 'blue' },
                        { status: 'atestado' as const, label: 'Atestado Médico', icon: Stethoscope, color: 'purple' }
                      ].map(({ status, label, icon: Icon, color }) => (
                        <Button
                          key={status}
                          variant={currentStatus === status ? "default" : "outline"}
                          className={cn(
                            "justify-start h-auto p-3",
                            currentStatus === status && `bg-${color}-600 hover:bg-${color}-700`
                          )}
                          onClick={() => handleStatusChange(student.id, status)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          <span>{label}</span>
                          {currentStatus === status && (
                            <CheckCircle className="h-4 w-4 ml-auto" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legal Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>ATENÇÃO:</strong> Após salvar, os registros de presença não poderão ser alterados.
            Confira cuidadosamente antes de finalizar.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <LoadingButton
            onClick={handleSave}
            loading={saving}
            className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
          >
            <Save className="h-5 w-5 mr-2" />
            Salvar Presença ({students.length} alunos)
          </LoadingButton>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
              className="h-10"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Resetar
            </Button>

            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="h-10"
            >
              Cancelar
            </Button>
          </div>
        </div>

        {/* Quick Actions Bar (Mobile Optimization) */}
        <div className="sticky bottom-0 bg-white border-t pt-4 mt-6 -mb-6 -mx-6 px-6 pb-6">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newRecords: Record<string, AttendanceRecord['status']> = {}
                students.forEach(student => {
                  newRecords[student.id] = 'presente'
                })
                setAttendanceRecords(newRecords)
                toast.info('Todos marcados como presentes')
              }}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Todos Presentes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newRecords: Record<string, AttendanceRecord['status']> = {}
                students.forEach(student => {
                  newRecords[student.id] = 'falta'
                })
                setAttendanceRecords(newRecords)
                toast.info('Todos marcados como falta')
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Todas Faltas
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}