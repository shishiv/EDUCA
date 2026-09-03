/**
 * Student Report Card Page (Boletim Individual)
 * Task Group 3.3.3: Pagina de Boletim Individual
 *
 * This page displays the student's report card, automatically
 * detecting the education level (Infantil vs Fundamental) and
 * rendering the appropriate component.
 *
 * Features:
 * - Auto-detection of education level
 * - Print/PDF functionality
 * - Navigation back to student details
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 * @see components/reports/StudentReport.tsx
 * @see components/reports/StudentReportInfantil.tsx
 */

'use client'
import { useTranslations } from 'next-intl'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  GraduationCap,
  AlertTriangle,
  Baby,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { loadCanonicalAttendanceSummaries } from '@/lib/api/canonical-attendance-facts'
import {
  createPDFDocument,
  addPDFHeader,
  addPDFTable,
  addPDFFooter,
  savePDF,
} from '@/lib/export/pdf-utils'

import {
  StudentReport,
  type DisciplineGrade,
  type AttendanceSummary,
} from '@/components/reports/StudentReport'

import {
  StudentReportInfantil,
  type ReportSummary,
} from '@/components/reports/StudentReportInfantil'

import { type EducationLevel } from '@/types/lesson-content'
import { type SemestreType, type ReportStatus } from '@/types/descriptive-report'

// ============================================================================
// TYPES
// ============================================================================

interface StudentData {
  id: string
  nome_completo: string
  data_nascimento: string
  matricula?: {
    id: string
    turma_id: string
    turma: {
      id: string
      nome: string
      serie: string
      etapa_ensino?: string | null
      escola: {
        nome: string
      }
    }
    ano_letivo: number
  }
}

interface GradeData {
  disciplina: string
  bimestre: number
  nota: number
}

interface DescriptiveReportData {
  id: string
  semestre: SemestreType
  ano_letivo: number
  status: ReportStatus
  campo_eu_outro_nos: string | null
  campo_corpo_gestos: string | null
  campo_tracos_sons: string | null
  campo_escuta_fala: string | null
  campo_espacos_tempos: string | null
  observacoes_gerais: string | null
  finalizado_em: string | null
  professor?: {
    nome: string
  }
}

interface AttendanceData {
  total_aulas: number
  presencas: number
  faltas: number
  atestados: number
}

interface StudentEnrollmentData {
  id: string
  turma_id: string
  ano_letivo: number
  turmas: {
    id: string
    nome: string
    serie: string
    etapa_ensino: string | null
    escolas: { nome: string }
  }
}

interface StudentQueryData {
  id: string
  nome_completo: string
  data_nascimento: string
  matriculas: StudentEnrollmentData[]
}

interface ReportCardLoadData {
  student: StudentData
  educationLevel: EducationLevel
}

