'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  GraduationCap,
  PenLine,
  Plus,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { DescriptiveReportForm } from '@/components/reports/DescriptiveReportForm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useClassroomTranslations } from '@/i18n/classroom'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { transformFormDataToInput } from '@/lib/validation/descriptive-report'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import {
  type DescriptiveReportDetailed,
  type SemestreType,
  SEMESTER_CONFIG,
  formatSemester,
  getCurrentAcademicYear,
  getCurrentSemester,
} from '@/types/descriptive-report'

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

interface ReportsListProps {
  reports: DescriptiveReportDetailed[]
  emissionEnabled: boolean
  emittingReportId: string | null
  onEmit(reportId: string): Promise<void>
  onOpen(report: DescriptiveReportDetailed): void
}

interface ReportDialogProps {
  open: boolean
  creating: boolean
  loading: boolean
  report: DescriptiveReportDetailed | null
  student: StudentInfo
  semester: SemestreType
  year: number
  onOpenChange(open: boolean): void
  onSemesterChange(semester: SemestreType): void
  onYearChange(year: number): void
  onSave(data: ReportFormInput): Promise<void>
  onFinalize(data: ReportFormInput): Promise<void>
}

type ReportFormInput = ReturnType<typeof transformFormDataToInput>

const reportRowSchema = z.object({
  id: z.string(),
  matricula_id: z.string(),
  turma_id: z.string(),
  professor_id: z.string(),
  ano_letivo: z.number(),
  semestre: z.enum(['primeiro', 'segundo']),
  status: z.enum(['rascunho', 'finalizado']),
  campo_eu_outro_nos: z.string().nullable(),
  campo_corpo_gestos: z.string().nullable(),
  campo_tracos_sons: z.string().nullable(),
  campo_escuta_fala: z.string().nullable(),
  campo_espacos_tempos: z.string().nullable(),
  observacoes_gerais: z.string().nullable(),
  finalizado_em: z.string().nullable(),
  finalizado_por: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().nullable(),
  professor: z.object({ nome: z.string() }).nullable(),
})

const pdfErrorSchema = z.object({ error: z.string().optional() })
type ReportRow = z.infer<typeof reportRowSchema>

function getDescriptiveReportEmissionMessage(code: string | null): string {
  if (code === 'DESCRIPTIVE_REPORT_CONTENT_EMPTY') {
    return 'Não há conteúdo ministrado registrado no período deste relatório. Registre o conteúdo da aula antes de emitir o PDF.'
  }
  if (code === 'DESCRIPTIVE_REPORT_NOT_FINALIZED') {
    return 'Finalize o relatório antes de emitir o PDF.'
  }
  return 'Não foi possível emitir o PDF agora. Tente novamente.'
}

function parseSemester(value: string): SemestreType | null {
  const result = z.enum(['primeiro', 'segundo']).safeParse(value)
  return result.success ? result.data : null
}

function countFilledFields(report: ReportRow): number {
  return [
    report.campo_eu_outro_nos,
    report.campo_corpo_gestos,
    report.campo_tracos_sons,
    report.campo_escuta_fala,
    report.campo_espacos_tempos,
  ].filter((field) => field && field.trim().length >= 50).length
}

function toDetailedReport(
  report: ReportRow,
  student: StudentInfo,
): DescriptiveReportDetailed {
  return {
    id: report.id,
    matricula_id: report.matricula_id,
    turma_id: report.turma_id,
    professor_id: report.professor_id,
    ano_letivo: report.ano_letivo,
    semestre: report.semestre,
    status: report.status,
    campo_eu_outro_nos: report.campo_eu_outro_nos,
    campo_corpo_gestos: report.campo_corpo_gestos,
    campo_tracos_sons: report.campo_tracos_sons,
    campo_escuta_fala: report.campo_escuta_fala,
    campo_espacos_tempos: report.campo_espacos_tempos,
    observacoes_gerais: report.observacoes_gerais,
    finalizado_em: report.finalizado_em,
    finalizado_por: report.finalizado_por,
    created_at: report.created_at,
    updated_at: report.updated_at,
    created_by: report.created_by,
    aluno_id: student.id,
    aluno_nome: student.nome_completo,
    aluno_nascimento: student.data_nascimento,
    turma_nome: student.turma_nome,
    turma_serie: student.turma_serie,
    escola_id: student.turma_id,
    escola_nome: student.escola_nome,
    professor_nome: report.professor?.nome ?? 'Desconhecido',
    campos_preenchidos: countFilledFields(report),
    total_campos: 5,
  }
}

