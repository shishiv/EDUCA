'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { format, isAfter, startOfDay } from 'date-fns'
import { ArrowLeft, CalendarClock, Lock } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { classesApi } from '@/lib/api/classes'
import { attendanceApi } from '@/lib/api/attendance'
import { useAuth } from '@/hooks/use-auth'
import { canRecordAttendance } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { getSessionLockInfo } from '@/components/attendance/AttendanceGridUtils'
import { getTodaySaoPauloDate } from '@/lib/date-utils'
import { openSessionAction } from '@/app/actions/attendance/open-session'
import { markAttendanceBatchAction } from '@/app/actions/attendance/mark-attendance-batch'
import { closeSessionAction } from '@/app/actions/attendance/close-session'
import {
  ChamadaHeader,
  ChamadaDateNav,
  ChamadaStatusButtons,
  JustificationModal,
  ViewOnlyNotice,
  FecharAulaDialog,
  AttendanceReopenPanel,
  type AttendanceStatus,
} from '@/components/attendance'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getFrequencyPolicyStatus } from '@/lib/attendance/attendance-policy'
import type { AttendanceReopenRequest } from '@/lib/services/attendance-reopen'
import { useClassroomTranslations } from '@/i18n/classroom'

interface Student {
  id: string
  nome: string
  matriculaId: string
  frequencia: number
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

interface AttendanceSession {
  id: string
  turma_id: string
  data_aula: string
  status: string
  professor_id: string
  escola_id: string
  aberta_em: string | null
  fechada_em: string | null
  created_at: string | null
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

function getFrequencyColor(percentage: number): string {
  const status = getFrequencyPolicyStatus(percentage)
  if (status === 'CONFORME') return 'text-green-600'
  if (status === 'ATENCAO') return 'text-amber-600'
  return 'text-red-600'
}

function getFrequencyBgColor(percentage: number): string {
  const status = getFrequencyPolicyStatus(percentage)
  if (status === 'CONFORME') return ''
  if (status === 'ATENCAO') return 'bg-amber-50'
  return 'bg-red-50'
}

function mapDatabaseStatus(status: string | null, presente: boolean): AttendanceStatus {
  switch (status?.toUpperCase()) {
    case 'P':
    case 'PRESENTE':
      return 'P'
    case 'F':
    case 'FALTA':
    case 'AUSENTE':
      return 'F'
    case 'J':
    case 'JUSTIFICADA':
    case 'A':
    case 'ATESTADO':
    case 'ATESTADO_MEDICO':
      return 'J'
    default:
      return presente ? 'P' : null
  }
}

function statusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'ABERTA':
      return 'Aberta'
    case 'FECHADA':
      return 'Fechada'
    case 'CANCELADA':
      return 'Cancelada'
    case 'PLANEJADA':
      return 'Planejada'
    default:
      return status
  }
}

function getDisabledReason(
  isViewOnly: boolean,
  isFutureDate: boolean,
  lockInfo: ReturnType<typeof getSessionLockInfo>,
  sessionStateLocked: boolean
): string | null {
  if (isViewOnly) return 'Modo de visualização: secretaria e administração não registram frequência.'
  if (isFutureDate) return 'Data futura: a chamada só pode ser registrada na data da aula.'
  if (lockInfo.isLocked) return lockInfo.message
  if (sessionStateLocked) return 'Esta sessão não está aberta.'
  return null
}

function getAttendanceViewState(
  role: Parameters<typeof canRecordAttendance>[0],
  selectedSession: AttendanceSession | null,
  isFutureDate: boolean,
  lockInfo: ReturnType<typeof getSessionLockInfo>,
  studentCount: number
) {
  const canRecord = canRecordAttendance(role)
  const isViewOnly = !canRecord
  const sessionStateLocked = Boolean(selectedSession && selectedSession.status !== 'ABERTA')
  const isLocked = lockInfo.isLocked || sessionStateLocked
  return {
    isTeacher: role === 'professor',
    isDirector: role === 'diretor',
    isViewOnly,
    sessionStateLocked,
    isLocked,
    canOpenSession: Boolean(
      canRecord && !selectedSession && !isFutureDate && !lockInfo.isLocked && studentCount > 0
    ),
    canEditSelectedSession: Boolean(
      selectedSession && canRecord && !isLocked && !isFutureDate
    ),
    disabledReason: getDisabledReason(isViewOnly, isFutureDate, lockInfo, sessionStateLocked),
  }
}

