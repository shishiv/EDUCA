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

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
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
      etapa_ensino?: string
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect education level from turma serie
 */
function detectEducationLevel(serie: string | undefined): EducationLevel {
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

// ============================================================================
// COMPONENT
// ============================================================================

export default function BoletimPage() {
  const params = useParams()
  const router = useRouter()
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
  const [exportingPDF, setExportingPDF] = useState(false)

  // Fetch student data
  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch student with active enrollment
      const { data: studentData, error: studentError } = await supabase
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
              escolas!inner (
                nome
              )
            )
          )
        `)
        .eq('id', studentId)
        .eq('matriculas.situacao', 'ativa')
        .single()

      if (studentError) {
        if (studentError.code === 'PGRST116') {
          setError('Aluno nao encontrado ou sem matricula ativa')
        } else {
          throw studentError
        }
        return
      }

      // Transform student data with type casting for Supabase inference
      const rawData = studentData as any
      const matriculaRaw = Array.isArray(rawData.matriculas)
        ? rawData.matriculas[0]
        : rawData.matriculas

      const turmaRaw = matriculaRaw?.turmas
      const escolaRaw = turmaRaw?.escolas

      const transformedStudent: StudentData = {
        id: rawData.id,
        nome_completo: rawData.nome_completo,
        data_nascimento: rawData.data_nascimento,
        matricula: matriculaRaw
          ? {
              id: matriculaRaw.id,
              turma_id: matriculaRaw.turma_id,
              ano_letivo: matriculaRaw.ano_letivo,
              turma: {
                id: turmaRaw?.id || '',
                nome: turmaRaw?.nome || '',
                serie: turmaRaw?.serie || '',
                etapa_ensino: turmaRaw?.etapa_ensino,
                escola: {
                  nome: escolaRaw?.nome || '',
                },
              },
            }
          : undefined,
      }

      setStudent(transformedStudent)

      // Detect education level
      const detectedLevel = detectEducationLevel(turmaRaw?.serie || turmaRaw?.etapa_ensino)
      setEducationLevel(detectedLevel)

      // Fetch grades or descriptive reports based on education level
      if (detectedLevel === 'fundamental' && matriculaRaw?.id) {
        // Fetch grades for Fundamental
        const { data: gradesData, error: gradesError } = await supabase
          .from('notas')
          .select('disciplina, bimestre, nota')
          .eq('matricula_id', matriculaRaw.id)
          .order('disciplina')
          .order('bimestre')

        if (gradesError) {
          logger.warn('Error fetching grades', {
            feature: 'boletim',
            action: 'fetch_grades_failed',
            metadata: { error: gradesError.message },
          })
        } else if (gradesData) {
          const transformedGrades = transformGradesToDisciplineGrades(gradesData as GradeData[])
          setGrades(transformedGrades)
        }
      } else if (detectedLevel === 'infantil' && matriculaRaw?.id) {
        // Fetch descriptive reports for Infantil - using raw SQL for non-existing table
        // Note: relatorios_descritivos table may not exist in current schema
        // This is a placeholder for when the table is created
        try {
          const { data: reportsData, error: reportsError } = await supabase
            .from('relatorios_descritivos' as any)
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
              users:professor_id (
                nome
              )
            `)
            .eq('matricula_id', matriculaRaw.id)
            .order('ano_letivo', { ascending: false })
            .order('semestre')

          if (!reportsError && reportsData) {
            const transformedReports = transformDescriptiveReports(
              (reportsData as any[]).map((r: any) => ({
                ...r,
                professor: r.users,
              })) as DescriptiveReportData[]
            )
            setDescriptiveReports(transformedReports)
          }
        } catch (e) {
          // Table may not exist yet - this is expected in early development
          logger.warn('Descriptive reports table may not exist', {
            feature: 'boletim',
            action: 'fetch_reports_skipped',
          })
        }
      }

      // Fetch attendance summary (for both levels)
      if (matriculaRaw?.turma_id) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('frequencia')
          .select('presente')
          .eq('matricula_id', matriculaRaw.id)

        if (!attendanceError && attendanceData) {
          const total = attendanceData.length
          const presencas = attendanceData.filter((a: any) => a.presente === true).length
          const faltas = total - presencas

          setAttendance(
            calculateAttendanceSummary({
              total_aulas: total,
              presencas,
              faltas,
              atestados: 0, // Not tracked in basic frequencia table
            })
          )
        }
      }
    } catch (err) {
      logger.error('Error loading student report', err as Error, {
        feature: 'boletim',
        action: 'fetch_failed',
      })
      setError('Erro ao carregar dados do boletim')
      toast.error('Erro ao carregar boletim')
    } finally {
      setLoading(false)
    }
  }, [studentId])

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

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    if (!student) return

    setExportingPDF(true)
    try {
      const matricula = student.matricula
      const turma = matricula?.turma

      // Create PDF document
      const doc = createPDFDocument('portrait')

      // Add header
      let currentY = addPDFHeader(doc, {
        title: 'Boletim Escolar',
        subtitle: educationLevel === 'infantil'
          ? 'Relatorio de Desenvolvimento - Educacao Infantil'
          : 'Desempenho Academico - Ensino Fundamental',
        schoolName: turma?.escola?.nome || 'Escola Municipal',
      })

      // Add student info section
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Dados do Aluno', 15, currentY)
      currentY += 7

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Nome: ${student.nome_completo}`, 15, currentY)
      currentY += 5
      doc.text(`Turma: ${turma?.nome || '-'} | Serie: ${turma?.serie || '-'}`, 15, currentY)
      currentY += 5
      doc.text(`Ano Letivo: ${matricula?.ano_letivo || new Date().getFullYear()}`, 15, currentY)
      currentY += 10

      if (educationLevel === 'fundamental' && grades.length > 0) {
        // Add grades table
        currentY = addPDFTable(
          doc,
          {
            title: 'Notas por Disciplina',
            columns: [
              { header: 'Disciplina', dataKey: 'disciplina', halign: 'left' },
              { header: '1o Bim', dataKey: 'bimestre1', halign: 'center', width: 20 },
              { header: '2o Bim', dataKey: 'bimestre2', halign: 'center', width: 20 },
              { header: '3o Bim', dataKey: 'bimestre3', halign: 'center', width: 20 },
              { header: '4o Bim', dataKey: 'bimestre4', halign: 'center', width: 20 },
              { header: 'Media', dataKey: 'media', halign: 'center', width: 20 },
            ],
            rows: grades.map((g) => ({
              disciplina: g.disciplina,
              bimestre1: g.bimestre1 !== null ? g.bimestre1.toFixed(1) : '-',
              bimestre2: g.bimestre2 !== null ? g.bimestre2.toFixed(1) : '-',
              bimestre3: g.bimestre3 !== null ? g.bimestre3.toFixed(1) : '-',
              bimestre4: g.bimestre4 !== null ? g.bimestre4.toFixed(1) : '-',
              media: g.media !== null ? g.media.toFixed(1) : '-',
            })),
          },
          currentY
        )
        currentY += 10
      } else if (educationLevel === 'infantil' && descriptiveReports.length > 0) {
        // Add descriptive reports summary
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Relatorios Descritivos', 15, currentY)
        currentY += 7

        for (const report of descriptiveReports) {
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
      }

      // Add attendance summary if available
      if (attendance) {
        currentY += 5
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Frequencia', 15, currentY)
        currentY += 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Total de Aulas: ${attendance.totalAulas}`, 15, currentY)
        currentY += 5
        doc.text(`Presencas: ${attendance.presencas} | Faltas: ${attendance.faltas}`, 15, currentY)
        currentY += 5
        doc.text(`Percentual de Frequencia: ${attendance.percentual}%`, 15, currentY)
      }

      // Add footer
      addPDFFooter(doc, { showPageNumbers: true, showGeneratedAt: true })

      // Save PDF
      const filename = `boletim-${student.nome_completo.replace(/\s+/g, '-').toLowerCase()}`
      savePDF(doc, filename)

      toast.success('PDF exportado com sucesso!')
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
      toast.error('Erro ao exportar PDF')
    } finally {
      setExportingPDF(false)
    }
  }, [student, educationLevel, grades, descriptiveReports, attendance])

  // Loading state
  if (loading) {
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

  // Error state
  if (error || !student) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/alunos/${studentId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            {error || 'Nao foi possivel carregar os dados do aluno.'}
          </AlertDescription>
        </Alert>

        <Button onClick={fetchStudentData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  // Prepare data for components
  const matricula = student.matricula
  const turma = matricula?.turma

  return (
    <div className={cn('space-y-6', printMode && 'print:space-y-4')}>
      {/* Header - hidden in print */}
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/alunos/${studentId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
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
              ? 'Relatorio de Desenvolvimento - Educacao Infantil'
              : 'Desempenho Academico - Ensino Fundamental'}
          </p>
        </div>
      </div>

      {/* Render appropriate component based on education level */}
      {educationLevel === 'fundamental' ? (
        <StudentReport
          student={{
            id: student.id,
            nome: student.nome_completo,
            dataNascimento: student.data_nascimento,
            turma: turma?.nome || '',
            serie: turma?.serie || '',
            escola: turma?.escola?.nome || '',
            anoLetivo: matricula?.ano_letivo || new Date().getFullYear(),
          }}
          grades={grades}
          attendance={attendance || undefined}
          onPrint={handlePrint}
          onExportPDF={handleExportPDF}
          printMode={printMode}
        />
      ) : (
        <StudentReportInfantil
          student={{
            id: student.id,
            nome: student.nome_completo,
            dataNascimento: student.data_nascimento,
            turma: turma?.nome || '',
            faixaEtaria: turma?.serie,
            escola: turma?.escola?.nome || '',
            anoLetivo: matricula?.ano_letivo || new Date().getFullYear(),
          }}
          reports={descriptiveReports}
          onPrint={handlePrint}
          onExportPDF={handleExportPDF}
          printMode={printMode}
        />
      )}
    </div>
  )
}
