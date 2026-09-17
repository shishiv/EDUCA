'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, BookOpen, FileText, Loader2, Lock, Plus, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  DevelopmentReportWriter,
  type ReportFormValues,
} from '@/components/diary/DevelopmentReportWriter'
import { VivenciasReference } from '@/components/diary/VivenciasReference'
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
import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'
import { canAccessRoute } from '@/lib/route-policy'
import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import {
  SEMESTER_CONFIG,
  type ReportStatus,
  type SemestreType,
} from '@/types/descriptive-report'
import type { CampoType, Vivencia } from '@/types/diario-infantil'

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

interface ReportHeaderProps {
  alunoId: string
  studentName: string
  semester: SemestreType
  mobileSheetOpen: boolean
  vivencias: Vivencia[]
  selectedCampo: CampoType | null
  onMobileSheetChange(open: boolean): void
  onSemesterChange(semester: SemestreType): void
  onFilterChange(campo: CampoType | null): void
  onPrint(): void
}

interface ReportContentProps {
  alunoId: string
  studentName: string
  semesterLabel: string
  vivencias: Vivencia[]
  selectedCampo: CampoType | null
  finalized: boolean
  canWrite: boolean
  isSaving: boolean
  role?: string
  initialValues?: ReportFormValues
  onSave(data: ReportFormValues): Promise<void>
  onFinalize(data: ReportFormValues): Promise<void>
  onCampoFocus(campo: CampoType | null): void
  onFilterChange(campo: CampoType | null): void
}

const apiErrorSchema = z.object({ error: z.string() })
const vivenciaSchema = z.object({
  id: z.string(),
  escola_id: z.string(),
  aluno_id: z.string(),
  matricula_id: z.string(),
  turma_id: z.string(),
  professor_id: z.string(),
  data_vivencia: z.string(),
  campos_experiencia: z.array(z.enum(['eu', 'corpo', 'tracos', 'escuta', 'espacos'])),
  descricao: z.string(),
  observacoes: z.string().nullable(),
  escopo: z.enum(['individual', 'coletiva']),
  created_by: z.string(),
  updated_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})
const vivenciasResponseSchema = z.object({ data: z.array(vivenciaSchema) })
const existingReportSchema = z.object({
  id: z.string(),
  status: z.enum(['rascunho', 'finalizado']),
  campo_eu_outro_nos: z.string().nullable(),
  campo_corpo_gestos: z.string().nullable(),
  campo_tracos_sons: z.string().nullable(),
  campo_escuta_fala: z.string().nullable(),
  campo_espacos_tempos: z.string().nullable(),
  observacoes_gerais: z.string().nullable(),
})

function getCurrentSemester(): SemestreType {
  return new Date().getMonth() + 1 <= 7 ? 'primeiro' : 'segundo'
}

function getCurrentYear(): number {
  return new Date().getFullYear()
}

function formatSemesterLabel(semester: SemestreType, year: number): string {
  return `${SEMESTER_CONFIG[semester].label} de ${year}`
}

function parseSemester(value: string): SemestreType | null {
  const result = z.enum(['primeiro', 'segundo']).safeParse(value)
  return result.success ? result.data : null
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const result = apiErrorSchema.safeParse(await response.json().catch(() => null))
  return result.success ? result.data.error : fallback
}

async function fetchStudent(alunoId: string): Promise<Student> {
  const { data, error } = await supabase
    .from('alunos')
    .select('id, nome_completo, data_nascimento')
    .eq('id', alunoId)
    .single()
  if (error) throw error
  return data
}

async function fetchActiveEnrollment(alunoId: string): Promise<Matricula | null> {
  const { data, error } = await supabase
    .from('matriculas')
    .select('id, turma_id')
    .eq('aluno_id', alunoId)
    .eq('situacao', 'ativa')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!error) return data
  logger.warn('Error loading matricula', {
    feature: 'relatorios-descritivos',
    action: 'load_matricula',
    metadata: { alunoId, error: error.message },
  })
  return null
}