interface EducationRecords {
  grades?: DisciplineGrade[]
  descriptiveReports?: ReportSummary[]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect education level from turma serie
 */
function detectEducationLevel(serie: string | null | undefined): EducationLevel {
  if (!serie) return 'fundamental'

  const serieLower = serie.toLowerCase()

  // Check for Infantil patterns
  if (
    serieLower.includes('infantil') ||
    serieLower.includes('creche') ||
    serieLower.includes('bercario') ||
    serieLower.includes('maternal') ||
    serieLower.includes('pre') ||
    serieLower.includes('jardim')
  ) {
    return 'infantil'
  }

  // Check for explicit etapa_ensino
  if (serieLower.includes('ei') || serieLower === 'educacao infantil') {
    return 'infantil'
  }

  // Default to Fundamental
  return 'fundamental'
}

/**
 * Transform grades data to DisciplineGrade format
 */
function transformGradesToDisciplineGrades(grades: GradeData[]): DisciplineGrade[] {
  // Group by discipline
  const byDiscipline = grades.reduce((acc, grade) => {
    if (!acc[grade.disciplina]) {
      acc[grade.disciplina] = {
        disciplina: grade.disciplina,
        bimestre1: null,
        bimestre2: null,
        bimestre3: null,
        bimestre4: null,
        media: null,
      }
    }

    switch (grade.bimestre) {
      case 1:
        acc[grade.disciplina].bimestre1 = grade.nota
        break
      case 2:
        acc[grade.disciplina].bimestre2 = grade.nota
        break
      case 3:
        acc[grade.disciplina].bimestre3 = grade.nota
        break
      case 4:
        acc[grade.disciplina].bimestre4 = grade.nota
        break
    }

    return acc
  }, {} as Record<string, DisciplineGrade>)

  // Calculate averages
  return Object.values(byDiscipline).map((dg) => {
    const gradesArray = [dg.bimestre1, dg.bimestre2, dg.bimestre3, dg.bimestre4].filter(
      (g): g is number => g !== null
    )

    if (gradesArray.length > 0) {
      dg.media = Math.round((gradesArray.reduce((a, b) => a + b, 0) / gradesArray.length) * 10) / 10
    }

    return dg
  })
}

/**
 * Transform descriptive reports to ReportSummary format
 */
function transformDescriptiveReports(reports: DescriptiveReportData[]): ReportSummary[] {
  return reports.map((report) => ({
    id: report.id,
    semestre: report.semestre,
    anoLetivo: report.ano_letivo,
    status: report.status,
    professorNome: report.professor?.nome,
    finalizadoEm: report.finalizado_em || undefined,
    campoEuOutroNos: report.campo_eu_outro_nos,
    campoCorpoGestos: report.campo_corpo_gestos,
    campoTracosSons: report.campo_tracos_sons,
    campoEscutaFala: report.campo_escuta_fala,
    campoEspacosTempos: report.campo_espacos_tempos,
    observacoesGerais: report.observacoes_gerais,
  }))
}

/**
 * Calculate attendance summary from data
 */
function calculateAttendanceSummary(attendance: AttendanceData): AttendanceSummary {
  const { total_aulas, presencas, faltas, atestados } = attendance
  const percentual = total_aulas > 0 ? (presencas / total_aulas) * 100 : 0

  return {
    totalAulas: total_aulas,
    presencas,
    faltas,
    atestados,
    percentual: Math.round(percentual * 10) / 10,
  }
}

function mapStudentData(data: StudentQueryData): ReportCardLoadData {
  const matricula = data.matriculas[0]
  const turma = matricula?.turmas
  const escola = turma?.escolas
  return {
    student: {
      id: data.id,
      nome_completo: data.nome_completo,
      data_nascimento: data.data_nascimento,
      matricula: matricula
        ? {
            id: matricula.id,
            turma_id: matricula.turma_id,
            ano_letivo: matricula.ano_letivo,
            turma: {
              id: turma?.id || '',
              nome: turma?.nome || '',
              serie: turma?.serie || '',
              etapa_ensino: turma?.etapa_ensino,
              escola: { nome: escola?.nome || '' },
            },
          }
        : undefined,
    },
    educationLevel: detectEducationLevel(turma?.serie || turma?.etapa_ensino),
  }
}

async function loadStudentData(studentId: string): Promise<ReportCardLoadData | null> {
  const { data, error } = await supabase
    .from('alunos')
    .select(`
      id,
      nome_completo,
      data_nascimento,
      matriculas!inner (
        id,
        turma_id,
        ano_letivo,
        turmas!inner (
          id,
          nome,
          serie,
          etapa_ensino,
          escolas!inner (
            nome
          )
        )
      )
    `)
    .eq('id', studentId)
    .eq('matriculas.situacao', 'ativa')
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw error
  return mapStudentData(data)
}

async function loadGrades(matriculaId: string): Promise<DisciplineGrade[] | undefined> {
  const { data, error } = await supabase
    .from('notas')
    .select('disciplina, bimestre, nota')
    .eq('matricula_id', matriculaId)
    .order('disciplina')
    .order('bimestre')

  if (error) {
    logger.warn('Error fetching grades', {
      feature: 'boletim',
      action: 'fetch_grades_failed',
      metadata: { error: error.message },
    })
    return undefined
  }
  return data ? transformGradesToDisciplineGrades(data) : undefined
}

async function loadDescriptiveReports(matriculaId: string): Promise<ReportSummary[] | undefined> {
  try {
    const { data, error } = await supabase
      .from('relatorios_descritivos')
      .select(`
        id,
        semestre,
        ano_letivo,
        status,
        campo_eu_outro_nos,
        campo_corpo_gestos,
        campo_tracos_sons,
        campo_escuta_fala,
        campo_espacos_tempos,
        observacoes_gerais,
        finalizado_em,
        professor:users!relatorios_descritivos_professor_id_fkey (
          nome
        )
      `)
      .eq('matricula_id', matriculaId)
      .order('ano_letivo', { ascending: false })
      .order('semestre')

    if (error || !data) return undefined
    return transformDescriptiveReports(
      data.map((report) => ({
        ...report,
        semestre: report.semestre as SemestreType,
        status: report.status as ReportStatus,
        professor: report.professor ?? undefined,
      })),
    )
  } catch {
    logger.warn('Unable to load descriptive reports', {
      feature: 'boletim',
      action: 'fetch_reports_skipped',
    })
    return undefined
  }
}

async function loadEducationRecords(data: ReportCardLoadData): Promise<EducationRecords> {
  const matriculaId = data.student.matricula?.id
  if (!matriculaId) return {}
  if (data.educationLevel === 'fundamental') {
    return { grades: await loadGrades(matriculaId) }
  }
  return { descriptiveReports: await loadDescriptiveReports(matriculaId) }
}

async function loadStudentAttendance(matricula: StudentData['matricula']): Promise<AttendanceSummary | null> {
  if (!matricula?.turma_id) return null
  const summary = (await loadCanonicalAttendanceSummaries(supabase, [matricula.id])).get(matricula.id)
  if (!summary) return null
  return calculateAttendanceSummary({
    total_aulas: summary.total,
    presencas: summary.presencas,
    faltas: summary.faltas,
    atestados: summary.atestados,
  })
}

type PDFDocument = ReturnType<typeof createPDFDocument>

function addStudentPDFInfo(doc: PDFDocument, student: StudentData, currentY: number, studentLabel: string) {
  const matricula = student.matricula
  const turma = matricula?.turma
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(studentLabel, 15, currentY)
  currentY += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nome: ${student.nome_completo}`, 15, currentY)
  currentY += 5
  doc.text(`Turma: ${turma?.nome || '-'} | Série: ${turma?.serie || '-'}`, 15, currentY)
  currentY += 5
  doc.text(`Ano Letivo: ${matricula?.ano_letivo || new Date().getFullYear()}`, 15, currentY)
  return currentY + 10
}

function addGradesPDFSection(
  doc: PDFDocument,
  grades: DisciplineGrade[],
  currentY: number,
  disciplineLabel: string,
) {
  const tableEnd = addPDFTable(
    doc,
    {
      title: 'Notas por Disciplina',
      columns: [
        { header: disciplineLabel, dataKey: 'disciplina', halign: 'left' },
        { header: '1o Bim', dataKey: 'bimestre1', halign: 'center', width: 20 },
        { header: '2o Bim', dataKey: 'bimestre2', halign: 'center', width: 20 },
        { header: '3o Bim', dataKey: 'bimestre3', halign: 'center', width: 20 },
        { header: '4o Bim', dataKey: 'bimestre4', halign: 'center', width: 20 },
        { header: 'Media', dataKey: 'media', halign: 'center', width: 20 },
      ],
      rows: grades.map((grade) => ({
        disciplina: grade.disciplina,
        bimestre1: grade.bimestre1 !== null ? grade.bimestre1.toFixed(1) : '-',
        bimestre2: grade.bimestre2 !== null ? grade.bimestre2.toFixed(1) : '-',
        bimestre3: grade.bimestre3 !== null ? grade.bimestre3.toFixed(1) : '-',
        bimestre4: grade.bimestre4 !== null ? grade.bimestre4.toFixed(1) : '-',
        media: grade.media !== null ? grade.media.toFixed(1) : '-',
      })),
    },
    currentY,
  )
  return tableEnd + 10
}

function addDescriptiveReportsPDFSection(
  doc: PDFDocument,
  reports: ReportSummary[],
  currentY: number,
) {
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatorios Descritivos', 15, currentY)
  currentY += 7

  for (const report of reports) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${report.semestre}o Semestre ${report.anoLetivo}`, 15, currentY)
    currentY += 5
    doc.setFont('helvetica', 'normal')
    if (report.observacoesGerais) {
      const lines = doc.splitTextToSize(report.observacoesGerais, 180)
      doc.text(lines, 15, currentY)
      currentY += lines.length * 5 + 5
    }
  }
  return currentY
}

