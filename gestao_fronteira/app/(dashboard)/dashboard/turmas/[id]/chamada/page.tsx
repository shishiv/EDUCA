/**
 * Chamada Page
 * Attendance marking page for a specific turma
 *
 * Features:
 * - P/F/J toggle interface with visual feedback
 * - Date navigation with calendar picker
 * - Batch save with unsaved changes indicator
 * - Compliance integration (18:00 lock, immutability)
 * - Role-based visibility (teachers vs gestores)
 *
 * @see .planning/phases/04-turmas-chamada/04-02-PLAN.md
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format, isSameDay, startOfDay, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Components
import {
  ChamadaHeader,
  ChamadaDateNav,
  ChamadaStatusButtons,
  JustificationModal,
  type AttendanceStatus,
} from '@/components/attendance'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface Student {
  id: string
  nome: string
  matriculaId: string
  frequencia: number // Overall frequency percentage
  hasNis: boolean
}

interface Turma {
  id: string
  nome: string
  serie: string
  escola: { nome: string }
}

interface AttendanceRecord {
  status: AttendanceStatus
  justificativa: string | null
}

// ============================================================================
// Utility Functions
// ============================================================================

function getInitials(nome: string): string {
  const parts = nome.split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function getFrequencyColor(percentage: number): string {
  if (percentage >= 75) return 'text-green-600'
  if (percentage >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getFrequencyBgColor(percentage: number): string {
  if (percentage >= 75) return ''
  if (percentage >= 60) return 'bg-amber-50'
  return 'bg-red-50'
}

// ============================================================================
// Component
// ============================================================================

export default function ChamadaPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params?.id as string

  // Data state
  const [turma, setTurma] = useState<Turma | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Date navigation
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()))

  // Attendance tracking
  const [attendance, setAttendance] = useState<Map<string, AttendanceRecord>>(new Map())
  const [originalAttendance, setOriginalAttendance] = useState<Map<string, AttendanceRecord>>(new Map())
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Lock state
  const [isLocked, setIsLocked] = useState(false)
  const [lockReason, setLockReason] = useState<string | null>(null)
  const [isFutureDate, setIsFutureDate] = useState(false)

  // Justification modal state
  const [justificationModal, setJustificationModal] = useState<{
    isOpen: boolean
    studentId: string
    studentName: string
  } | null>(null)

  // Save state
  const [isSaving, setIsSaving] = useState(false)

  // User role (for BF visibility) - simplified check
  const [canSeeBolsaFamilia, setCanSeeBolsaFamilia] = useState(false)

  // ============================================================================
  // Derived State
  // ============================================================================

  const hasUnsavedChanges = useMemo(() => {
    if (attendance.size !== originalAttendance.size) return true

    for (const [studentId, record] of attendance) {
      const original = originalAttendance.get(studentId)
      if (!original) return true
      if (original.status !== record.status) return true
      if (original.justificativa !== record.justificativa) return true
    }
    return false
  }, [attendance, originalAttendance])

  const presentCount = useMemo(() => {
    let count = 0
    attendance.forEach((record) => {
      // P and J count as present
      if (record.status === 'P' || record.status === 'J') {
        count++
      }
    })
    return count
  }, [attendance])

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadTurma = useCallback(async () => {
    if (!turmaId) return

    try {
      const { data, error: turmaError } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          serie,
          escola:escolas(nome)
        `)
        .eq('id', turmaId)
        .single()

      if (turmaError) throw turmaError

      setTurma({
        id: data.id,
        nome: data.nome,
        serie: data.serie,
        escola: { nome: (data.escola as { nome: string })?.nome || 'Escola' }
      })
    } catch (err: any) {
      console.error('Error loading turma:', err)
      setError('Erro ao carregar turma')
    }
  }, [turmaId])

  const loadStudents = useCallback(async () => {
    if (!turmaId) return

    try {
      // Get students enrolled in this turma
      const { data, error: studentsError } = await supabase
        .from('matriculas')
        .select(`
          id,
          aluno:alunos(
            id,
            nome_completo,
            nis
          )
        `)
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('aluno(nome_completo)', { ascending: true })

      if (studentsError) throw studentsError

      const studentsList: Student[] = (data || []).map((m: any) => ({
        id: m.aluno?.id || '',
        nome: m.aluno?.nome_completo || 'Aluno',
        matriculaId: m.id,
        frequencia: 85, // TODO: Calculate from actual attendance data
        hasNis: !!m.aluno?.nis,
      })).filter((s: Student) => s.id)

      setStudents(studentsList)
    } catch (err: any) {
      console.error('Error loading students:', err)
      setError('Erro ao carregar alunos')
    }
  }, [turmaId])

  const loadAttendanceForDate = useCallback(async (date: Date) => {
    if (!turmaId || students.length === 0) return

    const dateStr = format(date, 'yyyy-MM-dd')

    try {
      // Check for existing session
      const { data: session } = await supabase
        .from('sessoes_aula')
        .select('id, status')
        .eq('turma_id', turmaId)
        .eq('data_aula', dateStr)
        .single()

      if (session) {
        setSessionId(session.id)
        const sessionLocked = session.status === 'fechada'
        setIsLocked(sessionLocked)
        if (sessionLocked) {
          setLockReason('Chamada finalizada')
        }

        // Load existing attendance records
        const { data: frequencias } = await supabase
          .from('frequencia')
          .select('matricula_id, status_presenca, justificativa')
          .eq('sessao_id', session.id)

        const attendanceMap = new Map<string, AttendanceRecord>()
        frequencias?.forEach((f: any) => {
          // Map DB status to component status
          let status: AttendanceStatus = null
          if (f.status_presenca === 'presente' || f.status_presenca === 'P') status = 'P'
          else if (f.status_presenca === 'falta' || f.status_presenca === 'F') status = 'F'
          else if (f.status_presenca === 'justificada' || f.status_presenca === 'J') status = 'J'

          attendanceMap.set(f.matricula_id, {
            status,
            justificativa: f.justificativa || null,
          })
        })

        setAttendance(attendanceMap)
        setOriginalAttendance(new Map(attendanceMap))
      } else {
        setSessionId(null)
        setIsLocked(false)
        setLockReason(null)

        // No session for this date
        const today = startOfDay(new Date())
        if (isSameDay(date, today)) {
          // Initialize all as Present for today
          initializeAllPresent()
        } else {
          // Past/future dates without session: empty
          setAttendance(new Map())
          setOriginalAttendance(new Map())
        }
      }
    } catch (err: any) {
      console.error('Error loading attendance:', err)
      toast.error('Erro ao carregar chamada')
    }
  }, [turmaId, students])

  const initializeAllPresent = useCallback(() => {
    const initial = new Map<string, AttendanceRecord>()
    students.forEach((student) => {
      initial.set(student.matriculaId, { status: 'P', justificativa: null })
    })
    setAttendance(initial)
    // Keep original empty so hasUnsavedChanges is true
    setOriginalAttendance(new Map())
  }, [students])

  // ============================================================================
  // Effects
  // ============================================================================

  // Load turma data
  useEffect(() => {
    loadTurma()
    loadStudents()
  }, [loadTurma, loadStudents])

  // Update loading state
  useEffect(() => {
    if (turma && students.length >= 0) {
      setLoading(false)
    }
  }, [turma, students])

  // Load attendance when date changes
  useEffect(() => {
    if (students.length > 0) {
      loadAttendanceForDate(currentDate)
    }
  }, [currentDate, students, loadAttendanceForDate])

  // Check if future date
  useEffect(() => {
    const today = startOfDay(new Date())
    const current = startOfDay(currentDate)
    setIsFutureDate(isAfter(current, today))
  }, [currentDate])

  // Check time-based lock (after 18:00 Sao Paulo time)
  useEffect(() => {
    const checkTimeLock = () => {
      const now = new Date()
      const nowBrazilian = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      const today = startOfDay(new Date())

      // Past dates are always locked (can't modify historical records)
      const currentDateStart = startOfDay(currentDate)
      if (currentDateStart < today && !isSameDay(currentDate, today)) {
        setIsLocked(true)
        setLockReason('Data passada - nao e permitido modificar registros historicos')
        return
      }

      // Today: check 18:00 cutoff
      if (isSameDay(currentDate, today)) {
        const hour = nowBrazilian.getHours()
        if (hour >= 18) {
          setIsLocked(true)
          setLockReason('Apos 18:00 - chamada travada automaticamente')
        }
      }
    }

    checkTimeLock()
    const interval = setInterval(checkTimeLock, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [currentDate])

  // Check user role for BF visibility
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        // Gestores (diretor, supervisor, secretaria, admin) can see BF info
        const gestorRoles = ['diretor', 'supervisor', 'secretaria', 'admin']
        setCanSeeBolsaFamilia(gestorRoles.includes(profile?.role || ''))
      }
    }
    checkUserRole()
  }, [])

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleDateChange = useCallback((date: Date) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Voce tem alteracoes nao salvas. Deseja descarta-las?')) {
        return
      }
    }
    setCurrentDate(startOfDay(date))
  }, [hasUnsavedChanges])

  const handleStatusChange = useCallback((
    matriculaId: string,
    status: AttendanceStatus,
    justificativa?: string
  ) => {
    setAttendance((prev) => {
      const next = new Map(prev)
      next.set(matriculaId, {
        status,
        justificativa: justificativa || null,
      })
      return next
    })
  }, [])

  const handleJustificationNeeded = useCallback((student: Student) => {
    setJustificationModal({
      isOpen: true,
      studentId: student.matriculaId,
      studentName: student.nome,
    })
  }, [])

  const handleJustificationConfirm = useCallback((motivo: string) => {
    if (justificationModal) {
      handleStatusChange(justificationModal.studentId, 'J', motivo)
      setJustificationModal(null)
    }
  }, [justificationModal, handleStatusChange])

  const handleSave = useCallback(async () => {
    if (!turmaId || isLocked || isFutureDate) return

    setIsSaving(true)
    const dateStr = format(currentDate, 'yyyy-MM-dd')

    try {
      // Get or create session
      let currentSessionId = sessionId

      if (!currentSessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('sessoes_aula')
          .insert({
            turma_id: turmaId,
            data_aula: dateStr,
            status: 'ABERTA',
          })
          .select()
          .single()

        if (sessionError) throw sessionError
        currentSessionId = newSession.id
        setSessionId(currentSessionId)
      }

      // Prepare attendance records
      const records: any[] = []
      attendance.forEach((record, matriculaId) => {
        // Map component status to DB status
        let dbStatus = null
        if (record.status === 'P') dbStatus = 'presente'
        else if (record.status === 'F') dbStatus = 'falta'
        else if (record.status === 'J') dbStatus = 'justificada'

        if (dbStatus) {
          records.push({
            sessao_id: currentSessionId,
            matricula_id: matriculaId,
            status_presenca: dbStatus,
            justificativa: record.justificativa,
            data_aula: dateStr,
            marcado_em: new Date().toISOString(),
          })
        }
      })

      // Upsert attendance records
      const { error: upsertError } = await supabase
        .from('frequencia')
        .upsert(records, {
          onConflict: 'sessao_id,matricula_id',
        })

      if (upsertError) throw upsertError

      // Update original attendance to match current
      setOriginalAttendance(new Map(attendance))
      toast.success('Chamada salva com sucesso!')

    } catch (err: any) {
      console.error('Error saving attendance:', err)
      toast.error(`Erro ao salvar: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }, [turmaId, sessionId, currentDate, attendance, isLocked, isFutureDate])

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !turma) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          <p className="font-medium">Erro ao carregar chamada</p>
          <p className="text-sm mt-1">{error || 'Turma nao encontrada'}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  const isDisabled = isLocked || isFutureDate

  return (
    <div className="space-y-4 p-4">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/turmas">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Turmas
          </Link>
        </Button>
      </div>

      {/* Header */}
      <ChamadaHeader
        turma={turma}
        date={currentDate}
        studentCount={students.length}
        presentCount={presentCount}
        hasUnsavedChanges={hasUnsavedChanges}
        isLocked={isDisabled}
        lockReason={isLocked ? lockReason : isFutureDate ? 'Data futura - somente visualizacao' : null}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Date navigation */}
      <ChamadaDateNav
        currentDate={currentDate}
        onDateChange={handleDateChange}
      />

      {/* Student list */}
      <Card>
        <CardContent className="p-4">
          {students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum aluno matriculado nesta turma
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => {
                const record = attendance.get(student.matriculaId)
                const isAtRisk = student.frequencia < 75
                const isCritical = student.frequencia < 60

                return (
                  <div
                    key={student.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg',
                      'hover:bg-muted/50 transition-colors',
                      getFrequencyBgColor(student.frequencia)
                    )}
                  >
                    {/* Left: Photo + Name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-500 text-white text-sm">
                          {getInitials(student.nome)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {student.nome}
                          </p>
                          {canSeeBolsaFamilia && student.hasNis && isAtRisk && (
                            <Badge variant="destructive" className="text-xs flex-shrink-0">
                              BF
                            </Badge>
                          )}
                        </div>

                        {/* Frequency percentage - visible for gestores */}
                        {canSeeBolsaFamilia && (
                          <p className={cn(
                            'text-sm tabular-nums',
                            getFrequencyColor(student.frequencia)
                          )}>
                            {student.frequencia.toFixed(1)}% frequencia
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: P/F/J buttons */}
                    <ChamadaStatusButtons
                      status={record?.status ?? null}
                      onChange={(status, justificativa) =>
                        handleStatusChange(student.matriculaId, status, justificativa)
                      }
                      onJustificationNeeded={() => handleJustificationNeeded(student)}
                      disabled={isDisabled}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Justification modal */}
      <JustificationModal
        isOpen={justificationModal?.isOpen ?? false}
        onClose={() => setJustificationModal(null)}
        onConfirm={handleJustificationConfirm}
        studentName={justificationModal?.studentName ?? ''}
      />
    </div>
  )
}