async function fetchVivencias(alunoId: string): Promise<Vivencia[]> {
  const response = await fetch(`/api/vivencias?aluno_id=${alunoId}`)
  if (!response.ok) throw new Error(await readApiError(response, 'Erro ao carregar vivencias'))
  return vivenciasResponseSchema.parse(await response.json()).data
}

async function fetchExistingReport(
  matriculaId: string,
  year: number,
  semester: SemestreType,
): Promise<ExistingReport | null | undefined> {
  const { data, error } = await supabase
    .from('relatorios_descritivos')
    .select('id, status, campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons, campo_escuta_fala, campo_espacos_tempos, observacoes_gerais')
    .eq('matricula_id', matriculaId)
    .eq('ano_letivo', year)
    .eq('semestre', semester)
    .maybeSingle()

  if (!error) return data ? existingReportSchema.parse(data) : null
  logger.warn('Error loading existing report', {
    feature: 'relatorios-descritivos',
    action: 'load_existing_report',
    metadata: { matriculaId, error: error.message },
  })
  return undefined
}

function mapFormToDatabase(data: ReportFormValues): TablesUpdate<'relatorios_descritivos'> {
  return {
    campo_eu_outro_nos: data.campo_eu || null,
    campo_corpo_gestos: data.campo_corpo || null,
    campo_tracos_sons: data.campo_tracos || null,
    campo_escuta_fala: data.campo_escuta || null,
    campo_espacos_tempos: data.campo_espacos || null,
    observacoes_gerais: data.observacoes_gerais || null,
  }
}

async function updateExistingReport(
  reportId: string,
  payload: TablesUpdate<'relatorios_descritivos'>,
): Promise<void> {
  const { error } = await supabase.from('relatorios_descritivos').update(payload).eq('id', reportId)
  if (error) throw error
}

async function insertReport(
  payload: TablesInsert<'relatorios_descritivos'>,
): Promise<ExistingReport> {
  const { data, error } = await supabase
    .from('relatorios_descritivos')
    .insert(payload)
    .select('id, status, campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons, campo_escuta_fala, campo_espacos_tempos, observacoes_gerais')
    .single()
  if (error) throw error
  return existingReportSchema.parse(data)
}

async function saveDraft(
  data: ReportFormValues,
  matricula: Matricula,
  userId: string,
  year: number,
  semester: SemestreType,
  existingReport: ExistingReport | null,
): Promise<ExistingReport | null> {
  const reportData = mapFormToDatabase(data)
  const now = new Date().toISOString()
  if (existingReport) {
    await updateExistingReport(existingReport.id, { ...reportData, updated_at: now })
    return null
  }

  const payload: TablesInsert<'relatorios_descritivos'> = {
    matricula_id: matricula.id,
    turma_id: matricula.turma_id,
    professor_id: userId,
    ano_letivo: year,
    semestre: semester,
    status: 'rascunho',
    ...reportData,
    created_at: now,
    updated_at: now,
    created_by: userId,
  }
  return insertReport(payload)
}

async function finalizeReport(
  data: ReportFormValues,
  matricula: Matricula,
  userId: string,
  year: number,
  semester: SemestreType,
  existingReport: ExistingReport | null,
): Promise<ExistingReport> {
  const reportData = mapFormToDatabase(data)
  const now = new Date().toISOString()
  if (existingReport) {
    await updateExistingReport(existingReport.id, {
      ...reportData,
      status: 'finalizado',
      finalizado_em: now,
      finalizado_por: userId,
      updated_at: now,
    })
    return { ...existingReport, ...reportData, status: 'finalizado' }
  }

  const payload: TablesInsert<'relatorios_descritivos'> = {
    matricula_id: matricula.id,
    turma_id: matricula.turma_id,
    professor_id: userId,
    ano_letivo: year,
    semestre: semester,
    status: 'finalizado',
    ...reportData,
    finalizado_em: now,
    finalizado_por: userId,
    created_at: now,
    updated_at: now,
    created_by: userId,
  }
  return insertReport(payload)
}

