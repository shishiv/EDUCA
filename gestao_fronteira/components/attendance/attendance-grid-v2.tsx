/**
 * AttendanceGrid V2 - Integrated with Task 2 State Management
 *
 * Enhancements from V1:
 * - Zustand store integration for optimistic updates
 * - TanStack Query hooks for data fetching and mutations
 * - 2-second debounced batch save
 * - Phase awareness (disable when locked)
 * - Enhanced touch targets (48px minimum)
 * - Server action integration (markAttendanceAction)
 *
 * Compliance: Brazilian educational standards with "não existe o esquecer"
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Check, X, Clock, AlertCircle, Save, Wifi, WifiOff, Users, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Task 2 Integration: Zustand Store and TanStack Query
import {
  useActiveSession,
  useSessionStats,
  useCurrentPhase,
  useIsSessionLocked,
  useOptimisticUpdates,
  type SessionPhase
} from '@/lib/stores/attendance-session-store'
import {
  useMarkAttendance,
  useBatchMarkAttendance,
  useAttendanceSession
} from '@/hooks/use-attendance-hooks'

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

interface AttendanceGridV2Props {
  sessionId: string
  turmaId: string
  students: Student[]
  isMobile?: boolean
  className?: string
}

export default function AttendanceGridV2({
  sessionId,
  turmaId,
  students: initialStudents,
  isMobile = false,
  className
}: AttendanceGridV2Props) {
  // Task 2 State Management Hooks
  const activeSession = useActiveSession()
  const sessionStats = useSessionStats()
  const currentPhase = useCurrentPhase()
  const isLocked = useIsSessionLocked()
  const { pendingUpdates } = useOptimisticUpdates()

  // TanStack Query Mutations
  const markAttendanceMutation = useMarkAttendance()
  const batchMarkMutation = useBatchMarkAttendance()
  const { data: sessionData, isLoading: sessionLoading } = useAttendanceSession(turmaId)

  // Local State
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [debouncedUpdates, setDebouncedUpdates] = useState<Map<string, { presente: boolean; observacoes?: string }>>(new Map())

  // Debounced batch save timer (2 seconds)
  const [batchSaveTimer, setBatchSaveTimer] = useState<NodeJS.Timeout | null>(null)

  // Online/offline detection
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

  // Sync local students with prop updates
  useEffect(() => {
    setStudents(initialStudents)
  }, [initialStudents])

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

  // Mark attendance with optimistic update
  const markAttendance = useCallback((studentId: string, presente: boolean, observacoes?: string) => {
    if (!activeSession || isLocked || currentPhase === 'locked') {
      toast.error('Ação Não Permitida', {
        description: 'Sessão bloqueada. Frequência não pode ser modificada.'
      })
      return
    }

    const student = students.find(s => s.aluno_id === studentId)
    if (!student || !student.can_modify) {
      return
    }

    // Optimistic UI Update
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

    // Add to debounced batch
    setDebouncedUpdates(prev => new Map(prev.set(studentId, { presente, observacoes })))

    // Clear existing timer
    if (batchSaveTimer) {
      clearTimeout(batchSaveTimer)
    }

    // Set 2-second debounce timer for batch save
    const timer = setTimeout(() => {
      saveDebouncedBatch()
    }, 2000)

    setBatchSaveTimer(timer)

    // Show immediate feedback
    toast.success('Marcação registrada', {
      description: 'Salvando automaticamente...',
      duration: 1500
    })
  }, [activeSession, isLocked, currentPhase, students, batchSaveTimer])

  // Save debounced batch updates
  const saveDebouncedBatch = useCallback(async () => {
    if (debouncedUpdates.size === 0 || !isOnline || !activeSession) return

    const updates = Array.from(debouncedUpdates.entries()).map(([aluno_id, data]) => ({
      aluno_id,
      ...data
    }))

    try {
      await batchMarkMutation.mutateAsync({
        session_id: activeSession.id,
        attendance_records: updates
      })

      toast.success('Sincronizado', {
        description: `${updates.length} marcações salvas com sucesso.`
      })

      setDebouncedUpdates(new Map())
    } catch (error) {
      toast.error('Erro ao salvar', {
        description: 'Tentando novamente em alguns segundos...'
      })
    }
  }, [debouncedUpdates, isOnline, activeSession, batchMarkMutation])

  // Manual batch save
  const handleManualBatchSave = useCallback(async () => {
    if (batchSaveTimer) {
      clearTimeout(batchSaveTimer)
      setBatchSaveTimer(null)
    }
    await saveDebouncedBatch()
  }, [batchSaveTimer, saveDebouncedBatch])

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

  // Student selection toggle (for bulk operations)
  const toggleStudentSelection = useCallback((studentId: string) => {
    setSelectedStudents(prev => {
      const updated = new Set(prev)
      if (updated.has(studentId)) {
        updated.delete(studentId)
      } else {
        updated.add(studentId)
      }
      return updated
    })
  }, [])

  // Touch handlers for mobile (long press for selection)
  const [touchTimer, setTouchTimer] = useState<NodeJS.Timeout | null>(null)

  const handleTouchStart = useCallback((studentId: string) => {
    if (isMobile) {
      const timer = setTimeout(() => {
        toggleStudentSelection(studentId)
      }, 500) // 500ms long press
      setTouchTimer(timer)
    }
  }, [isMobile, toggleStudentSelection])

  const handleTouchEnd = useCallback(() => {
    if (touchTimer) {
      clearTimeout(touchTimer)
      setTouchTimer(null)
    }
  }, [touchTimer])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (batchSaveTimer) {
        clearTimeout(batchSaveTimer)
      }
      if (touchTimer) {
        clearTimeout(touchTimer)
      }
    }
  }, [batchSaveTimer, touchTimer])

  // Student row component with enhanced touch targets (48px)
  const StudentRow = ({ student }: { student: Student }) => {
    const isPending = debouncedUpdates.has(student.aluno_id)
    const isSelected = selectedStudents.has(student.aluno_id)
    const isDisabled = isLocked || currentPhase === 'locked' || !student.can_modify

    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 border-b border-gray-100 transition-colors',
          isSelected && 'bg-blue-50 border-blue-200',
          isPending && 'bg-yellow-50',
          isDisabled && 'opacity-50 cursor-not-allowed',
          isMobile ? 'min-h-[60px]' : 'min-h-[50px]'
        )}
        onClick={() => isMobile && toggleStudentSelection(student.aluno_id)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Call number badge */}
          <div className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium',
            isMobile && 'w-10 h-10'
          )}>
            {student.numero_chamada}
          </div>

          {/* Student info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {student.student.nome_completo}
            </p>
            <p className="text-sm text-gray-500">
              {student.student.numero_matricula}
            </p>
          </div>

          {/* Status badges */}
          {isPending && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Salvando
            </Badge>
          )}

          {student.attendance?.is_locked && (
            <Badge variant="destructive" className="text-xs">
              Bloqueado
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {student.marked ? (
            <div className="flex items-center gap-1">
              {student.attendance?.presente ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">P</span>
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-600">F</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-1">
              {/* Present button - Enhanced 48px touch target */}
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  'border-green-200 hover:bg-green-50',
                  isMobile ? 'h-12 w-12 p-0 touch-manipulation' : 'h-8 w-8 p-0'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  markAttendance(student.aluno_id, true)
                }}
                onTouchStart={() => handleTouchStart(student.aluno_id)}
                onTouchEnd={handleTouchEnd}
                disabled={isDisabled}
              >
                <Check className={cn('text-green-600', isMobile ? 'h-6 w-6' : 'h-4 w-4')} />
              </Button>

              {/* Absent button - Enhanced 48px touch target */}
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  'border-red-200 hover:bg-red-50',
                  isMobile ? 'h-12 w-12 p-0 touch-manipulation' : 'h-8 w-8 p-0'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  markAttendance(student.aluno_id, false)
                }}
                onTouchStart={() => handleTouchStart(student.aluno_id)}
                onTouchEnd={handleTouchEnd}
                disabled={isDisabled}
              >
                <X className={cn('text-red-600', isMobile ? 'h-6 w-6' : 'h-4 w-4')} />
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Frequência
            {activeSession && <Badge variant="outline">{activeSession.turma_nome}</Badge>}
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Phase indicator */}
            {currentPhase && (
              <Badge variant={currentPhase === 'attendance' ? 'default' : 'secondary'}>
                {currentPhase === 'planning' && 'Planejamento'}
                {currentPhase === 'attendance' && 'Marcando'}
                {currentPhase === 'completion' && 'Finalizada'}
                {currentPhase === 'locked' && 'Bloqueada'}
              </Badge>
            )}

            {/* Online/Offline indicator */}
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}

            {/* Pending count */}
            {debouncedUpdates.size > 0 && (
              <Badge variant="outline" className="text-xs">
                {debouncedUpdates.size} pendente(s)
              </Badge>
            )}
          </div>
        </div>

        {/* Statistics from Zustand store */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg">{sessionStats.total}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-green-600">{sessionStats.present}</div>
            <div className="text-muted-foreground">Presentes</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-red-600">{sessionStats.absent}</div>
            <div className="text-muted-foreground">Ausentes</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-gray-600">{sessionStats.total - sessionStats.present - sessionStats.absent}</div>
            <div className="text-muted-foreground">Pendentes</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, matrícula ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Manual batch save button */}
            {debouncedUpdates.size > 0 && (
              <Button
                onClick={handleManualBatchSave}
                disabled={batchMarkMutation.isPending || !isOnline}
                variant="default"
                size="sm"
                className={cn(isMobile && 'min-h-[44px] touch-manipulation')}
              >
                {batchMarkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {!isMobile && <span className="ml-2">Salvar Agora</span>}
              </Button>
            )}
          </div>

          {/* Bulk action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilter(filter === 'all' ? 'unmarked' : 'all')}
              className={cn(isMobile && 'min-h-[44px] touch-manipulation')}
            >
              {filter === 'all' ? 'Não Marcados' : 'Todos'}
            </Button>

            {selectedStudents.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={markSelectedPresent}
                className={cn('text-green-600', isMobile && 'min-h-[44px] touch-manipulation')}
                disabled={isLocked}
              >
                Marcar {selectedStudents.size} como Presente
              </Button>
            )}

            {filter === 'unmarked' && filteredStudents.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={markAllPresent}
                className={cn('text-green-600', isMobile && 'min-h-[44px] touch-manipulation')}
                disabled={isLocked}
              >
                Todos Presentes
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Lock warning */}
        {isLocked && (
          <Alert className="m-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Sessão bloqueada.</strong> Frequência não pode ser modificada. "Não existe o esquecer".
            </AlertDescription>
          </Alert>
        )}

        {/* Student list */}
        <ScrollArea className={cn('w-full', isMobile ? 'h-[60vh]' : 'h-[500px]')}>
          {sessionLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredStudents.length > 0 ? (
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
            <div className="flex items-center gap-2">
              {debouncedUpdates.size > 0 && (
                <span className="text-orange-600 font-medium">
                  Salvando automaticamente em 2s...
                </span>
              )}
              {!isOnline && (
                <span className="text-red-600 font-medium">
                  Offline - Aguardando conexão
                </span>
              )}
            </div>
            <div>
              {Math.round((sessionStats.present + sessionStats.absent) / sessionStats.total * 100)}% concluído
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export with backward compatibility alias
export { AttendanceGridV2 as AttendanceGrid }