function addEducationPDFSection(
  doc: PDFDocument,
  educationLevel: EducationLevel,
  grades: DisciplineGrade[],
  reports: ReportSummary[],
  currentY: number,
  disciplineLabel: string,
) {
  if (educationLevel === 'fundamental' && grades.length > 0) {
    return addGradesPDFSection(doc, grades, currentY, disciplineLabel)
  }
  if (educationLevel === 'infantil' && reports.length > 0) {
    return addDescriptiveReportsPDFSection(doc, reports, currentY)
  }
  return currentY
}

function addAttendancePDFSection(doc: PDFDocument, attendance: AttendanceSummary | null, currentY: number) {
  if (!attendance) return
  currentY += 5
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Frequência', 15, currentY)
  currentY += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total de Aulas: ${attendance.totalAulas}`, 15, currentY)
  currentY += 5
  doc.text(`Presenças: ${attendance.presencas} | Faltas: ${attendance.faltas}`, 15, currentY)
  currentY += 5
  doc.text(`Percentual de Frequência: ${attendance.percentual}%`, 15, currentY)
}

function buildReportCardPDF(
  student: StudentData,
  educationLevel: EducationLevel,
  grades: DisciplineGrade[],
  reports: ReportSummary[],
  attendance: AttendanceSummary | null,
  studentLabel: string,
  disciplineLabel: string,
) {
  const doc = createPDFDocument('portrait')
  let currentY = addPDFHeader(doc, {
    title: 'Boletim Escolar',
    subtitle: educationLevel === 'infantil'
      ? 'Relatório de Desenvolvimento - Educação Infantil'
      : 'Desempenho Acadêmico - Ensino Fundamental',
    schoolName: student.matricula?.turma.escola.nome || 'Escola Municipal',
  })
  currentY = addStudentPDFInfo(doc, student, currentY, studentLabel)
  currentY = addEducationPDFSection(
    doc,
    educationLevel,
    grades,
    reports,
    currentY,
    disciplineLabel,
  )
  addAttendancePDFSection(doc, attendance, currentY)
  addPDFFooter(doc, { showPageNumbers: true, showGeneratedAt: true })
  return doc
}

function ReportCardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-24" />
        <div className="flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    </div>
  )
}

function ReportCardError({
  studentId,
  error,
  onRetry,
}: {
  studentId: string
  error: string | null
  onRetry: () => void
}) {
  const t = useTranslations('registry')
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/alunos/${studentId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('ui.voltar')}
          </Link>
        </Button>
      </div>
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('labels.erro')}</AlertTitle>
        <AlertDescription>
          {error || 'Não foi possível carregar os dados do aluno.'}
        </AlertDescription>
      </Alert>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar novamente
      </Button>
    </div>
  )
}

function ReportCardHeader({ studentId, educationLevel }: {
  studentId: string
  educationLevel: EducationLevel
}) {
  const t = useTranslations('registry')
  return (
    <div className="flex items-center gap-4 print:hidden">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/alunos/${studentId}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('ui.voltar')}
        </Link>
      </Button>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          {educationLevel === 'infantil' ? (
            <Baby className="h-6 w-6 text-purple-600" />
          ) : (
            <GraduationCap className="h-6 w-6 text-blue-600" />
          )}
          Boletim Escolar
        </h1>
        <p className="text-gray-600">
          {educationLevel === 'infantil'
            ? t('ui.relatorio-de-desenvolvimento-educacao-infantil')
            : t('ui.desempenho-academico-ensino-fundamental')}
        </p>
      </div>
    </div>
  )
}

function getFundamentalStudentInfo(student: StudentData) {
  const matricula = student.matricula
  const turma = matricula?.turma
  return {
    id: student.id,
    nome: student.nome_completo,
    dataNascimento: student.data_nascimento,
    turma: turma?.nome || '',
    serie: turma?.serie || '',
    escola: turma?.escola?.nome || '',
    anoLetivo: matricula?.ano_letivo || new Date().getFullYear(),
  }
}

function getInfantilStudentInfo(student: StudentData) {
  const matricula = student.matricula
  const turma = matricula?.turma
  return {
    id: student.id,
    nome: student.nome_completo,
    dataNascimento: student.data_nascimento,
    turma: turma?.nome || '',
    faixaEtaria: turma?.serie,
    escola: turma?.escola?.nome || '',
    anoLetivo: matricula?.ano_letivo || new Date().getFullYear(),
  }
}

function ReportCardContent({
  studentId,
  student,
  educationLevel,
  grades,
  descriptiveReports,
  attendance,
  printMode,
  onPrint,
  onExportPDF,
}: {
  studentId: string
  student: StudentData
  educationLevel: EducationLevel
  grades: DisciplineGrade[]
  descriptiveReports: ReportSummary[]
  attendance: AttendanceSummary | null
  printMode: boolean
  onPrint: () => void
  onExportPDF: () => void
}) {
  return (
    <div className={cn('space-y-6', printMode && 'print:space-y-4')}>
      <ReportCardHeader studentId={studentId} educationLevel={educationLevel} />
      {educationLevel === 'fundamental' ? (
        <StudentReport
          student={getFundamentalStudentInfo(student)}
          grades={grades}
          attendance={attendance || undefined}
          onPrint={onPrint}
          onExportPDF={onExportPDF}
          printMode={printMode}
        />
      ) : (
        <StudentReportInfantil
          student={getInfantilStudentInfo(student)}
          reports={descriptiveReports}
          onPrint={onPrint}
          onExportPDF={onExportPDF}
          printMode={printMode}
        />
      )}
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function BoletimPage() {
  const t = useTranslations('registry')
  const params = useParams()
  const studentId = params.id as string

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [student, setStudent] = useState<StudentData | null>(null)
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('fundamental')
  const [grades, setGrades] = useState<DisciplineGrade[]>([])
  const [descriptiveReports, setDescriptiveReports] = useState<ReportSummary[]>([])
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [printMode, setPrintMode] = useState(false)
  const [, setExportingPDF] = useState(false)

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await loadStudentData(studentId)
      if (!data) {
        setError(t('ui.aluno-nao-encontrado-ou-sem-matricula-ativa'))
        return
      }

      setStudent(data.student)
      setEducationLevel(data.educationLevel)

      const educationRecords = await loadEducationRecords(data)
      if (educationRecords.grades) setGrades(educationRecords.grades)
      if (educationRecords.descriptiveReports) setDescriptiveReports(educationRecords.descriptiveReports)

      const attendanceSummary = await loadStudentAttendance(data.student.matricula)
      if (attendanceSummary) setAttendance(attendanceSummary)
    } catch (err) {
      logger.error('Error loading student report', err as Error, {
        feature: 'boletim',
        action: 'fetch_failed',
      })
      setError(t('ui.erro-ao-carregar-dados-do-boletim'))
      toast.error(t('ui.erro-ao-carregar-boletim'))
    } finally {
      setLoading(false)
    }
  }, [studentId, t])

  // Load data on mount
  useEffect(() => {
    fetchStudentData()
  }, [fetchStudentData])

  // Handle print
  const handlePrint = useCallback(() => {
    setPrintMode(true)
    setTimeout(() => {
      window.print()
      setPrintMode(false)
    }, 100)
  }, [])

  const handleExportPDF = useCallback(async () => {
    if (!student) return

    setExportingPDF(true)
    try {
      const doc = buildReportCardPDF(
        student,
        educationLevel,
        grades,
        descriptiveReports,
        attendance,
        t('labels.dados-do-aluno'),
        t('labels.disciplina'),
      )
      const filename = `boletim-${student.nome_completo.replace(/\s+/g, '-').toLowerCase()}`
      savePDF(doc, filename)

      toast.success(t('ui.pdf-exportado-com-sucesso'))
      logger.info('PDF exported successfully', {
        feature: 'boletim',
        action: 'export_pdf',
        metadata: { studentId: student.id },
      })
    } catch (error) {
      logger.error('Error exporting PDF', error as Error, {
        feature: 'boletim',
        action: 'export_pdf_failed',
      })
      toast.error(t('ui.erro-ao-exportar-pdf'))
    } finally {
      setExportingPDF(false)
    }
  }, [student, educationLevel, grades, descriptiveReports, attendance, t])

  if (loading) return <ReportCardLoading />

  if (error || !student) {
    return <ReportCardError studentId={studentId} error={error} onRetry={fetchStudentData} />
  }

  return (
    <ReportCardContent
      studentId={studentId}
      student={student}
      educationLevel={educationLevel}
      grades={grades}
      descriptiveReports={descriptiveReports}
      attendance={attendance}
      printMode={printMode}
      onPrint={handlePrint}
      onExportPDF={handleExportPDF}
    />
  )
}
