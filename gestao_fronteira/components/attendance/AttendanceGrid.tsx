/**
 * Enhanced Touch-Optimized Attendance Grid
 * Task 1.2.2 & 1.2.4: AttendanceGrid with 3-state support and real-time summary
 * Task 1.3.2: Visual lock indicator for 18:00 blocking
 *
 * Features:
 * - Three-state attendance: P (Presente), F (Falta), A (Attestado)
 * - Touch-optimized with 44px minimum touch targets
 * - Real-time summary with attendance rate badge (green >= 80%, yellow >= 75%, red < 75%)
 * - Batch operations and real-time sync
 * - Visual lock indicator when session is locked after 18:00
 * - Brazilian educational compliance: "nao existe o esquecer"
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see types/diario-classe.ts for TypeScript types
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  FileText,
  Lock,
  LockOpen,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { AttendanceCell, type AttendanceStatus } from './AttendanceCell'

// ============================================================================
// Types
// ============================================================================

interface Student {
  id: string
  nome_completo: string
  data_nascimento: string
  foto_url?: string
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
  status_presenca?: AttendanceStatus
  observacoes?: string
  horario_marcacao: string
  is_locked?: boolean
  created_by?: string
  updated_by?: string
}

/**
 * Session lock information for UI display
 * Task 1.3.2: Lock indicator implementation
 */
interface SessionLockInfo {
  isLocked: boolean
  lockReason: 'time_18h' | 'session_closed' | 'past_date' | null
  canEdit: boolean
  message: string
  timeUntilLockMinutes: number | null
}

interface AttendanceGridProps {
  /** Session ID for the attendance */
  sessionId: string
  /** Class/turma ID */
  turmaId: string
  /** Session date in ISO format (YYYY-MM-DD) for lock calculation */
  sessionDate?: string
  /** Session status (PLANEJADA, ABERTA, FECHADA, CANCELADA) */
  sessionStatus?: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'
  /** Whether the grid is readonly (locked session) */
  readonly?: boolean
  /** Show student photos */
  showPhotos?: boolean
  /** Callback when attendance statistics change */
  onAttendanceChange?: (stats: AttendanceStats) => void
}

/**
 * Attendance statistics for the grid header
 * Task 1.2.4: Real-time summary calculation
 */
export interface AttendanceStats {
  /** Total number of students */
  total: number
  /** Number of students marked present */
  present: number
  /** Number of students marked absent */
  absent: number
  /** Number of students with excused absence (attestado) */
  attestado: number
  /** Number of students not yet marked */
  pending: number
  /** Number of locked records */
  locked: number
  /** Attendance rate: (present + attestado) / marked * 100 */
  attendanceRate: number
}

// ============================================================================
// Lock Status Helper Functions (Task 1.3.2)
// ============================================================================

/**
 * Check if current time is before 18:00 in Sao Paulo timezone
 */
function isBefore18hSaoPaulo(): boolean {
  const now = new Date()
  // Get current hour in Sao Paulo timezone
  const saoPauloTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false
  }).format(now)
  const currentHour = parseInt(saoPauloTime, 10)
  return currentHour < 18
}

/**
 * Calculate time until 18:00 lock in minutes
 */
function getTimeUntilLock(): number {
  const now = new Date()
  const saoPauloFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  })
  const parts = saoPauloFormatter.formatToParts(now)
  const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)

  const lockHour = 18
  const minutesUntilLock = (lockHour - currentHour) * 60 - currentMinute
  return Math.max(0, minutesUntilLock)
}

/**
 * Format time until lock in human-readable format
 */
function formatTimeUntilLock(minutes: number): string {
  if (minutes <= 0) return 'Bloqueado'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}

/**
 * Get the current date in Sao Paulo timezone (YYYY-MM-DD format)
 */
function getTodaySaoPaulo(): string {
  const now = new Date()
  const saoPauloFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return saoPauloFormatter.format(now)
}