async function fetchStudentInfo(alunoId: string): Promise<StudentInfo> {
  const { data, error } = await supabase
    .from('matriculas')
    .select(`
      id,
      turma_id,
      aluno:alunos!inner(id, nome_completo, data_nascimento),
      turma:turmas!inner(id, nome, serie, escola:escolas!inner(nome))
    `)
    .eq('aluno.id', alunoId)
    .eq('situacao', 'ativa')
    .single()

  if (error) throw new Error('Aluno não encontrado ou sem matrícula ativa')

  return {
    id: data.aluno.id,
    nome_completo: data.aluno.nome_completo,
    data_nascimento: data.aluno.data_nascimento,
    matricula_id: data.id,
    turma_id: data.turma.id,
    turma_nome: data.turma.nome,
    turma_serie: data.turma.serie,
    escola_nome: data.turma.escola.nome,
  }
}

async function fetchReports(student: StudentInfo): Promise<DescriptiveReportDetailed[]> {
  const { data, error } = await supabase
    .from('relatorios_descritivos')
    .select(`
      id,
      matricula_id,
      turma_id,
      professor_id,
      ano_letivo,
      semestre,
      status,
      campo_eu_outro_nos,
      campo_corpo_gestos,
      campo_tracos_sons,
      campo_escuta_fala,
      campo_espacos_tempos,
      observacoes_gerais,
      finalizado_em,
      finalizado_por,
      created_at,
      updated_at,
      created_by,
      professor:users!relatorios_descritivos_professor_id_fkey(nome)
    `)
    .eq('matricula_id', student.matricula_id)
    .order('ano_letivo', { ascending: false })
    .order('semestre', { ascending: false })

  if (!error) {
    return data.map((report) => toDetailedReport(reportRowSchema.parse(report), student))
  }

  logger.warn('Error fetching reports', {
    feature: 'relatorios-descritivos',
    action: 'fetch_reports',
    metadata: { error: error.message },
  })
  return []
}

async function insertReport(payload: TablesInsert<'relatorios_descritivos'>): Promise<void> {
  const { error } = await supabase.from('relatorios_descritivos').insert(payload)
  if (error) throw error
}

async function updateReport(
  reportId: string,
  payload: TablesUpdate<'relatorios_descritivos'>,
): Promise<void> {
  const { error } = await supabase.from('relatorios_descritivos').update(payload).eq('id', reportId)
  if (error) throw error
}

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Usuario nao autenticado')
  return data.user.id
}

async function saveDraft(
  student: StudentInfo,
  selectedReport: DescriptiveReportDetailed | null,
  creating: boolean,
  year: number,
  semester: SemestreType,
  data: ReportFormInput,
): Promise<void> {
  if (creating) {
    const userId = await getCurrentUserId()
    const payload: TablesInsert<'relatorios_descritivos'> = {
      matricula_id: student.matricula_id,
      turma_id: student.turma_id,
      professor_id: userId,
      ano_letivo: year,
      semestre: semester,
      status: 'rascunho',
      ...data,
      created_by: userId,
    }
    await insertReport(payload)
    return
  }

  if (!selectedReport) return
  const payload: TablesUpdate<'relatorios_descritivos'> = {
    ...data,
  }
  await updateReport(selectedReport.id, payload)
}

async function finalizeReport(
  student: StudentInfo,
  selectedReport: DescriptiveReportDetailed | null,
  creating: boolean,
  year: number,
  semester: SemestreType,
  data: ReportFormInput,
): Promise<void> {
  if (creating) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Usuario nao autenticado')
    const payload: TablesInsert<'relatorios_descritivos'> = {
      matricula_id: student.matricula_id,
      turma_id: student.turma_id,
      professor_id: userData.user.id,
      ano_letivo: year,
      semestre: semester,
      status: 'finalizado',
      ...data,
      finalizado_em: new Date().toISOString(),
      finalizado_por: userData.user.id,
      created_by: userData.user.id,
    }
    await insertReport(payload)
    return
  }

  if (!selectedReport) return
  const { data: userData } = await supabase.auth.getUser()
  const payload: TablesUpdate<'relatorios_descritivos'> = {
    ...data,
    status: 'finalizado',
    finalizado_em: new Date().toISOString(),
    finalizado_por: userData.user?.id,
  }
  await updateReport(selectedReport.id, payload)
}

