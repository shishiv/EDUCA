'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Check,
  X,
  Clock,
  AlertCircle,
  Save,
  Users,
  Search,
  Filter,
  MoreVertical,
  Undo2,
  CheckCircle2,
  XCircle,
  User,
  Smartphone,
  Volume2,
  Eye,
  EyeOff,
  RotateCcw,
  FileCheck,
  Heart,
  Stethoscope,
  AlertTriangle,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Student {
  id: string
  nome_completo: string
  numero_matricula: string
  numero_chamada: number
  data_nascimento?: string
  foto_url?: string
}

interface AttendanceRecord {
  student_id: string
  status: 'presente' | 'falta' | 'justificada' | 'atestado'
  timestamp: Date
  observacoes?: string
}

interface AttendanceAction {
  id: string
  studentId: string
  previousStatus: AttendanceRecord['status'] | null
  newStatus: AttendanceRecord['status']
  timestamp: Date
}

interface TabletAttendanceGridProps {
  classId: string
  sessionId: string
  students: Student[]
  onSave: (records: AttendanceRecord[]) => Promise<void>
  onCancel?: () => void
  className?: string
  autoSave?: boolean
  showPhotos?: boolean
}

const STATUS_CONFIG = {
  presente: {
    label: 'Presente',
    shortLabel: 'P',
    icon: CheckCircle2,
    color: 'bg-green-500 hover:bg-green-600 border-green-600',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Estudante presente na aula'
  },
  falta: {
    label: 'Falta',
    shortLabel: 'F',
    icon: XCircle,
    color: 'bg-red-500 hover:bg-red-600 border-red-600',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    description: 'Estudante ausente sem justificativa'
  },
  justificada: {
    label: 'Falta Justificada',
    shortLabel: 'J',
    icon: FileCheck,
    color: 'bg-orange-500 hover:bg-orange-600 border-orange-600',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    description: 'Ausência com justificativa válida'
  },
  atestado: {
    label: 'Atestado Médico',
    shortLabel: 'A',
    icon: Stethoscope,
    color: 'bg-blue-500 hover:bg-blue-600 border-blue-600',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Ausência com atestado médico'
  }
} as const