function ChamadaLoading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(index => <Skeleton key={index} className="h-16 w-full" />)}
      </div>
    </div>
  )
}

function ChamadaError({ error, onBack }: { error: string | null; onBack: () => void }) {
  const t = useClassroomTranslations()
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">Erro ao carregar a chamada</p>
        <p className="mt-1 text-sm">{error || t('classes.notFound')}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('actions.back')}
        </Button>
      </div>
    </div>
  )
}

function SessionSelector({
  sessions,
  selectedSessionId,
  onSessionChange,
}: {
  sessions: AttendanceSession[]
  selectedSessionId: string | null
  onSessionChange: (sessionId: string) => void
}) {
  if (sessions.length === 0) return null
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label htmlFor="attendance-session" className="text-sm font-medium">
            Sessão da data
          </label>
          {sessions.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Há mais de uma sessão nesta data. Cada sessão mantém seus próprios registros.
            </p>
          )}
        </div>
        <select
          id="attendance-session"
          value={selectedSessionId ?? ''}
          onChange={event => onSessionChange(event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {sessions.map(session => (
            <option key={session.id} value={session.id}>
              {statusLabel(session.status)} - {session.created_at ? format(new Date(session.created_at), 'HH:mm') : 'sem horário'}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  )
}

function EmptySessionCard({
  canOpenSession,
  isSaving,
  isViewOnly,
  disabledReason,
  onOpenSession,
}: {
  canOpenSession: boolean
  isSaving: boolean
  isViewOnly: boolean
  disabledReason: string | null
  onOpenSession: () => void
}) {
  const t = useClassroomTranslations()
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <CalendarClock className="h-12 w-12 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">{t('attendance.noCall')}</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {t('attendance.openHintDate')}
          </p>
        </div>
        {canOpenSession ? (
          <Button onClick={onOpenSession} disabled={isSaving}>
            {isSaving ? t('attendance.opening') : t('actions.openAttendance')}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isViewOnly ? 'Este perfil pode visualizar chamadas existentes.' : disabledReason || 'Não é possível abrir uma chamada nesta data.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function AttendanceSessionContent({
  loading,
  selectedSession,
  students,
  attendance,
  canOpenSession,
  canEditSelectedSession,
  isSaving,
  isViewOnly,
  sessionStateLocked,
  disabledReason,
  onOpenSession,
  onStatusChange,
  onJustificationNeeded,
}: {
  loading: boolean
  selectedSession: AttendanceSession | null
  students: Student[]
  attendance: Map<string, AttendanceRecord>
  canOpenSession: boolean
  canEditSelectedSession: boolean
  isSaving: boolean
  isViewOnly: boolean
  sessionStateLocked: boolean
  disabledReason: string | null
  onOpenSession: () => void
  onStatusChange: (matriculaId: string, status: AttendanceStatus, justificativa?: string) => void
  onJustificationNeeded: (student: Student) => void
}) {
  const t = useClassroomTranslations()
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <CalendarClock className="h-5 w-5 animate-pulse" />
          {t('attendance.loading')}
        </CardContent>
      </Card>
    )
  }
  if (!selectedSession) {
    return (
      <EmptySessionCard
        canOpenSession={canOpenSession}
        isSaving={isSaving}
        isViewOnly={isViewOnly}
        disabledReason={disabledReason}
        onOpenSession={onOpenSession}
      />
    )
  }
  return (
    <>
      {isViewOnly && <ViewOnlyNotice message="Secretaria e administração podem revisar a chamada, mas somente professores e diretores registram ou fecham a sessão." />}
      {sessionStateLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <Lock className="h-4 w-4" />
          {t('labels.session')} {statusLabel(selectedSession.status).toLowerCase()}. Os registros não podem ser alterados.
        </div>
      )}
      <Card>
        <CardContent className="p-4">
          {students.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('attendance.noStudents')}</p>
          ) : (
            <div className="space-y-2">
              {students.map(student => {
                const record = attendance.get(student.matriculaId)
                const policyStatus = getFrequencyPolicyStatus(student.frequencia)
                return (
                  <div
                    key={student.matriculaId}
                    className={cn(
                      'flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50',
                      getFrequencyBgColor(student.frequencia)
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-500 text-sm text-white">
                          {getInitials(student.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-foreground">{student.nome}</p>
                          {policyStatus !== 'CONFORME' && (
                            <Badge variant="outline" className="text-xs">
                              {policyStatus === 'CRITICO' ? 'Não conformidade' : 'Atenção preventiva'}
                            </Badge>
                          )}
                        </div>
                        <p className={cn('text-sm tabular-nums', getFrequencyColor(student.frequencia))}>
                          {student.frequencia.toFixed(1)}% de frequência
                        </p>
                      </div>
                    </div>
                    <ChamadaStatusButtons
                      status={record?.status ?? null}
                      onChange={(status, justificativa) => onStatusChange(student.matriculaId, status, justificativa)}
                      onJustificationNeeded={() => onJustificationNeeded(student)}
                      disabled={!canEditSelectedSession}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default function ChamadaPage() {
  const t = useClassroomTranslations()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userProfile, loading: authLoading } = useAuth()
  const turmaId = params?.id as string
  const requestedSessionId = searchParams.get('sessao')

  const [turma, setTurma] = useState<Turma | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [reopenRequest, setReopenRequest] = useState<AttendanceReopenRequest | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(requestedSessionId)
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null)
  const [attendance, setAttendance] = useState<Map<string, AttendanceRecord>>(new Map())
  const [originalAttendance, setOriginalAttendance] = useState<Map<string, AttendanceRecord>>(new Map())
  const [currentDate, setCurrentDate] = useState(() => startOfDay(getTodaySaoPauloDate()))
  const [loading, setLoading] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [loadingReopenRequest, setLoadingReopenRequest] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justificationModal, setJustificationModal] = useState<{
    matriculaId: string
    studentName: string
  } | null>(null)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const sessionLoadRequestId = useRef(0)

  const selectedSession = useMemo(
    () => sessions.find(session => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  )

  const dateString = format(currentDate, 'yyyy-MM-dd')
  const today = startOfDay(getTodaySaoPauloDate())
  const isFutureDate = isAfter(startOfDay(currentDate), today)
  const lockInfo = useMemo(
    () => getSessionLockInfo(selectedSession?.data_aula ?? dateString, selectedSession?.status),
    [dateString, selectedSession]
  )
  const {
    isTeacher,
    isDirector,
    isViewOnly,
    sessionStateLocked,
    isLocked,
    canOpenSession,
    canEditSelectedSession,
    disabledReason,
  } = getAttendanceViewState(
    userProfile?.tipo_usuario ?? null,
    selectedSession,
    isFutureDate,
    lockInfo,
    students.length
  )
  const hasUnsavedChanges = useMemo(() => {
    if (attendance.size !== originalAttendance.size) return true

    for (const [matriculaId, record] of attendance) {
      const original = originalAttendance.get(matriculaId)
      if (!original) return true
      if (original.status !== record.status || original.justificativa !== record.justificativa) return true
    }

    return false
  }, [attendance, originalAttendance])
  const presentCount = useMemo(
    () => Array.from(attendance.values()).filter(record => record.status === 'P' || record.status === 'J').length,
    [attendance]
  )

  const loadTurma = useCallback(async () => {
    const data = await classesApi.getClassWithSchool(turmaId)
    if (!data) throw new Error('Turma não encontrada')
    setTurma(data)
  }, [turmaId])

  const loadStudents = useCallback(async () => {
    const data = await attendanceApi.getStudentsForChamada(turmaId)
    setStudents(data.map(student => ({
      id: student.id,
      nome: student.nome,
      matriculaId: student.matriculaId,
      frequencia: student.frequencia,
    })))
  }, [turmaId])

  const loadSessions = useCallback(async () => {
    const requestId = ++sessionLoadRequestId.current
    setLoadingSessions(true)
    try {
      const loadedSessions = await attendanceApi.getSessionsForChamada(
        turmaId,
        dateString,
        requestedSessionId
      )

      // An initial no-session query can finish after a newly opened session.
      // Only the latest request may replace the current session selection.
      if (requestId !== sessionLoadRequestId.current) return

      setSessions(loadedSessions)

      const requested = loadedSessions.find(session => session.id === requestedSessionId)
      const openSession = loadedSessions.find(session => session.status === 'ABERTA')
      const nextSession = requested ?? openSession ?? loadedSessions[loadedSessions.length - 1] ?? null
      setSelectedSessionId(nextSession?.id ?? null)

      // A deep link may point to a session on another date. The canonical
      // read adapter returns the session's own date, so the UI follows it.
      if (requested && requested.data_aula !== dateString) {
        setCurrentDate(startOfDay(new Date(`${requested.data_aula}T00:00:00`)))
      }
    } catch (loadError) {
      if (requestId !== sessionLoadRequestId.current) return
      logger.error('ATTENDANCE_SESSION_READ_FAILED', loadError as Error, {
        metadata: { turmaId, date: dateString },
      })
      setError('Erro ao carregar as sessões da chamada')
      setSessions([])
      setSelectedSessionId(null)
    } finally {
      if (requestId === sessionLoadRequestId.current) setLoadingSessions(false)
    }
  }, [dateString, requestedSessionId, turmaId])

  const loadReopenRequest = useCallback(async (sessionId: string | null) => {
    if (!sessionId) {
      setReopenRequest(null)
      return
    }

    setLoadingReopenRequest(true)
    try {
      const request = await attendanceApi.getAttendanceReopenRequest(sessionId)
      setReopenRequest(request)
    } catch (loadError) {
      logger.error('ATTENDANCE_REOPEN_REQUEST_READ_FAILED', loadError as Error, {
        metadata: { sessionId },
      })
      setReopenRequest(null)
    } finally {
      setLoadingReopenRequest(false)
    }
  }, [])

  const loadAttendance = useCallback(async (sessionId: string | null) => {
    if (!sessionId) {
      setAttendance(new Map())
      setOriginalAttendance(new Map())
      return
    }

    if (sessionId === draftSessionId) {
      setLoadingAttendance(false)
      return
    }

    setLoadingAttendance(true)
    try {
      const canonicalRecords = await attendanceApi.getAttendanceForSession(sessionId)
      const loadedAttendance = new Map<string, AttendanceRecord>()
      for (const [matriculaId, record] of canonicalRecords) {
        const status = mapDatabaseStatus(record.status, record.status === 'P' || record.status === 'J')
        if (status === null) continue
        loadedAttendance.set(matriculaId, {
          status,
          justificativa: record.justificativa,
        })
      }

      setAttendance(loadedAttendance)
      setOriginalAttendance(new Map(loadedAttendance))
    } catch (loadError) {
      logger.error('ATTENDANCE_RECORD_READ_FAILED', loadError as Error, {
        metadata: { sessionId },
      })
      toast.error('Erro ao carregar a frequência da sessão')
      setAttendance(new Map())
      setOriginalAttendance(new Map())
    } finally {
      setLoadingAttendance(false)
    }
  }, [draftSessionId])

  useEffect(() => {
    if (authLoading || !userProfile?.id) return

    let active = true
    setLoading(true)
    setError(null)

    Promise.all([loadTurma(), loadStudents()])
      .catch(loadError => {
        if (!active) return
        logger.error('ATTENDANCE_CLASS_READ_FAILED', loadError as Error, {
          metadata: { turmaId },
        })
        setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar a turma')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [authLoading, loadStudents, loadTurma, turmaId, userProfile?.id])

  useEffect(() => {
    if (authLoading || !userProfile?.id) return
    void loadSessions()
  }, [authLoading, loadSessions, userProfile?.id])

  useEffect(() => {
    if (authLoading || !userProfile?.id) return
    void loadAttendance(selectedSessionId)
    void loadReopenRequest(selectedSessionId)
  }, [authLoading, loadAttendance, loadReopenRequest, selectedSessionId, userProfile?.id])

  const initializeAllPresent = useCallback(() => {
    const initial = new Map<string, AttendanceRecord>()
    students.forEach(student => {
      initial.set(student.matriculaId, { status: 'P', justificativa: null })
    })
    setAttendance(initial)
    setOriginalAttendance(new Map())
  }, [students])

  const handleDateChange = useCallback((date: Date) => {
    if (hasUnsavedChanges && !window.confirm('Existem alterações não salvas. Deseja descartá-las?')) return
    setCurrentDate(startOfDay(date))
    setSelectedSessionId(null)
    setDraftSessionId(null)
    setAttendance(new Map())
    setOriginalAttendance(new Map())
  }, [hasUnsavedChanges])

  const handleSessionChange = useCallback((sessionId: string) => {
    if (hasUnsavedChanges && !window.confirm('Existem alterações não salvas. Deseja descartá-las?')) return
    setSelectedSessionId(sessionId)
    setDraftSessionId(null)
    router.replace(`/dashboard/turmas/${turmaId}/chamada?sessao=${sessionId}`)
  }, [hasUnsavedChanges, router, turmaId])

  const handleStatusChange = useCallback((matriculaId: string, status: AttendanceStatus, justificativa?: string) => {
    setAttendance(previous => {
      const next = new Map(previous)
      if (status === null) {
        next.delete(matriculaId)
      } else {
        next.set(matriculaId, { status, justificativa: justificativa ?? null })
      }
      return next
    })
  }, [])

  const handleOpenSession = useCallback(async () => {
    if (!canOpenSession) return

    setIsSaving(true)
    try {
      const result = await openSessionAction({
        turma_id: turmaId,
        data_aula: dateString,
        conteudo_programatico: 'Chamada',
      })

      if (!result.success || !result.session) {
        toast.error(result.error || 'Não foi possível abrir a chamada')
        return
      }

      const openedSession: AttendanceSession = {
        id: result.session.id,
        turma_id: result.session.turma_id,
        data_aula: result.session.data_aula,
        status: result.session.status,
        professor_id: result.session.professor_id,
        escola_id: result.session.escola_id,
        aberta_em: result.session.aberta_em,
        fechada_em: result.session.fechada_em,
        created_at: result.session.created_at,
      }
      // Mark the draft before selecting the session so the initial attendance
      // read cannot clear the all-present UI state while the action settles.
      setDraftSessionId(openedSession.id)
      setSessions(previous => [...previous, openedSession])
      setSelectedSessionId(openedSession.id)
      initializeAllPresent()
      // The page can still have an initial no-session read in flight. Re-read
      // after the server action so that stale fixture state cannot win.
      await loadSessions()
      router.replace(`/dashboard/turmas/${turmaId}/chamada?sessao=${openedSession.id}`)
      toast.success('Chamada aberta. Marque a presença e salve os registros.')
    } catch (openError) {
      logger.error('ATTENDANCE_SESSION_OPEN_UI_FAILED', openError as Error, { metadata: { turmaId } })
      toast.error('Erro ao abrir a chamada. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }, [canOpenSession, dateString, initializeAllPresent, loadSessions, router, turmaId])

  const handleSave = useCallback(async () => {
    if (!selectedSession || !canEditSelectedSession) return

    setIsSaving(true)
    try {
      const result = await markAttendanceBatchAction({
        sessao_id: selectedSession.id,
        records: students.map(student => {
          const record = attendance.get(student.matriculaId)
          return {
            matricula_id: student.matriculaId,
            status: record?.status ?? null,
            justificativa: record?.justificativa ?? null,
          }
        }),
      })

      if (!result.success) {
        toast.error(result.error || 'Não foi possível salvar a chamada')
        return
      }

      setOriginalAttendance(new Map(attendance))
      setDraftSessionId(null)
      toast.success('Chamada salva com sucesso!')
    } catch (saveError) {
      logger.error('ATTENDANCE_BATCH_UI_FAILED', saveError as Error, { metadata: { sessionId: selectedSession.id } })
      toast.error('Erro ao salvar a chamada. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }, [attendance, canEditSelectedSession, selectedSession, students])

  const handleClose = useCallback(async (observacoes?: string) => {
    if (!selectedSession || !canEditSelectedSession || hasUnsavedChanges) return

    setIsClosing(true)
    try {
      const result = await closeSessionAction({
        session_id: selectedSession.id,
        observacoes,
      })

      if (!result.success) {
        throw new Error(result.error || 'Não foi possível fechar a chamada')
      }

      setSessions(previous => previous.map(session =>
        session.id === selectedSession.id
          ? { ...session, status: 'FECHADA', fechada_em: result.session?.fechada_em ?? new Date().toISOString() }
          : session
      ))
      setCloseDialogOpen(false)
      setDraftSessionId(null)
      setReopenRequest(null)
      toast.success('Chamada fechada. Os registros agora são imutáveis.')
    } catch (closeError) {
      logger.error('ATTENDANCE_SESSION_CLOSE_UI_FAILED', closeError as Error, { metadata: { sessionId: selectedSession.id } })
      toast.error(closeError instanceof Error ? closeError.message : 'Erro ao fechar a chamada. Tente novamente.')
      throw closeError
    } finally {
      setIsClosing(false)
    }
  }, [canEditSelectedSession, hasUnsavedChanges, selectedSession])

  const handleReopenRequestCompleted = useCallback(async () => {
    await loadReopenRequest(selectedSessionId)
  }, [loadReopenRequest, selectedSessionId])

  const handleReopenDecisionCompleted = useCallback(async () => {
    await loadSessions()
  }, [loadSessions])

  const handleJustificationNeeded = useCallback((student: Student) => {
    setJustificationModal({ matriculaId: student.matriculaId, studentName: student.nome })
  }, [])

  const handleJustificationConfirm = useCallback((motivo: string) => {
    if (!justificationModal) return
    handleStatusChange(justificationModal.matriculaId, 'J', motivo)
    setJustificationModal(null)
  }, [handleStatusChange, justificationModal])

  if (loading) return <ChamadaLoading />
  if (error || !turma) return <ChamadaError error={error} onBack={() => router.back()} />

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/turmas/${turmaId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('labels.class')}
          </Link>
        </Button>
      </div>

      {selectedSession && (
        <ChamadaHeader
          turma={turma}
          date={currentDate}
          studentCount={students.length}
          presentCount={presentCount}
          hasUnsavedChanges={hasUnsavedChanges}
          isLocked={isLocked}
          lockReason={disabledReason}
          onSave={handleSave}
          isSaving={isSaving}
          onClose={() => setCloseDialogOpen(true)}
          closeDisabled={Boolean(disabledReason) || hasUnsavedChanges || isClosing}
          canEdit={canEditSelectedSession}
        />
      )}

      {selectedSession && !loadingReopenRequest && (
        <AttendanceReopenPanel
          sessionId={selectedSession.id}
          sessionStatus={selectedSession.status}
          request={reopenRequest}
          isTeacher={isTeacher}
          isDirector={isDirector}
          onRequestChanged={setReopenRequest}
          onRequestCompleted={handleReopenRequestCompleted}
          onDecisionCompleted={handleReopenDecisionCompleted}
        />
      )}

      <ChamadaDateNav currentDate={currentDate} onDateChange={handleDateChange} />
      <SessionSelector
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSessionChange={handleSessionChange}
      />
      <AttendanceSessionContent
        loading={loadingSessions || loadingAttendance}
        selectedSession={selectedSession}
        students={students}
        attendance={attendance}
        canOpenSession={canOpenSession}
        canEditSelectedSession={canEditSelectedSession}
        isSaving={isSaving}
        isViewOnly={isViewOnly}
        sessionStateLocked={sessionStateLocked}
        disabledReason={disabledReason}
        onOpenSession={handleOpenSession}
        onStatusChange={handleStatusChange}
        onJustificationNeeded={handleJustificationNeeded}
      />

      <FecharAulaDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onConfirm={handleClose}
        sessaoId={selectedSession?.id ?? ''}
      />
      <JustificationModal
        isOpen={justificationModal !== null}
        onClose={() => setJustificationModal(null)}
        onConfirm={handleJustificationConfirm}
        studentName={justificationModal?.studentName ?? ''}
      />
    </div>
  )
}