async function readPdfErrorCode(response: Response): Promise<string | null> {
  const result = pdfErrorSchema.safeParse(await response.json().catch(() => null))
  return result.success ? result.data.error ?? null : null
}

function downloadPdf(response: Response, pdf: Blob): void {
  const filename = response.headers
    .get('content-disposition')
    ?.match(/filename="([^"]+)"/)?.[1] ?? 'relatorio-descritivo.pdf'
  const objectUrl = URL.createObjectURL(pdf)
  const download = document.createElement('a')
  download.href = objectUrl
  download.download = filename
  download.click()
  requestAnimationFrame(() => URL.revokeObjectURL(objectUrl))
}

function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()

  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years === 0) return `${months} meses`
  return `${years} ano${years > 1 ? 's' : ''} e ${months} mês${months !== 1 ? 'es' : ''}`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getReportDate(report: DescriptiveReportDetailed): string {
  return report.status === 'finalizado' && report.finalizado_em
    ? `Finalizado em ${formatDate(report.finalizado_em)}`
    : `Atualizado em ${formatDate(report.updated_at)}`
}

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
        <Skeleton className="mt-4 h-2 w-full" />
      </CardContent>
    </Card>
  )
}

function ReportsLoading() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
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

function ReportsError({ message, backLabel, onBack }: {
  message: string
  backLabel: string
  onBack(): void
}) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button variant="outline" className="mt-4" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {backLabel}
      </Button>
    </div>
  )
}

function ReportsNotFound({ title, backLabel, onBack }: {
  title: string
  backLabel: string
  onBack(): void
}) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          Nao foi possivel encontrar o aluno ou o aluno nao possui matricula ativa.
        </AlertDescription>
      </Alert>
      <Button variant="outline" className="mt-4" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {backLabel}
      </Button>
    </div>
  )
}

function StudentHeader({ student, onBack, onCreate }: {
  student: StudentInfo
  onBack(): void
  onCreate(): void
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <User className="h-6 w-6 text-purple-600" />
            {student.nome_completo}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              {student.turma_nome} - {student.turma_serie}
            </span>
            <span>|</span>
            <span>{student.escola_nome}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(student.data_nascimento)} ({calculateAge(student.data_nascimento)})</span>
          </div>
        </div>
      </div>
      <Button onClick={onCreate} className="self-start bg-purple-600 hover:bg-purple-700">
        <Plus className="mr-2 h-4 w-4" />
        Novo Relatorio
      </Button>
    </div>
  )
}

function ReportStatusBadge({ finalized }: { finalized: boolean }) {
  const t = useClassroomTranslations()
  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1',
        finalized
          ? 'border-green-300 bg-green-50 text-green-700'
          : 'border-yellow-300 bg-yellow-50 text-yellow-700',
      )}
    >
      {finalized ? <CheckCircle className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
      {finalized ? t('status.finalized') : t('status.draft')}
    </Badge>
  )
}

