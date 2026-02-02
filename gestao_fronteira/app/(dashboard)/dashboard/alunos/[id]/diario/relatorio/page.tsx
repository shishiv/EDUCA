/**
 * Relatorio de Desenvolvimento Page
 * Development report writing interface with vivencias reference sidebar
 *
 * Features:
 * - Two-column layout on desktop (writer + sidebar)
 * - Single column on mobile with sheet for vivencias
 * - Campo focus syncs with sidebar filter
 * - Semester selection dropdown
 * - Save draft and finalize report to relatorios_descritivos table
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-03-PLAN.md
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Printer,
  BookOpen,
  Loader2,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

// Components
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DevelopmentReportWriter, type ReportFormValues } from '@/components/diary/DevelopmentReportWriter'
import { VivenciasReference } from '@/components/diary/VivenciasReference'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// Types
import { type Vivencia, type CampoType } from '@/types/diario-infantil'
import { Plus } from 'lucide-react'
import { SEMESTER_CONFIG, type SemestreType, type ReportStatus } from '@/types/descriptive-report'

// ============================================================================
// Types
// ============================================================================

interface Student {
  id: string
  nome_completo: string
  data_nascimento: string
}

interface Matricula {
  id: string
  turma_id: string
}

interface ExistingReport {
  id: string
  status: ReportStatus
  campo_eu_outro_nos: string | null
  campo_corpo_gestos: string | null
  campo_tracos_sons: string | null
  campo_escuta_fala: string | null
  campo_espacos_tempos: string | null
  observacoes_gerais: string | null
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCurrentSemester(): SemestreType {
  const month = new Date().getMonth() + 1
  return month <= 7 ? 'primeiro' : 'segundo'
}

function getCurrentYear(): number {
  return new Date().getFullYear()
}

function formatSemesterLabel(semestre: SemestreType, ano: number): string {
  const config = SEMESTER_CONFIG[semestre]
  return `${config.label} de ${ano}`
}

// ============================================================================
// Component
// ============================================================================

export default function RelatorioPage() {
  const params = useParams()
  const router = useRouter()
  const { userProfile } = useAuth()
  const alunoId = params?.id as string

  // State
  const [student, setStudent] = useState<Student | null>(null)
  const [vivencias, setVivencias] = useState<Vivencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<SemestreType>(
    getCurrentSemester()
  )
  const [selectedYear] = useState(getCurrentYear())
  const [selectedCampo, setSelectedCampo] = useState<CampoType | null>(null)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  // Report state
  const [matricula, setMatricula] = useState<Matricula | null>(null)
  const [existingReport, setExistingReport] = useState<ExistingReport | null>(null)
  const [isReportFinalized, setIsReportFinalized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)
  const [pendingFinalizeData, setPendingFinalizeData] = useState<ReportFormValues | null>(null)

  // Load student data and matricula
  const loadStudent = useCallback(async () => {
    if (!alunoId) return

    try {
      const { data, error: studentError } = await supabase
        .from('alunos')
        .select('id, nome_completo, data_nascimento')
        .eq('id', alunoId)
        .single()

      if (studentError) throw studentError

      setStudent(data)

      // Load active matricula
      const { data: matriculaData, error: matriculaError } = await supabase
        .from('matriculas')
        .select('id, turma_id')
        .eq('aluno_id', alunoId)
        .eq('status', 'ativa')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (matriculaError) {
        logger.warn('Error loading matricula', {
          feature: 'relatorios-descritivos',
          action: 'load_matricula',
          metadata: { alunoId, error: matriculaError.message }
        })
      } else if (matriculaData) {
        setMatricula(matriculaData)
      }
    } catch (err: any) {
      logger.error('Error loading student', err as Error, {
        feature: 'diario-infantil',
        action: 'load_student_relatorio',
        metadata: { alunoId }
      })
      setError('Erro ao carregar dados do aluno')
    }
  }, [alunoId])

  // Load vivencias
  const loadVivencias = useCallback(async () => {
    if (!alunoId) return

    try {
      const response = await fetch(`/api/vivencias?aluno_id=${alunoId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar vivencias')
      }

      const { data } = await response.json()
      setVivencias(data || [])
    } catch (err) {
      logger.error('Error loading vivencias', err as Error, {
        feature: 'diario-infantil',
        action: 'load_vivencias_relatorio',
        metadata: { alunoId }
      })
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar vivencias'
      toast.error(errorMessage)
    }
  }, [alunoId])

  // Load existing report for selected semester
  const loadExistingReport = useCallback(async () => {
    if (!matricula) return

    try {
      const { data: report, error: reportError } = await supabase
        .from('relatorios_descritivos')
        .select('id, status, campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons, campo_escuta_fala, campo_espacos_tempos, observacoes_gerais')
        .eq('matricula_id', matricula.id)
        .eq('ano_letivo', selectedYear)
        .eq('semestre', selectedSemester)
        .maybeSingle()

      if (reportError) {
        logger.warn('Error loading existing report', {
          feature: 'relatorios-descritivos',
          action: 'load_existing_report',
          metadata: { matriculaId: matricula.id, error: reportError.message }
        })
      } else if (report) {
        setExistingReport({
          ...report,
          status: report.status as ReportStatus
        })
        setIsReportFinalized(report.status === 'finalizado')
      } else {
        setExistingReport(null)
        setIsReportFinalized(false)
      }
    } catch (err) {
      logger.error('Error in loadExistingReport', err as Error, {
        feature: 'relatorios-descritivos',
        action: 'load_existing_report_exception'
      })
    }
  }, [matricula, selectedYear, selectedSemester])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadStudent(), loadVivencias()])
      setLoading(false)
    }
    load()
  }, [loadStudent, loadVivencias])

  // Load existing report when matricula or semester changes
  useEffect(() => {
    if (matricula) {
      loadExistingReport()
    }
  }, [matricula, loadExistingReport])

  // Map form values to database columns
  const mapFormToDb = useCallback((data: ReportFormValues) => ({
    campo_eu_outro_nos: data.campo_eu || null,
    campo_corpo_gestos: data.campo_corpo || null,
    campo_tracos_sons: data.campo_tracos || null,
    campo_escuta_fala: data.campo_escuta || null,
    campo_espacos_tempos: data.campo_espacos || null,
    observacoes_gerais: data.observacoes_gerais || null,
  }), [])

  // Handlers
  const handleSaveDraft = useCallback(async (data: ReportFormValues) => {
    if (!matricula || !userProfile) {
      toast.error('Erro: dados da matricula nao encontrados')
      return
    }

    setIsSaving(true)
    try {
      const dbData = mapFormToDb(data)

      if (existingReport) {
        // Update existing report
        const { error: updateError } = await supabase
          .from('relatorios_descritivos')
          .update({
            ...dbData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReport.id)

        if (updateError) throw updateError
      } else {
        // Create new report
        const { data: newReport, error: insertError } = await supabase
          .from('relatorios_descritivos')
          .insert({
            matricula_id: matricula.id,
            turma_id: matricula.turma_id,
            professor_id: userProfile.id,
            ano_letivo: selectedYear,
            semestre: selectedSemester,
            status: 'rascunho' as ReportStatus,
            ...dbData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: userProfile.id,
          })
          .select('id, status, campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons, campo_escuta_fala, campo_espacos_tempos, observacoes_gerais')
          .single()

        if (insertError) throw insertError
        setExistingReport({
          ...newReport,
          status: newReport.status as ReportStatus
        })
      }

      logger.info('Draft saved successfully', {
        feature: 'relatorios-descritivos',
        action: 'save_draft',
        metadata: { alunoId, matriculaId: matricula.id, semestre: selectedSemester }
      })

      toast.success('Rascunho salvo com sucesso')
    } catch (err) {
      logger.error('Error saving draft', err as Error, {
        feature: 'relatorios-descritivos',
        action: 'save_draft_error',
        metadata: { alunoId }
      })
      toast.error('Erro ao salvar rascunho')
    } finally {
      setIsSaving(false)
    }
  }, [alunoId, matricula, userProfile, existingReport, selectedYear, selectedSemester, mapFormToDb])

  const handleFinalizeRequest = useCallback(async (data: ReportFormValues) => {
    // Show confirmation dialog before finalizing
    setPendingFinalizeData(data)
    setShowFinalizeDialog(true)
  }, [])

  const handleFinalizeConfirm = useCallback(async () => {
    if (!pendingFinalizeData || !matricula || !userProfile) {
      toast.error('Erro: dados incompletos para finalizacao')
      return
    }

    setIsSaving(true)
    try {
      const dbData = mapFormToDb(pendingFinalizeData)
      const now = new Date().toISOString()

      if (existingReport) {
        // Update and finalize existing report
        const { error: updateError } = await supabase
          .from('relatorios_descritivos')
          .update({
            ...dbData,
            status: 'finalizado' as ReportStatus,
            finalizado_em: now,
            finalizado_por: userProfile.id,
            updated_at: now,
          })
          .eq('id', existingReport.id)

        if (updateError) throw updateError
        setExistingReport({ ...existingReport, ...dbData, status: 'finalizado' })
      } else {
        // Create and finalize new report
        const { data: newReport, error: insertError } = await supabase
          .from('relatorios_descritivos')
          .insert({
            matricula_id: matricula.id,
            turma_id: matricula.turma_id,
            professor_id: userProfile.id,
            ano_letivo: selectedYear,
            semestre: selectedSemester,
            status: 'finalizado' as ReportStatus,
            ...dbData,
            finalizado_em: now,
            finalizado_por: userProfile.id,
            created_at: now,
            updated_at: now,
            created_by: userProfile.id,
          })
          .select('id, status, campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons, campo_escuta_fala, campo_espacos_tempos, observacoes_gerais')
          .single()

        if (insertError) throw insertError
        setExistingReport({
          ...newReport,
          status: newReport.status as ReportStatus
        })
      }

      setIsReportFinalized(true)
      logger.info('Report finalized successfully', {
        feature: 'relatorios-descritivos',
        action: 'finalize_report',
        metadata: { alunoId, matriculaId: matricula.id, semestre: selectedSemester }
      })

      toast.success('Relatorio finalizado com sucesso')
    } catch (err) {
      logger.error('Error finalizing report', err as Error, {
        feature: 'relatorios-descritivos',
        action: 'finalize_report_error',
        metadata: { alunoId }
      })
      toast.error('Erro ao finalizar relatorio')
    } finally {
      setIsSaving(false)
      setShowFinalizeDialog(false)
      setPendingFinalizeData(null)
    }
  }, [pendingFinalizeData, matricula, userProfile, existingReport, selectedYear, selectedSemester, mapFormToDb, alunoId])

  const handleCampoFocus = useCallback((campo: CampoType | null) => {
    setSelectedCampo(campo)
  }, [])

  const handleFilterChange = useCallback((campo: CampoType | null) => {
    setSelectedCampo(campo)
  }, [])

  const handlePrint = useCallback(() => {
    // PDF export - out of scope for this plan
    toast.info('Exportacao PDF sera implementada em breve')
  }, [])

  // Compute initial values from existing report
  const initialValues = useMemo(() => {
    if (!existingReport) return undefined
    return {
      campo_eu: existingReport.campo_eu_outro_nos || '',
      campo_corpo: existingReport.campo_corpo_gestos || '',
      campo_tracos: existingReport.campo_tracos_sons || '',
      campo_escuta: existingReport.campo_escuta_fala || '',
      campo_espacos: existingReport.campo_espacos_tempos || '',
      observacoes_gerais: existingReport.observacoes_gerais || '',
    }
  }, [existingReport])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid lg:grid-cols-[1fr,350px] gap-6">
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full hidden lg:block" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !student) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          <p className="font-medium">Erro ao carregar pagina</p>
          <p className="text-sm mt-1">{error || 'Aluno nao encontrado'}</p>
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

  const semesterLabel = formatSemesterLabel(selectedSemester, selectedYear)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4 space-y-4">
          {/* Back navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/alunos/${alunoId}/diario`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Diario Infantil
              </Link>
            </Button>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile vivencias button */}
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Vivencias
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Vivencias de Referencia</SheetTitle>
                  </SheetHeader>
                  <VivenciasReference
                    vivencias={vivencias}
                    selectedCampo={selectedCampo}
                    onFilterChange={handleFilterChange}
                    className="h-full"
                  />
                </SheetContent>
              </Sheet>

              {/* Print button */}
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </div>

          {/* Title and semester */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Relatorio de Desenvolvimento
              </h1>
              <p className="text-muted-foreground mt-1">
                {student.nome_completo}
              </p>
            </div>

            {/* Semester selector */}
            <Select
              value={selectedSemester}
              onValueChange={(value) =>
                setSelectedSemester(value as SemestreType)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o semestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primeiro">
                  {SEMESTER_CONFIG.primeiro.label}
                </SelectItem>
                <SelectItem value="segundo">
                  {SEMESTER_CONFIG.segundo.label}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Empty state */}
        {vivencias.length === 0 && (
          <div className="text-center py-12 border rounded-lg bg-muted/30 print:hidden">
            <p className="text-muted-foreground">
              Nenhuma vivencia registrada para gerar relatorio.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Registre vivencias no Diario Infantil para construir o relatorio de desenvolvimento.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/dashboard/alunos/${alunoId}/diario/novo`}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar primeira vivencia
              </Link>
            </Button>
          </div>
        )}

        {/* Report content */}
        {vivencias.length > 0 && (
          <div className="grid lg:grid-cols-[1fr,350px] gap-6">
            {/* Writer (main area) */}
            <main>
              {/* Finalized report notice */}
              {isReportFinalized && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <Lock className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Relatorio Finalizado</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Este relatorio foi finalizado e nao pode mais ser editado.
                  </AlertDescription>
                </Alert>
              )}
              <DevelopmentReportWriter
                studentName={student.nome_completo}
                semesterLabel={semesterLabel}
                initialValues={initialValues}
                onSave={handleSaveDraft}
                onFinalize={handleFinalizeRequest}
                onCampoFocus={handleCampoFocus}
                vivencias={vivencias}
                isLoading={isSaving}
                disabled={isReportFinalized}
              />
            </main>

            {/* Sidebar (hidden on mobile) */}
            <aside className="hidden lg:block">
              <div className="sticky top-[165px]">
                <div className="rounded-xl border border-gray-200 overflow-hidden h-[calc(100vh-200px)]">
                  <VivenciasReference
                    vivencias={vivencias}
                    selectedCampo={selectedCampo}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Relatorio</AlertDialogTitle>
            <AlertDialogDescription>
              Ao finalizar, o relatorio nao podera mais ser editado. Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalizeConfirm}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                'Finalizar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
