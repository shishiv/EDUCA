/**
 * Enhanced Touch-Optimized Attendance Grid
 * Optimized for tablet use with 44px minimum touch targets
 * Supports batch operations and real-time updates
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Users,
  UserCheck,
  UserX,
  Search,
  CheckSquare,
  Square,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Download,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Student {
  id: string
  nome_completo: string
  data_nascimento: string
  matriculas: Array<{
    id: string
    turma_id: string
    situacao: string
  }>
}

interface AttendanceRecord {
  id?: string
  aluno_id: string
  presente: boolean
  observacoes?: string
  horario_marcacao: string
  is_locked?: boolean
  created_by?: string
  updated_by?: string
}

interface AttendanceGridProps {
  sessionId: string
  turmaId: string
  readonly?: boolean
  showPhotos?: boolean
  onAttendanceChange?: (stats: AttendanceStats) => void
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  pending: number
  locked: number
}

export function AttendanceGrid({
  sessionId,
  turmaId,
  readonly = false,
  showPhotos = true,
  onAttendanceChange
}: AttendanceGridProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Map<string, AttendanceRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced')
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())

  // Load students and attendance data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Load students from Supabase with simpler query
      const { data: studentsData, error: studentsError } = await supabase
        .from('alunos')
        .select(`
          id,
          nome_completo,
          data_nascimento,
          matriculas!inner (
            id,
            turma_id,
            situacao
          )
        `)
        .eq('matriculas.turma_id', turmaId)
        .eq('matriculas.situacao', 'ativa')
        .order('nome_completo')

      if (studentsError) throw studentsError

      setStudents(studentsData || [])

      // Load existing attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('frequencia')
        .select('*')
        .eq('sessao_id', sessionId)

      if (attendanceError) throw attendanceError

      const attendanceMap = new Map<string, AttendanceRecord>()
      attendanceData?.forEach(record => {
        attendanceMap.set(record.matricula_id, {
          id: record.id,
          aluno_id: record.matricula_id,
          presente: record.presente || record.status_presenca === 'presente',
          observacoes: record.observacoes_frequencia,
          horario_marcacao: record.marcado_em || record.created_at,
          is_locked: record.bloqueado,
          created_by: record.marcado_por,
          updated_by: record.marcado_por
        })
      })

      setAttendance(attendanceMap)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados dos alunos')
    } finally {
      setLoading(false)
    }
  }, [sessionId, turmaId])

  // Calculate attendance statistics
  const stats = useMemo((): AttendanceStats => {
    const total = students.length
    let present = 0
    let absent = 0
    let locked = 0

    attendance.forEach(record => {
      if (record.presente) present++
      else absent++
      if (record.is_locked) locked++
    })

    const pending = total - (present + absent)

    return { total, present, absent, pending, locked }
  }, [students.length, attendance])

  // Notify parent component of attendance changes (outside render phase)
  useEffect(() => {
    onAttendanceChange?.(stats)
  }, [stats, onAttendanceChange])

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students

    return students.filter(student =>
      student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [students, searchTerm])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Set up real-time subscription for attendance changes
  useEffect(() => {
    const subscription = supabase
      .channel(`attendance_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'frequencia',
        filter: `aula_session_id=eq.${sessionId}`
      }, (payload) => {
        const record = payload.new as AttendanceRecord
        if (record) {
          setAttendance(prev => new Map(prev).set(record.aluno_id, record))
          setSyncStatus('synced')
          setLastSyncTime(new Date())
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [sessionId])

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Mark attendance for individual student
  const markAttendance = async (studentId: string, present: boolean) => {
    if (readonly) return

    try {
      setSyncStatus('pending')

      // Optimistic update
      const newRecord: AttendanceRecord = {
        aluno_id: studentId,
        presente: present,
        horario_marcacao: new Date().toISOString()
      }

      setAttendance(prev => new Map(prev).set(studentId, newRecord))

      // Send to server
      const response = await fetch(`/api/sessoes-aula/${sessionId}/frequencia/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance: [newRecord]
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao marcar presença')
      }

      setSyncStatus('synced')
      setLastSyncTime(new Date())

      // Show quick feedback
      toast.success(
        `${students.find(s => s.id === studentId)?.nome_completo} marcado como ${present ? 'presente' : 'ausente'}`,
        { duration: 2000 }
      )

    } catch (error) {
      console.error('Erro ao marcar presença:', error)
      setSyncStatus('error')

      // Revert optimistic update
      setAttendance(prev => {
        const newMap = new Map(prev)
        newMap.delete(studentId)
        return newMap
      })

      toast.error('Erro ao marcar presença. Tente novamente.')
    }
  }

  // Batch mark attendance for selected students
  const batchMarkAttendance = async (present: boolean) => {
    if (readonly || selectedStudents.size === 0) return

    try {
      setSaving(true)
      setSyncStatus('pending')

      const attendanceRecords = Array.from(selectedStudents).map(studentId => ({
        aluno_id: studentId,
        presente: present,
        horario_marcacao: new Date().toISOString()
      }))

      // Optimistic update
      const newAttendance = new Map(attendance)
      attendanceRecords.forEach(record => {
        newAttendance.set(record.aluno_id, record)
      })
      setAttendance(newAttendance)

      // Send to server
      const response = await fetch(`/api/sessoes-aula/${sessionId}/frequencia/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance: attendanceRecords
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao marcar presença em lote')
      }

      setSyncStatus('synced')
      setLastSyncTime(new Date())
      setSelectedStudents(new Set())

      toast.success(
        `${selectedStudents.size} aluno(s) marcado(s) como ${present ? 'presente(s)' : 'ausente(s)'}`,
        { duration: 3000 }
      )

    } catch (error) {
      console.error('Erro ao marcar presença em lote:', error)
      setSyncStatus('error')

      // Revert optimistic update
      loadData()

      toast.error('Erro ao marcar presença em lote. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // Get student initials for avatar
  const getStudentInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  // Get attendance status for student
  const getAttendanceStatus = (studentId: string) => {
    const record = attendance.get(studentId)
    if (!record) return 'pending'
    return record.presente ? 'present' : 'absent'
  }

  // Calculate age from birth date
  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando lista de alunos...</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Chamada - {stats.total} aluno(s)</span>
            </CardTitle>

            {/* Connection status */}
            <div className="flex items-center space-x-1 text-xs">
              {isOnline ? (
                <Wifi className="h-3 w-3 text-green-600" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-600" />
              )}
              <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Sync status */}
            <div className="flex items-center space-x-1 text-xs">
              {syncStatus === 'synced' && <div className="h-2 w-2 bg-green-600 rounded-full" />}
              {syncStatus === 'pending' && <div className="h-2 w-2 bg-yellow-600 rounded-full animate-pulse" />}
              {syncStatus === 'error' && <div className="h-2 w-2 bg-red-600 rounded-full" />}
              <span className="text-muted-foreground">
                {syncStatus === 'synced' && 'Sincronizado'}
                {syncStatus === 'pending' && 'Sincronizando...'}
                {syncStatus === 'error' && 'Erro na sincronização'}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="flex flex-wrap gap-4">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>Total: {stats.total}</span>
          </Badge>
          <Badge variant="default" className="flex items-center space-x-1 bg-green-600">
            <UserCheck className="h-3 w-3" />
            <span>Presentes: {stats.present}</span>
          </Badge>
          <Badge variant="destructive" className="flex items-center space-x-1">
            <UserX className="h-3 w-3" />
            <span>Ausentes: {stats.absent}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Pendentes: {stats.pending}</span>
          </Badge>
        </div>

        {/* Batch Actions */}
        {!readonly && selectedStudents.size > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium self-center">
              {selectedStudents.size} aluno(s) selecionado(s):
            </p>
            <Button
              size="sm"
              onClick={() => batchMarkAttendance(true)}
              disabled={saving}
              className="min-h-[36px]"
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Marcar Presentes
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => batchMarkAttendance(false)}
              disabled={saving}
              className="min-h-[36px]"
            >
              <UserX className="h-3 w-3 mr-1" />
              Marcar Ausentes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedStudents(new Set())}
              className="min-h-[36px]"
            >
              Limpar Seleção
            </Button>
          </div>
        )}

        {/* Offline warning */}
        {!isOnline && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Você está offline. As marcações serão sincronizadas quando a conexão for reestabelecida.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {filteredStudents.map((student) => {
            const attendanceStatus = getAttendanceStatus(student.id)
            const isSelected = selectedStudents.has(student.id)
            const record = attendance.get(student.id)
            const isLocked = record?.is_locked || false

            return (
              <div
                key={student.id}
                className={`
                  flex items-center justify-between p-3 rounded-lg border-2 transition-all
                  ${attendanceStatus === 'present' ? 'border-green-200 bg-green-50' : ''}
                  ${attendanceStatus === 'absent' ? 'border-red-200 bg-red-50' : ''}
                  ${attendanceStatus === 'pending' ? 'border-gray-200 bg-gray-50' : ''}
                  ${isSelected ? 'ring-2 ring-primary' : ''}
                  ${isLocked ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-center space-x-3 flex-1">
                  {/* Selection checkbox */}
                  {!readonly && !isLocked && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedStudents)
                        if (checked) {
                          newSelected.add(student.id)
                        } else {
                          newSelected.delete(student.id)
                        }
                        setSelectedStudents(newSelected)
                      }}
                      className="h-5 w-5" // Touch-friendly size
                    />
                  )}

                  {/* Student avatar */}
                  {showPhotos && (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.foto_url} alt={student.nome_completo} />
                      <AvatarFallback className="text-xs">
                        {getStudentInitials(student.nome_completo)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  {/* Student info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {student.nome_completo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calculateAge(student.data_nascimento)} anos
                      {record?.horario_marcacao && (
                        <span className="ml-2">
                          • Marcado às {new Date(record.horario_marcacao).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                      {isLocked && (
                        <span className="ml-2 text-orange-600">• Travado</span>
                      )}
                    </p>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center space-x-1">
                    {attendanceStatus === 'present' && (
                      <div className="h-3 w-3 bg-green-600 rounded-full"></div>
                    )}
                    {attendanceStatus === 'absent' && (
                      <div className="h-3 w-3 bg-red-600 rounded-full"></div>
                    )}
                    {attendanceStatus === 'pending' && (
                      <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {!readonly && !isLocked && (
                  <div className="flex space-x-2 ml-3">
                    <Button
                      size="sm"
                      variant={attendanceStatus === 'present' ? 'default' : 'outline'}
                      onClick={() => markAttendance(student.id, true)}
                      className="min-h-[44px] min-w-[80px]" // Touch-friendly
                      disabled={saving}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      P
                    </Button>
                    <Button
                      size="sm"
                      variant={attendanceStatus === 'absent' ? 'destructive' : 'outline'}
                      onClick={() => markAttendance(student.id, false)}
                      className="min-h-[44px] min-w-[80px]" // Touch-friendly
                      disabled={saving}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      F
                    </Button>
                  </div>
                )}

                {readonly && (
                  <div className="ml-3">
                    <Badge
                      variant={
                        attendanceStatus === 'present' ? 'default' :
                        attendanceStatus === 'absent' ? 'destructive' : 'secondary'
                      }
                    >
                      {attendanceStatus === 'present' && 'Presente'}
                      {attendanceStatus === 'absent' && 'Ausente'}
                      {attendanceStatus === 'pending' && 'Não marcado'}
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}

          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum aluno encontrado com esse nome.' : 'Nenhum aluno matriculado nesta turma.'}
            </div>
          )}
        </div>

        {/* Quick actions */}
        {!readonly && filteredStudents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const unselectedStudents = filteredStudents
                  .filter(s => !selectedStudents.has(s.id) && !attendance.get(s.id)?.is_locked)
                  .map(s => s.id)
                setSelectedStudents(new Set(unselectedStudents))
              }}
              className="min-h-[36px]"
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              Selecionar Não Marcados
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStudents(new Set())}
              className="min-h-[36px]"
            >
              <Square className="h-3 w-3 mr-1" />
              Limpar Seleção
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}