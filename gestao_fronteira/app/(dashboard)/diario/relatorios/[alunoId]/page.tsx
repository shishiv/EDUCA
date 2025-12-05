/**
 * Student Descriptive Reports Page
 * Task Group 3.2: Relatorios Descritivos (Ed. Infantil)
 *
 * This page allows teachers to:
 * - View previous descriptive reports for a student
 * - Create new reports
 * - Edit draft reports
 * - View finalized reports
 *
 * Features:
 * - Report history list
 * - Create new report modal
 * - Report status (draft/finalized)
 * - Semester-based organization
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Plus,
  FileText,
  Calendar,
  User,
  Clock,
  CheckCircle,
  PenLine,
  Eye,
  Edit,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { DescriptiveReportForm } from '@/components/reports/DescriptiveReportForm'
import {
  type DescriptiveReportDetailed,
  type SemestreType,
  SEMESTER_CONFIG,
  getCurrentSemester,
  getCurrentAcademicYear,
  formatSemester,
} from '@/types/descriptive-report'
import { transformFormDataToInput } from '@/lib/validation/descriptive-report'

// ============================================================================
// TYPES
// ============================================================================

interface StudentInfo {
  id: string
  nome_completo: string
  data_nascimento: string
  matricula_id: string
  turma_id: string
  turma_nome: string
  turma_serie: string
  escola_nome: string
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ReportCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-2 w-full mt-4" />
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StudentReportsPage() {
  const params = useParams()
  const router = useRouter()
  const alunoId = params.alunoId as string

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [reports, setReports] = useState<DescriptiveReportDetailed[]>([])
  const [selectedReport, setSelectedReport] = useState<DescriptiveReportDetailed | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newReportSemester, setNewReportSemester] = useState<SemestreType>(getCurrentSemester())
  const [newReportYear, setNewReportYear] = useState<number>(getCurrentAcademicYear())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch student info and reports
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First, get the student and their current enrollment
      const { data: matriculaData, error: matriculaError } = await supabase
        .from('matriculas')
        .select(`
          id,
          turma_id,
          aluno:alunos!inner(
            id,
            nome_completo,
            data_nascimento
          ),
          turma:turmas!inner(
            id,
            nome,
            serie,
            escola:escolas!inner(
              nome
            )
          )
        `)
        .eq('aluno.id', alunoId)
        .eq('situacao', 'ativa')
        .single()

      if (matriculaError) {
        throw new Error('Aluno nao encontrado ou sem matricula ativa')
      }

      // Type assertion for nested data
      const aluno = matriculaData.aluno as unknown as {
        id: string
        nome_completo: string
        data_nascimento: string
      }
      const turma = matriculaData.turma as unknown as {
        id: string
        nome: string
        serie: string
        escola: { nome: string }
      }

      setStudentInfo({
        id: aluno.id,
        nome_completo: aluno.nome_completo,
        data_nascimento: aluno.data_nascimento,
        matricula_id: matriculaData.id,
        turma_id: turma.id,
        turma_nome: turma.nome,
        turma_serie: turma.serie,
        escola_nome: turma.escola.nome,
      })

      // Fetch reports for this student - using any cast since table may not be in types yet
      const { data: reportsData, error: reportsError } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => {
                order: (col: string, opts: { ascending: boolean }) => Promise<{
                  data: unknown[] | null
                  error: Error | null
                }>
              }
            }
          }
        }
      })
        .from('relatorios_descritivos')
        .select(`
          *,
          professor:users!professor_id(nome)
        `)
        .eq('matricula_id', matriculaData.id)
        .order('ano_letivo', { ascending: false })
        .order('semestre', { ascending: false })

      if (reportsError) {
        console.warn('Error fetching reports:', reportsError)
        setReports([])
      } else {
        // Transform the data
        const reportsList = (reportsData || []) as Array<{
          id: string
          matricula_id: string
          turma_id: string
          professor_id: string
          ano_letivo: number
          semestre: SemestreType
          status: 'rascunho' | 'finalizado'
          campo_eu_outro_nos: string | null
          campo_corpo_gestos: string | null
          campo_tracos_sons: string | null
          campo_escuta_fala: string | null
          campo_espacos_tempos: string | null
          observacoes_gerais: string | null
          draft_data: Record<string, unknown> | null
          last_draft_saved_at: string | null
          finalizado_em: string | null
          finalizado_por: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          professor: { nome: string } | null
        }>

        const transformedReports: DescriptiveReportDetailed[] = reportsList.map((report) => ({
          ...report,
          aluno_id: aluno.id,
          aluno_nome: aluno.nome_completo,
          aluno_nascimento: aluno.data_nascimento,
          turma_nome: turma.nome,
          turma_serie: turma.serie,
          escola_id: turma.id,
          escola_nome: turma.escola.nome,
          professor_nome: report.professor?.nome || 'Desconhecido',
          campos_preenchidos: [
            report.campo_eu_outro_nos,
            report.campo_corpo_gestos,
            report.campo_tracos_sons,
            report.campo_escuta_fala,
            report.campo_espacos_tempos,
          ].filter((f) => f && f.trim().length >= 50).length,
          total_campos: 5,
        }))
        setReports(transformedReports)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }, [alunoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Check if report exists for period
  const reportExistsForPeriod = useCallback(
    (year: number, semester: SemestreType): boolean => {
      return reports.some((r) => r.ano_letivo === year && r.semestre === semester)
    },
    [reports]
  )

  // Handle create new report
  const handleCreateNew = useCallback(() => {
    const year = getCurrentAcademicYear()
    const semester = getCurrentSemester()

    // Check if report already exists
    if (reportExistsForPeriod(year, semester)) {
      toast.error(`Ja existe um relatorio para ${formatSemester(semester, year)}`)
      return
    }

    setNewReportYear(year)
    setNewReportSemester(semester)
    setIsCreatingNew(true)
    setSelectedReport(null)
    setIsFormOpen(true)
  }, [reportExistsForPeriod])

  // Handle open report
  const handleOpenReport = useCallback((report: DescriptiveReportDetailed) => {
    setSelectedReport(report)
    setIsCreatingNew(false)
    setIsFormOpen(true)
  }, [])

  // Handle save draft
  const handleSaveDraft = useCallback(
    async (data: ReturnType<typeof transformFormDataToInput>) => {
      if (!studentInfo) return

      setIsSaving(true)
      try {
        if (isCreatingNew) {
          // Create new report
          const { data: userData } = await supabase.auth.getUser()
          if (!userData.user) {
            throw new Error('Usuario nao autenticado')
          }

          const { error: insertError } = await (supabase as unknown as {
            from: (table: string) => {
              insert: (data: unknown) => Promise<{ error: Error | null }>
            }
          })
            .from('relatorios_descritivos')
            .insert({
              matricula_id: studentInfo.matricula_id,
              turma_id: studentInfo.turma_id,
              professor_id: userData.user.id,
              ano_letivo: newReportYear,
              semestre: newReportSemester,
              status: 'rascunho',
              ...data,
              last_draft_saved_at: new Date().toISOString(),
              created_by: userData.user.id,
            })

          if (insertError) {
            throw insertError
          }

          setIsCreatingNew(false)
        } else if (selectedReport) {
          // Update existing report
          const { error: updateError } = await (supabase as unknown as {
            from: (table: string) => {
              update: (data: unknown) => {
                eq: (col: string, val: string) => Promise<{ error: Error | null }>
              }
            }
          })
            .from('relatorios_descritivos')
            .update({
              ...data,
              last_draft_saved_at: new Date().toISOString(),
            })
            .eq('id', selectedReport.id)

          if (updateError) {
            throw updateError
          }
        }

        // Refresh data
        await fetchData()
      } catch (err) {
        console.error('Error saving draft:', err)
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [
      studentInfo,
      isCreatingNew,
      selectedReport,
      newReportYear,
      newReportSemester,
      fetchData,
    ]
  )

  // Handle finalize
  const handleFinalize = useCallback(
    async (data: ReturnType<typeof transformFormDataToInput>) => {
      if (!studentInfo) return

      setIsSaving(true)
      try {
        if (isCreatingNew) {
          // Create and finalize new report
          const { data: userData } = await supabase.auth.getUser()
          if (!userData.user) {
            throw new Error('Usuario nao autenticado')
          }

          const { error: insertError } = await (supabase as unknown as {
            from: (table: string) => {
              insert: (data: unknown) => Promise<{ error: Error | null }>
            }
          })
            .from('relatorios_descritivos')
            .insert({
              matricula_id: studentInfo.matricula_id,
              turma_id: studentInfo.turma_id,
              professor_id: userData.user.id,
              ano_letivo: newReportYear,
              semestre: newReportSemester,
              status: 'finalizado',
              ...data,
              finalizado_em: new Date().toISOString(),
              finalizado_por: userData.user.id,
              created_by: userData.user.id,
            })

          if (insertError) {
            throw insertError
          }
        } else if (selectedReport) {
          // Finalize existing report
          const { data: userData } = await supabase.auth.getUser()

          const { error: updateError } = await (supabase as unknown as {
            from: (table: string) => {
              update: (data: unknown) => {
                eq: (col: string, val: string) => Promise<{ error: Error | null }>
              }
            }
          })
            .from('relatorios_descritivos')
            .update({
              ...data,
              status: 'finalizado',
              finalizado_em: new Date().toISOString(),
              finalizado_por: userData.user?.id,
            })
            .eq('id', selectedReport.id)

          if (updateError) {
            throw updateError
          }
        }

        setIsFormOpen(false)
        await fetchData()
      } catch (err) {
        console.error('Error finalizing report:', err)
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [
      studentInfo,
      isCreatingNew,
      selectedReport,
      newReportYear,
      newReportSemester,
      fetchData,
    ]
  )

  // Calculate age
  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate)
    const today = new Date()
    let years = today.getFullYear() - birth.getFullYear()
    let months = today.getMonth() - birth.getMonth()

    if (months < 0) {
      years--
      months += 12
    }

    if (years === 0) {
      return `${months} meses`
    }
    return `${years} ano${years > 1 ? 's' : ''} e ${months} mes${months !== 1 ? 'es' : ''}`
  }

  // Format date
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          <ReportCardSkeleton />
          <ReportCardSkeleton />
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    )
  }

  // Render not found state
  if (!studentInfo) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Aluno nao encontrado</AlertTitle>
          <AlertDescription>
            Nao foi possivel encontrar o aluno ou o aluno nao possui matricula ativa.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-purple-600" />
              {studentInfo.nome_completo}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {studentInfo.turma_nome} - {studentInfo.turma_serie}
              </span>
              <span className="text-muted-foreground">|</span>
              <span>{studentInfo.escola_nome}</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(studentInfo.data_nascimento)} ({calculateAge(studentInfo.data_nascimento)})
              </span>
            </div>
          </div>
        </div>
        <Button
          onClick={handleCreateNew}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Relatorio
        </Button>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Relatorios Descritivos
        </h2>

        {reports.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum relatorio encontrado para este aluno.
                <br />
                Clique em &quot;Novo Relatorio&quot; para criar o primeiro.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card
                key={report.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  report.status === 'finalizado'
                    ? 'border-green-200 hover:border-green-300'
                    : 'border-yellow-200 hover:border-yellow-300'
                )}
                onClick={() => handleOpenReport(report)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatSemester(report.semestre, report.ano_letivo)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {report.status === 'finalizado'
                            ? `Finalizado em ${formatDate(report.finalizado_em!)}`
                            : `Atualizado em ${formatDate(report.updated_at)}`}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'flex items-center gap-1',
                        report.status === 'finalizado'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-yellow-300 bg-yellow-50 text-yellow-700'
                      )}
                    >
                      {report.status === 'finalizado' ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Finalizado
                        </>
                      ) : (
                        <>
                          <PenLine className="h-3 w-3" />
                          Rascunho
                        </>
                      )}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progresso</span>
                      <span>
                        {report.campos_preenchidos} de {report.total_campos} campos
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          report.status === 'finalizado' ? 'bg-green-500' : 'bg-purple-500'
                        )}
                        style={{
                          width: `${(report.campos_preenchidos / report.total_campos) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Action hint */}
                  <div className="flex items-center justify-end mt-3 text-xs text-muted-foreground">
                    {report.status === 'finalizado' ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Clique para visualizar
                      </>
                    ) : (
                      <>
                        <Edit className="h-3 w-3 mr-1" />
                        Clique para editar
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Report Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreatingNew
                ? 'Novo Relatorio Descritivo'
                : selectedReport?.status === 'finalizado'
                  ? 'Visualizar Relatorio'
                  : 'Editar Relatorio'}
            </DialogTitle>
            <DialogDescription>
              {isCreatingNew
                ? `${studentInfo.nome_completo} - ${formatSemester(newReportSemester, newReportYear)}`
                : selectedReport
                  ? `${studentInfo.nome_completo} - ${formatSemester(selectedReport.semestre, selectedReport.ano_letivo)}`
                  : ''}
            </DialogDescription>
          </DialogHeader>

          {/* New Report Semester Selector */}
          {isCreatingNew && (
            <div className="flex items-center gap-4 py-4 border-b">
              <div className="flex-1">
                <label className="text-sm font-medium">Ano Letivo</label>
                <Select
                  value={newReportYear.toString()}
                  onValueChange={(v) => setNewReportYear(parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[getCurrentAcademicYear() - 1, getCurrentAcademicYear()].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Semestre</label>
                <Select
                  value={newReportSemester}
                  onValueChange={(v) => setNewReportSemester(v as SemestreType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primeiro">{SEMESTER_CONFIG.primeiro.label}</SelectItem>
                    <SelectItem value="segundo">{SEMESTER_CONFIG.segundo.label}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DescriptiveReportForm
            reportId={selectedReport?.id}
            studentName={studentInfo.nome_completo}
            semesterLabel={
              isCreatingNew
                ? formatSemester(newReportSemester, newReportYear)
                : selectedReport
                  ? formatSemester(selectedReport.semestre, selectedReport.ano_letivo)
                  : ''
            }
            initialValues={selectedReport || undefined}
            status={selectedReport?.status || 'rascunho'}
            onSaveDraft={handleSaveDraft}
            onFinalize={handleFinalize}
            onCancel={() => setIsFormOpen(false)}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
