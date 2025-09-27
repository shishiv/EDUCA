'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Check, X, Clock, Users, Search, Filter, MoreVertical, Wifi, WifiOff, Save, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

// Touch-optimized student interface
interface Student {
  aluno_id: string
  numero_chamada: number
  student: {
    id: string
    nome_completo: string
    numero_matricula: string
    data_nascimento: string
    foto_url?: string
  }
  attendance: {
    id?: string
    presente: boolean
    observacoes?: string
    is_locked: boolean
    timestamp?: string
  } | null
  marked: boolean
  can_modify: boolean
}

interface TabletOptimizedAttendanceProps {
  sessionId: string
  session: {
    id: string
    turma_nome: string
    professor_nome: string
    bloqueado: boolean
  }
  students: Student[]
  onAttendanceUpdate: (students: Student[]) => void
  className?: string
}

interface GestureState {
  startX: number
  startY: number
  startTime: number
  isDragging: boolean
  element: string | null
}

export default function TabletOptimizedAttendance({
  sessionId,
  session,
  students: initialStudents,
  onAttendanceUpdate,
  className
}: TabletOptimizedAttendanceProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, any>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Touch gesture handling
  const [gestureState, setGestureState] = useState<GestureState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isDragging: false,
    element: null
  })

  const touchRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  // Detect orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    handleOrientationChange()
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
    }
  }, [])

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

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, studentId: string) => {
    const touch = e.touches[0]
    setGestureState({
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isDragging: false,
      element: studentId
    })

    // Start long press timer for multi-select
    longPressTimer.current = setTimeout(() => {
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }

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
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!gestureState.element) return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - gestureState.startX)
    const deltaY = Math.abs(touch.clientY - gestureState.startY)

    if (deltaX > 10 || deltaY > 10) {
      setGestureState(prev => ({ ...prev, isDragging: true }))

      // Cancel long press if dragging
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }, [gestureState])

  const handleTouchEnd = useCallback((e: React.TouchEvent, studentId: string, isPresent: boolean) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // If not dragging and not multi-selecting, mark attendance
    if (!gestureState.isDragging && selectedStudents.size === 0) {
      markAttendance(studentId, isPresent)
    }

    setGestureState({
      startX: 0,
      startY: 0,
      startTime: 0,
      isDragging: false,
      element: null
    })
  }, [gestureState, selectedStudents])

  const markAttendance = useCallback(async (studentId: string, presente: boolean) => {
    if (session.bloqueado) {
      toast({
        title: 'Ação Não Permitida',
        description: 'Sessão bloqueada para edição',
        variant: 'destructive'
      })
      return
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(presente ? [50] : [50, 50, 50])
    }

    // Update local state immediately
    const updatedStudents = students.map(s => {
      if (s.aluno_id === studentId) {
        return {
          ...s,
          attendance: {
            id: s.attendance?.id,
            presente,
            observacoes: s.attendance?.observacoes,
            is_locked: false,
            timestamp: new Date().toISOString()
          },
          marked: true
        }
      }
      return s
    })

    setStudents(updatedStudents)
    onAttendanceUpdate(updatedStudents)

    // Queue for sync
    setPendingUpdates(prev => new Map(prev.set(studentId, {
      aluno_id: studentId,
      presente,
      timestamp: new Date().toISOString()
    })))

    // Visual feedback
    toast({
      title: presente ? '✓ Presente' : '✗ Ausente',
      description: `${students.find(s => s.aluno_id === studentId)?.student.nome_completo}`,
      duration: 1000
    })
  }, [students, session.bloqueado, onAttendanceUpdate])

  const markSelectedPresent = useCallback(() => {
    selectedStudents.forEach(studentId => {
      markAttendance(studentId, true)
    })
    setSelectedStudents(new Set())
  }, [selectedStudents, markAttendance])

  const undoLastAction = useCallback(() => {
    // Implementation for undo functionality
    toast({
      title: 'Desfazer',
      description: 'Funcionalidade em desenvolvimento',
      variant: 'default'
    })
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Filtered students
  const filteredStudents = students
    .filter(student => {
      if (searchTerm) {
        return student.student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
               student.student.numero_matricula.includes(searchTerm)
      }
      return true
    })
    .filter(student => {
      switch (filter) {
        case 'present':
          return student.attendance?.presente === true
        case 'absent':
          return student.attendance?.presente === false
        case 'unmarked':
          return !student.marked
        default:
          return true
      }
    })
    .sort((a, b) => a.numero_chamada - b.numero_chamada)

  const stats = {
    total: students.length,
    present: students.filter(s => s.attendance?.presente === true).length,
    absent: students.filter(s => s.attendance?.presente === false).length,
    pending: students.filter(s => !s.marked).length
  }

  const StudentCard = ({ student }: { student: Student }) => {
    const isPending = pendingUpdates.has(student.aluno_id)
    const isSelected = selectedStudents.has(student.aluno_id)

    return (
      <div
        ref={touchRef}
        className={cn(
          'relative bg-white rounded-xl border-2 border-gray-100 transition-all duration-200',
          'touch-target-large p-6 m-2', // Large touch targets
          isSelected && 'border-blue-400 bg-blue-50 scale-[0.98]',
          isPending && 'border-orange-300 bg-orange-50',
          student.marked && 'border-green-200',
          orientation === 'landscape' ? 'min-h-[120px]' : 'min-h-[140px]'
        )}
        onTouchStart={(e) => handleTouchStart(e, student.aluno_id)}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => handleTouchEnd(e, student.aluno_id, true)}
      >
        {/* Student Photo Placeholder */}
        <div className="flex items-start gap-4">
          <div className={cn(
            'flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700',
            orientation === 'landscape' ? 'w-12 h-12 text-lg' : 'w-16 h-16 text-xl'
          )}>
            {student.numero_chamada}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-semibold text-gray-900 truncate',
              orientation === 'landscape' ? 'text-base' : 'text-lg'
            )}>
              {student.student.nome_completo}
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Mat: {student.student.numero_matricula}
            </p>

            {/* Large Touch Buttons */}
            {!student.marked ? (
              <div className="flex gap-3">
                <Button
                  className={cn(
                    'flex-1 h-14 text-lg font-semibold bg-green-500 hover:bg-green-600 text-white',
                    'touch-target-large shadow-lg active:scale-95 transition-transform',
                    orientation === 'landscape' && 'h-12 text-base'
                  )}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    markAttendance(student.aluno_id, true)
                  }}
                  disabled={session.bloqueado}
                >
                  <Check className="h-6 w-6 mr-2" />
                  PRESENTE
                </Button>

                <Button
                  className={cn(
                    'flex-1 h-14 text-lg font-semibold bg-red-500 hover:bg-red-600 text-white',
                    'touch-target-large shadow-lg active:scale-95 transition-transform',
                    orientation === 'landscape' && 'h-12 text-base'
                  )}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    markAttendance(student.aluno_id, false)
                  }}
                  disabled={session.bloqueado}
                >
                  <X className="h-6 w-6 mr-2" />
                  AUSENTE
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Badge
                  className={cn(
                    'text-base px-4 py-2',
                    student.attendance?.presente
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  )}
                >
                  {student.attendance?.presente ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      PRESENTE
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 mr-2" />
                      AUSENTE
                    </>
                  )}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        {isPending && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300 text-orange-700">
              Sincronizando...
            </Badge>
          </div>
        )}

        {isSelected && (
          <div className="absolute top-2 left-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'flex flex-col h-screen bg-gray-50',
      orientation === 'landscape' ? 'landscape-layout' : 'portrait-layout',
      className
    )}>
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={cn(
                'font-bold text-gray-900',
                orientation === 'landscape' ? 'text-lg' : 'text-xl'
              )}>
                {session.turma_nome}
              </h1>
              <p className="text-sm text-gray-600">
                Prof. {session.professor_nome}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="touch-target-large"
              >
                📱
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center bg-gray-50 rounded-lg p-2">
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-2">
              <div className="text-lg font-bold text-green-600">{stats.present}</div>
              <div className="text-xs text-gray-600">Presentes</div>
            </div>
            <div className="text-center bg-red-50 rounded-lg p-2">
              <div className="text-lg font-bold text-red-600">{stats.absent}</div>
              <div className="text-xs text-gray-600">Ausentes</div>
            </div>
            <div className="text-center bg-orange-50 rounded-lg p-2">
              <div className="text-lg font-bold text-orange-600">{stats.pending}</div>
              <div className="text-xs text-gray-600">Pendentes</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar estudante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base" // Larger touch target
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter(filter === 'all' ? 'unmarked' : 'all')}
              className="touch-target-large whitespace-nowrap"
            >
              <Filter className="h-4 w-4 mr-1" />
              {filter === 'all' ? 'Pendentes' : 'Todos'}
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedStudents.size > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={markSelectedPresent}
                className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-5 w-5 mr-2" />
                Marcar {selectedStudents.size} como Presente
              </Button>

              <Button
                variant="outline"
                onClick={() => setSelectedStudents(new Set())}
                className="h-12 touch-target-large"
              >
                ✕
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Student Grid */}
      <ScrollArea className="flex-1 px-2">
        {session.bloqueado && (
          <Alert className="m-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800 font-medium">
              🔒 Sessão bloqueada. Frequência não pode ser modificada.
            </AlertDescription>
          </Alert>
        )}

        <div className={cn(
          'grid gap-2 p-2',
          orientation === 'landscape'
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-1 md:grid-cols-2'
        )}>
          {filteredStudents.map(student => (
            <StudentCard key={student.aluno_id} student={student} />
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum estudante encontrado</p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Fixed Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          {pendingUpdates.size > 0 && (
            <Button
              onClick={() => {/* Implement sync */}}
              disabled={isSaving || !isOnline}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-5 w-5 mr-2" />
              Sincronizar ({pendingUpdates.size})
            </Button>
          )}

          <Button
            variant="outline"
            onClick={undoLastAction}
            className="h-12 touch-target-large"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Styles for touch optimization */}
      <style jsx>{`
        .touch-target-large {
          min-height: 44px;
          min-width: 44px;
        }

        .landscape-layout {
          /* Optimize for landscape tablet use */
        }

        .portrait-layout {
          /* Optimize for portrait tablet use */
        }

        /* Improve touch responsiveness */
        button {
          touch-action: manipulation;
        }

        /* Reduce click delay on iOS */
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  )
}