function ReportCard({ report, emissionEnabled, emitting, onEmit, onOpen }: {
  report: DescriptiveReportDetailed
  emissionEnabled: boolean
  emitting: boolean
  onEmit(reportId: string): Promise<void>
  onOpen(report: DescriptiveReportDetailed): void
}) {
  const t = useClassroomTranslations()
  const finalized = report.status === 'finalizado'
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        finalized
          ? 'border-green-200 hover:border-green-300'
          : 'border-yellow-200 hover:border-yellow-300',
      )}
      onClick={() => onOpen(report)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatSemester(report.semestre, report.ano_letivo)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{getReportDate(report)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:justify-end">
            {emissionEnabled && finalized ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={emitting}
                onClick={(event) => {
                  event.stopPropagation()
                  void onEmit(report.id)
                }}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                {emitting ? 'Emitindo PDF...' : 'Emitir PDF'}
              </Button>
            ) : null}
            <ReportStatusBadge finalized={finalized} />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('reports.progress')}</span>
            <span>{report.campos_preenchidos} de {report.total_campos} campos</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn('h-full transition-all', finalized ? 'bg-green-500' : 'bg-purple-500')}
              style={{ width: `${(report.campos_preenchidos / report.total_campos) * 100}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground">
          {finalized ? <Eye className="mr-1 h-3 w-3" /> : <Edit className="mr-1 h-3 w-3" />}
          {finalized ? t('reports.clickView') : t('reports.clickEdit')}
        </div>
      </CardContent>
    </Card>
  )
}

function ReportsList({ reports, emissionEnabled, emittingReportId, onEmit, onOpen }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-center text-muted-foreground">
            Nenhum relatorio encontrado para este aluno.
            <br />
            Clique em &quot;Novo Relatorio&quot; para criar o primeiro.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          emissionEnabled={emissionEnabled}
          emitting={emittingReportId === report.id}
          onEmit={onEmit}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

function getDialogTitle(creating: boolean, report: DescriptiveReportDetailed | null): string {
  if (creating) return 'Novo Relatorio Descritivo'
  return report?.status === 'finalizado' ? 'Visualizar Relatorio' : 'Editar Relatorio'
}

function getDialogPeriod(
  creating: boolean,
  report: DescriptiveReportDetailed | null,
  semester: SemestreType,
  year: number,
): string {
  if (creating) return formatSemester(semester, year)
  return report ? formatSemester(report.semestre, report.ano_letivo) : ''
}

function NewReportPeriodSelector({ semester, year, onSemesterChange, onYearChange }: {
  semester: SemestreType
  year: number
  onSemesterChange(semester: SemestreType): void
  onYearChange(year: number): void
}) {
  const t = useClassroomTranslations()
  return (
    <div className="flex items-center gap-4 border-b py-4">
      <div className="flex-1">
        <label className="text-sm font-medium">{t('labels.year')}</label>
        <Select value={year.toString()} onValueChange={(value) => onYearChange(Number.parseInt(value))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[getCurrentAcademicYear() - 1, getCurrentAcademicYear()].map((option) => (
              <SelectItem key={option} value={option.toString()}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <label className="text-sm font-medium">{t('labels.semester')}</label>
        <Select
          value={semester}
          onValueChange={(value) => {
            const parsed = parseSemester(value)
            if (parsed) onSemesterChange(parsed)
          }}
        >
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="primeiro">{SEMESTER_CONFIG.primeiro.label}</SelectItem>
            <SelectItem value="segundo">{SEMESTER_CONFIG.segundo.label}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ReportDialog({
  open,
  creating,
  loading,
  report,
  student,
  semester,
  year,
  onOpenChange,
  onSemesterChange,
  onYearChange,
  onSave,
  onFinalize,
}: ReportDialogProps) {
  const title = getDialogTitle(creating, report)
  const period = getDialogPeriod(creating, report, semester, year)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{period ? `${student.nome_completo} - ${period}` : ''}</DialogDescription>
        </DialogHeader>
        {creating ? (
          <NewReportPeriodSelector
            semester={semester}
            year={year}
            onSemesterChange={onSemesterChange}
            onYearChange={onYearChange}
          />
        ) : null}
        <DescriptiveReportForm
          reportId={report?.id}
          studentName={student.nome_completo}
          semesterLabel={period}
          initialValues={report ?? undefined}
          status={report?.status ?? 'rascunho'}
          onSaveDraft={onSave}
          onFinalize={onFinalize}
          onCancel={() => onOpenChange(false)}
          isLoading={loading}
        />
      </DialogContent>
    </Dialog>
  )
}

export default function StudentReportsPage() {
  const t = useClassroomTranslations()
  const { alunoId } = useParams<{ alunoId: string }>()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [reports, setReports] = useState<DescriptiveReportDetailed[]>([])
  const [selectedReport, setSelectedReport] = useState<DescriptiveReportDetailed | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newReportSemester, setNewReportSemester] = useState<SemestreType>(getCurrentSemester())
  const [newReportYear, setNewReportYear] = useState(getCurrentAcademicYear())
  const [isSaving, setIsSaving] = useState(false)
  const [emittingReportId, setEmittingReportId] = useState<string | null>(null)
  const [emissionError, setEmissionError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const emissionEnabled = process.env.NEXT_PUBLIC_PILOT_DESCRIPTIVE_REPORT_DEMO === 'true'

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const student = await fetchStudentInfo(alunoId)
      setStudentInfo(student)
      setReports(await fetchReports(student))
    } catch (caught) {
      logger.error('Error fetching data', caught instanceof Error ? caught : String(caught), {
        feature: 'relatorios-descritivos',
        action: 'fetch_data',
        metadata: { alunoId },
      })
      setError(caught instanceof Error ? caught.message : 'Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }, [alunoId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleCreateNew = useCallback(() => {
    const year = getCurrentAcademicYear()
    const semester = getCurrentSemester()
    if (reports.some((report) => report.ano_letivo === year && report.semestre === semester)) {
      toast.error(`Já existe um relatório para ${formatSemester(semester, year)}`)
      return
    }
    setNewReportYear(year)
    setNewReportSemester(semester)
    setIsCreatingNew(true)
    setSelectedReport(null)
    setIsFormOpen(true)
  }, [reports])

  const handleOpenReport = useCallback((report: DescriptiveReportDetailed) => {
    setSelectedReport(report)
    setIsCreatingNew(false)
    setIsFormOpen(true)
  }, [])

  const handleSaveDraft = useCallback(async (data: ReportFormInput) => {
    if (!studentInfo) return
    setIsSaving(true)
    try {
      await saveDraft(studentInfo, selectedReport, isCreatingNew, newReportYear, newReportSemester, data)
      if (isCreatingNew) setIsCreatingNew(false)
      await fetchData()
    } catch (caught) {
      logger.error('Error saving draft', caught instanceof Error ? caught : String(caught), {
        feature: 'relatorios-descritivos',
        action: 'save_draft',
        metadata: { alunoId, isCreatingNew },
      })
      throw caught
    } finally {
      setIsSaving(false)
    }
  }, [alunoId, fetchData, isCreatingNew, newReportSemester, newReportYear, selectedReport, studentInfo])

  const handleFinalize = useCallback(async (data: ReportFormInput) => {
    if (!studentInfo) return
    setIsSaving(true)
    try {
      await finalizeReport(studentInfo, selectedReport, isCreatingNew, newReportYear, newReportSemester, data)
      setIsFormOpen(false)
      await fetchData()
    } catch (caught) {
      logger.error('Error finalizing report', caught instanceof Error ? caught : String(caught), {
        feature: 'relatorios-descritivos',
        action: 'finalize_report',
        metadata: { alunoId, isCreatingNew, selectedReportId: selectedReport?.id },
      })
      throw caught
    } finally {
      setIsSaving(false)
    }
  }, [alunoId, fetchData, isCreatingNew, newReportSemester, newReportYear, selectedReport, studentInfo])

  const handleEmitPdf = useCallback(async (reportId: string) => {
    setEmittingReportId(reportId)
    setEmissionError(null)
    try {
      const response = await fetch(`/api/pilot/descriptive-reports/${reportId}/pdf`)
      if (!response.ok) {
        const message = getDescriptiveReportEmissionMessage(await readPdfErrorCode(response))
        setEmissionError(message)
        toast.error(message)
        return
      }
      const pdf = await response.blob()
      if (pdf.size === 0) throw new Error('DESCRIPTIVE_REPORT_PDF_EMPTY: generated PDF was empty')
      downloadPdf(response, pdf)
      toast.success('PDF emitido com sucesso')
    } catch (caught) {
      logger.error('Error emitting descriptive report PDF', caught instanceof Error ? caught : String(caught), {
        feature: 'relatorios-descritivos',
        action: 'emit_pdf',
        metadata: { reportId },
      })
      const message = 'Não foi possível emitir o PDF agora. Tente novamente.'
      setEmissionError(message)
      toast.error(message)
    } finally {
      setEmittingReportId(null)
    }
  }, [])

  if (isLoading) return <ReportsLoading />
  if (error) {
    return <ReportsError message={error} backLabel={t('actions.back')} onBack={() => router.back()} />
  }
  if (!studentInfo) {
    return (
      <ReportsNotFound
        title={t('reports.studentNotFound')}
        backLabel={t('actions.back')}
        onBack={() => router.back()}
      />
    )
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <StudentHeader student={studentInfo} onBack={() => router.back()} onCreate={handleCreateNew} />
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Relatorios Descritivos
        </h2>
        {emissionError ? (
          <Alert variant="destructive" data-testid="descriptive-report-emission-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('reports.pdfNotIssued')}</AlertTitle>
            <AlertDescription>{emissionError}</AlertDescription>
          </Alert>
        ) : null}
        <ReportsList
          reports={reports}
          emissionEnabled={emissionEnabled}
          emittingReportId={emittingReportId}
          onEmit={handleEmitPdf}
          onOpen={handleOpenReport}
        />
      </div>
      <ReportDialog
        open={isFormOpen}
        creating={isCreatingNew}
        loading={isSaving}
        report={selectedReport}
        student={studentInfo}
        semester={newReportSemester}
        year={newReportYear}
        onOpenChange={setIsFormOpen}
        onSemesterChange={setNewReportSemester}
        onYearChange={setNewReportYear}
        onSave={handleSaveDraft}
        onFinalize={handleFinalize}
      />
    </div>
  )
}