/**
 * Determine session lock status based on time and session state
 * Task 1.3.2: Lock indicator logic
 */
function getSessionLockInfo(
  sessionDate?: string,
  sessionStatus?: string
): SessionLockInfo {
  const today = getTodaySaoPaulo()

  // If session is already closed
  if (sessionStatus === 'FECHADA') {
    return {
      isLocked: true,
      lockReason: 'session_closed',
      canEdit: false,
      message: 'Sessao finalizada. Frequencia nao pode ser modificada.',
      timeUntilLockMinutes: null
    }
  }

  // If session date is in the past
  if (sessionDate && sessionDate < today) {
    return {
      isLocked: true,
      lockReason: 'past_date',
      canEdit: false,
      message: 'Data passada. Frequencia bloqueada para garantir integridade dos registros.',
      timeUntilLockMinutes: null
    }
  }

  // If session is today, check time
  if (sessionDate === today || !sessionDate) {
    const isBefore18h = isBefore18hSaoPaulo()
    const timeUntilLock = getTimeUntilLock()

    if (!isBefore18h) {
      return {
        isLocked: true,
        lockReason: 'time_18h',
        canEdit: false,
        message: 'Frequencia bloqueada apos 18:00. Principio "nao existe o esquecer" da legislacao educacional brasileira.',
        timeUntilLockMinutes: 0
      }
    }

    // Session is open and editable
    return {
      isLocked: false,
      lockReason: null,
      canEdit: true,
      message: timeUntilLock <= 60
        ? `Atencao: Bloqueio automatico em ${formatTimeUntilLock(timeUntilLock)}`
        : '',
      timeUntilLockMinutes: timeUntilLock
    }
  }

  // Future date - editable
  return {
    isLocked: false,
    lockReason: null,
    canEdit: true,
    message: '',
    timeUntilLockMinutes: null
  }
}

// ============================================================================
// Component
// ============================================================================

