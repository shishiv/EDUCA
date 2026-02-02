/**
 * Frequency Page - Daily Attendance Management by Class
 * Task 1.4.1 & 1.4.4: Create frequency page with controls and save button
 *
 * Features:
 * - Class/turma selector with day navigation
 * - Integrated AttendanceGrid with 3-state support (P/F/A)
 * - Risk alert for students with < 80% attendance
 * - Fixed "SALVAR FREQUENCIA" button at bottom center
 * - Real-time sync with Supabase
 *
 * Layout based on: planning/visuals/frequencia.html
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see types/diario-classe.ts for TypeScript types
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ClipboardList,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AttendanceGrid, type AttendanceStats } from '@/components/attendance/AttendanceGrid'
import { FrequencyControls, type Turma, type PeriodView } from '@/components/diary/FrequencyControls'
import { RiskAlert, type StudentAtRisk } from '@/components/diary/RiskAlert'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { AttendanceSummary } from '@/types/diario-classe'

// ============================================================================
// Types
// ============================================================================

interface SessionInfo {
  id: string
  turma_id: string
  data_aula: string
  status: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'
  professor_id: string
  escola_id: string
}

// ============================================================================
// Component
// ============================================================================

export default function FrequenciaPage() {
  const router = useRouter()
  const { userProfile } = useAuth()

  // State
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null)
  const [selectedTurmaEscolaId, setSelectedTurmaEscolaId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [periodView, setPeriodView] = useState<PeriodView>('week')
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [studentsAtRisk, setStudentsAtRisk] = useState<StudentAtRisk[]>([])

  // Loading states
  const [loadingTurmas, setLoadingTurmas] = useState(true)
  const [loadingSession, setLoadingSession] = useState(false)
  const [loadingRisk, setLoadingRisk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // =========================================================================
  // Data Loading: Turmas
  // =========================================================================

  useEffect(() => {
    async function loadTurmas() {
      if (!userProfile) return

      try {
        setLoadingTurmas(true)
        setError(null)

        let query = supabase
          .from('turmas')
          .select('id, nome, serie, ano_letivo, escola_id')
          .eq('ativo', true)
          .order('nome')

        // Filter by school for non-admin users
        if (userProfile.tipo_usuario !== 'admin' && userProfile.escola_id) {
          query = query.eq('escola_id', userProfile.escola_id)
        }

        // For professors, filter by their assigned turmas (turmas.professor_id)
        if (userProfile.tipo_usuario === 'professor') {
          query = query.eq('professor_id', userProfile.id)
        }

        const { data, error: queryError } = await query

        if (queryError) throw queryError

        const formattedTurmas: (Turma & { escola_id: string })[] = (data || []).map(t => ({
          id: t.id,
          nome: t.nome,
          serie: t.serie,
          ano_letivo: t.ano_letivo,
          escola_id: t.escola_id,
        }))

        setTurmas(formattedTurmas)

        // Auto-select first turma if only one available
        if (formattedTurmas.length === 1 && !selectedTurmaId) {
          setSelectedTurmaId(formattedTurmas[0].id)
          setSelectedTurmaEscolaId(formattedTurmas[0].escola_id)
        }
      } catch (err) {
        logger.error('Error loading turmas:', err as Error, { feature: 'frequencia', action: 'load_turmas' })
        setError('Erro ao carregar turmas. Tente novamente.')
      } finally {
        setLoadingTurmas(false)
      }
    }

    loadTurmas()
  }, [userProfile, selectedTurmaId])

  // =========================================================================
  // Data Loading: Session for selected turma/date
  // =========================================================================

  useEffect(() => {
    async function loadOrCreateSession() {
      if (!selectedTurmaId || !userProfile) {
        setSession(null)
        return
      }

      try {
        setLoadingSession(true)
        setError(null)

        const dateStr = format(selectedDate, 'yyyy-MM-dd')

        // Try to find existing session
        const { data: existingSession, error: sessionError } = await supabase
          .from('sessoes_aula')
          .select('id, turma_id, data_aula, status, professor_id, escola_id')
          .eq('turma_id', selectedTurmaId)
          .eq('data_aula', dateStr)
          .maybeSingle()

        if (sessionError) {
          throw sessionError
        }

        if (existingSession) {
          setSession(existingSession as SessionInfo)
        } else {
          // Create a new session if professor
          if (userProfile.tipo_usuario === 'professor' && selectedTurmaEscolaId) {
            const { data: newSession, error: createError } = await supabase
              .from('sessoes_aula')
              .insert({
                turma_id: selectedTurmaId,
                data_aula: dateStr,
                status: 'ABERTA',
                professor_id: userProfile.id,
                escola_id: selectedTurmaEscolaId,
                conteudo_programatico: 'Aula do dia ' + dateStr,
              })
              .select('id, turma_id, data_aula, status, professor_id, escola_id')
              .single()

            if (createError) throw createError

            setSession(newSession as SessionInfo)
            toast.success('Sessao de aula criada para hoje')
          } else {
            // Non-professor users can only view existing sessions
            setSession(null)
          }
        }
      } catch (err) {
        logger.error('Error loading session:', err as Error, { feature: 'frequencia', action: 'load_session' })
        // Don't show error for missing session - just set to null
        setSession(null)
      } finally {
        setLoadingSession(false)
      }
    }

    loadOrCreateSession()
  }, [selectedTurmaId, selectedTurmaEscolaId, selectedDate, userProfile])

  // =========================================================================
  // Data Loading: Students at Risk
  // =========================================================================

  const loadStudentsAtRisk = useCallback(async () => {
    if (!selectedTurmaId) {
      setStudentsAtRisk([])
      return
    }

    try {
      setLoadingRisk(true)

      // Get all matriculas in the turma with their student info
      const { data: matriculas, error: matriculasError } = await supabase
        .from('matriculas')
        .select(`
          id,
          aluno_id,
          turma_id,
          situacao,
          alunos (
            id,
            nome_completo
          )
        `)
        .eq('turma_id', selectedTurmaId)
        .eq('situacao', 'ativa')

      if (matriculasError) throw matriculasError

      if (!matriculas || matriculas.length === 0) {
        setStudentsAtRisk([])
        return
      }

      // Get attendance records for these matriculas
      const matriculaIds = matriculas.map(m => m.id)
      const { data: attendance, error: attendanceError } = await supabase
        .from('frequencia')
        .select('matricula_id, presente, status_presenca')
        .in('matricula_id', matriculaIds)

      if (attendanceError) throw attendanceError

      // Calculate attendance percentage for each student
      const studentsWithRisk: StudentAtRisk[] = []

      for (const matricula of matriculas) {
        const studentAttendance = attendance?.filter(a => a.matricula_id === matricula.id) || []
        const total = studentAttendance.length

        if (total === 0) continue // Skip students with no attendance records

        const presentes = studentAttendance.filter(
          a => a.status_presenca === 'P' || (a.presente && !a.status_presenca)
        ).length
        const atestados = studentAttendance.filter(a => a.status_presenca === 'A').length
        const faltas = studentAttendance.filter(
          a => a.status_presenca === 'F' || (!a.presente && !a.status_presenca)
        ).length

        // Calculate attendance rate (presentes + atestados count as attended)
        const attended = presentes + atestados
        const percentage = Math.round((attended / total) * 100)

        // Only include students below 80% threshold
        if (percentage < 80) {
          const aluno = matricula.alunos as { id: string; nome_completo: string } | null
          studentsWithRisk.push({
            id: aluno?.id || matricula.aluno_id,
            nome: aluno?.nome_completo || 'Aluno',
            nis: undefined, // NIS not available in alunos table
            frequenciaPercentual: percentage,
            totalFaltas: faltas,
            totalAtestados: atestados,
            matriculaId: matricula.id,
          })
        }
      }

      setStudentsAtRisk(studentsWithRisk)
    } catch (err) {
      logger.error('Error loading students at risk:', err as Error, { feature: 'frequencia', action: 'load_risk' })
      // Don't show error - just keep empty list
      setStudentsAtRisk([])
    } finally {
      setLoadingRisk(false)
    }
  }, [selectedTurmaId])

  useEffect(() => {
    loadStudentsAtRisk()
  }, [loadStudentsAtRisk])

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleTurmaChange = (turmaId: string) => {
    setSelectedTurmaId(turmaId)
    // Find escola_id for the selected turma
    const turma = turmas.find(t => t.id === turmaId) as (Turma & { escola_id?: string }) | undefined
    setSelectedTurmaEscolaId(turma?.escola_id || null)
    setSession(null)
    setSummary(null)
  }

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    setSession(null)
  }

  const handleAttendanceChange = (stats: AttendanceStats) => {
    // Convert AttendanceStats to AttendanceSummary
    const newSummary: AttendanceSummary = {
      total: stats.total,
      presentes: stats.present,
      faltas: stats.absent,
      atestados: stats.attestado,
      percentualPresenca: stats.attendanceRate,
      percentualFrequencia: stats.attendanceRate,
    }
    setSummary(newSummary)
  }

  const handleSaveFrequency = async () => {
    if (!session) {
      toast.error('Nenhuma sessao ativa para salvar')
      return
    }

    try {
      setSaving(true)
      setSaveSuccess(false)

      // The AttendanceGrid already saves in real-time, but we can force a refresh
      // and update the session status if needed

      // For now, just show success feedback since AttendanceGrid handles saving
      await new Promise(resolve => setTimeout(resolve, 500)) // Brief delay for UX

      setSaveSuccess(true)
      toast.success('Frequencia salva com sucesso!')

      // Refresh risk data
      loadStudentsAtRisk()

      // Reset success indicator after a delay
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      logger.error('Error saving frequency:', err as Error, { feature: 'frequencia', action: 'save' })
      toast.error('Erro ao salvar frequencia. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleStudentRiskClick = (student: StudentAtRisk) => {
    router.push(`/dashboard/alunos/${student.id}`)
  }

  // =========================================================================
  // Derived State
  // =========================================================================

  const isReadonly = useMemo(() => {
    if (!userProfile) return true
    if (userProfile.tipo_usuario === 'admin') return false
    if (userProfile.tipo_usuario === 'professor' && session?.professor_id === userProfile.id) return false
    return true
  }, [userProfile, session])

  const selectedTurma = useMemo(() => {
    return turmas.find(t => t.id === selectedTurmaId)
  }, [turmas, selectedTurmaId])

  const formattedDate = format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  // =========================================================================
  // Loading State
  // =========================================================================

  if (!userProfile) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7" />
            Frequencia Diaria
          </h1>
          <p className="text-muted-foreground">
            Registre a presenca dos alunos por turma e dia
          </p>
        </div>
        <div className="text-sm text-muted-foreground mt-2 md:mt-0">
          {formattedDate}
        </div>
      </div>

      {/* User Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Usuario:</strong> {userProfile.nome} ({userProfile.tipo_usuario})
          {selectedTurma && (
            <>
              {' | '}
              <strong>Turma:</strong> {selectedTurma.nome}
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls Panel */}
      {loadingTurmas ? (
        <Card className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </Card>
      ) : (
        <FrequencyControls
          turmas={turmas}
          selectedTurmaId={selectedTurmaId}
          onTurmaChange={handleTurmaChange}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          periodView={periodView}
          onPeriodViewChange={setPeriodView}
          summary={summary || undefined}
          loading={loadingSession}
          disabled={saving}
        />
      )}

      {/* Risk Alert */}
      {studentsAtRisk.length > 0 && (
        <RiskAlert
          studentsAtRisk={studentsAtRisk}
          loading={loadingRisk}
          onStudentClick={handleStudentRiskClick}
          showStudentLink={false}
        />
      )}

      {/* Attendance Grid */}
      {selectedTurmaId && session ? (
        <AttendanceGrid
          sessionId={session.id}
          turmaId={selectedTurmaId}
          sessionDate={session.data_aula}
          sessionStatus={session.status}
          readonly={isReadonly}
          showPhotos={true}
          onAttendanceChange={handleAttendanceChange}
        />
      ) : selectedTurmaId && loadingSession ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando sessao de aula...</p>
            </div>
          </CardContent>
        </Card>
      ) : selectedTurmaId && !session ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nenhuma sessao encontrada</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Nao ha sessao de aula registrada para esta turma nesta data.
                {userProfile.tipo_usuario !== 'professor' && (
                  <> Apenas professores podem criar novas sessoes.</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Selecione uma Turma</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Escolha uma turma no painel acima para visualizar e registrar a frequencia dos alunos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {selectedTurmaId && session && (
        <Card className="bg-white">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="font-semibold">Legenda:</span>
              <span className="flex items-center gap-1">
                <span className="w-6 h-6 bg-green-100 border border-green-300 rounded flex items-center justify-center text-green-700 font-bold">P</span>
                Presente
              </span>
              <span className="flex items-center gap-1">
                <span className="w-6 h-6 bg-red-100 border border-red-300 rounded flex items-center justify-center text-red-700 font-bold">F</span>
                Falta
              </span>
              <span className="flex items-center gap-1">
                <span className="w-6 h-6 bg-yellow-100 border border-yellow-300 rounded flex items-center justify-center text-yellow-700 font-bold">A</span>
                Atestado
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fixed Save Button (Task 1.4.4) */}
      {selectedTurmaId && session && !isReadonly && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <Button
            size="lg"
            onClick={handleSaveFrequency}
            disabled={saving}
            className={`
              px-12 py-6 text-lg font-bold shadow-lg transition-all hover:scale-105
              ${saveSuccess
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-green-600 hover:bg-green-700'
              }
            `}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Frequencia Salva!
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                SALVAR FREQUENCIA
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
