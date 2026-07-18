/**
 * Attendance Reports Page
 * Task Group 4.1.4: Attendance Report Page
 * Task Group 5.1.2: Mobile responsiveness fixes
 * OpenSpec Change: 2025-12-04-diario-de-classe
 *
 * Features:
 * - Class (turma) filter dropdown
 * - Period selector (date range)
 * - Table visualization with AttendanceReportTable
 * - Optional bar chart visualization
 * - Export to PDF and Excel
 * - Mobile-optimized layout
 *
 * Route: /relatorios/frequencia
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 * @see components/reports/AttendanceReportTable.tsx
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  BarChart3,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  TableIcon,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { reportsApi, type ReportTurma } from '@/lib/api/reports'
import { logger } from '@/lib/logger'

import { AttendanceReportTable, type AttendanceTableRow } from '@/components/reports/AttendanceReportTable'
import {
  generateClassAttendanceReport,
  getStudentsAtRisk,
  type ClassAttendanceReport,
  type AttendanceReportFilters,
} from '@/lib/reports/attendance-reports'
import {
  generateAttendanceReportPDF,
  generateAttendanceReportExcel,
} from '@/lib/export'

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

const RISK_THRESHOLD = 80
const CRITICAL_THRESHOLD = 75

// Quick period options
const PERIOD_OPTIONS = [
  { value: 'current_month', label: 'Mes Atual' },
  { value: 'last_month', label: 'Mes Anterior' },
  { value: 'bimestre_1', label: '1o Bimestre' },
  { value: 'bimestre_2', label: '2o Bimestre' },
  { value: 'bimestre_3', label: '3o Bimestre' },
  { value: 'bimestre_4', label: '4o Bimestre' },
  { value: 'custom', label: 'Personalizado' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get date range from period option
 */
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
        from: new Date(anoLetivo, 1, 1), // February
        to: new Date(anoLetivo, 3, 30), // April
      }
    case 'bimestre_2':
      return {
        from: new Date(anoLetivo, 4, 1), // May
        to: new Date(anoLetivo, 6, 31), // July
      }
    case 'bimestre_3':
      return {
        from: new Date(anoLetivo, 7, 1), // August
        to: new Date(anoLetivo, 9, 31), // October
      }
    case 'bimestre_4':
      return {
        from: new Date(anoLetivo, 10, 1), // November
        to: new Date(anoLetivo, 11, 31), // December
      }
    default:
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      }
  }
}

/**
 * Format date for display
 */
