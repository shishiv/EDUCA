/**
 * Content Reports Page (Relatorio de Conteudo Ministrado)
 * Task Group 4.4.2: Content Report Page
 * OpenSpec Change: 2025-12-04-diario-de-classe
 *
 * Features:
 * - Class (turma) filter dropdown
 * - Optional discipline filter
 * - Period selector (date range)
 * - List of lessons with content
 * - BNCC skills summary
 * - Export to PDF
 *
 * Route: /relatorios/conteudo
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 * @see lib/reports/content-reports.ts
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BookOpen,
  Calendar as CalendarIcon,
  FileText,
  Filter,
  RefreshCw,
  TableIcon,
  ListTree,
  AlertTriangle,
  GraduationCap,
  Target,
  Lightbulb,
  ChevronRight,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { reportsApi, type ReportTurma } from '@/lib/api/reports'
import { logger } from '@/lib/logger'

import {
  generateContentReport,
  type ContentReport,
  type ContentReportFilters,
  type LessonContentReportItem,
  type BNNCSkillUsage,
} from '@/lib/reports/content-reports'
import { generateContentReportPDF, generateBNNCSkillsReportPDF } from '@/lib/export'
import { BNCC_SUBJECTS, type BNNCSubjectCode } from '@/types/lesson-content'

// ============================================================================
// TYPES
// ============================================================================

// Using ReportTurma from lib/api/reports.ts
type Turma = ReportTurma

interface DateRange {
  from: Date
  to: Date
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PERIOD_OPTIONS = [
  { value: 'current_month', label: 'Mes Atual' },
  { value: 'last_month', label: 'Mes Anterior' },
  { value: 'bimestre_1', label: '1o Bimestre' },
  { value: 'bimestre_2', label: '2o Bimestre' },
  { value: 'bimestre_3', label: '3o Bimestre' },
  { value: 'bimestre_4', label: '4o Bimestre' },
  { value: 'custom', label: 'Personalizado' },
]

const DISCIPLINE_OPTIONS = [
  { value: 'todas', label: 'Todas as Disciplinas' },
  ...Object.values(BNCC_SUBJECTS).map((s) => ({
    value: s.code,
    label: s.fullName,
  })),
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPeriodDates(period: string, anoLetivo: number): DateRange {
  const today = new Date()

  switch (period) {
    case 'current_month':
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      }
    case 'last_month':
      const lastMonth = subMonths(today, 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      }
    case 'bimestre_1':
      return {
        from: new Date(anoLetivo, 1, 1),
        to: new Date(anoLetivo, 3, 30),
      }
    case 'bimestre_2':
      return {
        from: new Date(anoLetivo, 4, 1),
        to: new Date(anoLetivo, 6, 31),
      }
    case 'bimestre_3':
      return {
        from: new Date(anoLetivo, 7, 1),
        to: new Date(anoLetivo, 9, 31),
      }
    case 'bimestre_4':
      return {
        from: new Date(anoLetivo, 10, 1),
        to: new Date(anoLetivo, 11, 31),
      }
    default:
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      }
  }
}

function formatDateDisplay(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

function formatDateApi(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Lesson Card Component
 */