export function TabletOptimizedAttendanceGrid({
  classId,
  sessionId,
  students,
  onSave,
  onCancel,
  className,
  autoSave = false,
  showPhotos = true
}: TabletAttendanceGridProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map())
  const [actionHistory, setActionHistory] = useState<AttendanceAction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | AttendanceRecord['status']>('all')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isCompactView, setIsCompactView] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showLegend, setShowLegend] = useState(true)

  // Filtered students based on search and filter
  const filteredStudents = useMemo(() => {
    let filtered = students

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.numero_matricula.includes(searchTerm) ||
        student.numero_chamada.toString().includes(searchTerm)
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(student => {
        const record = attendanceRecords.get(student.id)
        return record?.status === filterStatus
      })
    }

    return filtered.sort((a, b) => a.numero_chamada - b.numero_chamada)
  }, [students, searchTerm, filterStatus, attendanceRecords])

  // Statistics
  const stats = useMemo(() => {
    const total = students.length
    const marked = attendanceRecords.size
    const presente = Array.from(attendanceRecords.values()).filter(r => r.status === 'presente').length
    const falta = Array.from(attendanceRecords.values()).filter(r => r.status === 'falta').length
    const justificada = Array.from(attendanceRecords.values()).filter(r => r.status === 'justificada').length
    const atestado = Array.from(attendanceRecords.values()).filter(r => r.status === 'atestado').length
    const pending = total - marked

    return { total, marked, presente, falta, justificada, atestado, pending }
  }, [students.length, attendanceRecords])

  // Play sound feedback
  const playSound = useCallback((type: 'mark' | 'undo' | 'save' | 'error') => {
    if (!soundEnabled) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    const frequencies = {
      mark: 800,
      undo: 600,
      save: 1000,
      error: 400
    }

    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime)
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }, [soundEnabled])

  // Mark attendance for a student
  const markAttendance = useCallback((studentId: string, status: AttendanceRecord['status'], observacoes?: string) => {
    const previousRecord = attendanceRecords.get(studentId)
    const newRecord: AttendanceRecord = {
      student_id: studentId,
      status,
      timestamp: new Date(),
      observacoes
    }

    setAttendanceRecords(prev => new Map(prev.set(studentId, newRecord)))

    // Add to action history for undo functionality
    const action: AttendanceAction = {
      id: `${studentId}-${Date.now()}`,
      studentId,
      previousStatus: previousRecord?.status || null,
      newStatus: status,
      timestamp: new Date()
    }
    setActionHistory(prev => [...prev, action])

    playSound('mark')

    // Show feedback toast
    const student = students.find(s => s.id === studentId)
    if (student) {
      toast.success(`${student.nome_completo}: ${STATUS_CONFIG[status].label}`, {
        duration: 1500
      })
    }
  }, [attendanceRecords, students, playSound])

  // Undo last action
  const undoLastAction = useCallback(() => {
    if (actionHistory.length === 0) return

    const lastAction = actionHistory[actionHistory.length - 1]
    setActionHistory(prev => prev.slice(0, -1))

    if (lastAction.previousStatus === null) {
      // Remove the record entirely
      setAttendanceRecords(prev => {
        const newMap = new Map(prev)
        newMap.delete(lastAction.studentId)
        return newMap
      })
    } else {
      // Restore previous status
      const restoredRecord: AttendanceRecord = {
        student_id: lastAction.studentId,
        status: lastAction.previousStatus,
        timestamp: new Date()
      }
      setAttendanceRecords(prev => new Map(prev.set(lastAction.studentId, restoredRecord)))
    }

    playSound('undo')
    toast.info('Última ação desfeita')
  }, [actionHistory, playSound])

  // Bulk operations
  const markAllAsPresent = useCallback(() => {
    filteredStudents.forEach(student => {
      markAttendance(student.id, 'presente')
    })
    toast.success(`${filteredStudents.length} alunos marcados como presentes`)
  }, [filteredStudents, markAttendance])

  const markSelectedAs = useCallback((status: AttendanceRecord['status']) => {
    selectedStudents.forEach(studentId => {
      markAttendance(studentId, status)
    })
    setSelectedStudents(new Set())
    toast.success(`${selectedStudents.size} alunos marcados como ${STATUS_CONFIG[status].label.toLowerCase()}`)
  }, [selectedStudents, markAttendance])

  // Save attendance records
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const records = Array.from(attendanceRecords.values())
      await onSave(records)
      playSound('save')
      toast.success('Frequência salva com sucesso!')
    } catch (error) {
      playSound('error')
      toast.error('Erro ao salvar frequência. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }, [attendanceRecords, onSave, playSound])

  // Toggle student selection
  const toggleStudentSelection = useCallback((studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }, [])

  // Student Card Component
  const StudentCard = ({ student }: { student: Student }) => {
    const record = attendanceRecords.get(student.id)
    const isSelected = selectedStudents.has(student.id)

    return (
      <Card
        className={cn(
          "touch-manipulation transition-all duration-200 border-2",
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
          record ? STATUS_CONFIG[record.status].bgColor : "bg-white"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {/* Selection checkbox */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => toggleStudentSelection(student.id)}
            >
              <div className={cn(
                "h-5 w-5 rounded border-2 flex items-center justify-center",
                isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
              )}>
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
            </Button>

            {/* Student avatar */}
            {showPhotos && (
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm">
                  {student.nome_completo.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Student info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {student.numero_chamada}
                </Badge>
                <span className="font-medium text-sm truncate">
                  {student.nome_completo}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                Matrícula: {student.numero_matricula}
              </p>
            </div>

            {/* Current status */}
            {record && (
              <Badge
                variant="outline"
                className={cn("text-xs", STATUS_CONFIG[record.status].textColor)}
              >
                {STATUS_CONFIG[record.status].shortLabel}
              </Badge>
            )}
          </div>

          {/* Touch-friendly status buttons */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const StatusIcon = config.icon
              const isActive = record?.status === status

              return (
                <Button
                  key={status}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-12 flex flex-col gap-1 text-xs touch-target-large",
                    isActive ? config.color : "hover:border-gray-400"
                  )}
                  onClick={() => markAttendance(student.id, status as AttendanceRecord['status'])}
                >
                  <StatusIcon className="h-4 w-4" />
                  <span>{config.shortLabel}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with controls */}
      <div className="flex flex-col gap-4">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, matrícula ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 px-4">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtro
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                  <Users className="h-4 w-4 mr-2" />
                  Todos os alunos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                  const StatusIcon = config.icon
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => setFilterStatus(status as AttendanceRecord['status'])}
                    >
                      <StatusIcon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 px-3">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowLegend(!showLegend)}>
                  {showLegend ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showLegend ? 'Ocultar' : 'Mostrar'} legenda
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSoundEnabled(!soundEnabled)}>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Som {soundEnabled ? 'desligado' : 'ligado'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCompactView(!isCompactView)}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Visualização {isCompactView ? 'normal' : 'compacta'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats and progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4 text-sm">
                <span>Total: <strong>{stats.total}</strong></span>
                <span>Marcados: <strong>{stats.marked}</strong></span>
                <span>Pendentes: <strong>{stats.pending}</strong></span>
              </div>
              <div className="text-sm text-gray-500">
                {Math.round((stats.marked / stats.total) * 100)}% concluído
              </div>
            </div>
            <Progress value={(stats.marked / stats.total) * 100} className="h-2" />

            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                Presentes: {stats.presente}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                Faltas: {stats.falta}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                Justificadas: {stats.justificada}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                Atestados: {stats.atestado}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        {showLegend && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 text-sm">Legenda dos Status</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                  const StatusIcon = config.icon
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <StatusIcon className={cn("h-4 w-4", config.textColor)} />
                      <div>
                        <p className="text-sm font-medium">{config.shortLabel} - {config.label}</p>
                        <p className="text-xs text-gray-500">{config.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk actions */}
        {selectedStudents.size > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">
                  {selectedStudents.size} aluno(s) selecionado(s)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStudents(new Set())}
                >
                  Desmarcar todos
                </Button>
              </div>
              <div className="flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                  const StatusIcon = config.icon
                  return (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      className="h-10"
                      onClick={() => markSelectedAs(status as AttendanceRecord['status'])}
                    >
                      <StatusIcon className="h-4 w-4 mr-1" />
                      {config.shortLabel}
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Students grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStudents.map(student => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>

      {/* Empty state */}
      {filteredStudents.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'Nenhum aluno encontrado com os filtros aplicados'
                : 'Nenhum aluno encontrado'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={undoLastAction}
              disabled={actionHistory.length === 0}
              className="h-12"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Desfazer
            </Button>

            <Button
              variant="outline"
              onClick={markAllAsPresent}
              className="h-12"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar Todos Presentes
            </Button>
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="h-12"
              >
                Cancelar
              </Button>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || attendanceRecords.size === 0}
              className="h-12 min-w-32"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Frequência
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}