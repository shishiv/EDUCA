/**
 * Enhanced Touch-Optimized Attendance Grid
 * Refactored from 1,078 LOC to ~400 LOC (Phase 15-07)
 *
 * Features:
 * - Three-state attendance: P (Presente), F (Falta), A (Attestado)
 * - Touch-optimized with 44px minimum touch targets
 * - Real-time summary with attendance rate badge (green >= 80%, yellow >= 75%, red < 75%)
 * - Batch operations and real-time sync
 * - Visual lock indicator when session is locked after 18:00
 * - Brazilian educational compliance: "nao existe o esquecer"
 *
 * Subcomponents:
 * - AttendanceGridHeader: Lock banners, title, search, stats, batch actions
 * - AttendanceGridRow: Individual student row with attendance marking
 * - AttendanceGridSummary: Quick actions and lock footer
 * - AttendanceGridUtils: Lock status helper functions
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see types/diario-classe.ts for TypeScript types
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { AttendanceStatusUI } from '@/types/attendance'
import { uiStatusToDB, dbStatusToUI } from '@/types/attendance'
import { AttendanceGridHeader } from './AttendanceGridHeader'
import { AttendanceGridRow } from './AttendanceGridRow'
import { AttendanceGridSummary } from './AttendanceGridSummary'
import { getSessionLockInfo } from './AttendanceGridUtils'
import type {
  Student,
  AttendanceRecord,
  AttendanceStats,
  SessionLockInfo,
  AttendanceGridProps,
} from './AttendanceGridTypes'

// Re-export types for consumers
export type { AttendanceStats, AttendanceGridProps } from './AttendanceGridTypes'

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
  const [lockInfo, setLockInfo] = useState<SessionLockInfo>(() =>
    getSessionLockInfo(sessionDate, sessionStatus)
  )

  const isEffectivelyReadonly = readonly || lockInfo.isLocked || !lockInfo.canEdit

  // =========================================================================
  // Effects
  // =========================================================================

  // Update lock info periodically
  useEffect(() => {
    const updateLockInfo = () => {
      setLockInfo(getSessionLockInfo(sessionDate, sessionStatus))
    }
    updateLockInfo()
    const interval = setInterval(updateLockInfo, 60000)
    return () => clearInterval(interval)
  }, [sessionDate, sessionStatus])

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

  // =========================================================================
  // Data Loading
  // =========================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

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

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('frequencia')
        .select('*')
        .eq('sessao_id', sessionId)

      if (attendanceError) throw attendanceError

      const attendanceMap = new Map<string, AttendanceRecord>()
      attendanceData?.forEach(record => {
        let status: AttendanceStatusUI = 'empty'
        if (record.status_presenca === 'P') status = 'presente'
        else if (record.status_presenca === 'F') status = 'falta'
        else if (record.status_presenca === 'A') status = 'attestado'
        else if (record.presente) status = 'presente'
        else if (record.presente === false) status = 'falta'

        attendanceMap.set(record.matricula_id, {
          id: record.id,
          aluno_id: record.matricula_id,
          presente: record.presente || status === 'presente' || status === 'attestado',
          status_presenca: uiStatusToDB(status),
          observacoes: record.observacoes_frequencia ?? undefined,
          horario_marcacao: record.marcado_em || record.created_at || new Date().toISOString(),
          is_locked: record.bloqueado,
          created_by: record.marcado_por ?? undefined,
          updated_by: record.marcado_por ?? undefined
        })
      })

      setAttendance(attendanceMap)

    } catch (error) {
      logger.error('Erro ao carregar dados:', error instanceof Error ? error : new Error(String(error)))
      toast.error('Erro ao carregar dados dos alunos')
    } finally {
      setLoading(false)
    }
  }, [sessionId, turmaId])

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel(`attendance_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'frequencia',
        filter: `sessao_id=eq.${sessionId}`
      }, () => {
        loadData()
        setSyncStatus('synced')
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
  // Statistics Calculation
  // =========================================================================

  const stats = useMemo((): AttendanceStats => {
    const total = students.length
    let present = 0
    let absent = 0
    let attestado = 0
    let locked = 0

    attendance.forEach(record => {
      const status = record.status_presenca
      if (status === 'A') attestado++
      else if (status === 'P') present++
      else if (status === 'F') absent++
      if (record.is_locked) locked++
    })

    const pending = total - (present + absent + attestado)
    const attended = present + attestado
    const marked = present + absent + attestado
    const attendanceRate = marked > 0 ? Math.round((attended / marked) * 100) : 0

    return { total, present, absent, attestado, pending, locked, attendanceRate }
  }, [students.length, attendance])

  // Notify parent
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
  // Handlers
  // =========================================================================

  const getAttendanceStatusUI = (studentId: string): AttendanceStatusUI => {
    const record = attendance.get(studentId)
    if (!record) return 'empty'
    return dbStatusToUI(record.status_presenca)
  }

  // Adapter for AttendanceGridRow which uses DB status format ('P'|'F'|'A'|null)
  const handleStatusChangeDB = (studentId: string, dbStatus: 'P' | 'F' | 'A' | null) => {
    const uiStatus = dbStatusToUI(dbStatus)
    markAttendanceStatusUI(studentId, uiStatus)
  }

  const markAttendanceStatusUI = async (studentId: string, status: AttendanceStatusUI) => {
    if (isEffectivelyReadonly) {
      toast.error('Frequencia bloqueada. Nao e possivel fazer alteracoes.')
      return
    }

    try {
      setSyncStatus('pending')

      const statusMap: Record<AttendanceStatusUI, { presente: boolean; status_presenca: string }> = {
        'presente': { presente: true, status_presenca: 'P' },
        'falta': { presente: false, status_presenca: 'F' },
        'attestado': { presente: true, status_presenca: 'A' },
        'empty': { presente: false, status_presenca: '' }
      }

      const statusFields = statusMap[status]

      // Optimistic update
      setAttendance(prev => {
        const newMap = new Map(prev)
        if (status === 'empty') {
          newMap.delete(studentId)
        } else {
          newMap.set(studentId, {
            aluno_id: studentId,
            presente: statusFields.presente,
            status_presenca: uiStatusToDB(status),
            horario_marcacao: new Date().toISOString()
          })
        }
        return newMap
      })

      const response = await fetch(`/api/sessoes/aula/${sessionId}/frequencia/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        if (result.error?.includes('18:00') || result.error?.includes('bloqueado') || result.error?.includes('locked')) {
          setLockInfo(getSessionLockInfo(sessionDate, sessionStatus))
          toast.error('Frequencia bloqueada. Atualizando status...')
        }
        throw new Error(result.error || 'Erro ao marcar presenca')
      }

      setSyncStatus('synced')

      const statusLabels: Record<AttendanceStatusUI, string> = {
        'presente': 'presente',
        'falta': 'ausente',
        'attestado': 'com atestado',
        'empty': 'desmarcado'
      }
      const studentName = students.find(s => s.id === studentId)?.nome_completo || 'Aluno'
      toast.success(`${studentName} marcado como ${statusLabels[status]}`, { duration: 2000 })

    } catch (error) {
      logger.error('Erro ao marcar presenca:', error instanceof Error ? error : new Error(String(error)))
      setSyncStatus('error')
      loadData()
      toast.error('Erro ao marcar presenca. Tente novamente.')
    }
  }

  const batchMarkAttendance = async (present: boolean) => {
    if (isEffectivelyReadonly || selectedStudents.size === 0) {
      if (isEffectivelyReadonly) {
        toast.error('Frequencia bloqueada. Nao e possivel fazer alteracoes.')
      }
      return
    }

    try {
      setSaving(true)
      setSyncStatus('pending')

      const status: AttendanceStatusUI = present ? 'presente' : 'falta'
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
        newAttendance.set(record.aluno_id, { ...record, status_presenca: dbStatus })
      })
      setAttendance(newAttendance)

      const response = await fetch(`/api/sessoes/aula/${sessionId}/frequencia/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: attendanceRecords })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao marcar presenca em lote')

      setSyncStatus('synced')
      setSelectedStudents(new Set())
      toast.success(`${selectedStudents.size} aluno(s) marcado(s) como ${present ? 'presente(s)' : 'ausente(s)'}`, { duration: 3000 })

    } catch (error) {
      logger.error('Erro ao marcar presenca em lote:', error instanceof Error ? error : new Error(String(error)))
      setSyncStatus('error')
      loadData()
      toast.error('Erro ao marcar presenca em lote. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectionChange = (studentId: string, selected: boolean) => {
    const newSelected = new Set(selectedStudents)
    if (selected) {
      newSelected.add(studentId)
    } else {
      newSelected.delete(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleSelectUnmarked = () => {
    const unmarkedStudents = filteredStudents
      .filter(s => {
        const status = getAttendanceStatusUI(s.id)
        return status === 'empty' && !attendance.get(s.id)?.is_locked
      })
      .map(s => s.id)
    setSelectedStudents(new Set(unmarkedStudents))
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
      <AttendanceGridHeader
        stats={stats}
        lockInfo={lockInfo}
        isEffectivelyReadonly={isEffectivelyReadonly}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStudents={selectedStudents}
        onClearSelection={() => setSelectedStudents(new Set())}
        onBatchMark={batchMarkAttendance}
        saving={saving}
        isOnline={isOnline}
        syncStatus={syncStatus}
      />

      <CardContent>
        <div className="space-y-2">
          {filteredStudents.map((student) => {
            const isSelected = selectedStudents.has(student.id)
            const record = attendance.get(student.id)
            const isRecordLocked = record?.is_locked || lockInfo.isLocked
            // AttendanceGridRow expects AttendanceStatus ('P'|'F'|'A'|null), not AttendanceStatusUI
            const attendanceStatusDB = record?.status_presenca ?? null

            return (
              <AttendanceGridRow
                key={student.id}
                student={student}
                record={record}
                attendanceStatus={attendanceStatusDB}
                isSelected={isSelected}
                isEffectivelyReadonly={isEffectivelyReadonly}
                isRecordLocked={isRecordLocked}
                showPhotos={showPhotos}
                saving={saving}
                onSelectionChange={handleSelectionChange}
                onStatusChange={handleStatusChangeDB}
              />
            )
          })}

          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum aluno encontrado com esse nome.' : 'Nenhum aluno matriculado nesta turma.'}
            </div>
          )}
        </div>

        <AttendanceGridSummary
          isEffectivelyReadonly={isEffectivelyReadonly}
          hasStudents={filteredStudents.length > 0}
          lockInfo={lockInfo}
          onSelectUnmarked={handleSelectUnmarked}
          onClearSelection={() => setSelectedStudents(new Set())}
        />
      </CardContent>
    </Card>
  )
}
