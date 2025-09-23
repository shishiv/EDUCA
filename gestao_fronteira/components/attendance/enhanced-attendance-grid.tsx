/**
 * Enhanced AttendanceGrid Component - Session-aware with Mobile Optimization
 * Brazilian Educational Compliance with Real-time Updates
 * Task 3: Frontend Components - Enhanced AttendanceGrid
 */

'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Check, X, Clock, AlertCircle, Save, Smartphone, Wifi, WifiOff, Users, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { SessionRealtimeManager, type AttendanceRealtimeData } from '@/lib/realtime/session-realtime'

// Types
interface Student {
  aluno_id: string
  numero_chamada: number
  student: {
    id: string
    nome_completo: string
    numero_matricula: string
    data_nascimento: string
  }
  attendance: {
    id?: string
    presente: boolean
    observacoes?: string
    is_locked: boolean
    created_at?: string
    updated_at?: string
  } | null
  marked: boolean
  can_modify: boolean
}

interface AttendanceGridProps {
  sessionId: string
  session: {
    id: string
    fase: 'planejamento' | 'chamada' | 'finalizada' | 'bloqueada'
    bloqueado: boolean
    can_modify_session: boolean
    turma_nome?: string
  }
  students: Student[]
  onAttendanceUpdate: (students: Student[]) => void
  onStatsUpdate?: (stats: any) => void
  isMobile?: boolean
  className?: string
}

interface BatchUpdate {
  aluno_id: string
  presente: boolean
  observacoes?: string
  timestamp: string
}

interface OfflineQueue {
  updates: BatchUpdate[]
  lastSync: string
}