function LessonCard({ lesson }: { lesson: LessonContentReportItem }) {
  return (
    <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-medium">{lesson.tema}</CardTitle>
            <CardDescription className="text-sm mt-1">
              {format(new Date(lesson.dataAula), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {lesson.turmaNome && ` | ${lesson.turmaSerie} - ${lesson.turmaNome}`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {lesson.habilidadesBncc.length} BNCC
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Objetivo:</p>
          <p className="text-sm text-gray-700">{lesson.objetivo}</p>
        </div>

        {lesson.habilidadesBncc.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Habilidades BNCC:</p>
            <div className="flex flex-wrap gap-1">
              {lesson.habilidadesBncc.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    skill.startsWith('EI') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  )}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {lesson.metodologia && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Metodologia:</p>
            <p className="text-sm text-gray-600">{lesson.metodologia}</p>
          </div>
        )}

        {lesson.recursos && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Recursos:</p>
            <p className="text-sm text-gray-600">{lesson.recursos}</p>
          </div>
        )}

        {lesson.professorNome && (
          <p className="text-xs text-gray-400 pt-2 border-t">
            Professor(a): {lesson.professorNome}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * BNCC Skills Summary Component
 */
function BNNCSkillsSummary({ skills, onExport }: { skills: BNNCSkillUsage[]; onExport?: () => void }) {
  const fundamentalSkills = skills.filter((s) => s.nivel === 'fundamental')
  const infantilSkills = skills.filter((s) => s.nivel === 'infantil')

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-purple-600" />
            Habilidades BNCC Trabalhadas
          </CardTitle>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            Nenhuma habilidade BNCC registrada no periodo.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-sm">
                {skills.length} habilidades unicas
              </Badge>
              {fundamentalSkills.length > 0 && (
                <Badge className="bg-blue-100 text-blue-700 text-sm">
                  {fundamentalSkills.length} Fundamental
                </Badge>
              )}
              {infantilSkills.length > 0 && (
                <Badge className="bg-purple-100 text-purple-700 text-sm">
                  {infantilSkills.length} Ed. Infantil
                </Badge>
              )}
            </div>

            {/* Skills accordion by level */}
            <Accordion type="multiple" defaultValue={['fundamental', 'infantil']}>
              {fundamentalSkills.length > 0 && (
                <AccordionItem value="fundamental">
                  <AccordionTrigger className="text-sm font-medium">
                    Ensino Fundamental ({fundamentalSkills.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {fundamentalSkills.map((skill) => (
                        <div
                          key={skill.codigo}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700 font-mono">
                              {skill.codigo}
                            </Badge>
                            <span className="text-sm text-gray-600">{skill.descricao}</span>
                          </div>
                          <Badge variant="outline">{skill.vezesTrabalhado}x</Badge>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {infantilSkills.length > 0 && (
                <AccordionItem value="infantil">
                  <AccordionTrigger className="text-sm font-medium">
                    Educacao Infantil ({infantilSkills.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {infantilSkills.map((skill) => (
                        <div
                          key={skill.codigo}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-100 text-purple-700 font-mono">
                              {skill.codigo}
                            </Badge>
                            <span className="text-sm text-gray-600">{skill.descricao}</span>
                          </div>
                          <Badge variant="outline">{skill.vezesTrabalhado}x</Badge>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Content Table Component
 */
function ContentTable({ lessons }: { lessons: LessonContentReportItem[] }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead>Tema/Conteudo</TableHead>
            <TableHead className="hidden md:table-cell">Objetivo</TableHead>
            <TableHead className="w-[120px] text-center">Habilidades</TableHead>
            <TableHead className="hidden lg:table-cell">Turma</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons.map((lesson) => (
            <TableRow key={lesson.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">
                {format(new Date(lesson.dataAula), 'dd/MM/yy')}
              </TableCell>
              <TableCell>
                <div className="max-w-[250px]">
                  <p className="font-medium truncate">{lesson.tema}</p>
                  <p className="text-xs text-gray-500 truncate md:hidden">{lesson.objetivo}</p>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <p className="text-sm text-gray-600 truncate max-w-[300px]">{lesson.objetivo}</p>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-wrap justify-center gap-1">
                  {lesson.habilidadesBncc.slice(0, 2).map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className={cn(
                        'text-xs font-mono',
                        skill.startsWith('EI') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {skill}
                    </Badge>
                  ))}
                  {lesson.habilidadesBncc.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{lesson.habilidadesBncc.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-gray-600">
                  {lesson.turmaSerie} - {lesson.turmaNome}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContentReportsPage() {
  // State
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [selectedTurma, setSelectedTurma] = useState<string>('todas')
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>('todas')
  const [periodOption, setPeriodOption] = useState<string>('current_month')
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }))
  const [reportData, setReportData] = useState<ContentReport | null>(null)
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(true)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const currentYear = new Date().getFullYear()

  // Period label
  const periodoLabel = useMemo(() => {
    return `${formatDateDisplay(dateRange.from)} a ${formatDateDisplay(dateRange.to)}`
  }, [dateRange])

  // Fetch turmas on mount
  useEffect(() => {
    async function fetchTurmas() {
      setIsLoadingTurmas(true)
      setError(null)

      try {
        const turmasData = await reportsApi.getTurmasForFilters()
        setTurmas(turmasData)
      } catch (err) {
        logger.error('Error fetching turmas', err as Error, {
          feature: 'reports',
          action: 'load_conteudo_turmas'
        })
        setError('Erro ao carregar turmas')
      } finally {
        setIsLoadingTurmas(false)
      }
    }

    fetchTurmas()
  }, [])

  // Update date range when period option changes
  useEffect(() => {
    if (periodOption !== 'custom') {
      setDateRange(getPeriodDates(periodOption, currentYear))
    }
  }, [periodOption, currentYear])

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setIsLoadingReport(true)
    setError(null)

    try {
      const filters: ContentReportFilters = {
        startDate: formatDateApi(dateRange.from),
        endDate: formatDateApi(dateRange.to),
      }

      if (selectedTurma !== 'todas') {
        filters.turmaId = selectedTurma
      }

      if (selectedDisciplina !== 'todas') {
        filters.disciplina = selectedDisciplina as BNNCSubjectCode
      }

      const result = await generateContentReport(supabase, filters)

      if (result.error) {
        throw new Error(result.error)
      }

      setReportData(result.data)
      toast.success('Relatorio gerado com sucesso')
    } catch (err) {
      logger.error('Error generating report', err as Error, {
        feature: 'reports',
        action: 'generate_conteudo_report',
        metadata: { turmaId: selectedTurma, disciplina: selectedDisciplina }
      })
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar relatorio'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoadingReport(false)
    }
  }, [dateRange, selectedTurma, selectedDisciplina])

  // Handle turma selection
  const handleTurmaChange = (turmaId: string) => {
    setSelectedTurma(turmaId)
    setReportData(null)
  }

  // Handle export PDF
  const handleExportPDF = () => {
    if (!reportData) {
      toast.error('Gere um relatorio primeiro')
      return
    }
    try {
      generateContentReportPDF(reportData, selectedTurmaInfo?.escola?.nome)
      toast.success('PDF gerado com sucesso')
    } catch (err) {
      logger.error('Error generating PDF', err as Error, {
        feature: 'reports',
        action: 'export_conteudo_pdf'
      })
      toast.error('Erro ao gerar PDF')
    }
  }

  // Handle export BNCC skills PDF
  const handleExportBNNCPDF = () => {
    if (!reportData || reportData.habilidadesBncc.length === 0) {
      toast.error('Nenhuma habilidade BNCC para exportar')
      return
    }
    try {
      generateBNNCSkillsReportPDF(reportData.habilidadesBncc, {
        turma: reportData.turma,
        escola: reportData.escola,
        periodo: reportData.periodo,
        professor: reportData.professor,
      })
      toast.success('PDF de habilidades gerado com sucesso')
    } catch (err) {
      logger.error('Error generating BNCC PDF', err as Error, {
        feature: 'reports',
        action: 'export_bncc_pdf'
      })
      toast.error('Erro ao gerar PDF')
    }
  }

  // Get selected turma info
  const selectedTurmaInfo = useMemo(() => {
    return turmas.find((t) => t.id === selectedTurma)
  }, [turmas, selectedTurma])

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Relatorio de Conteudo Ministrado
          </h1>
          <p className="text-gray-600 mt-1">
            Visualize o conteudo das aulas e habilidades BNCC trabalhadas
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!reportData}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Turma Selector */}
            <div className="space-y-2">
              <Label htmlFor="turma">Turma</Label>
              {isLoadingTurmas ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedTurma} onValueChange={handleTurmaChange}>
                  <SelectTrigger id="turma">
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Turmas</SelectItem>
                    {turmas.map((turma) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {turma.serie} - {turma.nome}
                        {turma.escola && ` (${turma.escola.nome})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Discipline Selector (optional) */}
            <div className="space-y-2">
              <Label htmlFor="disciplina">Disciplina (opcional)</Label>
              <Select value={selectedDisciplina} onValueChange={setSelectedDisciplina}>
                <SelectTrigger id="disciplina">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Selector */}
            <div className="space-y-2">
              <Label htmlFor="periodo">Periodo</Label>
              <Select value={periodOption} onValueChange={setPeriodOption}>
                <SelectTrigger id="periodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range (for custom period) */}
            {periodOption === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Data Inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateRange.from && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? formatDateDisplay(dateRange.from) : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) =>
                          date && setDateRange((prev) => ({ ...prev, from: date }))
                        }
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateRange.to && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? formatDateDisplay(dateRange.to) : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) =>
                          date && setDateRange((prev) => ({ ...prev, to: date }))
                        }
                        locale={ptBR}
                        disabled={(date) => date < dateRange.from}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={fetchReport}
                disabled={isLoadingReport}
                className="w-full"
              >
                {isLoadingReport ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4 mr-2" />
                )}
                Gerar Relatorio
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Report Content */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reportData.resumo.totalAulas}</p>
                    <p className="text-sm text-gray-500">Aulas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reportData.resumo.habilidadesUnicas}</p>
                    <p className="text-sm text-gray-500">Habilidades BNCC</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Lightbulb className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reportData.resumo.mediaHabilidadesPorAula.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">Media/Aula</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reportData.resumo.disciplinasMaisTrabalhadas.length}</p>
                    <p className="text-sm text-gray-500">Disciplinas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="lessons" className="space-y-4">
            <TabsList className="grid w-full max-w-[400px] grid-cols-3">
              <TabsTrigger value="lessons" className="flex items-center gap-1">
                <ListTree className="h-4 w-4" />
                Aulas
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                BNCC
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-1">
                <TableIcon className="h-4 w-4" />
                Tabela
              </TabsTrigger>
            </TabsList>

            {/* Lessons Tab - Card View */}
            <TabsContent value="lessons">
              {reportData.aulas.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-600">
                      Nenhuma aula registrada no periodo
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Periodo: {periodoLabel}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {reportData.aulas.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills">
              <BNNCSkillsSummary
                skills={reportData.habilidadesBncc}
                onExport={handleExportBNNCPDF}
              />
            </TabsContent>

            {/* Table Tab */}
            <TabsContent value="table">
              {reportData.aulas.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <TableIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-600">
                      Nenhum dado para exibir
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ContentTable lessons={reportData.aulas} />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Empty State */}
      {!reportData && !isLoadingReport && !error && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">
              Selecione os filtros e gere o relatorio
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Use os filtros acima para visualizar o conteudo ministrado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