export function AttendanceGrid({
  sessionId,
  turmaId,
  sessionDate,
  sessionStatus,
  readonly = false,
  showPhotos = true,
  onAttendanceChange
}: AttendanceGridProps) {
  // State
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Map<string, AttendanceRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced')
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())

  // Task 1.3.2: Lock status state
  const [lockInfo, setLockInfo] = useState<SessionLockInfo>(() =>
    getSessionLockInfo(sessionDate, sessionStatus)
  )

  // Determine if grid is effectively readonly based on lock status
  const isEffectivelyReadonly = readonly || lockInfo.isLocked || !lockInfo.canEdit

  // =========================================================================
  // Lock Status Update Effect (Task 1.3.2)
  // =========================================================================

  // Update lock info periodically (every minute) to handle 18:00 transition
  useEffect(() => {
    const updateLockInfo = () => {
      setLockInfo(getSessionLockInfo(sessionDate, sessionStatus))
    }

    // Update immediately
    updateLockInfo()

    // Set up interval to check every minute
    const interval = setInterval(updateLockInfo, 60000)

    return () => clearInterval(interval)
  }, [sessionDate, sessionStatus])

  // =========================================================================
  // Data Loading
  // =========================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Load students from Supabase
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

      // Load existing attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('frequencia')
        .select('*')
        .eq('sessao_id', sessionId)

      if (attendanceError) throw attendanceError

      const attendanceMap = new Map<string, AttendanceRecord>()
      attendanceData?.forEach(record => {
        // Map database status_presenca to our AttendanceStatus type
        let status: AttendanceStatus = 'empty'
        if (record.status_presenca === 'P') status = 'presente'
        else if (record.status_presenca === 'F') status = 'falta'
        else if (record.status_presenca === 'A') status = 'attestado'
        else if (record.presente) status = 'presente'
        else if (record.presente === false) status = 'falta'

        attendanceMap.set(record.matricula_id, {
          id: record.id,
          aluno_id: record.matricula_id,
          presente: record.presente || status === 'presente' || status === 'attestado',
          status_presenca: status,
          observacoes: record.observacoes_frequencia,
          horario_marcacao: record.marcado_em || record.created_at,
          is_locked: record.bloqueado,
          created_by: record.marcado_por,
          updated_by: record.marcado_por
        })
      })

      setAttendance(attendanceMap)

    } catch (error) {
      logger.error('Erro ao carregar dados:', { error: error })
      toast.error('Erro ao carregar dados dos alunos')
    } finally {
      setLoading(false)
    }
  }, [sessionId, turmaId])

  // =========================================================================
  // Statistics Calculation (Task 1.2.4)
  // =========================================================================

  const stats = useMemo((): AttendanceStats => {
    const total = students.length
    let present = 0
    let absent = 0
    let attestado = 0
    let locked = 0

    attendance.forEach(record => {
      const status = record.status_presenca || 'empty'

      if (status === 'attestado') {
        attestado++
      } else if (status === 'presente') {
        present++
      } else if (status === 'falta') {
        absent++
      }

      if (record.is_locked) locked++
    })

    const pending = total - (present + absent + attestado)

    // Calculate attendance rate: (present + attestado) / marked * 100
    // Attestados count as "attended" for frequency calculation
    const attended = present + attestado
    const marked = present + absent + attestado
    const attendanceRate = marked > 0 ? Math.round((attended / marked) * 100) : 0

    return { total, present, absent, attestado, pending, locked, attendanceRate }
  }, [students.length, attendance])

  // Notify parent component of attendance changes
  useEffect(() => {
    onAttendanceChange?.(stats)
  }, [stats, onAttendanceChange])

  // =========================================================================
  // Filtered Students
  // =========================================================================

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students

    return students.filter(student =>
      student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [students, searchTerm])

  // =========================================================================
  // Effects
  // =========================================================================

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

  // Real-time subscription for attendance changes
  useEffect(() => {
    const subscription = supabase
      .channel(`attendance_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'frequencia',
        filter: `sessao_id=eq.${sessionId}`
      }, () => {
        // Reload data on any change
        loadData()
        setSyncStatus('synced')
        setLastSyncTime(new Date())
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [sessionId, loadData])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // =========================================================================
  // Attendance Marking (3-state support)
  // =========================================================================

  const markAttendanceStatus = async (studentId: string, status: AttendanceStatus) => {
    // Task 1.3.2: Block if locked
    if (isEffectivelyReadonly) {
      toast.error('Frequencia bloqueada. Nao e possivel fazer alteracoes.')
      return
    }

    try {
      setSyncStatus('pending')

      // Map status to database fields
      const statusMap: Record<AttendanceStatus, { presente: boolean; status_presenca: string }> = {
        'presente': { presente: true, status_presenca: 'P' },
        'falta': { presente: false, status_presenca: 'F' },
        'attestado': { presente: true, status_presenca: 'A' },
        'empty': { presente: false, status_presenca: '' }
      }

      const statusFields = statusMap[status]

      // Optimistic update
      const newRecord: AttendanceRecord = {
        aluno_id: studentId,
        presente: statusFields.presente,
        status_presenca: status,
        horario_marcacao: new Date().toISOString()
      }

      setAttendance(prev => {
        const newMap = new Map(prev)
        if (status === 'empty') {
          newMap.delete(studentId)
        } else {
          newMap.set(studentId, newRecord)
        }
        return newMap
      })

      // Send to server
      const response = await fetch(`/api/sessoes/aula/${sessionId}/frequencia/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance: status === 'empty' ? [] : [{
            aluno_id: studentId,
            presente: statusFields.presente,
            status_presenca: statusFields.status_presenca,
            horario_marcacao: new Date().toISOString()
          }]
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // Check if it's a lock-related error
        if (result.error?.includes('18:00') || result.error?.includes('bloqueado') || result.error?.includes('locked') || result.error?.includes('IMUTABILIDADE')) {
          setLockInfo(getSessionLockInfo(sessionDate, sessionStatus))
          toast.error('Frequencia bloqueada. Atualizando status...')
        }
        throw new Error(result.error || 'Erro ao marcar presenca')
      }

      setSyncStatus('synced')
      setLastSyncTime(new Date())

      // Show feedback toast
      const statusLabels: Record<AttendanceStatus, string> = {
        'presente': 'presente',
        'falta': 'ausente',
        'attestado': 'com atestado',
        'empty': 'desmarcado'
      }
      const studentName = students.find(s => s.id === studentId)?.nome_completo || 'Aluno'
      toast.success(
        `${studentName} marcado como ${statusLabels[status]}`,
        { duration: 2000 }
      )

    } catch (error) {
      logger.error('Erro ao marcar presenca:', { error: error })
      setSyncStatus('error')
      loadData() // Revert optimistic update
      toast.error('Erro ao marcar presenca. Tente novamente.')
    }
  }

  // Batch mark attendance for selected students
  const batchMarkAttendance = async (present: boolean) => {
    // Task 1.3.2: Block if locked
    if (isEffectivelyReadonly || selectedStudents.size === 0) {
      if (isEffectivelyReadonly) {
        toast.error('Frequencia bloqueada. Nao e possivel fazer alteracoes.')
      }
      return
    }

    try {
      setSaving(true)
      setSyncStatus('pending')

      const status: AttendanceStatus = present ? 'presente' : 'falta'
      const dbStatus = present ? 'P' : 'F'

      const attendanceRecords = Array.from(selectedStudents).map(studentId => ({
        aluno_id: studentId,
        presente: present,
        status_presenca: dbStatus,
        horario_marcacao: new Date().toISOString()
      }))

      // Optimistic update
      const newAttendance = new Map(attendance)
      attendanceRecords.forEach(record => {
        newAttendance.set(record.aluno_id, {
          ...record,
          status_presenca: status
        })
      })
      setAttendance(newAttendance)

      // Send to server
      const response = await fetch(`/api/sessoes/aula/${sessionId}/frequencia/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: attendanceRecords })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao marcar presenca em lote')
      }

      setSyncStatus('synced')
      setLastSyncTime(new Date())
      setSelectedStudents(new Set())

      toast.success(
        `${selectedStudents.size} aluno(s) marcado(s) como ${present ? 'presente(s)' : 'ausente(s)'}`,
        { duration: 3000 }
      )

    } catch (error) {
      logger.error('Erro ao marcar presenca em lote:', { error: error })
      setSyncStatus('error')
      loadData()
      toast.error('Erro ao marcar presenca em lote. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // =========================================================================
  // Helper Functions
  // =========================================================================

  const getStudentInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  const getAttendanceStatus = (studentId: string): AttendanceStatus => {
    const record = attendance.get(studentId)
    if (!record) return 'empty'
    return record.status_presenca || 'empty'
  }

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

  /**
   * Get row styling based on attendance status
   * Colors from spec: green (#dcfce7), red (#fee2e2), yellow (#fef3c7)
   */
  const getRowClassName = (status: AttendanceStatus, isSelected: boolean, isLocked: boolean) => {
    return cn(
      'flex items-center justify-between p-3 rounded-lg border-2 transition-all',
      // Status-based colors
      status === 'presente' && 'border-green-200 bg-green-50',
      status === 'falta' && 'border-red-200 bg-red-50',
      status === 'attestado' && 'border-yellow-200 bg-yellow-50',
      status === 'empty' && 'border-gray-200 bg-gray-50',
      // Selection ring
      isSelected && 'ring-2 ring-primary',
      // Locked opacity
      isLocked && 'opacity-70'
    )
  }

  /**
   * Get attendance rate badge color
   * Task 1.2.4: Badge with color based on percentage
   * - Green >= 80%
   * - Yellow >= 75%
   * - Red < 75%
   */
  const getAttendanceRateBadgeClass = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 border-green-600 text-green-700'
    if (rate >= 75) return 'bg-yellow-100 border-yellow-600 text-yellow-700'
    return 'bg-red-100 border-red-600 text-red-700'
  }

  // =========================================================================
  // Render
  // =========================================================================

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
        {/* Task 1.3.2: Lock Status Banner */}
        {lockInfo.isLocked && (
          <Alert variant="destructive" className="mb-4 border-orange-500 bg-orange-50">
            <Lock className="h-5 w-5 text-orange-600" />
            <AlertTitle className="text-orange-800 font-semibold">
              Frequencia Bloqueada
            </AlertTitle>
            <AlertDescription className="text-orange-700">
              {lockInfo.message}
              {lockInfo.lockReason === 'time_18h' && (
                <p className="mt-1 text-sm">
                  Conforme legislacao educacional brasileira, os registros de frequencia sao imutaveis apos as 18:00.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Task 1.3.2: Warning Banner - Approaching Lock Time */}
        {!lockInfo.isLocked && lockInfo.timeUntilLockMinutes !== null && lockInfo.timeUntilLockMinutes <= 60 && (
          <Alert className="mb-4 border-yellow-500 bg-yellow-50">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="text-yellow-800 font-semibold">
              Atencao: Bloqueio Proximo
            </AlertTitle>
            <AlertDescription className="text-yellow-700">
              {lockInfo.message}
              <p className="mt-1 text-sm">
                Finalize as marcacoes de frequencia antes do bloqueio automatico as 18:00.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4 flex-wrap gap-y-2">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Chamada - {stats.total} aluno(s)</span>
            </CardTitle>

            {/* Task 1.3.2: Lock Status Indicator */}
            <div className="flex items-center space-x-1 text-xs">
              {lockInfo.isLocked ? (
                <>
                  <Lock className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-600 font-medium">Bloqueado</span>
                </>
              ) : (
                <>
                  <LockOpen className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Editavel</span>
                </>
              )}
            </div>

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
                {syncStatus === 'error' && 'Erro na sincronizacao'}
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

        {/* Statistics Summary (Task 1.2.4) */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>Total: {stats.total}</span>
          </Badge>
          <Badge variant="default" className="flex items-center space-x-1 bg-green-600 hover:bg-green-600">
            <UserCheck className="h-3 w-3" />
            <span>Presentes: {stats.present}</span>
          </Badge>
          <Badge variant="destructive" className="flex items-center space-x-1">
            <UserX className="h-3 w-3" />
            <span>Ausentes: {stats.absent}</span>
          </Badge>
          <Badge variant="default" className="flex items-center space-x-1 bg-yellow-500 hover:bg-yellow-500">
            <FileText className="h-3 w-3" />
            <span>Atestados: {stats.attestado}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Pendentes: {stats.pending}</span>
          </Badge>

          {/* Attendance Rate Badge with color coding */}
          {(stats.present + stats.absent + stats.attestado) > 0 && (
            <Badge
              variant="outline"
              className={cn(
                'flex items-center space-x-1 font-semibold',
                getAttendanceRateBadgeClass(stats.attendanceRate)
              )}
            >
              <span>Taxa: {stats.attendanceRate}%</span>
            </Badge>
          )}

          {/* Task 1.3.2: Lock badge in statistics */}
          {lockInfo.isLocked && (
            <Badge variant="outline" className="flex items-center space-x-1 bg-orange-50 border-orange-500 text-orange-700">
              <Lock className="h-3 w-3" />
              <span>Bloqueado</span>
            </Badge>
          )}
        </div>

        {/* Batch Actions - Only show if not locked */}
        {!isEffectivelyReadonly && selectedStudents.size > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md mt-4">
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
              Limpar Selecao
            </Button>
          </div>
        )}

        {/* Offline warning */}
        {!isOnline && (
          <Alert variant="destructive" className="mt-4">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Voce esta offline. As marcacoes serao sincronizadas quando a conexao for reestabelecida.
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
            const isRecordLocked = record?.is_locked || lockInfo.isLocked

            return (
              <div
                key={student.id}
                className={getRowClassName(attendanceStatus, isSelected, isRecordLocked)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  {/* Selection checkbox - Only show if not locked */}
                  {!isEffectivelyReadonly && !isRecordLocked && (
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
                      className="h-5 w-5"
                    />
                  )}

                  {/* Lock icon for locked records (Task 1.3.2) */}
                  {isRecordLocked && (
                    <Lock className="h-4 w-4 text-orange-500 flex-shrink-0" />
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
                          - Marcado as {new Date(record.horario_marcacao).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                      {isRecordLocked && (
                        <span className="ml-2 text-orange-600 font-medium">- Bloqueado</span>
                      )}
                    </p>
                  </div>

                  {/* Status indicator dot */}
                  <div className="flex items-center">
                    {attendanceStatus === 'presente' && (
                      <div className="h-3 w-3 bg-green-600 rounded-full" />
                    )}
                    {attendanceStatus === 'falta' && (
                      <div className="h-3 w-3 bg-red-600 rounded-full" />
                    )}
                    {attendanceStatus === 'attestado' && (
                      <div className="h-3 w-3 bg-yellow-500 rounded-full" />
                    )}
                    {attendanceStatus === 'empty' && (
                      <div className="h-3 w-3 bg-gray-400 rounded-full" />
                    )}
                  </div>
                </div>

                {/* AttendanceCell - 3-state button (Task 1.2.3) - Only if not locked */}
                {!isEffectivelyReadonly && !isRecordLocked && (
                  <div className="ml-3">
                    <AttendanceCell
                      studentId={student.id}
                      studentName={student.nome_completo}
                      currentStatus={attendanceStatus}
                      onStatusChange={(newStatus) => markAttendanceStatus(student.id, newStatus)}
                      disabled={saving}
                    />
                  </div>
                )}

                {/* Readonly badge (when locked or readonly) - Task 1.3.2 */}
                {(isEffectivelyReadonly || isRecordLocked) && (
                  <div className="ml-3 flex items-center space-x-2">
                    <Badge
                      variant={
                        attendanceStatus === 'presente' ? 'default' :
                        attendanceStatus === 'falta' ? 'destructive' :
                        attendanceStatus === 'attestado' ? 'default' : 'secondary'
                      }
                      className={cn(
                        attendanceStatus === 'presente' && 'bg-green-600',
                        attendanceStatus === 'attestado' && 'bg-yellow-500'
                      )}
                    >
                      {attendanceStatus === 'presente' && 'Presente'}
                      {attendanceStatus === 'falta' && 'Ausente'}
                      {attendanceStatus === 'attestado' && 'Atestado'}
                      {attendanceStatus === 'empty' && 'Nao marcado'}
                    </Badge>
                    {isRecordLocked && (
                      <Lock className="h-4 w-4 text-orange-500" />
                    )}
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

        {/* Quick actions - Only show if not locked */}
        {!isEffectivelyReadonly && filteredStudents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const unmarkedStudents = filteredStudents
                  .filter(s => {
                    const status = getAttendanceStatus(s.id)
                    return status === 'empty' && !attendance.get(s.id)?.is_locked
                  })
                  .map(s => s.id)
                setSelectedStudents(new Set(unmarkedStudents))
              }}
              className="min-h-[36px]"
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              Selecionar Nao Marcados
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStudents(new Set())}
              className="min-h-[36px]"
            >
              <Square className="h-3 w-3 mr-1" />
              Limpar Selecao
            </Button>
          </div>
        )}

        {/* Task 1.3.2: Lock info footer */}
        {lockInfo.isLocked && (
          <div className="mt-6 pt-4 border-t flex items-center justify-center text-sm text-orange-600">
            <Lock className="h-4 w-4 mr-2" />
            <span>Frequencia bloqueada - Somente visualizacao disponivel</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