function getInitialValues(report: ExistingReport | null): ReportFormValues | undefined {
  if (!report) return undefined
  return {
    campo_eu: report.campo_eu_outro_nos || '',
    campo_corpo: report.campo_corpo_gestos || '',
    campo_tracos: report.campo_tracos_sons || '',
    campo_escuta: report.campo_escuta_fala || '',
    campo_espacos: report.campo_espacos_tempos || '',
    observacoes_gerais: report.observacoes_gerais || '',
  }
}

function ReportLoading() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr,350px]">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="hidden h-96 w-full lg:block" />
      </div>
    </div>
  )
}

function ReportError({ message, onBack }: { message: string; onBack(): void }) {
  const t = useTranslations('registry')
  return (
    <div className="p-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">{t('labels.erro-ao-carregar-pagina')}</p>
        <p className="mt-1 text-sm">{message}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('ui.voltar')}
        </Button>
      </div>
    </div>
  )
}

function ReportHeader({
  alunoId,
  studentName,
  semester,
  mobileSheetOpen,
  vivencias,
  selectedCampo,
  onMobileSheetChange,
  onSemesterChange,
  onFilterChange,
  onPrint,
}: ReportHeaderProps) {
  const t = useTranslations('registry')
  return (
    <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/alunos/${alunoId}/diario`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Diario Infantil
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Sheet open={mobileSheetOpen} onOpenChange={onMobileSheetChange}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Vivencias
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full p-0 sm:max-w-md">
                <SheetHeader className="sr-only">
                  <SheetTitle>{t('labels.vivencias-de-referencia')}</SheetTitle>
                </SheetHeader>
                <VivenciasReference
                  vivencias={vivencias}
                  selectedCampo={selectedCampo}
                  onFilterChange={onFilterChange}
                  className="h-full"
                />
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('labels.exportar')}</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <FileText className="h-5 w-5 text-purple-600" />
              {t('ui.relatorio-de-desenvolvimento')}
            </h1>
            <p className="mt-1 text-muted-foreground">{studentName}</p>
          </div>
          <Select
            value={semester}
            onValueChange={(value) => {
              const parsed = parseSemester(value)
              if (parsed) onSemesterChange(parsed)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('labels.selecione-o-semestre')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primeiro">{SEMESTER_CONFIG.primeiro.label}</SelectItem>
              <SelectItem value="segundo">{SEMESTER_CONFIG.segundo.label}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

function EmptyVivencias({ alunoId, role }: { alunoId: string; role?: string }) {
  const t = useTranslations('registry')
  const newVivenciaPath = `/dashboard/alunos/${alunoId}/diario/novo`
  return (
    <div className="rounded-lg border bg-muted/30 py-12 text-center print:hidden">
      <p className="text-muted-foreground">
        {t('ui.nenhuma-vivencia-registrada-para-gerar-relatorio')}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('ui.registre-vivencias-no-diario-infantil-para-construir-o-relatorio-de-dese')}
      </p>
      {canAccessRoute(newVivenciaPath, role) ? (
        <Button asChild className="mt-4">
          <Link href={newVivenciaPath}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar primeira vivencia
          </Link>
        </Button>
      ) : null}
    </div>
  )
}

function ReportContent({
  alunoId,
  studentName,
  semesterLabel,
  vivencias,
  selectedCampo,
  finalized,
  canWrite,
  isSaving,
  role,
  initialValues,
  onSave,
  onFinalize,
  onCampoFocus,
  onFilterChange,
}: ReportContentProps) {
  const t = useTranslations('registry')
  if (vivencias.length === 0) return <EmptyVivencias alunoId={alunoId} role={role} />

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,350px]">
      <main>
        {finalized ? (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <Lock className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">{t('labels.relatorio-finalizado')}</AlertTitle>
            <AlertDescription className="text-green-700">
              {t('ui.este-relatorio-foi-finalizado-e-nao-pode-mais-ser-editado')}
            </AlertDescription>
          </Alert>
        ) : null}
        <DevelopmentReportWriter
          studentName={studentName}
          semesterLabel={semesterLabel}
          initialValues={initialValues}
          onSave={canWrite ? onSave : undefined}
          onFinalize={canWrite ? onFinalize : undefined}
          onCampoFocus={onCampoFocus}
          vivencias={vivencias}
          isLoading={isSaving}
          disabled={finalized || !canWrite}
        />
      </main>
      <aside className="hidden lg:block">
        <div className="sticky top-[165px]">
          <div className="h-[calc(100vh-200px)] overflow-hidden rounded-xl border border-gray-200">
            <VivenciasReference
              vivencias={vivencias}
              selectedCampo={selectedCampo}
              onFilterChange={onFilterChange}
            />
          </div>
        </div>
      </aside>
    </div>
  )
}

function FinalizeDialog({ open, loading, onOpenChange, onConfirm }: {
  open: boolean
  loading: boolean
  onOpenChange(open: boolean): void
  onConfirm(): Promise<void>
}) {
  const t = useTranslations('registry')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('labels.finalizar-relatorio')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('ui.ao-finalizar-o-relatorio-nao-podera-mais-ser-editado-tem-certeza-que-des')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('labels.cancelar')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void onConfirm()}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalizando...</>
            ) : 'Finalizar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function RelatorioPage() {
  const t = useTranslations('registry')
  const { id: alunoId } = useParams<{ id: string }>()
  const router = useRouter()
  const { userProfile } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [vivencias, setVivencias] = useState<Vivencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<SemestreType>(getCurrentSemester())
  const [selectedYear] = useState(getCurrentYear())
  const [selectedCampo, setSelectedCampo] = useState<CampoType | null>(null)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [matricula, setMatricula] = useState<Matricula | null>(null)
  const [existingReport, setExistingReport] = useState<ExistingReport | null>(null)
  const [isReportFinalized, setIsReportFinalized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)
  const [pendingFinalizeData, setPendingFinalizeData] = useState<ReportFormValues | null>(null)
  const canWriteReport = userProfile?.tipo_usuario === 'professor'

  const loadStudent = useCallback(async () => {
    try {
      const loadedStudent = await fetchStudent(alunoId)
      setStudent(loadedStudent)
      const loadedMatricula = await fetchActiveEnrollment(alunoId)
      if (loadedMatricula) setMatricula(loadedMatricula)
    } catch (caught) {
      logger.error('Error loading student', caught instanceof Error ? caught : String(caught), {
        feature: 'diario-infantil',
        action: 'load_student_relatorio',
        metadata: { alunoId },
      })
      setError(t('ui.erro-ao-carregar-dados-do-aluno'))
    }
  }, [alunoId, t])

  const loadVivencias = useCallback(async () => {
    try {
      setVivencias(await fetchVivencias(alunoId))
    } catch (caught) {
      logger.error('Error loading vivencias', caught instanceof Error ? caught : String(caught), {
        feature: 'diario-infantil',
        action: 'load_vivencias_relatorio',
        metadata: { alunoId },
      })
      toast.error(caught instanceof Error ? caught.message : 'Erro ao carregar vivencias')
    }
  }, [alunoId])

  const loadExistingReport = useCallback(async () => {
    if (!matricula) return
    try {
      const report = await fetchExistingReport(matricula.id, selectedYear, selectedSemester)
      if (report === undefined) return
      setExistingReport(report)
      setIsReportFinalized(report?.status === 'finalizado')
    } catch (caught) {
      logger.error('Error in loadExistingReport', caught instanceof Error ? caught : String(caught), {
        feature: 'relatorios-descritivos',
        action: 'load_existing_report_exception',
      })
    }
  }, [matricula, selectedSemester, selectedYear])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadStudent(), loadVivencias()])
      setLoading(false)
    }
    void load()
  }, [loadStudent, loadVivencias])

  useEffect(() => {
    void loadExistingReport()
  }, [loadExistingReport])

  const handleSaveDraft = useCallback(async (data: ReportFormValues) => {
    if (!matricula || !userProfile) {
      toast.error(t('ui.erro-dados-da-matricula-nao-encontrados'))
      return
    }
    setIsSaving(true)
    try {
      const newReport = await saveDraft(
        data,
        matricula,
        userProfile.id,
        selectedYear,
        selectedSemester,
        existingReport,
      )
      if (newReport) setExistingReport(newReport)
      logger.info('Draft saved successfully', {
        feature: 'relatorios-descritivos',
        action: 'save_draft',
        metadata: { alunoId, matriculaId: matricula.id, semestre: selectedSemester },
      })
      toast.success(t('ui.rascunho-salvo-com-sucesso'))
    } catch (caught) {
      logger.error('Error saving draft', caught instanceof Error ? caught : String(caught), {
        feature: 'relatorios-descritivos',
        action: 'save_draft_error',
        metadata: { alunoId },
      })
      toast.error(t('ui.erro-ao-salvar-rascunho'))
    } finally {
      setIsSaving(false)
    }
  }, [alunoId, existingReport, matricula, selectedSemester, selectedYear, t, userProfile])

  const handleFinalizeConfirm = useCallback(async () => {
    if (!pendingFinalizeData || !matricula || !userProfile) {
      toast.error(t('ui.erro-dados-incompletos-para-finalizacao'))
      return
    }
    setIsSaving(true)
    try {
      const report = await finalizeReport(
        pendingFinalizeData,
        matricula,
        userProfile.id,
        selectedYear,
        selectedSemester,
        existingReport,
      )
      setExistingReport(report)
      setIsReportFinalized(true)
      logger.info('Report finalized successfully', {
        feature: 'relatorios-descritivos',
        action: 'finalize_report',
        metadata: { alunoId, matriculaId: matricula.id, semestre: selectedSemester },
      })
      toast.success(t('ui.relatorio-finalizado-com-sucesso'))
    } catch (caught) {
      logger.error('Error finalizing report', caught instanceof Error ? caught : String(caught), {
        feature: 'relatorios-descritivos',
        action: 'finalize_report_error',
        metadata: { alunoId },
      })
      toast.error(t('ui.erro-ao-finalizar-relatorio'))
    } finally {
      setIsSaving(false)
      setShowFinalizeDialog(false)
      setPendingFinalizeData(null)
    }
  }, [alunoId, existingReport, matricula, pendingFinalizeData, selectedSemester, selectedYear, t, userProfile])

  const initialValues = useMemo(() => getInitialValues(existingReport), [existingReport])
  const handleFinalizeRequest = useCallback(async (data: ReportFormValues) => {
    setPendingFinalizeData(data)
    setShowFinalizeDialog(true)
  }, [])
  const handlePrint = useCallback(() => {
    toast.info(t('ui.exportacao-pdf-sera-implementada-em-breve'))
  }, [t])

  if (loading) return <ReportLoading />
  if (error || !student) {
    return <ReportError message={error || t('ui.aluno-nao-encontrado')} onBack={() => router.back()} />
  }

  return (
    <div className="min-h-screen">
      <ReportHeader
        alunoId={alunoId}
        studentName={student.nome_completo}
        semester={selectedSemester}
        mobileSheetOpen={mobileSheetOpen}
        vivencias={vivencias}
        selectedCampo={selectedCampo}
        onMobileSheetChange={setMobileSheetOpen}
        onSemesterChange={setSelectedSemester}
        onFilterChange={setSelectedCampo}
        onPrint={handlePrint}
      />
      <div className="p-4">
        <ReportContent
          alunoId={alunoId}
          studentName={student.nome_completo}
          semesterLabel={formatSemesterLabel(selectedSemester, selectedYear)}
          vivencias={vivencias}
          selectedCampo={selectedCampo}
          finalized={isReportFinalized}
          canWrite={canWriteReport}
          isSaving={isSaving}
          role={userProfile?.tipo_usuario}
          initialValues={initialValues}
          onSave={handleSaveDraft}
          onFinalize={handleFinalizeRequest}
          onCampoFocus={setSelectedCampo}
          onFilterChange={setSelectedCampo}
        />
      </div>
      <FinalizeDialog
        open={showFinalizeDialog}
        loading={isSaving}
        onOpenChange={setShowFinalizeDialog}
        onConfirm={handleFinalizeConfirm}
      />
    </div>
  )
}