function formatDateDisplay(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Format date for API
 */
function formatDateApi(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AttendanceReportsPage() {
  // State
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [selectedTurma, setSelectedTurma] = useState<string>('')
  const [periodOption, setPeriodOption] = useState<string>('current_month')
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }))
  const [reportData, setReportData] = useState<ClassAttendanceReport | null>(null)
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(true)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')

  // Current year for bimestre calculations
  const currentYear = new Date().getFullYear()

  // Transform report data to table format
  const tableData: AttendanceTableRow[] = useMemo(() => {
    if (!reportData?.students) return []

    return reportData.students.map((student) => ({
      matriculaId: student.matriculaId,
      alunoId: student.alunoId,
      nome: student.nome,
      presencas: student.presencas,
      faltas: student.faltas,
      atestados: student.atestados,
      totalAulas: student.totalAulas,
      percentual: student.percentual,
      emRisco: student.emRisco,
    }))
  }, [reportData])

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

        // Auto-select first turma if only one
        if (turmasData.length === 1) {
          setSelectedTurma(turmasData[0].id)
        }
      } catch (err) {
        logger.error('Error fetching turmas', err as Error, {
          feature: 'reports',
          action: 'load_frequencia_turmas'
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
    if (!selectedTurma) {
      toast.error('Selecione uma turma')
      return
    }

    setIsLoadingReport(true)
    setError(null)

    try {
      const filters: AttendanceReportFilters = {
        startDate: formatDateApi(dateRange.from),
        endDate: formatDateApi(dateRange.to),
        riskThreshold: RISK_THRESHOLD,
      }

      const result = await generateClassAttendanceReport(supabase, selectedTurma, filters)

      if (result.error) {
        throw new Error(result.error)
      }

      setReportData(result.data)
      toast.success('Relatorio gerado com sucesso')
    } catch (err) {
      logger.error('Error generating report', err as Error, {
        feature: 'reports',
        action: 'generate_frequencia_report',
        metadata: { turmaId: selectedTurma }
      })
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar relatorio'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoadingReport(false)
    }
  }, [selectedTurma, dateRange])

  // Handle turma selection
  const handleTurmaChange = (turmaId: string) => {
    setSelectedTurma(turmaId)
    setReportData(null) // Clear previous report
  }

  // Handle row click
  const handleRowClick = (row: AttendanceTableRow) => {
    // Navigate to student details
    window.open(`/dashboard/alunos/${row.alunoId}`, '_blank')
  }

  // Handle export PDF
  const handleExportPDF = () => {
    if (!reportData) {
      toast.error('Gere um relatorio primeiro')
      return
    }
    try {
      generateAttendanceReportPDF(reportData, selectedTurmaInfo?.escola?.nome)
      toast.success('PDF gerado com sucesso')
    } catch (err) {
      logger.error('Error generating PDF', err as Error, {
        feature: 'reports',
        action: 'export_frequencia_pdf'
      })
      toast.error('Erro ao gerar PDF')
    }
  }

  // Handle export Excel
  const handleExportExcel = async () => {
    if (!reportData) {
      toast.error('Gere um relatorio primeiro')
      return
    }
    try {
      await generateAttendanceReportExcel(reportData, selectedTurmaInfo?.escola?.nome)
      toast.success('Excel gerado com sucesso')
    } catch (err) {
      logger.error('Error generating Excel', err as Error, {
        feature: 'reports',
        action: 'export_frequencia_excel'
      })
      toast.error('Erro ao gerar Excel')
    }
  }

  // Get selected turma info
  const selectedTurmaInfo = useMemo(() => {
    return turmas.find((t) => t.id === selectedTurma)
  }, [turmas, selectedTurma])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <span className="hidden xs:inline">Relatorios de </span>Frequencia
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            <span className="hidden sm:inline">Visualize e exporte relatorios de frequencia por turma e periodo</span>
            <span className="sm:hidden">Relatorios por turma e periodo</span>
          </p>
        </div>

        {/* Export buttons - stack on mobile */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* Filters - Mobile optimized grid */}
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Turma Selector */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="turma" className="text-xs sm:text-sm">Turma</Label>
              {isLoadingTurmas ? (
                <Skeleton className="h-10 sm:h-11 w-full" />
              ) : (
                <Select value={selectedTurma} onValueChange={handleTurmaChange}>
                  <SelectTrigger id="turma" className="min-h-[44px]">
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map((turma) => (
                      <SelectItem key={turma.id} value={turma.id} className="py-3">
                        {turma.serie} - {turma.nome}
                        {turma.escola && (
                          <span className="hidden sm:inline"> ({turma.escola.nome})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Period Selector */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="periodo" className="text-xs sm:text-sm">Periodo</Label>
              <Select value={periodOption} onValueChange={setPeriodOption}>
                <SelectTrigger id="periodo" className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="py-3">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range (for custom period) */}
            {periodOption === 'custom' && (
              <>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Data Inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal min-h-[44px]',
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

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal min-h-[44px]',
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

            {/* Generate Button - Full width on mobile when custom period */}
            <div className={cn(
              'flex items-end',
              periodOption === 'custom' ? 'col-span-1 sm:col-span-2 lg:col-span-4' : ''
            )}>
              <Button
                onClick={fetchReport}
                disabled={!selectedTurma || isLoadingReport}
                className="w-full min-h-[44px]"
              >
                {isLoadingReport ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
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
          {/* View Mode Tabs - Full width on mobile */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'chart')}>
            <TabsList className="grid w-full sm:w-auto sm:max-w-[200px] grid-cols-2">
              <TabsTrigger value="table" className="flex items-center gap-1 min-h-[44px]">
                <TableIcon className="h-4 w-4" />
                <span className="hidden xs:inline">Tabela</span>
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-1 min-h-[44px]">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden xs:inline">Grafico</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-4">
              <AttendanceReportTable
                data={tableData}
                turmaName={
                  selectedTurmaInfo
                    ? `${selectedTurmaInfo.serie} - ${selectedTurmaInfo.nome}`
                    : undefined
                }
                periodoLabel={periodoLabel}
                riskThreshold={RISK_THRESHOLD}
                isLoading={isLoadingReport}
                onRowClick={handleRowClick}
                onPrint={() => window.print()}
                onExportPDF={handleExportPDF}
              />
            </TabsContent>

            <TabsContent value="chart" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Visualizacao Grafica</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 sm:py-12 text-gray-500">
                    <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-base sm:text-lg font-medium">Grafico em desenvolvimento</p>
                    <p className="text-xs sm:text-sm mt-1">
                      A visualizacao grafica sera implementada em breve.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Empty State */}
      {!reportData && !isLoadingReport && !error && (
        <Card>
          <CardContent className="text-center py-8 sm:py-12">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-base sm:text-lg font-medium text-gray-600">Selecione uma turma e periodo</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Use os filtros acima para gerar o relatorio de frequencia.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