export default function EnhancedAttendanceGrid({
  sessionId,
  session,
  students: initialStudents,
  onAttendanceUpdate,
  onStatsUpdate,
  isMobile = false,
  className
}: AttendanceGridProps) {
  // State
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, BatchUpdate>>(new Map())
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSync, setLastSync] = useState<Date>(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())

  // Refs
  const realtimeManager = useRef<SessionRealtimeManager | null>(null)
  const offlineQueue = useRef<OfflineQueue>({ updates: [], lastSync: new Date().toISOString() })
  const touchTimer = useRef<NodeJS.Timeout | null>(null)

  // Filtered students
  const filteredStudents = useMemo(() => {
    let filtered = students

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student.numero_matricula.includes(searchTerm) ||
        student.numero_chamada.toString().includes(searchTerm)
      )
    }

    // Apply attendance filter
    switch (filter) {
      case 'present':
        filtered = filtered.filter(s => s.attendance?.presente === true)
        break
      case 'absent':
        filtered = filtered.filter(s => s.attendance?.presente === false)
        break
      case 'unmarked':
        filtered = filtered.filter(s => !s.marked)
        break
      default:
        break
    }

    return filtered.sort((a, b) => a.numero_chamada - b.numero_chamada)
  }, [students, searchTerm, filter])

  // Statistics
  const stats = useMemo(() => {
    const total = students.length
    const marked = students.filter(s => s.marked).length
    const present = students.filter(s => s.attendance?.presente === true).length
    const absent = students.filter(s => s.attendance?.presente === false).length
    const pending = total - marked

    return {
      total,
      marked,
      present,
      absent,
      pending,
      completion_percentage: total > 0 ? Math.round((marked / total) * 100) : 0
    }
  }, [students])

  // Real-time setup
  useEffect(() => {
    if (!realtimeManager.current) {
      realtimeManager.current = new SessionRealtimeManager({
        onAttendanceUpdate: (attendance, eventType) => {
          if (attendance.session_id === sessionId) {
            updateStudentAttendance(attendance, eventType)
          }
        },
        onConnectionStatus: (status) => {
          setIsOnline(status === 'connected')
        },
        onError: (error) => {
          console.error('Attendance real-time error:', error)
        }
      })

      realtimeManager.current.subscribeToAttendance([sessionId])
    }

    return () => {
      realtimeManager.current?.unsubscribeAll()
    }
  }, [sessionId])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineUpdates()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync stats with parent
  useEffect(() => {
    onStatsUpdate?.(stats)
  }, [stats, onStatsUpdate])

  // Update student attendance from real-time
  const updateStudentAttendance = useCallback((attendance: AttendanceRealtimeData, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    setStudents(prev => prev.map(student => {
      if (student.aluno_id === attendance.aluno_id) {
        if (eventType === 'DELETE') {
          return {
            ...student,
            attendance: null,
            marked: false
          }
        } else {
          return {
            ...student,
            attendance: {
              id: attendance.id,
              presente: attendance.presente,
              observacoes: attendance.observacoes,
              is_locked: attendance.is_locked,
              updated_at: attendance.updated_at
            },
            marked: true
          }
        }
      }
      return student
    }))
  }, [])

  // Mark attendance for individual student
  const markAttendance = useCallback(async (studentId: string, presente: boolean, observacoes?: string) => {
    if (!session.can_modify_session || session.bloqueado) {
      toast({
        title: 'Ação Não Permitida',
        description: 'Não é possível modificar frequência de sessão bloqueada',
        variant: 'destructive'
      })
      return
    }

    const student = students.find(s => s.aluno_id === studentId)
    if (!student || !student.can_modify) {
      return
    }

    // Update local state immediately for responsiveness
    const updatedStudents = students.map(s => {
      if (s.aluno_id === studentId) {
        return {
          ...s,
          attendance: {
            id: s.attendance?.id,
            presente,
            observacoes,
            is_locked: false,
            updated_at: new Date().toISOString()
          },
          marked: true
        }
      }
      return s
    })

    setStudents(updatedStudents)
    onAttendanceUpdate(updatedStudents)

    // Prepare update for batch or immediate sync
    const update: BatchUpdate = {
      aluno_id: studentId,
      presente,
      observacoes,
      timestamp: new Date().toISOString()
    }

    if (isOnline) {
      // Send immediately if online
      try {
        const response = await fetch(`/api/sessions/${sessionId}/attendance`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aluno_id: studentId,
            presente,
            observacoes
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update attendance')
        }

        // Remove from pending updates if successful
        setPendingUpdates(prev => {
          const updated = new Map(prev)
          updated.delete(studentId)
          return updated
        })

        setLastSync(new Date())

      } catch (error) {
        // Add to pending updates if failed
        setPendingUpdates(prev => new Map(prev.set(studentId, update)))
        console.error('Failed to sync attendance:', error)
      }
    } else {
      // Add to offline queue
      setPendingUpdates(prev => new Map(prev.set(studentId, update)))
      offlineQueue.current.updates.push(update)

      toast({
        title: 'Salvo Offline',
        description: 'Frequência será sincronizada quando conexão for restabelecida',
        variant: 'default'
      })
    }
  }, [sessionId, session, students, isOnline, onAttendanceUpdate])

  // Batch save all pending updates
  const saveBatchUpdates = useCallback(async () => {
    if (pendingUpdates.size === 0 || !isOnline) return

    setIsSaving(true)
    try {
      const updates = Array.from(pendingUpdates.values())

      const response = await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: updates })
      })

      if (response.ok) {
        setPendingUpdates(new Map())
        offlineQueue.current.updates = []
        setLastSync(new Date())

        toast({
          title: 'Sincronizado',
          description: `${updates.length} registros de frequência salvos`,
          variant: 'default'
        })
      } else {
        throw new Error('Failed to batch update')
      }
    } catch (error) {
      toast({
        title: 'Erro de Sincronização',
        description: 'Erro ao salvar frequência. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }, [pendingUpdates, sessionId, isOnline])

  // Sync offline updates when coming back online
  const syncOfflineUpdates = useCallback(async () => {
    if (offlineQueue.current.updates.length > 0) {
      await saveBatchUpdates()
    }
  }, [saveBatchUpdates])

  // Bulk operations
  const markAllPresent = useCallback(() => {
    filteredStudents.forEach(student => {
      if (!student.marked && student.can_modify) {
        markAttendance(student.aluno_id, true)
      }
    })
  }, [filteredStudents, markAttendance])

  const markSelectedPresent = useCallback(() => {
    selectedStudents.forEach(studentId => {
      markAttendance(studentId, true)
    })
    setSelectedStudents(new Set())
  }, [selectedStudents, markAttendance])

  // Touch/click handlers for mobile optimization
  const handleStudentTouch = useCallback((studentId: string, presente: boolean) => {
    if (isMobile) {
      // Long press for context menu
      touchTimer.current = setTimeout(() => {
        setSelectedStudents(prev => {
          const updated = new Set(prev)
          if (updated.has(studentId)) {
            updated.delete(studentId)
          } else {
            updated.add(studentId)
          }
          return updated
        })
      }, 500)
    } else {
      markAttendance(studentId, presente)
    }
  }, [isMobile, markAttendance])

  const handleTouchEnd = useCallback(() => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current)
      touchTimer.current = null
    }
  }, [])

  // Student row component
  const StudentRow = ({ student }: { student: Student }) => {
    const isPending = pendingUpdates.has(student.aluno_id)
    const isSelected = selectedStudents.has(student.aluno_id)

    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 border-b border-gray-100 transition-colors',
          isSelected && 'bg-blue-50 border-blue-200',
          isPending && 'bg-yellow-50',
          !student.can_modify && 'opacity-50',
          isMobile ? 'min-h-[60px]' : 'min-h-[50px]'
        )}
        key={student.aluno_id}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium',
            isMobile && 'w-10 h-10'
          )}>
            {student.numero_chamada}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {student.student.nome_completo}
            </p>
            <p className="text-sm text-gray-500">
              {student.student.numero_matricula}
            </p>
          </div>

          {isPending && (
            <Badge variant="outline" className="text-xs">
              Pendente
            </Badge>
          )}

          {student.attendance?.is_locked && (
            <Badge variant="destructive" className="text-xs">
              Bloqueado
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {student.marked ? (
            <div className="flex items-center gap-1">
              {student.attendance?.presente ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {student.attendance?.presente ? 'P' : 'F'}
              </span>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  'h-8 w-8 p-0 border-green-200 hover:bg-green-50',
                  isMobile && 'h-12 w-12 touch-target-large'
                )}
                onClick={() => markAttendance(student.aluno_id, true)}
                onTouchStart={() => handleStudentTouch(student.aluno_id, true)}
                onTouchEnd={handleTouchEnd}
                disabled={!student.can_modify || session.bloqueado}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                className={cn(
                  'h-8 w-8 p-0 border-red-200 hover:bg-red-50',
                  isMobile && 'h-12 w-12 touch-target-large'
                )}
                onClick={() => markAttendance(student.aluno_id, false)}
                onTouchStart={() => handleStudentTouch(student.aluno_id, false)}
                onTouchEnd={handleTouchEnd}
                disabled={!student.can_modify || session.bloqueado}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Frequência - {session.turma_nome}
          </CardTitle>

          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}

            {pendingUpdates.size > 0 && (
              <Badge variant="outline" className="text-xs">
                {pendingUpdates.size} pendente(s)
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg">{stats.total}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-green-600">{stats.present}</div>
            <div className="text-muted-foreground">Presentes</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-red-600">{stats.absent}</div>
            <div className="text-muted-foreground">Ausentes</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-gray-600">{stats.pending}</div>
            <div className="text-muted-foreground">Pendentes</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, matrícula ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {pendingUpdates.size > 0 && (
              <Button
                onClick={saveBatchUpdates}
                disabled={isSaving || !isOnline}
                variant="default"
                size="sm"
                className={cn(isMobile && 'touch-target-large')}
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {!isMobile && 'Salvar'}
              </Button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilter(filter === 'all' ? 'unmarked' : 'all')}
            >
              {filter === 'all' ? 'Não Marcados' : 'Todos'}
            </Button>

            {selectedStudents.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={markSelectedPresent}
                className="text-green-600"
              >
                Marcar {selectedStudents.size} como Presente
              </Button>
            )}

            {filter === 'unmarked' && filteredStudents.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={markAllPresent}
                className="text-green-600"
              >
                Todos Presentes
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {session.bloqueado && (
          <Alert className="m-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Esta sessão está bloqueada. Frequência não pode ser modificada.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className={cn('w-full', isMobile ? 'h-[60vh]' : 'h-[500px]')}>
          {filteredStudents.length > 0 ? (
            <div className="divide-y">
              {filteredStudents.map(student => (
                <StudentRow key={student.aluno_id} student={student} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {searchTerm ? 'Nenhum estudante encontrado' : 'Nenhum estudante na turma'}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Última sincronização: {lastSync.toLocaleTimeString()}
            </div>
            <div>
              {stats.completion_percentage}% concluído
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}